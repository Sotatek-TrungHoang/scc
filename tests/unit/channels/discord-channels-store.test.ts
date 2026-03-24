import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  clearConfiguredDiscordBotTokenEverywhere,
  clearConfiguredDiscordBotToken,
  getDiscordChannelsEnvPath,
  hasConfiguredDiscordBotToken,
  readConfiguredDiscordBotToken,
  readDiscordBotTokenFromEnvContent,
  setConfiguredDiscordBotToken,
  syncDiscordChannelsEnvToConfigDir,
} from '../../../src/channels/discord-channels-store';

describe('discord channels token store', () => {
  let tempHome = '';
  let originalHome: string | undefined;
  let originalCcsHome: string | undefined;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-discord-channels-'));
    originalHome = process.env.HOME;
    originalCcsHome = process.env.CCS_HOME;
    process.env.HOME = tempHome;
    process.env.CCS_HOME = tempHome;
  });

  afterEach(() => {
    if (originalHome !== undefined) process.env.HOME = originalHome;
    else delete process.env.HOME;

    if (originalCcsHome !== undefined) process.env.CCS_HOME = originalCcsHome;
    else delete process.env.CCS_HOME;

    fs.rmSync(tempHome, { recursive: true, force: true });
  });

  it('writes and reads DISCORD_BOT_TOKEN from the canonical Claude channels env file', () => {
    const envPath = setConfiguredDiscordBotToken('discord-secret');

    expect(envPath).toBe(path.join(tempHome, '.claude', 'channels', 'discord', '.env'));
    expect(hasConfiguredDiscordBotToken()).toBe(true);
    expect(readConfiguredDiscordBotToken()).toBe('discord-secret');
    expect(readDiscordBotTokenFromEnvContent(fs.readFileSync(envPath, 'utf8'))).toBe(
      'discord-secret'
    );
  });

  it('removes only the token entry and deletes the file when nothing remains', () => {
    const envPath = getDiscordChannelsEnvPath();
    fs.mkdirSync(path.dirname(envPath), { recursive: true });
    fs.writeFileSync(envPath, '# comment\nDISCORD_BOT_TOKEN=secret\nOTHER_KEY=value\n', 'utf8');

    clearConfiguredDiscordBotToken();
    expect(fs.readFileSync(envPath, 'utf8')).toBe('# comment\nOTHER_KEY=value\n');

    clearConfiguredDiscordBotToken();
    fs.writeFileSync(envPath, 'DISCORD_BOT_TOKEN=secret\n', 'utf8');
    clearConfiguredDiscordBotToken();
    expect(fs.existsSync(envPath)).toBe(false);
  });

  it('syncs the canonical env file into an alternate CLAUDE_CONFIG_DIR for account sessions', () => {
    setConfiguredDiscordBotToken('discord-secret');

    const targetConfigDir = path.join(tempHome, '.ccs', 'instances', 'work');
    const targetPath = path.join(targetConfigDir, 'channels', 'discord', '.env');
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, '# keep\nOTHER_KEY=value\n', 'utf8');

    const result = syncDiscordChannelsEnvToConfigDir(targetConfigDir);

    expect(result.synced).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(fs.readFileSync(targetPath, 'utf8')).toBe(
      '# keep\nOTHER_KEY=value\n\nDISCORD_BOT_TOKEN=discord-secret\n'
    );
    expect(fs.statSync(targetPath).mode & 0o777).toBe(0o600);
  });

  it('clears previously synced copies across managed Claude config dirs', () => {
    setConfiguredDiscordBotToken('discord-secret');

    const instanceConfigDir = path.join(tempHome, '.ccs', 'instances', 'work');
    const instanceEnvPath = path.join(instanceConfigDir, 'channels', 'discord', '.env');

    syncDiscordChannelsEnvToConfigDir(instanceConfigDir);
    expect(fs.existsSync(instanceEnvPath)).toBe(true);

    const clearedPaths = clearConfiguredDiscordBotTokenEverywhere();

    expect(clearedPaths).toContain(getDiscordChannelsEnvPath());
    expect(clearedPaths).toContain(instanceEnvPath);
    expect(fs.existsSync(getDiscordChannelsEnvPath())).toBe(false);
    expect(fs.existsSync(instanceEnvPath)).toBe(false);
  });
});
