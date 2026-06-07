import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const tempDirectories: string[] = [];

function createTempDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-navigation-docker-update-'));
  tempDirectories.push(directory);
  return directory;
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function writeExecutable(filePath: string, content: string): void {
  writeFile(filePath, content);
  fs.chmodSync(filePath, 0o755);
}

function readLog(logPath: string): string {
  return fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
}

function hasPosixShell(): boolean {
  return spawnSync('sh', ['-c', 'true'], { stdio: 'ignore' }).status === 0;
}

afterEach(() => {
  while (tempDirectories.length > 0) {
    fs.rmSync(tempDirectories.pop() as string, { recursive: true, force: true });
  }
});

describe('Docker update deployment script', () => {
  it('keeps the runtime backup command limited to .env and data', () => {
    const deployScript = fs.readFileSync(path.join(repoRoot, 'deploy', 'git-deploy.sh'), 'utf8');

    expect(deployScript).toContain('tar -C "${DEPLOY_PATH}" -czf "${backup_path}" .env data');
    expect(deployScript).not.toMatch(/rm\s+-rf\s+["']?\$\{?DATA_DIR\}?/);
    expect(deployScript).not.toMatch(/rm\s+-rf\s+["']?\$\{?DEPLOY_PATH\}?\/data/);
  });

  it.skipIf(!hasPosixShell())('backs up and preserves existing .env and data during an update', () => {
    const deployPath = createTempDirectory();
    const fakeBin = path.join(createTempDirectory(), 'bin');
    const repoPath = path.join(deployPath, 'repo');
    const commandLog = path.join(createTempDirectory(), 'commands.log');
    const envContent = [
      'EDITOR_ACCESS_TOKEN=keep-existing-secret',
      'APP_PORT=7199',
      'NEXT_PUBLIC_SITE_URL=https://example.test',
      'COOKIE_SECURE=true',
      'R2_BACKUP_ENABLED=false',
      '',
    ].join('\n');
    const settingsContent = JSON.stringify({ siteName: 'Keep Runtime Data' }, null, 2);

    writeFile(path.join(deployPath, '.env'), envContent);
    writeFile(path.join(deployPath, 'data', 'settings', 'site.json'), settingsContent);
    fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });
    writeFile(
      path.join(repoPath, 'deploy', 'compose.prod.yaml'),
      [
        'services:',
        '  app:',
        '    image: ${DEPLOY_IMAGE:-ghcr.io/242282218/blog-nevigation:latest}',
        '    volumes:',
        '      - ./data:/var/lib/blog-navigation',
        '',
      ].join('\n')
    );

    writeExecutable(
      path.join(fakeBin, 'git'),
      [
        '#!/usr/bin/env sh',
        'printf "git %s\\n" "$*" >> "$COMMAND_LOG"',
        'if [ "$4" = "rev-parse" ]; then',
        '  printf "abcdef1\\n"',
        'fi',
        'exit 0',
        '',
      ].join('\n')
    );
    writeExecutable(
      path.join(fakeBin, 'docker'),
      [
        '#!/usr/bin/env sh',
        'printf "docker %s\\n" "$*" >> "$COMMAND_LOG"',
        'case "$*" in',
        '  *"compose version"*) exit 0 ;;',
        '  *"compose "*"pull app"*) exit 0 ;;',
        '  *"compose "*"ps -q app"*) exit 0 ;;',
        '  *"compose "*"up -d --force-recreate --remove-orphans app"*) exit 0 ;;',
        '  *"compose "*"port app 3000"*) printf "127.0.0.1:7199\\n"; exit 0 ;;',
        '  *"compose "*"ps"*) exit 0 ;;',
        '  *"inspect"*) exit 0 ;;',
        'esac',
        'exit 0',
        '',
      ].join('\n')
    );
    writeExecutable(
      path.join(fakeBin, 'tar'),
      [
        '#!/usr/bin/env sh',
        'printf "tar %s\\n" "$*" >> "$COMMAND_LOG"',
        'while [ "$#" -gt 0 ]; do',
        '  if [ "$1" = "-czf" ]; then',
        '    shift',
        '    mkdir -p "$(dirname "$1")"',
        '    printf "fake backup\\n" > "$1"',
        '    exit 0',
        '  fi',
        '  shift',
        'done',
        'exit 0',
        '',
      ].join('\n')
    );
    writeExecutable(
      path.join(fakeBin, 'curl'),
      [
        '#!/usr/bin/env sh',
        'printf "curl %s\\n" "$*" >> "$COMMAND_LOG"',
        'exit 0',
        '',
      ].join('\n')
    );

    const result = execFileSync('sh', [path.join(repoRoot, 'deploy', 'git-deploy.sh')], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
        COMMAND_LOG: commandLog,
        DEPLOY_PATH: deployPath,
        REPO_PATH: repoPath,
        DEPLOY_BRANCH: 'main',
        BACKUP_RETENTION: '0',
        HEALTHCHECK_TIMEOUT_SECONDS: '1',
      },
    });
    const commands = readLog(commandLog);

    expect(result).toContain('Creating runtime backup:');
    expect(result).toContain('Deployment succeeded');
    expect(fs.readFileSync(path.join(deployPath, '.env'), 'utf8')).toBe(envContent);
    expect(fs.readFileSync(path.join(deployPath, 'data', 'settings', 'site.json'), 'utf8')).toBe(settingsContent);
    expect(fs.readFileSync(path.join(deployPath, 'compose.prod.yaml'), 'utf8')).toContain(
      './data:/var/lib/blog-navigation'
    );
    expect(commands).toContain('tar -C');
    expect(commands).toContain('.env data');
    expect(commands).toContain('docker compose');
    expect(commands).not.toMatch(/rm\s+-rf\s+.*data/);
    expect(commands).not.toMatch(/docker\s+rm\s+-f/);
  });
});
