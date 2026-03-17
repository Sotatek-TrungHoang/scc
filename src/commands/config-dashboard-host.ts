import * as os from 'os';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const WILDCARD_HOSTS = new Set(['0.0.0.0', '::', '[::]']);

interface NetworkInterfaceCandidate {
  address: string;
  family: string | number;
  internal: boolean;
}

type NetworkInterfacesMap = Record<string, NetworkInterfaceCandidate[] | undefined>;

export interface DashboardUrls {
  bindHost: string;
  browserUrl: string;
  networkUrl?: string;
}

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.trim().toLowerCase());
}

export function isWildcardHost(host: string): boolean {
  return WILDCARD_HOSTS.has(host.trim().toLowerCase());
}

export function resolveDashboardUrls(
  host: string,
  port: number,
  networkInterfaces: NetworkInterfacesMap = os.networkInterfaces()
): DashboardUrls {
  const bindHost = host.trim();

  if (isWildcardHost(bindHost)) {
    return {
      bindHost,
      browserUrl: `http://localhost:${port}`,
      networkUrl: getFirstExternalIpv4Url(port, networkInterfaces),
    };
  }

  return {
    bindHost,
    browserUrl: `http://${formatHostForUrl(bindHost)}:${port}`,
  };
}

function getFirstExternalIpv4Url(
  port: number,
  networkInterfaces: NetworkInterfacesMap
): string | undefined {
  for (const interfaceName of Object.keys(networkInterfaces)) {
    const candidates = networkInterfaces[interfaceName];
    if (!candidates) {
      continue;
    }

    for (const candidate of candidates) {
      const family =
        typeof candidate.family === 'string' ? candidate.family : String(candidate.family);
      if (family === 'IPv4' && !candidate.internal) {
        return `http://${candidate.address}:${port}`;
      }
    }
  }

  return undefined;
}

function formatHostForUrl(host: string): string {
  if (host.includes(':') && !host.startsWith('[') && !host.endsWith(']')) {
    return `[${host}]`;
  }

  return host;
}
