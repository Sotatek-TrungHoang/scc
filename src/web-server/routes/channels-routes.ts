import { Router, type Request, type Response } from 'express';
import { getDiscordChannelsConfig, mutateUnifiedConfig } from '../../config/unified-config-loader';
import {
  clearConfiguredDiscordBotTokenEverywhere,
  getDiscordChannelsEnvPath,
  hasConfiguredDiscordBotToken,
  setConfiguredDiscordBotToken,
} from '../../channels/discord-channels-store';
import {
  DISCORD_CHANNEL_PLUGIN_SPEC,
  isBunAvailable,
} from '../../channels/discord-channels-runtime';
import { requireLocalAccessWhenAuthDisabled } from '../middleware/auth-middleware';

const router = Router();

router.use((req: Request, res: Response, next) => {
  if (
    requireLocalAccessWhenAuthDisabled(
      req,
      res,
      'Discord Channels settings require localhost access when dashboard auth is disabled.'
    )
  ) {
    next();
  }
});

router.get('/', (_req: Request, res: Response): void => {
  res.json({
    config: getDiscordChannelsConfig(),
    status: {
      bunInstalled: isBunAvailable(),
      tokenConfigured: hasConfiguredDiscordBotToken(),
      tokenPath: getDiscordChannelsEnvPath(),
      pluginSpec: DISCORD_CHANNEL_PLUGIN_SPEC,
      supportedProfiles: ['default', 'account'],
      manualSetupCommands: [
        '/plugin install discord@claude-plugins-official',
        '/discord:configure <DISCORD_BOT_TOKEN>',
        '/discord:access pair <code>',
        '/discord:access policy allowlist',
      ],
    },
  });
});

router.put('/', (req: Request, res: Response): void => {
  const { enabled, unattended } = req.body as { enabled?: unknown; unattended?: unknown };

  if (enabled !== undefined && typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled must be a boolean' });
    return;
  }
  if (unattended !== undefined && typeof unattended !== 'boolean') {
    res.status(400).json({ error: 'unattended must be a boolean' });
    return;
  }

  try {
    const updated = mutateUnifiedConfig((config) => {
      config.discord_channels = {
        enabled: enabled ?? config.discord_channels?.enabled ?? false,
        unattended: unattended ?? config.discord_channels?.unattended ?? false,
      };
    });

    res.json({ success: true, config: updated.discord_channels });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/discord/token', (req: Request, res: Response): void => {
  const { token } = req.body as { token?: unknown };

  if (typeof token !== 'string') {
    res.status(400).json({ error: 'token must be a string' });
    return;
  }

  try {
    const tokenPath = setConfiguredDiscordBotToken(token);
    res.json({ success: true, tokenConfigured: true, tokenPath });
  } catch (error) {
    const message = (error as Error).message;
    const statusCode = message.includes('cannot be empty') ? 400 : 500;
    res.status(statusCode).json({ error: message });
  }
});

router.delete('/discord/token', (_req: Request, res: Response): void => {
  try {
    const clearedPaths = clearConfiguredDiscordBotTokenEverywhere();
    res.json({
      success: true,
      tokenConfigured: false,
      tokenPath: getDiscordChannelsEnvPath(),
      clearedPaths,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
