import { describe, expect, it } from 'bun:test';

import {
  isLoopbackHost,
  isWildcardHost,
  resolveDashboardUrls,
} from '../../../src/commands/config-dashboard-host';

describe('config dashboard host helpers', () => {
  it('detects loopback and wildcard hosts', () => {
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isWildcardHost('0.0.0.0')).toBe(true);
    expect(isWildcardHost('::')).toBe(true);
  });

  it('returns localhost browser URL and LAN URL for wildcard host', () => {
    const urls = resolveDashboardUrls('0.0.0.0', 3000, {
      en0: [
        {
          address: '192.168.1.25',
          netmask: '255.255.255.0',
          family: 'IPv4',
          mac: '00:00:00:00:00:00',
          internal: false,
          cidr: '192.168.1.25/24',
        },
      ],
    });

    expect(urls.browserUrl).toBe('http://localhost:3000');
    expect(urls.networkUrl).toBe('http://192.168.1.25:3000');
  });

  it('returns explicit host URL for loopback bindings', () => {
    const urls = resolveDashboardUrls('127.0.0.1', 3000, {});

    expect(urls.browserUrl).toBe('http://127.0.0.1:3000');
    expect(urls.networkUrl).toBeUndefined();
  });
});
