import fs from 'node:fs';
import path from 'node:path';

interface ProviderSchedule {
  name: string;
  secretName: string;
  cadenceDays: number;
  lastRotated: string;
  owner: string;
  escalationContacts: string[];
  vercel?: {
    projectId: string;
    targets: string[];
  } | null;
  supabase?: {
    projectRef: string;
    secretName: string;
  } | null;
}

interface ScheduleFile {
  providers: ProviderSchedule[];
  warningWindowDays?: number;
}

interface ProviderStatus extends ProviderSchedule {
  daysSince: number;
  daysUntilDue: number;
  dueDate: Date;
  status: 'healthy' | 'warning' | 'overdue';
}

const schedulePath = path.resolve(__dirname, '../automation/key-rotation/schedule.json');

function loadSchedule(): ScheduleFile {
  const raw = fs.readFileSync(schedulePath, 'utf-8');
  return JSON.parse(raw);
}

function calculateStatus(schedule: ProviderSchedule, warningWindowDays: number): ProviderStatus {
  const lastRotatedDate = new Date(schedule.lastRotated);
  if (Number.isNaN(lastRotatedDate.getTime())) {
    throw new Error(`Invalid date for ${schedule.name}: ${schedule.lastRotated}`);
  }

  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSince = Math.floor((now.getTime() - lastRotatedDate.getTime()) / msPerDay);
  const dueDate = new Date(lastRotatedDate.getTime() + schedule.cadenceDays * msPerDay);
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / msPerDay);

  let status: ProviderStatus['status'] = 'healthy';
  if (daysUntilDue <= 0) {
    status = 'overdue';
  } else if (daysUntilDue <= warningWindowDays) {
    status = 'warning';
  }

  return {
    ...schedule,
    daysSince,
    daysUntilDue,
    dueDate,
    status,
  };
}

function renderStatus(provider: ProviderStatus): string {
  const dueDate = provider.dueDate.toISOString().split('T')[0];
  const base = `${provider.name} (${provider.secretName}) → due ${dueDate} (${provider.daysUntilDue} days)`;

  if (provider.status === 'healthy') {
    return `✅  ${base}`;
  }

  const contacts = provider.escalationContacts.join(', ');
  const statusEmoji = provider.status === 'warning' ? '⚠️' : '❌';
  return `${statusEmoji}  ${base} | Escalate: ${contacts}`;
}

function main() {
  const schedule = loadSchedule();
  const warningWindowDays = schedule.warningWindowDays ?? 5;
  const statuses = schedule.providers.map((provider) =>
    calculateStatus(provider, warningWindowDays),
  );

  statuses.forEach((status) => {
    console.log(renderStatus(status));
  });

  const overdue = statuses.filter((status) => status.status === 'overdue');
  const warnings = statuses.filter((status) => status.status === 'warning');

  if (overdue.length > 0 || warnings.length > 0) {
    console.log('\nRotation action required for the providers above.');
  }

  if (overdue.length > 0) {
    console.error(`Found ${overdue.length} overdue provider(s). Failing the check.`);
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.error(`Found ${warnings.length} provider(s) within the warning window. Failing the check to force rotation.`);
    process.exit(1);
  }

  console.log('\nAll secrets comply with the rotation timeline.');
}

main();
