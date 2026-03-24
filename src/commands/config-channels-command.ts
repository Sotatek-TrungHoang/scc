import { initUI, header, ok, info, warn, fail, subheader, color, dim } from '../utils/ui';
import {
  getDiscordChannelsConfig,
  loadOrCreateUnifiedConfig,
  updateUnifiedConfig,
} from '../config/unified-config-loader';
import { DEFAULT_DISCORD_CHANNELS_CONFIG } from '../config/unified-config-types';
import {
  clearConfiguredDiscordBotTokenEverywhere,
  getDiscordChannelsEnvPath,
  hasConfiguredDiscordBotToken,
  setConfiguredDiscordBotToken,
} from '../channels/discord-channels-store';
import { DISCORD_CHANNEL_PLUGIN_SPEC, isBunAvailable } from '../channels/discord-channels-runtime';
import { extractOption, hasAnyFlag } from './arg-extractor';

interface ChannelsCommandOptions {
  enable: boolean;
  disable: boolean;
  unattended: boolean;
  noUnattended: boolean;
  clearToken: boolean;
  setToken?: string;
  setTokenMissing: boolean;
  help: boolean;
}

export function parseChannelsCommandArgs(args: string[]): ChannelsCommandOptions {
  const setToken = extractOption(args, ['--set-token']);

  return {
    enable: hasAnyFlag(args, ['--enable']),
    disable: hasAnyFlag(args, ['--disable']),
    unattended: hasAnyFlag(args, ['--unattended']),
    noUnattended: hasAnyFlag(args, ['--no-unattended']),
    clearToken: hasAnyFlag(args, ['--clear-token']),
    setToken: setToken.found ? setToken.value : undefined,
    setTokenMissing: setToken.found && setToken.missingValue,
    help: hasAnyFlag(args, ['--help', '-h']),
  };
}

function showHelp(): void {
  console.log('');
  console.log(header('ccs config channels'));
  console.log('');
  console.log(
    '  Configure Anthropic official Discord Channels auto-enable for native Claude sessions.'
  );
  console.log('');
  console.log(subheader('Usage:'));
  console.log(`  ${color('ccs config channels', 'command')} [options]`);
  console.log('');
  console.log(subheader('Options:'));
  console.log(`  ${color('--enable', 'command')}              Enable auto-adding Discord Channels`);
  console.log(
    `  ${color('--disable', 'command')}             Disable auto-adding Discord Channels`
  );
  console.log(
    `  ${color('--unattended', 'command')}         Also add --dangerously-skip-permissions`
  );
  console.log(`  ${color('--no-unattended', 'command')}      Disable unattended runtime flag`);
  console.log(`  ${color('--set-token <token>', 'command')}  Save DISCORD_BOT_TOKEN`);
  console.log(`  ${color('--clear-token', 'command')}        Remove saved DISCORD_BOT_TOKEN`);
  console.log(`  ${color('--help, -h', 'command')}           Show this help`);
  console.log('');
  console.log(subheader('Examples:'));
  console.log(
    `  $ ${color('ccs config channels', 'command')}                     ${dim('# Show status')}`
  );
  console.log(
    `  $ ${color('ccs config channels --enable', 'command')}            ${dim('# Auto-enable Discord Channels')}`
  );
  console.log(
    `  $ ${color('ccs config channels --unattended', 'command')}       ${dim('# Also skip permissions prompts')}`
  );
  console.log(
    `  $ ${color('ccs config channels --set-token xxxxxx', 'command')} ${dim('# Save bot token')}`
  );
  console.log('');
}

function showStatus(): void {
  const config = getDiscordChannelsConfig();
  const bunReady = isBunAvailable();
  const tokenConfigured = hasConfiguredDiscordBotToken();

  console.log('');
  console.log(header('Discord Channels Configuration'));
  console.log('');
  console.log(`  Status:       ${config.enabled ? ok('Enabled') : warn('Disabled')}`);
  console.log(`  Unattended:   ${config.unattended ? warn('Enabled') : info('Disabled')}`);
  console.log(`  Bun:          ${bunReady ? ok('Installed') : warn('Missing')}`);
  console.log(`  Token:        ${tokenConfigured ? ok('Configured') : warn('Not configured')}`);
  console.log(`  Plugin:       ${color(DISCORD_CHANNEL_PLUGIN_SPEC, 'command')}`);
  console.log('');
  console.log(subheader('Applies To:'));
  console.log(`  ${dim('Native Claude target only: default and account sessions.')}`);
  console.log(`  ${dim('Not applied to CLIProxy, API-key, Copilot, or Droid flows.')}`);
  console.log('');
  console.log(subheader('Files:'));
  console.log(`  Config: ${color('~/.ccs/config.yaml', 'path')}`);
  console.log(`  Token:  ${color(getDiscordChannelsEnvPath(), 'path')}`);
  console.log('');
  console.log(subheader('Manual Claude Setup:'));
  console.log(`  ${color('/plugin install discord@claude-plugins-official', 'command')}`);
  console.log(`  ${color('/discord:configure <DISCORD_BOT_TOKEN>', 'command')}`);
  console.log(`  ${color('/discord:access pair <code>', 'command')}`);
  console.log(`  ${color('/discord:access policy allowlist', 'command')}`);
  console.log('');
}

export async function handleConfigChannelsCommand(args: string[]): Promise<void> {
  await initUI();

  const options = parseChannelsCommandArgs(args);
  if (options.help) {
    showHelp();
    return;
  }

  if (options.enable && options.disable) {
    console.error(fail('Cannot use --enable and --disable together'));
    process.exitCode = 1;
    return;
  }
  if (options.unattended && options.noUnattended) {
    console.error(fail('Cannot use --unattended and --no-unattended together'));
    process.exitCode = 1;
    return;
  }
  if (options.setToken !== undefined && options.clearToken) {
    console.error(fail('Cannot use --set-token and --clear-token together'));
    process.exitCode = 1;
    return;
  }
  if (options.setTokenMissing) {
    console.error(fail('--set-token requires a token value'));
    process.exitCode = 1;
    return;
  }

  const config = loadOrCreateUnifiedConfig();
  const nextConfig = {
    ...(config.discord_channels ?? DEFAULT_DISCORD_CHANNELS_CONFIG),
  };
  let updated = false;

  if (options.enable) {
    nextConfig.enabled = true;
    updated = true;
  }
  if (options.disable) {
    nextConfig.enabled = false;
    updated = true;
  }
  if (options.unattended) {
    nextConfig.unattended = true;
    updated = true;
  }
  if (options.noUnattended) {
    nextConfig.unattended = false;
    updated = true;
  }

  try {
    if (updated) {
      updateUnifiedConfig({ discord_channels: nextConfig });
      console.log(ok('Configuration updated'));
      console.log('');
    }

    if (options.setToken !== undefined) {
      setConfiguredDiscordBotToken(options.setToken);
      console.log(ok('Discord bot token saved'));
      console.log('');
    }

    if (options.clearToken) {
      clearConfiguredDiscordBotTokenEverywhere();
      console.log(ok('Discord bot token cleared'));
      console.log('');
    }
  } catch (error) {
    console.error(fail((error as Error).message));
    process.exitCode = 1;
    return;
  }

  showStatus();
}
