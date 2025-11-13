import fs from 'node:fs';
import path from 'node:path';

type Schedule = typeof import('../automation/key-rotation/schedule.json');

type ProviderSchedule = Schedule['providers'][number];

const schedulePath = path.resolve(__dirname, '../automation/key-rotation/schedule.json');
const providerName = 'Supabase Service Role';

const REQUIRED_ENVS = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_REF',
  'VERCEL_TOKEN',
  'VERCEL_PROJECT_ID',
];

REQUIRED_ENVS.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
});

async function rotateServiceKey(): Promise<string> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys/rotate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'service_role' }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to rotate Supabase service key: ${response.status} ${body}`);
  }

  const json = (await response.json()) as { key: string };
  if (!json.key) {
    throw new Error('Supabase did not return a key');
  }
  return json.key;
}

async function pushToVercel(secretName: string, value: string) {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/env`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: secretName,
        value,
        target: ['production', 'preview'],
        type: 'encrypted',
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to push secret to Vercel: ${response.status} ${body}`);
  }

  const json = await response.json();
  console.log(`Updated Vercel secret ${secretName}: ${JSON.stringify(json)}`);
}

async function pushToSupabase(secretName: string, value: string) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/secrets`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: secretName,
        value,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to push secret to Supabase: ${response.status} ${body}`);
  }

  const json = await response.json();
  console.log(`Updated Supabase secret ${secretName}: ${JSON.stringify(json)}`);
}

function updateScheduleFile(secretName: string) {
  const raw = fs.readFileSync(schedulePath, 'utf-8');
  const json = JSON.parse(raw) as Schedule;
  json.providers = json.providers.map((provider: ProviderSchedule) => {
    if (provider.name === providerName && provider.secretName === secretName) {
      return {
        ...provider,
        lastRotated: new Date().toISOString().split('T')[0],
      };
    }
    return provider;
  });
  fs.writeFileSync(schedulePath, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`Updated schedule for ${providerName}.`);
}

async function main() {
  console.log('Rotating Supabase service role key...');
  const key = await rotateServiceKey();
  console.log('New service role key created. Updating secret stores...');
  await pushToVercel('SUPABASE_SERVICE_ROLE_KEY', key);
  await pushToSupabase('SUPABASE_SERVICE_ROLE_KEY', key);

  if (process.argv.includes('--update-schedule')) {
    updateScheduleFile('SUPABASE_SERVICE_ROLE_KEY');
  }

  console.log('Rotation complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
