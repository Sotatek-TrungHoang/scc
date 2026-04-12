/**
 * Shared prompt injection strategy.
 *
 * Detects which prompt injection mode the user is using and ensures CCS
 * always uses the SAME mode so Claude CLI never receives mixed
 * `--append-system-prompt` and `--append-system-prompt-file` flags.
 *
 * Rules:
 *  - User passes `--append-system-prompt` → all CCS prompts use inline
 *  - User passes `--append-system-prompt-file` → all CCS prompts use file
 *  - Neither present → default to inline (`--append-system-prompt`)
 */

import * as fs from 'fs';
import * as path from 'path';
import { getCcsDir } from './config-manager';

export type PromptInjectionMode = 'inline' | 'file';

/** `--append-system-prompt` — inline prompt text */
export const PROMPT_FLAG_INLINE = '--append-system-prompt';
/** `--append-system-prompt-file` — prompt read from file */
export const PROMPT_FLAG_FILE = '--append-system-prompt-file';

/**
 * Detect which prompt injection mode to use based on user-provided args.
 *
 * - `--append-system-prompt-file` found (space or `=` form) → 'file'
 * - `--append-system-prompt` found (space or `=` form) → 'inline'
 * - Neither → 'inline' (default)
 */
export function detectPromptInjectionMode(args: string[]): PromptInjectionMode {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === PROMPT_FLAG_FILE || arg.startsWith(`${PROMPT_FLAG_FILE}=`)) {
      return 'file';
    }
  }

  return 'inline';
}

/**
 * Build a `--append-system-prompt <text>` arg pair.
 */
export function buildInlineSteeringArg(params: { promptContent: string }): string[] {
  return [PROMPT_FLAG_INLINE, params.promptContent];
}

/**
 * Build a `--append-system-prompt-file <path>` arg pair.
 * Writes the prompt to a temp file first.
 */
export function buildFileSteeringArg(params: {
  promptFileName: string;
  promptContent: string;
}): string[] {
  const ccsDir = getCcsDir();

  const promptsFolder = path.join(ccsDir, '/prompts');

  if (!fs.existsSync(promptsFolder)) {
    fs.mkdirSync(promptsFolder, { recursive: true });
  }

  const promptFile = path.join(promptsFolder, params.promptFileName);

  fs.writeFileSync(promptFile, params.promptContent);

  return [PROMPT_FLAG_FILE, promptFile];
}

/**
 * Build steering prompt args in the given mode.
 */
export function buildSteeringArg(params: {
  args: string[];
  promptName: string;
  promptContent: string;
}): string[] {
  const mode = detectPromptInjectionMode(params.args);

  if (mode === 'file') {
    return buildFileSteeringArg({
      promptFileName: `${params.promptName}.txt`,
      promptContent: params.promptContent,
    });
  }

  return buildInlineSteeringArg({ promptContent: params.promptContent });
}
