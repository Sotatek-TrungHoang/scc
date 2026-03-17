import { describe, expect, it } from 'bun:test';

import {
  DEFAULT_DASHBOARD_HOST,
  parseConfigCommandArgs,
} from '../../../src/commands/config-command-options';

describe('config command options parser', () => {
  it('defaults to wildcard host without explicit override', () => {
    const result = parseConfigCommandArgs([]);

    expect(result.help).toBe(false);
    expect(result.error).toBeUndefined();
    expect(result.options.host).toBe(DEFAULT_DASHBOARD_HOST);
    expect(result.options.hostProvided).toBe(false);
  });

  it('parses explicit host and port overrides', () => {
    const result = parseConfigCommandArgs(['--host', '0.0.0.0', '--port', '4100']);

    expect(result.error).toBeUndefined();
    expect(result.options.host).toBe('0.0.0.0');
    expect(result.options.hostProvided).toBe(true);
    expect(result.options.port).toBe(4100);
  });

  it('rejects missing host values', () => {
    const result = parseConfigCommandArgs(['--host']);

    expect(result.error).toBe('Invalid host value');
  });
});
