import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useDiscordChannelsConfig } from '../hooks/use-discord-channels-config';
import { useRawConfig } from '../hooks';

export default function ChannelsSection() {
  const {
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
  } = useDiscordChannelsConfig();
  const { fetchRawConfig } = useRawConfig();
  const [tokenDraft, setTokenDraft] = useState('');

  useEffect(() => {
    void fetchConfig();
    void fetchRawConfig();
  }, [fetchConfig, fetchRawConfig]);

  const refreshAll = async () => {
    await Promise.all([fetchConfig(), fetchRawConfig()]);
  };

  const handleToggle = async (
    updates: Partial<typeof config>,
    successMessage: string
  ): Promise<void> => {
    await updateConfig(updates, successMessage);
    await fetchRawConfig();
  };

  const handleSaveToken = async (): Promise<void> => {
    await saveToken(tokenDraft);
    setTokenDraft('');
    await fetchRawConfig();
  };

  const handleClearToken = async (): Promise<void> => {
    await clearToken();
    setTokenDraft('');
    await fetchRawConfig();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`absolute left-5 right-5 top-20 z-10 transition-all duration-200 ease-out ${
          error || success
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        {error && (
          <Alert variant="destructive" className="py-2 shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-green-200 bg-green-50 text-green-700 shadow-lg dark:border-green-900/50 dark:bg-green-900/90 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Auto-enable Anthropic&apos;s official Discord Channels plugin for compatible Claude
              sessions. CCS stores only the booleans in <code>config.yaml</code>; the bot token
              stays in Claude&apos;s official channels env file.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Runtime</p>
              <p className="mt-1 font-medium">{status?.pluginSpec ?? 'Unknown plugin'}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Applies only to native Claude <code>default</code> and <code>account</code>{' '}
                sessions.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Bun</span>
                <span className={status?.bunInstalled ? 'text-green-600' : 'text-amber-600'}>
                  {status?.bunInstalled ? 'Installed' : 'Missing'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Bot token</span>
                <span className={status?.tokenConfigured ? 'text-green-600' : 'text-amber-600'}>
                  {status?.tokenConfigured ? 'Configured' : 'Not configured'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground break-all">{status?.tokenPath}</div>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-base font-medium">Enable Discord Channels on launch</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  When enabled, CCS appends the official Discord Channels plugin at runtime unless
                  you already passed your own <code>--channels</code> flag.
                </p>
              </div>
              <Switch
                checked={config.enabled}
                disabled={saving}
                onCheckedChange={(checked) =>
                  void handleToggle(
                    { enabled: checked },
                    checked
                      ? 'Discord Channels auto-enable enabled'
                      : 'Discord Channels auto-enable disabled'
                  )
                }
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg bg-muted/30 p-4">
              <div className="flex gap-3">
                <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <Label className="text-sm font-medium">
                    Also add <code>--dangerously-skip-permissions</code>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Opt-in only. CCS adds the bypass flag only when it is auto-enabling Discord
                    Channels and you did not already set a permission flag yourself.
                  </p>
                </div>
              </div>
              <Switch
                checked={config.unattended}
                disabled={saving}
                onCheckedChange={(checked) =>
                  void handleToggle(
                    { unattended: checked },
                    checked
                      ? 'Unattended Discord Channels enabled'
                      : 'Unattended Discord Channels disabled'
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <Label className="text-base font-medium">Discord bot token</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Save <code>DISCORD_BOT_TOKEN</code> into Claude&apos;s official Discord channel env
              file. The dashboard never reads the token value back after save.
            </p>
            <Input
              type="password"
              value={tokenDraft}
              onChange={(event) => setTokenDraft(event.target.value)}
              placeholder={
                status?.tokenConfigured
                  ? 'Configured. Enter a new token to replace it.'
                  : 'Paste DISCORD_BOT_TOKEN'
              }
              disabled={saving}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void handleSaveToken()}
                disabled={saving || !tokenDraft.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Token
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleClearToken()}
                disabled={saving || !status?.tokenConfigured}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Token
              </Button>
              <Button variant="outline" onClick={() => void refreshAll()} disabled={saving}>
                <RefreshCw className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              CCS does not persist a global Claude setting for channels. It only prepares the token
              file and injects runtime flags when the session is compatible and the prerequisites
              are present.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border p-4 space-y-3">
            <Label className="text-base font-medium">Claude-side setup</Label>
            <p className="text-sm text-muted-foreground">
              If the plugin is not ready yet, complete the official setup once inside Claude.
            </p>
            <div className="space-y-2">
              {(status?.manualSetupCommands ?? []).map((command) => (
                <div
                  key={command}
                  className="rounded-md bg-muted px-3 py-2 font-mono text-sm break-all"
                >
                  {command}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </>
  );
}
