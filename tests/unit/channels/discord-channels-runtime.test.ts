import { describe, expect, it } from 'bun:test';
import {
  DISCORD_CHANNEL_PLUGIN_SPEC,
  hasExplicitChannelsFlag,
  hasExplicitPermissionOverride,
  isDiscordChannelsSessionSupported,
  resolveDiscordChannelsSyncConfigDir,
  resolveDiscordChannelsLaunchPlan,
} from '../../../src/channels/discord-channels-runtime';

describe('discord channels runtime planning', () => {
  it('supports only native Claude default/account sessions', () => {
    expect(isDiscordChannelsSessionSupported('claude', 'default')).toBe(true);
    expect(isDiscordChannelsSessionSupported('claude', 'account')).toBe(true);
    expect(isDiscordChannelsSessionSupported('claude', 'settings')).toBe(false);
    expect(isDiscordChannelsSessionSupported('droid', 'default')).toBe(false);
  });

  it('detects explicit channel and permission overrides', () => {
    expect(hasExplicitChannelsFlag(['--channels', 'plugin:other'])).toBe(true);
    expect(hasExplicitChannelsFlag([`--channels=${DISCORD_CHANNEL_PLUGIN_SPEC}`])).toBe(true);
    expect(hasExplicitChannelsFlag(['--permission-mode', 'acceptEdits'])).toBe(false);

    expect(hasExplicitPermissionOverride(['--dangerously-skip-permissions'])).toBe(true);
    expect(hasExplicitPermissionOverride(['--permission-mode', 'acceptEdits'])).toBe(true);
    expect(hasExplicitPermissionOverride(['--permission-mode=acceptEdits'])).toBe(true);
  });

  it('adds the official plugin flag and optional permission bypass when eligible', () => {
    const plan = resolveDiscordChannelsLaunchPlan({
      args: ['--verbose'],
      config: { enabled: true, unattended: true },
      target: 'claude',
      profileType: 'default',
      bunAvailable: true,
      tokenConfigured: true,
    });

    expect(plan.applied).toBe(true);
    expect(plan.args).toEqual([
      '--verbose',
      '--channels',
      DISCORD_CHANNEL_PLUGIN_SPEC,
      '--dangerously-skip-permissions',
    ]);
    expect(plan.appliedPermissionBypass).toBe(true);
  });

  it('keeps explicit permission choice and still adds the official channel when possible', () => {
    const plan = resolveDiscordChannelsLaunchPlan({
      args: ['--permission-mode', 'acceptEdits'],
      config: { enabled: true, unattended: true },
      target: 'claude',
      profileType: 'account',
      bunAvailable: true,
      tokenConfigured: true,
    });

    expect(plan.applied).toBe(true);
    expect(plan.args).toEqual([
      '--permission-mode',
      'acceptEdits',
      '--channels',
      DISCORD_CHANNEL_PLUGIN_SPEC,
    ]);
    expect(plan.appliedPermissionBypass).toBe(false);
  });

  it('skips when the session is incompatible or prerequisites are missing', () => {
    const incompatible = resolveDiscordChannelsLaunchPlan({
      args: [],
      config: { enabled: true, unattended: false },
      target: 'claude',
      profileType: 'settings',
      bunAvailable: true,
      tokenConfigured: true,
    });
    const missingBun = resolveDiscordChannelsLaunchPlan({
      args: [],
      config: { enabled: true, unattended: false },
      target: 'claude',
      profileType: 'default',
      bunAvailable: false,
      tokenConfigured: true,
    });
    const missingToken = resolveDiscordChannelsLaunchPlan({
      args: [],
      config: { enabled: true, unattended: false },
      target: 'claude',
      profileType: 'default',
      bunAvailable: true,
      tokenConfigured: false,
    });

    expect(incompatible.applied).toBe(false);
    expect(incompatible.skipMessage).toContain('native Claude default/account sessions');
    expect(missingBun.applied).toBe(false);
    expect(missingBun.skipMessage).toContain('Bun is not installed');
    expect(missingToken.applied).toBe(false);
    expect(missingToken.skipMessage).toContain('DISCORD_BOT_TOKEN is not configured');
  });

  it('leaves explicit channel arguments untouched', () => {
    const plan = resolveDiscordChannelsLaunchPlan({
      args: ['--channels', 'plugin:custom'],
      config: { enabled: true, unattended: true },
      target: 'claude',
      profileType: 'default',
      bunAvailable: true,
      tokenConfigured: true,
    });

    expect(plan.applied).toBe(false);
    expect(plan.args).toEqual(['--channels', 'plugin:custom']);
    expect(plan.skipMessage).toBeUndefined();
  });

  it('falls back to process.env.CLAUDE_CONFIG_DIR for sync when no explicit dir is passed', () => {
    const originalConfigDir = process.env.CLAUDE_CONFIG_DIR;
    process.env.CLAUDE_CONFIG_DIR = '/tmp/external-claude-config';

    try {
      expect(resolveDiscordChannelsSyncConfigDir()).toBe('/tmp/external-claude-config');
      expect(resolveDiscordChannelsSyncConfigDir('/tmp/explicit')).toBe('/tmp/explicit');
    } finally {
      if (originalConfigDir !== undefined) {
        process.env.CLAUDE_CONFIG_DIR = originalConfigDir;
      } else {
        delete process.env.CLAUDE_CONFIG_DIR;
      }
    }
  });
});
