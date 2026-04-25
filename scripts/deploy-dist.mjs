import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const envPath = resolve('.env.deploy.local');
const distPath = resolve('dist');

function parseEnvFile(path) {
  if (!existsSync(path)) {
    throw new Error(
      [
        `Missing deploy config: ${path}`,
        'Create it with: cp .env.deploy.example .env.deploy.local',
        'Then edit DEPLOY_SSH_HOST, DEPLOY_SSH_USER, DEPLOY_REMOTE_DIR and optional SSH settings.',
      ].join('\n'),
    );
  }

  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return env;
      }

      const equalsIndex = trimmed.indexOf('=');

      if (equalsIndex === -1) {
        return env;
      }

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
      return env;
    }, {});
}

function requireEnv(env, key) {
  const value = env[key];

  if (!value) {
    throw new Error(`Missing ${key} in .env.deploy.local`);
  }

  return value;
}

function expandHome(path) {
  if (path === '~') {
    return homedir();
  }

  if (path.startsWith('~/')) {
    return `${homedir()}${path.slice(1)}`;
  }

  return path;
}

function isUnsafeRemoteDir(remoteDir) {
  const normalized = remoteDir.trim().replace(/\/+$/, '');
  return !normalized || normalized === '/' || normalized === '.' || normalized === '~';
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}`);
  }
}

const env = parseEnvFile(envPath);
const host = requireEnv(env, 'DEPLOY_SSH_HOST');
const user = requireEnv(env, 'DEPLOY_SSH_USER');
const port = env.DEPLOY_SSH_PORT || '22';
const remoteDir = requireEnv(env, 'DEPLOY_REMOTE_DIR');
const sshKey = env.DEPLOY_SSH_KEY ? expandHome(env.DEPLOY_SSH_KEY) : '';

if (isUnsafeRemoteDir(remoteDir)) {
  throw new Error(`Unsafe DEPLOY_REMOTE_DIR: ${remoteDir}`);
}

if (!existsSync(distPath) || !statSync(distPath).isDirectory()) {
  throw new Error('Missing dist directory. Run npm run build first.');
}

const sshArgs = ['-p', port];

if (sshKey) {
  if (!existsSync(sshKey)) {
    throw new Error(`SSH key file does not exist: ${sshKey}`);
  }

  sshArgs.push('-i', sshKey);
}

const sshTarget = `${user}@${host}`;
const sshCommand = ['ssh', ...sshArgs].join(' ');

console.log(`Deploying ./dist/ to ${sshTarget}:${remoteDir}`);
run('ssh', [...sshArgs, sshTarget, `mkdir -p ${shellQuote(remoteDir)}`]);
run('rsync', [
  '-az',
  '--delete',
  '-e',
  sshCommand,
  `${distPath}/`,
  `${sshTarget}:${remoteDir}`,
]);
console.log('Deploy complete.');
