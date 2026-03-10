import { DEFAULT_COPILOT_CONFIG, type CopilotConfig } from '../config/unified-config-types';

const LEGACY_COPILOT_MODEL_FALLBACKS: Readonly<Record<string, string>> = Object.freeze({
  // copilot-api v0.7.0 no longer advertises this ID in /v1/models and rejects it at runtime.
  'raptor-mini': DEFAULT_COPILOT_CONFIG.model,
});

export const DEPRECATED_COPILOT_MODEL_IDS = Object.freeze(
  Object.keys(LEGACY_COPILOT_MODEL_FALLBACKS)
);

function trimModelId(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeCopilotModelId(
  model: string | null | undefined,
  fallbackModel: string = DEFAULT_COPILOT_CONFIG.model
): string {
  const normalizedFallback = trimModelId(fallbackModel) ?? DEFAULT_COPILOT_CONFIG.model;
  const trimmedModel = trimModelId(model) ?? normalizedFallback;
  return LEGACY_COPILOT_MODEL_FALLBACKS[trimmedModel.toLowerCase()] ?? trimmedModel;
}

export function normalizeOptionalCopilotModelId(
  model: string | null | undefined,
  fallbackModel: string
): string | undefined {
  const trimmedModel = trimModelId(model);
  return trimmedModel ? normalizeCopilotModelId(trimmedModel, fallbackModel) : undefined;
}

export function normalizeCopilotConfig(config: CopilotConfig): CopilotConfig {
  const model = normalizeCopilotModelId(config.model);
  return {
    ...config,
    model,
    opus_model: normalizeOptionalCopilotModelId(config.opus_model, model),
    sonnet_model: normalizeOptionalCopilotModelId(config.sonnet_model, model),
    haiku_model: normalizeOptionalCopilotModelId(config.haiku_model, model),
  };
}

export interface CopilotSettingsPayload {
  env?: Record<string, unknown>;
  [key: string]: unknown;
}

export function normalizeCopilotSettings(
  settings: CopilotSettingsPayload,
  fallbackConfig: CopilotConfig = DEFAULT_COPILOT_CONFIG
): CopilotSettingsPayload {
  const normalizedConfig = normalizeCopilotConfig(fallbackConfig);
  const rawEnv =
    settings.env && typeof settings.env === 'object' && !Array.isArray(settings.env)
      ? settings.env
      : {};

  const model = normalizeCopilotModelId(
    typeof rawEnv.ANTHROPIC_MODEL === 'string' ? rawEnv.ANTHROPIC_MODEL : normalizedConfig.model,
    normalizedConfig.model
  );
  const opusModel =
    normalizeOptionalCopilotModelId(
      typeof rawEnv.ANTHROPIC_DEFAULT_OPUS_MODEL === 'string'
        ? rawEnv.ANTHROPIC_DEFAULT_OPUS_MODEL
        : normalizedConfig.opus_model,
      model
    ) ?? model;
  const sonnetModel =
    normalizeOptionalCopilotModelId(
      typeof rawEnv.ANTHROPIC_DEFAULT_SONNET_MODEL === 'string'
        ? rawEnv.ANTHROPIC_DEFAULT_SONNET_MODEL
        : normalizedConfig.sonnet_model,
      model
    ) ?? model;
  const haikuModel =
    normalizeOptionalCopilotModelId(
      typeof rawEnv.ANTHROPIC_DEFAULT_HAIKU_MODEL === 'string'
        ? rawEnv.ANTHROPIC_DEFAULT_HAIKU_MODEL
        : normalizedConfig.haiku_model,
      model
    ) ?? model;

  return {
    ...settings,
    env: {
      ...rawEnv,
      ANTHROPIC_MODEL: model,
      ANTHROPIC_DEFAULT_OPUS_MODEL: opusModel,
      ANTHROPIC_DEFAULT_SONNET_MODEL: sonnetModel,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: haikuModel,
    },
  };
}
