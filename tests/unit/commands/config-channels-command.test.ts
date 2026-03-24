import { describe, expect, it } from 'bun:test';
import { parseChannelsCommandArgs } from '../../../src/commands/config-channels-command';

describe('config channels command parser', () => {
  it('parses toggles and token input', () => {
    const result = parseChannelsCommandArgs([
      '--enable',
      '--unattended',
      '--set-token',
      'discord-secret',
    ]);

    expect(result.enable).toBe(true);
    expect(result.unattended).toBe(true);
    expect(result.setToken).toBe('discord-secret');
  });

  it('supports inline token assignment and clear flags', () => {
    const result = parseChannelsCommandArgs(['--disable', '--no-unattended', '--set-token=abc']);
    const clearResult = parseChannelsCommandArgs(['--clear-token']);

    expect(result.disable).toBe(true);
    expect(result.noUnattended).toBe(true);
    expect(result.setToken).toBe('abc');
    expect(clearResult.clearToken).toBe(true);
  });
});
