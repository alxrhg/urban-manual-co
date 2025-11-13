import assert from 'node:assert/strict';

import {
  getSupabaseConfigOrThrow,
  getSupabaseConfigResult,
  resetSupabaseConfigCache,
  SupabaseConfigError,
} from '@/lib/supabase/config';

const ORIGINAL_ENV = { ...process.env };
const SUPABASE_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

function resetEnv(overrides: Record<string, string | undefined> = {}) {
  resetSupabaseConfigCache();
  for (const key of SUPABASE_ENV_KEYS) {
    delete process.env[key];
  }
  Object.assign(process.env, overrides);
}

async function testValidConfiguration() {
  resetEnv({
    NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-12345678901234567890',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-12345678901234567890',
  });

  const result = getSupabaseConfigResult();
  assert.equal(result.ok, true, 'valid config should resolve successfully');
  if (result.ok) {
    assert.equal(result.value.url, 'https://demo.supabase.co');
    assert.equal(result.value.anonKey, 'anon-key-12345678901234567890');
    assert.equal(result.value.serviceRoleKey, 'service-role-12345678901234567890');
  }
}

async function testMissingUrl() {
  resetEnv({
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-12345678901234567890',
  });

  const result = getSupabaseConfigResult();
  assert.equal(result.ok, false, 'missing URL should fail');
  if (!result.ok) {
    assert.equal(result.error.code, 'MISSING_URL');
  }
}

async function testInvalidUrlFormat() {
  resetEnv({
    NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-12345678901234567890',
  });

  const result = getSupabaseConfigResult();
  assert.equal(result.ok, false, 'invalid URL format should fail');
  if (!result.ok) {
    assert.equal(result.error.code, 'INVALID_URL');
  }
}

async function testMissingAnonKey() {
  resetEnv({
    NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
  });

  const result = getSupabaseConfigResult();
  assert.equal(result.ok, false, 'missing anon key should fail');
  if (!result.ok) {
    assert.equal(result.error.code, 'MISSING_ANON_KEY');
  }
}

async function testPlaceholderAnonKey() {
  resetEnv({
    NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder',
  });

  const result = getSupabaseConfigResult();
  assert.equal(result.ok, false, 'placeholder anon key should fail validation');
  if (!result.ok) {
    assert.equal(result.error.code, 'INVALID_ANON_KEY');
  }
}

async function testMissingServiceRoleWhenRequired() {
  resetEnv({
    NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-12345678901234567890',
  });

  try {
    getSupabaseConfigOrThrow({ requireServiceRole: true });
    assert.fail('should throw when service role is required but missing');
  } catch (error) {
    assert.ok(error instanceof SupabaseConfigError, 'should throw a SupabaseConfigError');
    if (error instanceof SupabaseConfigError) {
      assert.equal(error.code, 'MISSING_SERVICE_ROLE_KEY');
    }
  }
}

async function run() {
  await testValidConfiguration();
  await testMissingUrl();
  await testInvalidUrlFormat();
  await testMissingAnonKey();
  await testPlaceholderAnonKey();
  await testMissingServiceRoleWhenRequired();
  console.log('Supabase config tests passed');
}

run()
  .catch(error => {
    console.error('Supabase config tests failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    resetSupabaseConfigCache();
    for (const key of SUPABASE_ENV_KEYS) {
      delete process.env[key];
    }
    Object.assign(process.env, ORIGINAL_ENV);
  });
