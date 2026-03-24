import { spawnSync } from 'child_process';
import type { DiscordChannelsConfig } from '../config/unified-config-types';
import type { TargetType } from '../targets/target-adapter';
import type { ProfileType } from '../types/profile';

export const DISCORD_CHANNEL_PLUGIN_SPEC = 'plugin:discord@claude-plugins-official';

export interface DiscordChannelsLaunchPlan {
  args: string[];
  applied: boolean;
  appliedPermissionBypass: boolean;
  skipMessage?: string;
}

interface DiscordChannelsLaunchInput {
  args: string[];
  config: DiscordChannelsConfig;
  target: TargetType;
  profileType: ProfileType;
  bunAvailable: boolean;
  tokenConfigured: boolean;
}

export function isBunAvailable(): boolean {
  const result = spawnSync('bun', ['--version'], { stdio: 'ignore' });
  return result.status === 0;
}

export function isDiscordChannelsSessionSupported(
  target: TargetType,
  profileType: ProfileType
): boolean {
  return target === 'claude' && (profileType === 'default' || profileType === 'account');
}

export function hasExplicitChannelsFlag(args: string[]): boolean {
  return args.some((arg) => arg === '--channels' || arg.startsWith('--channels='));
}

export function hasExplicitPermissionOverride(args: string[]): boolean {
  return args.some(
    (arg) =>
      arg === '--dangerously-skip-permissions' ||
      arg === '--permission-mode' ||
      arg.startsWith('--permission-mode=')
  );
}

export function resolveDiscordChannelsSyncConfigDir(targetConfigDir?: string): string | undefined {
  return targetConfigDir ?? process.env.CLAUDE_CONFIG_DIR;
}

export function resolveDiscordChannelsLaunchPlan(
  input: DiscordChannelsLaunchInput
): DiscordChannelsLaunchPlan {
  const { args, config, target, profileType, bunAvailable, tokenConfigured } = input;

  if (!config.enabled) {
    return { args, applied: false, appliedPermissionBypass: false };
  }

  if (!isDiscordChannelsSessionSupported(target, profileType)) {
    return {
      args,
      applied: false,
      appliedPermissionBypass: false,
      skipMessage:
        'Discord Channels auto-enable only applies to native Claude default/account sessions.',
    };
  }

  if (hasExplicitChannelsFlag(args)) {
    return { args, applied: false, appliedPermissionBypass: false };
  }

  if (!bunAvailable) {
    return {
      args,
      applied: false,
      appliedPermissionBypass: false,
      skipMessage: 'Discord Channels auto-enable skipped because Bun is not installed.',
    };
  }

  if (!tokenConfigured) {
    return {
      args,
      applied: false,
      appliedPermissionBypass: false,
      skipMessage:
        'Discord Channels auto-enable skipped because DISCORD_BOT_TOKEN is not configured.',
    };
  }

  const nextArgs = [...args, '--channels', DISCORD_CHANNEL_PLUGIN_SPEC];
  const canApplyPermissionBypass = config.unattended && !hasExplicitPermissionOverride(args);

  if (canApplyPermissionBypass) {
    nextArgs.push('--dangerously-skip-permissions');
  }

  return {
    args: nextArgs,
    applied: true,
    appliedPermissionBypass: canApplyPermissionBypass,
  };
}
