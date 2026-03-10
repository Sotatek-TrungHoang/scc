import { describe, expect, it } from 'bun:test';
import { DEFAULT_COPILOT_CONFIG } from '../../../src/config/unified-config-types';
import {
  DEPRECATED_COPILOT_MODEL_IDS,
  normalizeCopilotConfig,
  normalizeCopilotModelId,
  normalizeCopilotSettings,
} from '../../../src/copilot/copilot-model-normalizer';

describe('copilot-model-normalizer', () => {
  it('tracks raptor-mini as deprecated', () => {
    expect(DEPRECATED_COPILOT_MODEL_IDS).toContain('raptor-mini');
  });

  it('normalizes deprecated model IDs to the safe default', () => {
    expect(normalizeCopilotModelId('raptor-mini')).toBe(DEFAULT_COPILOT_CONFIG.model);
  });

  it('normalizes Copilot config tier mappings', () => {
    const normalized = normalizeCopilotConfig({
      ...DEFAULT_COPILOT_CONFIG,
      model: 'raptor-mini',
      opus_model: 'raptor-mini',
      sonnet_model: 'raptor-mini',
      haiku_model: 'raptor-mini',
    });

    expect(normalized.model).toBe('gpt-4.1');
    expect(normalized.opus_model).toBe('gpt-4.1');
    expect(normalized.sonnet_model).toBe('gpt-4.1');
    expect(normalized.haiku_model).toBe('gpt-4.1');
  });

  it('normalizes raw settings payloads without dropping unrelated env keys', () => {
    const normalized = normalizeCopilotSettings(
      {
        env: {
          ANTHROPIC_BASE_URL: 'http://127.0.0.1:4141',
          ANTHROPIC_MODEL: 'raptor-mini',
          ANTHROPIC_DEFAULT_OPUS_MODEL: 'raptor-mini',
          ANTHROPIC_DEFAULT_SONNET_MODEL: 'raptor-mini',
          ANTHROPIC_DEFAULT_HAIKU_MODEL: 'raptor-mini',
          EXTRA_FLAG: 'keep-me',
        },
      },
      {
        ...DEFAULT_COPILOT_CONFIG,
        model: 'raptor-mini',
      }
    );

    expect(normalized.env?.ANTHROPIC_MODEL).toBe('gpt-4.1');
    expect(normalized.env?.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('gpt-4.1');
    expect(normalized.env?.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('gpt-4.1');
    expect(normalized.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('gpt-4.1');
    expect(normalized.env?.EXTRA_FLAG).toBe('keep-me');
  });
});
