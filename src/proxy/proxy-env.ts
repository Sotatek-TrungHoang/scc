import type { OpenAICompatProfileConfig } from './profile-router';

export function buildOpenAICompatProxyEnv(
  profile: OpenAICompatProfileConfig,
  port: number,
  authToken: string,
  claudeConfigDir?: string
): Record<string, string> {
  return {
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
    ANTHROPIC_AUTH_TOKEN: authToken,
    ...(profile.model ? { ANTHROPIC_MODEL: profile.model } : {}),
    ...(profile.opusModel ? { ANTHROPIC_DEFAULT_OPUS_MODEL: profile.opusModel } : {}),
    ...(profile.sonnetModel ? { ANTHROPIC_DEFAULT_SONNET_MODEL: profile.sonnetModel } : {}),
    ...(profile.haikuModel
      ? {
          ANTHROPIC_DEFAULT_HAIKU_MODEL: profile.haikuModel,
          ANTHROPIC_SMALL_FAST_MODEL: profile.haikuModel,
        }
      : {}),
    ...(claudeConfigDir ? { CLAUDE_CONFIG_DIR: claudeConfigDir } : {}),
  };
}
