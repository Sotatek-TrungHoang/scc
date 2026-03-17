/**
 * Config Command Handler
 *
 * Launches web-based configuration dashboard.
 * Ensures CLIProxy service is running for dashboard features.
 * Usage: ccs config [--port PORT] [--host HOST] [--dev]
 */

import getPort from 'get-port';
import open from 'open';
import { startServer } from '../web-server';
import { setupGracefulShutdown } from '../web-server/shutdown';
import { ensureCliproxyService } from '../cliproxy/service-manager';
import { CLIPROXY_DEFAULT_PORT } from '../cliproxy/config-generator';
import { getDashboardAuthConfig } from '../config/unified-config-loader';
import { initUI, header, ok, info, warn, fail } from '../utils/ui';
import { isLoopbackHost, resolveDashboardUrls } from './config-dashboard-host';
import { parseConfigCommandArgs, showConfigCommandHelp } from './config-command-options';

/**
 * Handle config command
 */
export async function handleConfigCommand(args: string[]): Promise<void> {
  // Route subcommands before dashboard launch
  if (args[0] === 'auth') {
    const { handleConfigAuthCommand } = await import('./config-auth');
    await handleConfigAuthCommand(args.slice(1));
    return;
  }

  // Route image-analysis subcommand
  if (args[0] === 'image-analysis') {
    const { handleConfigImageAnalysisCommand } = await import('./config-image-analysis-command');
    await handleConfigImageAnalysisCommand(args.slice(1));
    return;
  }

  // Route thinking subcommand
  if (args[0] === 'thinking') {
    const { handleConfigThinkingCommand } = await import('./config-thinking-command');
    await handleConfigThinkingCommand(args.slice(1));
    return;
  }

  await initUI();

  const parsed = parseConfigCommandArgs(args);
  if (parsed.help) {
    showConfigCommandHelp();
    process.exit(0);
  }
  if (parsed.error) {
    console.error(fail(parsed.error));
    process.exit(1);
  }

  const options = parsed.options;
  const verbose = options.dev;

  console.log(header('CCS Config Dashboard'));
  console.log('');

  // Ensure CLIProxy service is running for dashboard features
  console.log(info('Starting CLIProxy service...'));
  const cliproxyResult = await ensureCliproxyService(CLIPROXY_DEFAULT_PORT, verbose);

  if (cliproxyResult.started) {
    if (cliproxyResult.alreadyRunning) {
      console.log(ok(`CLIProxy already running on port ${cliproxyResult.port}`));
      if (cliproxyResult.configRegenerated) {
        console.log(warn('Config updated - restart CLIProxy to apply changes'));
      }
    } else {
      console.log(ok(`CLIProxy started on port ${cliproxyResult.port}`));
    }
  } else {
    console.log(warn(`CLIProxy not available: ${cliproxyResult.error}`));
    console.log(info('Dashboard will work but Control Panel/Stats may be limited'));
  }
  console.log('');

  console.log(info('Starting dashboard server...'));

  // Find available port
  const port =
    options.port ??
    (await getPort({
      port: [3000, 3001, 3002, 8000, 8080],
    }));

  try {
    // Start server
    const { server, wss, cleanup } = await startServer({
      port,
      host: options.host,
      dev: options.dev,
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server, wss, cleanup);

    const urls = resolveDashboardUrls(options.host, port);

    if (options.dev) {
      console.log(ok(`Dev Server: ${urls.browserUrl}`));
      console.log('');
      console.log(info('HMR enabled - UI changes will hot-reload'));
    } else {
      console.log(ok(`Dashboard: ${urls.browserUrl}`));
    }

    if (!isLoopbackHost(urls.bindHost)) {
      console.log(info(`Bind host: ${urls.bindHost}`));
      if (urls.networkUrl) {
        console.log(info(`Network URL: ${urls.networkUrl}`));
      }
    }

    if (options.hostProvided && !isLoopbackHost(urls.bindHost)) {
      const authConfig = getDashboardAuthConfig();
      console.log(warn('Dashboard may be reachable from other devices on your network.'));
      if (!authConfig.enabled) {
        console.log(info('Protect it before sharing: ccs config auth setup'));
      }
      if (!urls.networkUrl) {
        console.log(info('Use your machine IP or hostname from the other device.'));
      }
    }
    console.log('');

    // Open browser
    try {
      await open(urls.browserUrl, { wait: false });
      console.log(info('Browser opened automatically'));
    } catch {
      console.log(info(`Open manually: ${urls.browserUrl}`));
    }

    console.log('');
    console.log(info('Press Ctrl+C to stop'));
  } catch (error) {
    console.error(fail(`Failed to start server: ${(error as Error).message}`));
    process.exit(1);
  }
}
