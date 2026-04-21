/**
 * Unit tests for Droid config manager
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  upsertCcsModel,
  removeCcsModel,
  listCcsModels,
  pruneOrphanedModels,
} from '../../../src/targets/droid-config-manager';

describe('droid-config-manager', () => {
  let tmpDir: string;
  let originalCcsHome: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-droid-test-'));
    originalCcsHome = process.env.CCS_HOME;
    process.env.CCS_HOME = tmpDir;
  });

  afterEach(() => {
    if (originalCcsHome !== undefined) {
      process.env.CCS_HOME = originalCcsHome;
    } else {
      delete process.env.CCS_HOME;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('upsertCcsModel', () => {
    it('should return a selector reference for the managed model', async () => {
      const ref = await upsertCcsModel('gemini', {
        model: 'claude-opus-4-6',
        displayName: 'SCC gemini',
        baseUrl: 'http://localhost:8317',
        apiKey: 'dummy-key',
        provider: 'anthropic',
      });

      expect(ref.profile).toBe('gemini');
      expect(ref.selectorAlias).toBe('SCC-gemini-0');
      expect(ref.selector).toBe('custom:SCC-gemini-0');
      expect(ref.index).toBe(0);

      const settingsPath = path.join(tmpDir, '.factory', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(settings.model).toBe('custom:SCC-gemini-0');
    });

    it('should create settings.json with customModels', async () => {
      await upsertCcsModel('gemini', {
        model: 'claude-opus-4-6',
        displayName: 'SCC gemini',
        baseUrl: 'http://localhost:8317',
        apiKey: 'dummy-key',
        provider: 'anthropic',
      });

      const settingsPath = path.join(tmpDir, '.factory', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(settings.customModels).toHaveLength(1);
      expect(settings.customModels[0].displayName).toBe('SCC gemini');
      expect(settings.customModels[0].baseUrl).toBe('http://localhost:8317');
      expect(settings.model).toBe('custom:SCC-gemini-0');
    });

    it('should update existing entry on second upsert', async () => {
      await upsertCcsModel('gemini', {
        model: 'claude-opus-4-6',
        displayName: 'SCC gemini',
        baseUrl: 'http://localhost:8317',
        apiKey: 'key-1',
        provider: 'anthropic',
      });

      await upsertCcsModel('gemini', {
        model: 'claude-opus-4-6',
        displayName: 'SCC gemini',
        baseUrl: 'http://localhost:8318',
        apiKey: 'key-2',
        provider: 'anthropic',
      });

      const settingsPath = path.join(tmpDir, '.factory', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(settings.customModels).toHaveLength(1);
      expect(settings.customModels[0].apiKey).toBe('key-2');
      expect(settings.customModels[0].baseUrl).toBe('http://localhost:8318');
    });

    it('should persist generic provider reasoning_effort from override', async () => {
      await upsertCcsModel('glm', {
        model: 'glm-4.7',
        displayName: 'SCC glm',
        baseUrl: 'https://api.z.ai/api/coding/paas/v4',
        apiKey: 'glm-key',
        provider: 'generic-chat-completion-api',
        reasoningOverride: 'high',
      });

      const settingsPath = path.join(tmpDir, '.factory', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(settings.customModels[0].extraArgs?.reasoning_effort).toBe('high');
      expect(settings.customModels[0].extraArgs?.reasoning).toBeUndefined();
      expect(settings.customModels[0].extraArgs?.thinking).toBeUndefined();
    });

    it('should persist openai provider reasoning.effort from --effort alias override', async () => {
      await upsertCcsModel('codex', {
        model: 'gpt-5.2',
        displayName: 'SCC codex',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'openai-key',
        provider: 'openai',
        reasoningOverride: 'xhigh',
      });

      const settingsPath = path.join(tmpDir, '.factory', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(settings.customModels[0].extraArgs?.reasoning?.effort).toBe('xhigh');
      expect(settings.customModels[0].extraArgs?.reasoning_effort).toBeUndefined();
    });

    it('should persist anthropic thinking budget from numeric override', async () => {
      await upsertCcsModel('agy', {
        model: 'claude-opus-4-5-thinking',
        displayName: 'SCC agy',
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'anthropic-key',
        provider: 'anthropic',
        reasoningOverride: 40960,
      });

      const settingsPath = path.join(tmpDir, '.factory', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(settings.customModels[0].extraArgs?.thinking?.type).toBe('enabled');
      expect(settings.customModels[0].extraArgs?.thinking?.budget_tokens).toBe(40960);
    });

    it('should clear prior reasoning config when override disables thinking', async () => {
      await upsertCcsModel('glm', {
        model: 'glm-4.7',
        displayName: 'SCC glm',
        baseUrl: 'https://api.z.ai/api/coding/paas/v4',
        apiKey: 'glm-key',
        provider: 'generic-chat-completion-api',
        reasoningOverride: 'high',
      });

      await upsertCcsModel('glm', {
        model: 'glm-4.7',
        displayName: 'SCC glm',
        baseUrl: 'https://api.z.ai/api/coding/paas/v4',
        apiKey: 'glm-key',
        provider: 'generic-chat-completion-api',
        reasoningOverride: 'off',
      });

      const settingsPath = path.join(tmpDir, '.factory', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(settings.customModels[0].extraArgs).toBeUndefined();
    });

    it('should preserve user entries', async () => {
      // Create existing settings with user's own custom model
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: [
            {
              model: 'gpt-4o',
              displayName: 'My GPT',
              baseUrl: 'https://api.openai.com',
              apiKey: 'sk-xxx',
              provider: 'openai',
            },
          ],
        })
      );

      await upsertCcsModel('gemini', {
        model: 'claude-opus-4-6',
        displayName: 'SCC gemini',
        baseUrl: 'http://localhost:8317',
        apiKey: 'dummy',
        provider: 'anthropic',
      });

      const settings = JSON.parse(fs.readFileSync(path.join(factoryDir, 'settings.json'), 'utf8'));
      expect(settings.customModels).toHaveLength(2);
      expect(settings.customModels[0].displayName).toBe('My GPT');
      expect(settings.customModels[1].displayName).toBe('SCC gemini');
    });

    it('should preserve user entries with unknown provider strings', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: [
            {
              model: 'user-model',
              displayName: 'My Custom Provider',
              baseUrl: 'https://example.invalid',
              apiKey: 'user-key',
              provider: 'custom-provider',
            },
          ],
        })
      );

      await upsertCcsModel('gemini', {
        model: 'claude-opus-4-6',
        displayName: 'SCC gemini',
        baseUrl: 'http://localhost:8317',
        apiKey: 'dummy',
        provider: 'anthropic',
      });

      const settings = JSON.parse(fs.readFileSync(path.join(factoryDir, 'settings.json'), 'utf8'));
      expect(settings.customModels).toHaveLength(2);
      expect(settings.customModels[0].provider).toBe('custom-provider');
      expect(settings.customModels[1].displayName).toBe('SCC gemini');
    });

    it('should write with restricted permissions', async () => {
      await upsertCcsModel('test', {
        model: 'test-model',
        displayName: 'SCC test',
        baseUrl: 'http://localhost:8317',
        apiKey: 'secret',
        provider: 'anthropic',
      });

      const settingsPath = path.join(tmpDir, '.factory', 'settings.json');
      const stat = fs.statSync(settingsPath);
      // eslint-disable-next-line no-bitwise
      const otherPerms = stat.mode & 0o077;
      expect(otherPerms).toBe(0);
    });

    it('should reject symlinked temp file path', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({ customModels: [] })
      );
      fs.symlinkSync('/tmp', path.join(factoryDir, 'settings.json.tmp'));

      await expect(
        upsertCcsModel('gemini', {
          model: 'claude-opus-4-6',
          displayName: 'SCC gemini',
          baseUrl: 'http://localhost:8317',
          apiKey: 'dummy-key',
          provider: 'anthropic',
        })
      ).rejects.toThrow(/settings\.json\.tmp is a symlink/);
    });

    it('should update legacy ccs- alias entry on upsert', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: [
            {
              model: 'claude-opus-4-6',
              displayName: 'scc-gemini',
              baseUrl: 'http://localhost:8317',
              apiKey: 'old-key',
              provider: 'anthropic',
            },
          ],
        })
      );

      await upsertCcsModel('gemini', {
        model: 'claude-opus-4-6',
        displayName: 'SCC gemini',
        baseUrl: 'http://localhost:8318',
        apiKey: 'new-key',
        provider: 'anthropic',
      });

      const settings = JSON.parse(fs.readFileSync(path.join(factoryDir, 'settings.json'), 'utf8'));
      expect(settings.customModels).toHaveLength(1);
      expect(settings.customModels[0].displayName).toBe('SCC gemini');
      expect(settings.customModels[0].apiKey).toBe('new-key');
      expect(settings.customModels[0].baseUrl).toBe('http://localhost:8318');
    });

    it('should reject symlinked settings file on write', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });

      const realSettings = path.join(factoryDir, 'real-settings.json');
      fs.writeFileSync(realSettings, JSON.stringify({ customModels: [] }));
      fs.symlinkSync(realSettings, path.join(factoryDir, 'settings.json'));

      await expect(
        upsertCcsModel('gemini', {
          model: 'claude-opus-4-6',
          displayName: 'SCC gemini',
          baseUrl: 'http://localhost:8317',
          apiKey: 'dummy-key',
          provider: 'anthropic',
        })
      ).rejects.toThrow(/settings\.json is a symlink/);
    });
  });

  describe('removeCcsModel', () => {
    it('should remove a SCC entry', async () => {
      await upsertCcsModel('gemini', {
        model: 'claude-opus-4-6',
        displayName: 'SCC gemini',
        baseUrl: 'http://localhost:8317',
        apiKey: 'dummy',
        provider: 'anthropic',
      });

      await removeCcsModel('gemini');

      const settingsPath = path.join(tmpDir, '.factory', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(settings.customModels).toHaveLength(0);
    });

    it('should not remove user entries', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: [
            {
              model: 'gpt-4o',
              displayName: 'My GPT',
              baseUrl: 'x',
              apiKey: 'y',
              provider: 'openai',
            },
            {
              model: 'opus',
              displayName: 'SCC gemini',
              baseUrl: 'x',
              apiKey: 'y',
              provider: 'anthropic',
            },
          ],
        })
      );

      await removeCcsModel('gemini');

      const settings = JSON.parse(fs.readFileSync(path.join(factoryDir, 'settings.json'), 'utf8'));
      expect(settings.customModels).toHaveLength(1);
      expect(settings.customModels[0].displayName).toBe('My GPT');
    });

    it('should remove legacy ccs- alias entries', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: [
            {
              model: 'opus',
              displayName: 'scc-gemini',
              baseUrl: 'x',
              apiKey: 'y',
              provider: 'anthropic',
            },
            {
              model: 'gpt-4o',
              displayName: 'My GPT',
              baseUrl: 'x',
              apiKey: 'y',
              provider: 'openai',
            },
          ],
        })
      );

      await removeCcsModel('gemini');

      const settings = JSON.parse(fs.readFileSync(path.join(factoryDir, 'settings.json'), 'utf8'));
      expect(settings.customModels).toHaveLength(1);
      expect(settings.customModels[0].displayName).toBe('My GPT');
    });
  });

  describe('listCcsModels', () => {
    it('should list only SCC entries', async () => {
      await upsertCcsModel('gemini', {
        model: 'opus',
        displayName: 'SCC gemini',
        baseUrl: 'http://localhost:8317',
        apiKey: 'dummy',
        provider: 'anthropic',
      });

      await upsertCcsModel('codex', {
        model: 'sonnet',
        displayName: 'SCC codex',
        baseUrl: 'http://localhost:8317',
        apiKey: 'dummy',
        provider: 'anthropic',
      });

      const models = await listCcsModels();
      expect(models.size).toBe(2);
      expect(models.has('gemini')).toBe(true);
      expect(models.has('codex')).toBe(true);
    });

    it('should return empty map when no settings file', async () => {
      const models = await listCcsModels();
      expect(models.size).toBe(0);
    });

    it('should normalize legacy object-map customModels', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: {
            gemini: {
              model: 'opus',
              displayName: 'SCC gemini',
              baseUrl: 'http://localhost:8317',
              apiKey: 'dummy',
              provider: 'anthropic',
            },
            invalid: {
              model: 'x',
              baseUrl: 'x',
            },
          },
        })
      );

      const models = await listCcsModels();
      expect(models.size).toBe(1);
      expect(models.has('gemini')).toBe(true);
    });

    it('should ignore malformed customModels entries', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: [
            null,
            123,
            'bad',
            { displayName: 'SCC ok', model: 'x', baseUrl: 'x', apiKey: 'y', provider: 'anthropic' },
          ],
        })
      );

      const models = await listCcsModels();
      expect(models.size).toBe(1);
      expect(models.has('ok')).toBe(true);
    });

    it('should reject symlinked settings file on read', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      const target = path.join(factoryDir, 'real-settings.json');
      fs.writeFileSync(target, JSON.stringify({ customModels: [] }));
      fs.symlinkSync(target, path.join(factoryDir, 'settings.json'));

      await expect(listCcsModels()).rejects.toThrow(/settings\.json is a symlink/);
    });

    it('should include legacy ccs- alias entries', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: [
            {
              model: 'opus',
              displayName: 'scc-gemini',
              baseUrl: 'http://localhost:8317',
              apiKey: 'dummy',
              provider: 'anthropic',
            },
          ],
        })
      );

      const models = await listCcsModels();
      expect(models.size).toBe(1);
      expect(models.has('gemini')).toBe(true);
    });

    it('should ignore malformed managed display names', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: [
            { model: 'x', displayName: 'SCC ', baseUrl: 'x', apiKey: 'y', provider: 'anthropic' },
            { model: 'x', displayName: 'scc-', baseUrl: 'x', apiKey: 'y', provider: 'anthropic' },
            { model: 'x', displayName: 'SCC ok', baseUrl: 'x', apiKey: 'y', provider: 'anthropic' },
          ],
        })
      );

      const models = await listCcsModels();
      expect(models.size).toBe(1);
      expect(models.has('ok')).toBe(true);
    });

    it('should recover from corrupted JSON by backing up and returning empty models', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      const settingsPath = path.join(factoryDir, 'settings.json');

      fs.writeFileSync(settingsPath, '{"customModels":[', 'utf8');

      const models = await listCcsModels();
      expect(models.size).toBe(0);
      expect(fs.existsSync(`${settingsPath}.bak`)).toBe(true);
    });
  });

  describe('pruneOrphanedModels', () => {
    it('should remove orphaned SCC entries', async () => {
      await upsertCcsModel('gemini', {
        model: 'opus',
        displayName: 'SCC gemini',
        baseUrl: 'x',
        apiKey: 'y',
        provider: 'anthropic',
      });
      await upsertCcsModel('codex', {
        model: 'sonnet',
        displayName: 'SCC codex',
        baseUrl: 'x',
        apiKey: 'y',
        provider: 'anthropic',
      });

      // Only gemini is active — codex should be pruned
      const removed = await pruneOrphanedModels(['gemini']);
      expect(removed).toBe(1);

      const models = await listCcsModels();
      expect(models.size).toBe(1);
      expect(models.has('gemini')).toBe(true);
    });

    it('should preserve user entries during prune', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: [
            {
              model: 'gpt-4o',
              displayName: 'My GPT',
              baseUrl: 'x',
              apiKey: 'y',
              provider: 'openai',
            },
            {
              model: 'opus',
              displayName: 'SCC old-profile',
              baseUrl: 'x',
              apiKey: 'y',
              provider: 'anthropic',
            },
          ],
        })
      );

      const removed = await pruneOrphanedModels([]);
      expect(removed).toBe(1);

      const settings = JSON.parse(fs.readFileSync(path.join(factoryDir, 'settings.json'), 'utf8'));
      expect(settings.customModels).toHaveLength(1);
      expect(settings.customModels[0].displayName).toBe('My GPT');
    });

    it('should prune orphaned legacy ccs- alias entries', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: [
            {
              model: 'opus',
              displayName: 'scc-gemini',
              baseUrl: 'x',
              apiKey: 'y',
              provider: 'anthropic',
            },
            {
              model: 'sonnet',
              displayName: 'scc-codex',
              baseUrl: 'x',
              apiKey: 'y',
              provider: 'anthropic',
            },
          ],
        })
      );

      const removed = await pruneOrphanedModels(['gemini']);
      expect(removed).toBe(1);

      const models = await listCcsModels();
      expect(models.size).toBe(1);
      expect(models.has('gemini')).toBe(true);
    });

    it('should prune malformed managed entries while preserving user models', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: [
            { model: 'x', displayName: 'SCC ', baseUrl: 'x', apiKey: 'y', provider: 'anthropic' },
            { model: 'x', displayName: 'scc-', baseUrl: 'x', apiKey: 'y', provider: 'anthropic' },
            {
              model: 'gpt-4o',
              displayName: 'My GPT',
              baseUrl: 'x',
              apiKey: 'y',
              provider: 'openai',
            },
          ],
        })
      );

      const removed = await pruneOrphanedModels([]);
      expect(removed).toBe(2);

      const settings = JSON.parse(fs.readFileSync(path.join(factoryDir, 'settings.json'), 'utf8'));
      expect(settings.customModels).toHaveLength(1);
      expect(settings.customModels[0].displayName).toBe('My GPT');
    });

    it('should reject invalid active profile names', async () => {
      await expect(pruneOrphanedModels(['bad profile'])).rejects.toThrow(/Invalid profile name/);
    });

    it('should use active profile snapshot taken at call time', async () => {
      const factoryDir = path.join(tmpDir, '.factory');
      fs.mkdirSync(factoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(factoryDir, 'settings.json'),
        JSON.stringify({
          customModels: [
            {
              model: 'opus',
              displayName: 'SCC gemini',
              baseUrl: 'x',
              apiKey: 'y',
              provider: 'anthropic',
            },
            {
              model: 'sonnet',
              displayName: 'SCC codex',
              baseUrl: 'x',
              apiKey: 'y',
              provider: 'anthropic',
            },
          ],
        })
      );

      const activeProfiles = ['gemini'];
      const prunePromise = pruneOrphanedModels(activeProfiles);
      activeProfiles.push('codex'); // Mutation after call should not affect in-flight prune decision.

      const removed = await prunePromise;
      expect(removed).toBe(1);

      const models = await listCcsModels();
      expect(models.size).toBe(1);
      expect(models.has('gemini')).toBe(true);
      expect(models.has('codex')).toBe(false);
    });
  });

  describe('concurrent writes', () => {
    it('should handle concurrent upserts without data loss', async () => {
      const profiles = Array.from({ length: 10 }, (_, i) => `profile-${i}`);

      await Promise.all(
        profiles.map((p) =>
          upsertCcsModel(p, {
            model: 'test-model',
            displayName: `SCC ${p}`,
            baseUrl: 'http://localhost:8317',
            apiKey: 'key',
            provider: 'anthropic',
          })
        )
      );

      const models = await listCcsModels();
      expect(models.size).toBe(10);

      for (const p of profiles) {
        expect(models.has(p)).toBe(true);
      }
    }, 15000);
  });
});
