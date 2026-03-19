import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProviderLogo } from '@/components/cliproxy/provider-logo';
import { cn } from '@/lib/utils';
import type { CLIProxyProvider } from '@/lib/provider-config';
import { ArrowRight, Link2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ApiProfileBridgeCalloutProps {
  provider?: CLIProxyProvider;
  className?: string;
  compact?: boolean;
}

export function ApiProfileBridgeCallout({
  provider,
  className,
  compact = false,
}: ApiProfileBridgeCalloutProps) {
  const providerQuery = provider ? `&cliproxyProvider=${provider}` : '';

  return (
    <div
      className={cn('rounded-xl border bg-card/95 shadow-sm', compact ? 'p-3' : 'p-4', className)}
    >
      <div className={cn('flex gap-3', compact ? 'items-start' : 'items-center')}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          {provider ? (
            <ProviderLogo provider={provider} size="md" />
          ) : (
            <Link2 className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Use this provider in API Profiles</h3>
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              No manual token copy
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure keys, OAuth accounts, or models here, then create a routed API Profile in CCS.
            The profile will point at the provider route automatically.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to={`/providers?cliproxyBridge=1${providerQuery}`}>
                Create API Profile
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/providers">Open API Profiles</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
