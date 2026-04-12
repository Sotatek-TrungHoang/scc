import { describe, expect, it } from 'bun:test';
import {
  detectPromptInjectionMode,
  buildInlineSteeringArg,
  buildFileSteeringArg,
  buildSteeringArg,
  PROMPT_FLAG_INLINE,
  PROMPT_FLAG_FILE,
} from '../../../src/utils/prompt-injection-strategy';

describe('detectPromptInjectionMode', () => {
  it('returns inline when no prompt flags present', () => {
    expect(detectPromptInjectionMode(['-p', 'hello'])).toBe('inline');
  });

  it('returns inline when only --append-system-prompt is present', () => {
    expect(detectPromptInjectionMode(['--append-system-prompt', 'test'])).toBe('inline');
  });

  it('returns inline when --append-system-prompt equals form is present', () => {
    expect(detectPromptInjectionMode(['--append-system-prompt=test'])).toBe('inline');
  });

  it('returns file when --append-system-prompt-file is present', () => {
    expect(detectPromptInjectionMode(['--append-system-prompt-file', '/tmp/p.txt'])).toBe('file');
  });

  it('returns file when --append-system-prompt-file equals form is present', () => {
    expect(detectPromptInjectionMode(['--append-system-prompt-file=/tmp/p.txt'])).toBe('file');
  });

  it('returns file even when --append-system-prompt is also present', () => {
    expect(
      detectPromptInjectionMode([
        '--append-system-prompt',
        'inline-text',
        '--append-system-prompt-file',
        '/tmp/p.txt',
      ])
    ).toBe('file');
  });
});

describe('buildInlineSteeringArg', () => {
  it('returns inline flag and prompt text', () => {
    expect(buildInlineSteeringArg({promptContent: 'hello world'})).toEqual(['--append-system-prompt', 'hello world']);
  });
});

describe('buildFileSteeringArg', () => {
  it('returns file flag and writes temp file', () => {
    const result = buildFileSteeringArg({promptFileName: 'ccs-test-prompt.txt', promptContent: 'hello world' });
    expect(result[0]).toBe('--append-system-prompt-file');
    expect(result[1]).toContain('ccs-test-prompt.txt');
  });
});

describe('buildSteeringArg', () => {
  it('delegates to inline in inline mode', () => {
    expect(buildSteeringArg({
      args: [PROMPT_FLAG_INLINE],
      promptName: 'ignored.txt',
      promptContent: 'hello',
    })).toEqual([
      '--append-system-prompt',
      'hello',
    ]);
  });

  it('delegates to file in file mode', () => {
    const result = buildSteeringArg({
      args: [PROMPT_FLAG_FILE],
      promptName: 'ccs-test',
      promptContent: 'hello',
    });
    expect(result[0]).toBe('--append-system-prompt-file');
    expect(result[1]).toContain('ccs-test.txt');
  });
});
