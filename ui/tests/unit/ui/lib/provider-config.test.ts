import { describe, expect, it } from 'vitest';

import {
  formatRequestedUpstreamModelRules,
  getRequestedModelId,
  parseRequestedUpstreamModelRules,
} from '@/lib/provider-config';

describe('provider model mapping helpers', () => {
  it('parses requested=upstream rules into stored upstream+alias pairs', () => {
    expect(
      parseRequestedUpstreamModelRules('claude-sonnet-4-5=gpt-4.1\nminimax/minimax-m2.7')
    ).toEqual([
      { name: 'gpt-4.1', alias: 'claude-sonnet-4-5' },
      { name: 'minimax/minimax-m2.7', alias: '' },
    ]);
  });

  it('formats stored model rules back into requested=upstream text', () => {
    expect(
      formatRequestedUpstreamModelRules([
        { name: 'gpt-4.1', alias: 'claude-sonnet-4-5' },
        { name: 'minimax/minimax-m2.7', alias: '' },
      ])
    ).toBe('claude-sonnet-4-5=gpt-4.1\nminimax/minimax-m2.7');
  });

  it('prefers the requested alias for generated settings previews', () => {
    expect(getRequestedModelId({ name: 'gpt-4.1', alias: 'claude-sonnet-4-5' })).toBe(
      'claude-sonnet-4-5'
    );
    expect(getRequestedModelId({ name: 'minimax/minimax-m2.7', alias: '' })).toBe(
      'minimax/minimax-m2.7'
    );
  });
});
