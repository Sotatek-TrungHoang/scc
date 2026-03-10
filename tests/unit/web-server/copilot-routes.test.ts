import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import express from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Server } from 'http';

let server: Server;
let baseUrl = '';
let tempDir = '';
let originalCcsHome: string | undefined;

let setGlobalConfigDir: (dir: string | undefined) => void;
let getCcsDir: () => string;
let loadOrCreateUnifiedConfig: () => {
  copilot?: {
    enabled?: boolean;
    auto_start?: boolean;
    port?: number;
    account_type?: 'individual' | 'business' | 'enterprise';
    rate_limit?: number | null;
    wait_on_limit?: boolean;
    model?: string;
    opus_model?: string;
    sonnet_model?: string;
    haiku_model?: string;
  };
};
let saveUnifiedConfig: (config: {
  copilot?: {
    enabled?: boolean;
    auto_start?: boolean;
    port?: number;
    account_type?: 'individual' | 'business' | 'enterprise';
    rate_limit?: number | null;
    wait_on_limit?: boolean;
    model?: string;
    opus_model?: string;
    sonnet_model?: string;
    haiku_model?: string;
  };
}) => void;

function seedCopilotConfig(
  overrides: {
    enabled?: boolean;
    auto_start?: boolean;
    port?: number;
    account_type?: 'individual' | 'business' | 'enterprise';
    rate_limit?: number | null;
    wait_on_limit?: boolean;
    model?: string;
    opus_model?: string;
    sonnet_model?: string;
    haiku_model?: string;
  } = {}
): void {
  const config = loadOrCreateUnifiedConfig();
  config.copilot = {
    enabled: overrides.enabled ?? true,
    auto_start: overrides.auto_start ?? false,
    port: overrides.port ?? 4141,
    account_type: overrides.account_type ?? 'individual',
    rate_limit: overrides.rate_limit ?? null,
    wait_on_limit: overrides.wait_on_limit ?? true,
    model: overrides.model ?? 'gpt-4.1',
    opus_model: overrides.opus_model,
    sonnet_model: overrides.sonnet_model,
    haiku_model: overrides.haiku_model,
  };
  saveUnifiedConfig(config);
}

function getCopilotSettingsPath(): string {
  return path.join(getCcsDir(), 'copilot.settings.json');
}

function writeCopilotSettings(settings: Record<string, unknown>): void {
  fs.writeFileSync(getCopilotSettingsPath(), JSON.stringify(settings, null, 2) + '\n');
}

beforeAll(async () => {
  originalCcsHome = process.env.CCS_HOME;
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-copilot-routes-test-'));
  process.env.CCS_HOME = tempDir;

  const configManager = await import('../../../src/utils/config-manager');
  setGlobalConfigDir = configManager.setGlobalConfigDir;
  getCcsDir = configManager.getCcsDir;
  setGlobalConfigDir(undefined);

  const unifiedConfig = await import('../../../src/config/unified-config-loader');
  loadOrCreateUnifiedConfig = unifiedConfig.loadOrCreateUnifiedConfig;
  saveUnifiedConfig = unifiedConfig.saveUnifiedConfig;

  const copilotRoutesModule = await import('../../../src/web-server/routes/copilot-routes');

  const app = express();
  app.use(express.json());
  app.use('/api/copilot', copilotRoutesModule.default);

  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.on('listening', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to resolve test server port');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  setGlobalConfigDir(undefined);
  const ccsDir = getCcsDir();
  if (!fs.existsSync(ccsDir)) {
    fs.mkdirSync(ccsDir, { recursive: true });
  }

  seedCopilotConfig();
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  if (originalCcsHome !== undefined) {
    process.env.CCS_HOME = originalCcsHome;
  } else {
    delete process.env.CCS_HOME;
  }
  setGlobalConfigDir(undefined);

  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('Copilot Routes', () => {
  it('GET /api/copilot/config normalizes and persists stale raptor-mini config', async () => {
    seedCopilotConfig({
      model: 'raptor-mini',
      opus_model: 'raptor-mini',
      sonnet_model: 'raptor-mini',
      haiku_model: 'raptor-mini',
    });

    const response = await fetch(`${baseUrl}/api/copilot/config`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      model: string;
      opus_model?: string;
      sonnet_model?: string;
      haiku_model?: string;
    };
    expect(body.model).toBe('gpt-4.1');
    expect(body.opus_model).toBeUndefined();
    expect(body.sonnet_model).toBeUndefined();
    expect(body.haiku_model).toBeUndefined();

    const persisted = loadOrCreateUnifiedConfig().copilot;
    expect(persisted?.model).toBe('gpt-4.1');
    expect(persisted?.opus_model).toBeUndefined();
    expect(persisted?.sonnet_model).toBeUndefined();
    expect(persisted?.haiku_model).toBeUndefined();
  });

  it('PUT /api/copilot/config normalizes stale raptor-mini payloads before save', async () => {
    const response = await fetch(`${baseUrl}/api/copilot/config`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'raptor-mini',
        opus_model: 'raptor-mini',
        sonnet_model: 'raptor-mini',
        haiku_model: 'raptor-mini',
      }),
    });
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      success: boolean;
      copilot: {
        model: string;
        opus_model?: string;
        sonnet_model?: string;
        haiku_model?: string;
      };
    };
    expect(body.success).toBe(true);
    expect(body.copilot.model).toBe('gpt-4.1');
    expect(body.copilot.opus_model).toBe('gpt-4.1');
    expect(body.copilot.sonnet_model).toBe('gpt-4.1');
    expect(body.copilot.haiku_model).toBe('gpt-4.1');

    const persisted = loadOrCreateUnifiedConfig().copilot;
    expect(persisted?.model).toBe('gpt-4.1');
    expect(persisted?.opus_model).toBeUndefined();
    expect(persisted?.sonnet_model).toBeUndefined();
    expect(persisted?.haiku_model).toBeUndefined();
  });

  it('GET /api/copilot/settings/raw normalizes and persists stale raw settings', async () => {
    seedCopilotConfig({ model: 'raptor-mini' });
    writeCopilotSettings({
      env: {
        ANTHROPIC_BASE_URL: 'http://127.0.0.1:4141',
        ANTHROPIC_AUTH_TOKEN: 'copilot-managed',
        ANTHROPIC_MODEL: 'raptor-mini',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'raptor-mini',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'raptor-mini',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'raptor-mini',
      },
    });

    const response = await fetch(`${baseUrl}/api/copilot/settings/raw`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      settings: {
        env: Record<string, string>;
      };
      exists: boolean;
    };
    expect(body.exists).toBe(true);
    expect(body.settings.env.ANTHROPIC_MODEL).toBe('gpt-4.1');
    expect(body.settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('gpt-4.1');
    expect(body.settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('gpt-4.1');
    expect(body.settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('gpt-4.1');

    const persistedSettings = JSON.parse(fs.readFileSync(getCopilotSettingsPath(), 'utf-8')) as {
      env: Record<string, string>;
    };
    expect(persistedSettings.env.ANTHROPIC_MODEL).toBe('gpt-4.1');
    expect(persistedSettings.env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('gpt-4.1');
    expect(loadOrCreateUnifiedConfig().copilot?.model).toBe('gpt-4.1');
  });

  it('PUT /api/copilot/settings/raw normalizes stale models before save and syncs unified config', async () => {
    const response = await fetch(`${baseUrl}/api/copilot/settings/raw`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        settings: {
          env: {
            ANTHROPIC_BASE_URL: 'http://127.0.0.1:4141',
            ANTHROPIC_AUTH_TOKEN: 'copilot-managed',
            ANTHROPIC_MODEL: 'raptor-mini',
            ANTHROPIC_DEFAULT_OPUS_MODEL: 'raptor-mini',
            ANTHROPIC_DEFAULT_SONNET_MODEL: 'raptor-mini',
            ANTHROPIC_DEFAULT_HAIKU_MODEL: 'raptor-mini',
          },
        },
      }),
    });
    expect(response.status).toBe(200);

    const persistedSettings = JSON.parse(fs.readFileSync(getCopilotSettingsPath(), 'utf-8')) as {
      env: Record<string, string>;
    };
    expect(persistedSettings.env.ANTHROPIC_MODEL).toBe('gpt-4.1');
    expect(persistedSettings.env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('gpt-4.1');
    expect(persistedSettings.env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('gpt-4.1');
    expect(persistedSettings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('gpt-4.1');

    const persistedConfig = loadOrCreateUnifiedConfig().copilot;
    expect(persistedConfig?.model).toBe('gpt-4.1');
    expect(persistedConfig?.opus_model).toBeUndefined();
    expect(persistedConfig?.sonnet_model).toBeUndefined();
    expect(persistedConfig?.haiku_model).toBeUndefined();
  });

  it('GET /api/copilot/models reports normalized current model for stale config', async () => {
    seedCopilotConfig({ model: 'raptor-mini' });

    const response = await fetch(`${baseUrl}/api/copilot/models`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      current: string;
      models: Array<{ id: string; isCurrent?: boolean }>;
    };

    expect(body.current).toBe('gpt-4.1');
    expect(body.models.some((model) => model.id === 'gpt-4.1' && model.isCurrent)).toBe(true);
    expect(loadOrCreateUnifiedConfig().copilot?.model).toBe('gpt-4.1');
  });
});
