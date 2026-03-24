import { useCallback, useState } from 'react';
import type { DiscordChannelsConfig, DiscordChannelsStatus } from '../types';

const DEFAULT_CONFIG: DiscordChannelsConfig = {
  enabled: false,
  unattended: false,
};

export function useDiscordChannelsConfig() {
  const [config, setConfig] = useState<DiscordChannelsConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<DiscordChannelsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const flashSuccess = useCallback((message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(null), 1500);
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/channels');
      if (!res.ok) {
        throw new Error('Failed to load Discord Channels settings');
      }

      const data = (await res.json()) as {
        config?: DiscordChannelsConfig;
        status?: DiscordChannelsStatus;
      };

      setConfig(data.config ?? DEFAULT_CONFIG);
      setStatus(data.status ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(
    async (updates: Partial<DiscordChannelsConfig>, successMessage = 'Settings saved') => {
      try {
        setSaving(true);
        setError(null);

        const res = await fetch('/api/channels', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error || 'Failed to save Discord Channels settings');
        }

        const data = (await res.json()) as { config?: DiscordChannelsConfig };
        setConfig(data.config ?? { ...config, ...updates });
        flashSuccess(successMessage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setSaving(false);
      }
    },
    [config, flashSuccess]
  );

  const saveToken = useCallback(
    async (token: string) => {
      try {
        setSaving(true);
        setError(null);

        const res = await fetch('/api/channels/discord/token', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error || 'Failed to save Discord bot token');
        }

        await fetchConfig();
        flashSuccess('Discord bot token saved');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setSaving(false);
      }
    },
    [fetchConfig, flashSuccess]
  );

  const clearToken = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch('/api/channels/discord/token', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Failed to clear Discord bot token');
      }

      await fetchConfig();
      flashSuccess('Discord bot token cleared');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, [fetchConfig, flashSuccess]);

  return {
    config,
    status,
    loading,
    saving,
    error,
    success,
    fetchConfig,
    updateConfig,
    saveToken,
    clearToken,
  };
}
