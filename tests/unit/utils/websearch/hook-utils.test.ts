import { expect, test, describe } from 'bun:test';
import {
  isCcsWebSearchHook,
  deduplicateCcsHooks,
} from '../../../../src/utils/websearch/hook-utils';

describe('isCcsWebSearchHook', () => {
  test('Returns true for SCC hook with forward slashes (Unix path)', () => {
    const hook = {
      matcher: 'WebSearch',
      hooks: [
        {
          command: 'node /home/user/.ccs/hooks/websearch-transformer/index.js',
        },
      ],
    };
    expect(isCcsWebSearchHook(hook)).toBe(true);
  });

  test('Returns true for SCC hook with backslashes (Windows path)', () => {
    const hook = {
      matcher: 'WebSearch',
      hooks: [
        {
          command: 'node C:\\Users\\user\\.ccs\\hooks\\websearch-transformer\\index.js',
        },
      ],
    };
    expect(isCcsWebSearchHook(hook)).toBe(true);
  });

  test('Returns true for mixed path separators', () => {
    const hook = {
      matcher: 'WebSearch',
      hooks: [
        {
          command: 'node /home/user\\.ccs/hooks\\websearch-transformer/index.js',
        },
      ],
    };
    expect(isCcsWebSearchHook(hook)).toBe(true);
  });

  test('Returns true for path with double slashes (normalization)', () => {
    const hook = {
      matcher: 'WebSearch',
      hooks: [
        {
          command: 'node /home/user//.ccs//hooks/websearch-transformer/index.js',
        },
      ],
    };
    expect(isCcsWebSearchHook(hook)).toBe(true);
  });

  test('Returns false for non-WebSearch matcher', () => {
    const hook = {
      matcher: 'SomethingElse',
      hooks: [
        {
          command: 'node /home/user/.ccs/hooks/websearch-transformer/index.js',
        },
      ],
    };
    expect(isCcsWebSearchHook(hook)).toBe(false);
  });

  test('Returns false for WebSearch with non-SCC hook command', () => {
    const hook = {
      matcher: 'WebSearch',
      hooks: [
        {
          command: 'node /some/other/path/custom-hook.js',
        },
      ],
    };
    expect(isCcsWebSearchHook(hook)).toBe(false);
  });

  test('Returns false when hooks array is missing', () => {
    const hook = {
      matcher: 'WebSearch',
    };
    expect(isCcsWebSearchHook(hook)).toBe(false);
  });

  test('Returns false when hooks array is empty', () => {
    const hook = {
      matcher: 'WebSearch',
      hooks: [],
    };
    expect(isCcsWebSearchHook(hook)).toBe(false);
  });

  test('Returns false when command is missing', () => {
    const hook = {
      matcher: 'WebSearch',
      hooks: [{}],
    };
    expect(isCcsWebSearchHook(hook)).toBe(false);
  });

  test('Returns false when command is not a string', () => {
    const hook = {
      matcher: 'WebSearch',
      hooks: [
        {
          command: 123,
        },
      ],
    };
    expect(isCcsWebSearchHook(hook)).toBe(false);
  });
});

describe('deduplicateCcsHooks', () => {
  test('No-op when 0 SCC hooks (returns false)', () => {
    const settings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'SomeOtherMatcher',
            hooks: [{ command: 'other-command' }],
          },
        ],
      },
    };
    const result = deduplicateCcsHooks(settings);
    expect(result).toBe(false);
    expect(settings.hooks.PreToolUse).toHaveLength(1);
  });

  test('No-op when 1 SCC hook (returns false)', () => {
    const settings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'WebSearch',
            hooks: [
              {
                command: 'node /home/user/.ccs/hooks/websearch-transformer/index.js',
              },
            ],
          },
        ],
      },
    };
    const result = deduplicateCcsHooks(settings);
    expect(result).toBe(false);
    expect(settings.hooks.PreToolUse).toHaveLength(1);
  });

  test('Removes duplicates when 2+ SCC hooks (returns true, keeps first)', () => {
    const settings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'WebSearch',
            hooks: [
              {
                command: 'node /home/user/.ccs/hooks/websearch-transformer/index.js',
              },
            ],
          },
          {
            matcher: 'WebSearch',
            hooks: [
              {
                command: 'node C:\\Users\\user\\.ccs\\hooks\\websearch-transformer\\index.js',
              },
            ],
          },
          {
            matcher: 'WebSearch',
            hooks: [
              {
                command: 'node /another/path/.ccs/hooks/websearch-transformer/index.js',
              },
            ],
          },
        ],
      },
    };
    const result = deduplicateCcsHooks(settings);
    expect(result).toBe(true);
    expect(settings.hooks.PreToolUse).toHaveLength(1);
    expect(settings.hooks.PreToolUse[0]).toEqual({
      matcher: 'WebSearch',
      hooks: [
        {
          command: 'node /home/user/.ccs/hooks/websearch-transformer/index.js',
        },
      ],
    });
  });

  test('Preserves non-SCC hooks in array', () => {
    const nonCcsHook = {
      matcher: 'SomeOtherMatcher',
      hooks: [{ command: 'other-command' }],
    };
    const settings = {
      hooks: {
        PreToolUse: [
          nonCcsHook,
          {
            matcher: 'WebSearch',
            hooks: [
              {
                command: 'node /home/user/.ccs/hooks/websearch-transformer/index.js',
              },
            ],
          },
          {
            matcher: 'WebSearch',
            hooks: [
              {
                command: 'node C:\\Users\\user\\.ccs\\hooks\\websearch-transformer\\index.js',
              },
            ],
          },
        ],
      },
    };
    const result = deduplicateCcsHooks(settings);
    expect(result).toBe(true);
    expect(settings.hooks.PreToolUse).toHaveLength(2);
    expect(settings.hooks.PreToolUse[0]).toEqual(nonCcsHook);
  });

  test('Returns false when hooks is undefined', () => {
    const settings = {};
    const result = deduplicateCcsHooks(settings);
    expect(result).toBe(false);
  });

  test('Returns false when PreToolUse is undefined', () => {
    const settings = {
      hooks: {},
    };
    const result = deduplicateCcsHooks(settings);
    expect(result).toBe(false);
  });

  test('Handles multiple non-SCC hooks with duplicates', () => {
    const settings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'OtherMatcher1',
            hooks: [{ command: 'command1' }],
          },
          {
            matcher: 'WebSearch',
            hooks: [
              {
                command: 'node /path1/.ccs/hooks/websearch-transformer/index.js',
              },
            ],
          },
          {
            matcher: 'OtherMatcher2',
            hooks: [{ command: 'command2' }],
          },
          {
            matcher: 'WebSearch',
            hooks: [
              {
                command: 'node /path2/.ccs/hooks/websearch-transformer/index.js',
              },
            ],
          },
        ],
      },
    };
    const result = deduplicateCcsHooks(settings);
    expect(result).toBe(true);
    expect(settings.hooks.PreToolUse).toHaveLength(3);
    // First and third should be non-SCC hooks, second should be the first SCC hook
    expect(settings.hooks.PreToolUse[0].matcher).toBe('OtherMatcher1');
    expect(settings.hooks.PreToolUse[1].matcher).toBe('WebSearch');
    expect(settings.hooks.PreToolUse[2].matcher).toBe('OtherMatcher2');
  });

  test('Edge case: Empty PreToolUse array', () => {
    const settings = {
      hooks: {
        PreToolUse: [],
      },
    };
    const result = deduplicateCcsHooks(settings);
    expect(result).toBe(false);
    expect(settings.hooks.PreToolUse).toHaveLength(0);
  });

  test('Stress test: 15 duplicate SCC WebSearch hooks', () => {
    const ccsHook = {
      matcher: 'WebSearch',
      hooks: [
        {
          command: 'node /home/user/.ccs/hooks/websearch-transformer/index.js',
        },
      ],
    };
    const settings = {
      hooks: {
        PreToolUse: Array(15).fill(ccsHook),
      },
    };
    const result = deduplicateCcsHooks(settings);
    expect(result).toBe(true);
    expect(settings.hooks.PreToolUse).toHaveLength(1);
    expect(settings.hooks.PreToolUse[0]).toEqual(ccsHook);
  });

  test('Leaves PostToolUse and PreToolCall untouched', () => {
    const postToolUseHook1 = {
      matcher: 'CustomMatcher1',
      hooks: [{ command: 'custom-command-1' }],
    };
    const postToolUseHook2 = {
      matcher: 'CustomMatcher2',
      hooks: [{ command: 'custom-command-2' }],
    };
    const preToolCallHook = {
      matcher: 'CustomMatcher3',
      hooks: [{ command: 'custom-command-3' }],
    };
    const settings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'WebSearch',
            hooks: [
              {
                command: 'node /path1/.ccs/hooks/websearch-transformer/index.js',
              },
            ],
          },
          {
            matcher: 'WebSearch',
            hooks: [
              {
                command: 'node /path2/.ccs/hooks/websearch-transformer/index.js',
              },
            ],
          },
          {
            matcher: 'WebSearch',
            hooks: [
              {
                command: 'node /path3/.ccs/hooks/websearch-transformer/index.js',
              },
            ],
          },
        ],
        PostToolUse: [postToolUseHook1, postToolUseHook2],
        PreToolCall: [preToolCallHook],
      },
    };
    const result = deduplicateCcsHooks(settings);
    expect(result).toBe(true);
    // PreToolUse should be deduplicated to 1 hook
    expect(settings.hooks.PreToolUse).toHaveLength(1);
    expect(settings.hooks.PreToolUse[0].matcher).toBe('WebSearch');
    // PostToolUse should remain unchanged with 2 hooks
    expect(settings.hooks.PostToolUse).toHaveLength(2);
    expect(settings.hooks.PostToolUse[0]).toEqual(postToolUseHook1);
    expect(settings.hooks.PostToolUse[1]).toEqual(postToolUseHook2);
    // PreToolCall should remain unchanged with 1 hook
    expect(settings.hooks.PreToolCall).toHaveLength(1);
    expect(settings.hooks.PreToolCall[0]).toEqual(preToolCallHook);
  });
});
