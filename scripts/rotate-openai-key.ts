import fs from 'node:fs';
import path from 'node:path';

type Schedule = typeof import('../automation/key-rotation/schedule.json');

type ProviderSchedule = Schedule['providers'][number];

const schedulePath = path.resolve(__dirname, '../automation/key-rotation/schedule.json');
const providerName = 'OpenAI';

const REQUIRED_ENVS = [
  'OPENAI_MANAGEMENT_KEY',
  'OPENAI_ORG_ID',
  'VERCEL_TOKEN',
  'VERCEL_PROJECT_ID',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_REF',
];

REQUIRED_ENVS.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
});

async function createOpenAIKey(): Promise<string> {
  const response = await fetch(
    `https://api.openai.com/v1/organizations/${process.env.OPENAI_ORG_ID}/api_keys`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_MANAGEMENT_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ display_name: `urban-manual-${Date.now()}` }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create OpenAI key: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as { secret?: string; id?: string };
  const key = payload.secret ?? payload.id;
  if (!key) {
    throw new Error('OpenAI did not return a secret');
  }
  return key;
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
  console.log('Rotating OpenAI API key...');
  const key = await createOpenAIKey();
  console.log('New OpenAI key created. Updating secret stores...');
  await pushToVercel('OPENAI_API_KEY', key);
  await pushToSupabase('OPENAI_API_KEY', key);

  if (process.argv.includes('--update-schedule')) {
    updateScheduleFile('OPENAI_API_KEY');
  }

  console.log('Rotation complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
