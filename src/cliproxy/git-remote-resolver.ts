/**
 * Git Remote Resolver
 *
 * Runs `git remote -v` once at process startup and caches the result.
 * Used to inject X-Git-Remote header into upstream proxy requests
 * so the gateway (Bifrost) can identify the source repository.
 *
 * Gracefully returns empty string if git is unavailable or CWD is not a repo.
 */

import { execSync } from 'child_process';

let cachedOutput: string | null = null;

/**
 * Get the cached base64-encoded output of `git remote -v` for the current working directory.
 * Runs the command once on first call, caches for subsequent calls.
 * Returns empty string if git is not installed or CWD is not a git repo.
 */
export function getGitRemoteOutput(): string {
  if (cachedOutput !== null) {
    return cachedOutput;
  }

  const cwd = process.cwd();
  try {
    const raw = execSync('git remote -v', {
      cwd,
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    cachedOutput = raw ? Buffer.from(raw).toString('base64') : '';
    console.error(
      `[scc:git-remote] cwd=${cwd} remotes=${raw.split('\n').length} encoded=${cachedOutput.length}b`
    );
  } catch {
    cachedOutput = '';
    console.error(`[scc:git-remote] cwd=${cwd} no git repo or git unavailable`);
  }

  return cachedOutput;
}
