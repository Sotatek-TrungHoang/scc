/**
 * Feature flags for gradual rollout of new functionality.
 */

/**
 * Check if unified config (YAML) is enabled.
 * Set SCC_UNIFIED_CONFIG=1 (or CCS_UNIFIED_CONFIG=1) to enable.
 */
export function isUnifiedConfigEnabled(): boolean {
  return (process.env.SCC_UNIFIED_CONFIG || process.env.CCS_UNIFIED_CONFIG) === '1';
}

/**
 * Check if migration mode is active.
 * Set SCC_MIGRATE=1 (or CCS_MIGRATE=1) to trigger automatic migration.
 */
export function isMigrationEnabled(): boolean {
  return (process.env.SCC_MIGRATE || process.env.CCS_MIGRATE) === '1';
}

/**
 * Check if debug mode is enabled.
 * Set SCC_DEBUG=1 (or CCS_DEBUG=1) for verbose logging.
 */
export function isDebugEnabled(): boolean {
  return (process.env.SCC_DEBUG || process.env.CCS_DEBUG) === '1';
}
