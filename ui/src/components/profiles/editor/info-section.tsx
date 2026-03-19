/**
 * Profile Info Section
 * Displays profile information and usage commands
 */

import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { CopyButton } from '@/components/ui/copy-button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Info, Link2, TriangleAlert } from 'lucide-react';
import type { SettingsResponse } from './types';
import type { CliTarget } from '@/lib/api-client';

interface InfoSectionProps {
  profileName: string;
  target: CliTarget;
  data: SettingsResponse | undefined;
}

export function InfoSection({ profileName, target, data }: InfoSectionProps) {
  const { t } = useTranslation();
  const isDroidTarget = target === 'droid';

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Profile Information */}
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <Info className="w-4 h-4" />
            {t('profileEditor.profileInfo')}
          </h3>
          <div className="space-y-3 bg-card rounded-lg border p-4 shadow-sm">
            {data && (
              <>
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-center">
                  <span className="font-medium text-muted-foreground">
                    {t('profileEditor.profileName')}
                  </span>
                  <span className="font-mono">{data.profile}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-center">
                  <span className="font-medium text-muted-foreground">
                    {t('profileEditor.filePath')}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs break-all">
                      {data.path}
                    </code>
                    <CopyButton value={data.path} size="icon" className="h-5 w-5" />
                  </div>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-center">
                  <span className="font-medium text-muted-foreground">
                    {t('profileEditor.lastModified')}
                  </span>
                  <span className="text-xs">{new Date(data.mtime).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-center">
                  <span className="font-medium text-muted-foreground">
                    {t('profileEditor.defaultTarget')}
                  </span>
                  <span className="font-mono">{target}</span>
                </div>
                {data.cliproxyBridge && (
                  <>
                    <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-start">
                      <span className="font-medium text-muted-foreground">Source</span>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <Link2 className="h-3 w-3" />
                            CLIProxy {data.cliproxyBridge.providerDisplayName}
                          </Badge>
                          <Badge variant="outline" className="uppercase">
                            {data.cliproxyBridge.source}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This profile is routed through{' '}
                          <code className="bg-muted px-1 rounded text-[10px]">
                            {data.cliproxyBridge.routePath}
                          </code>
                          . Keys and account state stay managed in CLIProxy.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-start">
                      <span className="font-medium text-muted-foreground">Bridge Status</span>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge
                            variant="outline"
                            className={
                              data.cliproxyBridge.usesCurrentTarget
                                ? 'border-green-200 text-green-700 bg-green-50'
                                : 'border-amber-200 text-amber-700 bg-amber-50'
                            }
                          >
                            {data.cliproxyBridge.usesCurrentTarget ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : (
                              <TriangleAlert className="mr-1 h-3 w-3" />
                            )}
                            {data.cliproxyBridge.usesCurrentTarget
                              ? 'Proxy target is current'
                              : 'Proxy target changed'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              data.cliproxyBridge.usesCurrentAuthToken
                                ? 'border-green-200 text-green-700 bg-green-50'
                                : 'border-amber-200 text-amber-700 bg-amber-50'
                            }
                          >
                            {data.cliproxyBridge.usesCurrentAuthToken ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : (
                              <TriangleAlert className="mr-1 h-3 w-3" />
                            )}
                            {data.cliproxyBridge.usesCurrentAuthToken
                              ? 'Auth token matches current proxy'
                              : 'Auth token may need refresh'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Expected proxy URL:{' '}
                          <code className="bg-muted px-1 rounded text-[10px] break-all">
                            {data.cliproxyBridge.currentBaseUrl}
                          </code>
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Usage */}
        <div>
          <h3 className="text-sm font-medium mb-3">{t('profileEditor.quickUsage')}</h3>
          <div className="space-y-3 bg-card rounded-lg border p-4 shadow-sm">
            <div>
              <Label className="text-xs text-muted-foreground">
                {t('profileEditor.runWithProfile')}
              </Label>
              <div className="mt-1 flex gap-2">
                <code className="flex-1 px-2 py-1.5 bg-muted rounded text-xs font-mono truncate">
                  ccs {profileName} "prompt"
                </code>
                <CopyButton value={`ccs ${profileName} "prompt"`} size="icon" className="h-6 w-6" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {isDroidTarget
                  ? t('profileEditor.droidAliasExplicit')
                  : t('profileEditor.runOnDroid')}
              </Label>
              <div className="mt-1 flex gap-2">
                <code className="flex-1 px-2 py-1.5 bg-muted rounded text-xs font-mono truncate">
                  {isDroidTarget
                    ? `ccsd ${profileName} "prompt"`
                    : `ccs ${profileName} --target droid "prompt"`}
                </code>
                <CopyButton
                  value={
                    isDroidTarget
                      ? `ccsd ${profileName} "prompt"`
                      : `ccs ${profileName} --target droid "prompt"`
                  }
                  size="icon"
                  className="h-6 w-6"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {isDroidTarget
                  ? t('profileEditor.overrideToClaude')
                  : t('profileEditor.overrideToClaudeExplicit')}
              </Label>
              <div className="mt-1 flex gap-2">
                <code className="flex-1 px-2 py-1.5 bg-muted rounded text-xs font-mono truncate">
                  ccs {profileName} --target claude "prompt"
                </code>
                <CopyButton
                  value={`ccs ${profileName} --target claude "prompt"`}
                  size="icon"
                  className="h-6 w-6"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {t('profileEditor.setAsDefault')}
              </Label>
              <div className="mt-1 flex gap-2">
                <code className="flex-1 px-2 py-1.5 bg-muted rounded text-xs font-mono truncate">
                  ccs default {profileName}
                </code>
                <CopyButton value={`ccs default ${profileName}`} size="icon" className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
