import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProviderLogo } from '@/components/cliproxy/provider-logo';
import type { AuthStatus } from '@/lib/api-client';
import {
  CLIPROXY_PROVIDERS,
  getProviderDescription,
  getProviderDisplayName,
  type CLIProxyProvider,
} from '@/lib/provider-config';
import { cn } from '@/lib/utils';
import { CheckCircle2, Link2, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CliproxyBridgeCreatePanelProps {
  selectedProvider: CLIProxyProvider;
  authStatuses?: AuthStatus[];
  onProviderSelect: (provider: CLIProxyProvider) => void;
}

export function CliproxyBridgeCreatePanel({
  selectedProvider,
  authStatuses,
  onProviderSelect,
}: CliproxyBridgeCreatePanelProps) {
  const statusMap = new Map((authStatuses || []).map((status) => [status.provider, status]));
  const selectedStatus = statusMap.get(selectedProvider);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">CLIProxy Provider</p>
          <p className="text-xs text-muted-foreground">
            Pick the provider already configured in CLIProxy. CCS will create a routed API Profile
            without asking you to copy the proxy URL or internal auth token.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {CLIPROXY_PROVIDERS.map((provider) => {
            const status = statusMap.get(provider);
            return (
              <button
                key={provider}
                type="button"
                onClick={() => onProviderSelect(provider)}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  selectedProvider === provider
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/15'
                    : 'border-border hover:border-primary/35 hover:bg-accent/15'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <ProviderLogo provider={provider} size="md" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{getProviderDisplayName(provider)}</span>
                      {status?.authenticated ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : status?.accounts?.length ? (
                        <Badge variant="secondary">{status.accounts.length} account(s)</Badge>
                      ) : (
                        <Badge variant="outline">Configured in CLIProxy</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getProviderDescription(provider)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Link2 className="h-4 w-4 text-primary" />
          Routed profile summary
        </div>
        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          <p>
            Provider route:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5">/api/provider/{selectedProvider}</code>
          </p>
          <p>CCS resolves the active CLIProxy target automatically for local and remote setups.</p>
          <p>
            {selectedStatus?.authenticated
              ? 'CCS OAuth account detected for this provider.'
              : 'No CCS OAuth account is required here if you already configured provider API keys in CLIProxy Control Panel.'}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link to={`/cliproxy?provider=${selectedProvider}`}>
              <Settings2 className="mr-1 h-4 w-4" />
              Open CLIProxy
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/cliproxy/control-panel">Open Control Panel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
