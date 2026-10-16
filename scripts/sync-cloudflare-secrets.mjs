import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function usage() {
  console.error(
    'Usage: sync-cloudflare-secrets.mjs --env staging|production [--dry-run] [--only=A,B] [--yes]'
  );
  process.exit(1);
}

function parseArgs() {
  const flags = { env: null, only: null, dryRun: false, yes: false };
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--env=')) {
      flags.env = arg.slice('--env='.length);
    } else if (arg === '--env') {
      flags.env = args[++i];
    } else if (arg.startsWith('--only=')) {
      flags.only = arg
        .slice('--only='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === '--only') {
      flags.only = args[++i]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === '--dry-run') {
      flags.dryRun = true;
    } else if (arg === '--yes') {
      flags.yes = true;
    }
  }
  if (!flags.env || !['staging', 'production'].includes(flags.env)) usage();
  return flags;
}

function parseEnvCloudflare(envName) {
  const envPath = resolve(root, '.env.cloudflare');
  if (!existsSync(envPath)) {
    console.error(`.env.cloudflare not found at ${envPath}`);
    console.error('Create it with sections [staging] and [production].');
    process.exit(1);
  }

  const content = readFileSync(envPath, 'utf8');
  const sectionRe = new RegExp(`\\[${envName}\\]([\\s\\S]*?)(?:\\[|$)`, 'i');
  const match = content.match(sectionRe);

  if (!match) {
    console.error(`Section [${envName}] not found in .env.cloudflare`);
    process.exit(1);
  }

  const vars = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[trimmed.slice(0, eqIdx).trim()] = val;
  }
  return vars;
}

function preCheck() {
  try {
    execSync('pnpm exec wrangler whoami', {
      stdio: 'pipe',
      cwd: resolve(root, 'apps/api'),
    });
  } catch {
    console.error('wrangler is not authenticated.');
    console.error('Run: pnpm dlx wrangler login');
    console.error('Or set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.');
    process.exit(1);
  }
}

function confirmProduction() {
  if (!process.stdin.isTTY) {
    console.error('--env production requires --yes when stdin is not a TTY');
    process.exit(1);
  }
  console.log("⚠️  About to update production secrets. Type 'production' to confirm:");
  const buf = Buffer.alloc(64);
  const n = readSync(0, buf, 0, buf.length);
  const input = buf.toString('utf8', 0, n).trim();
  if (input !== 'production') {
    console.log('Aborted.');
    process.exit(0);
  }
}

function runWrangler(cmd, input, cwd) {
  execSync(cmd, {
    input: input + '\n',
    stdio: ['pipe', 'inherit', 'inherit'],
    ...(cwd && { cwd }),
  });
}

function buildCommands(env, secretsMap, values, only) {
  const { environments, secrets } = secretsMap;
  const envConfig = environments[env];
  const keys = only || Object.keys(secrets);
  const commands = [];

  for (const key of keys) {
    const entry = secrets[key];
    if (!entry) {
      console.error(`Secret "${key}" not found in secrets-map.json`);
      process.exit(1);
    }

    const value = values[key];
    if (value === undefined) {
      console.error(`Secret "${key}" is missing from .env.cloudflare [${env}]`);
      process.exit(1);
    }
    if (value === '') {
      console.error(`Secret "${key}" in .env.cloudflare [${env}] is empty`);
      process.exit(1);
    }

    if (entry.targets.includes('workers')) {
      commands.push({
        secret: key,
        target: 'workers',
        value,
        cwd: resolve(root, 'apps/api'),
        cmd: `pnpm exec wrangler secret put ${key} --env ${envConfig.workers}`,
      });
    }
  }

  return commands;
}

const flags = parseArgs();
const secretsMap = JSON.parse(readFileSync(resolve(__dirname, 'secrets-map.json'), 'utf8'));
const values = parseEnvCloudflare(flags.env);

if (!flags.dryRun) {
  preCheck();
}

if (flags.env === 'production' && !flags.dryRun && !flags.yes) {
  confirmProduction();
}

const commands = buildCommands(flags.env, secretsMap, values, flags.only);

if (flags.dryRun) {
  console.log(`\n[DRY RUN] Would execute ${commands.length} command(s) for ${flags.env}:\n`);
  for (const { secret, target, cmd } of commands) {
    console.log(`# ${secret} → ${target}`);
    console.log(`  ${cmd}\n`);
  }
} else {
  let done = 0;
  for (const { secret, target, value, cwd, cmd } of commands) {
    console.log(`\n# ${secret} → ${target}`);
    try {
      runWrangler(cmd, value, cwd);
      done++;
    } catch {
      console.error(`Failed: ${secret} → ${target}`);
      process.exit(1);
    }
  }
  console.log(`\nDone. ${done} secret(s) synced for ${flags.env}.`);
}
