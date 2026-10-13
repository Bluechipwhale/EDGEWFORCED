// ==============================================================================
// EDGEWFORCE - SYSTEM & SECURITY LOGGER
// ==============================================================================

export const logger = {
  info: (msg, meta = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error: (msg, error = null) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, error ? (error.stack || error) : '');
  },
  audit: (actor, action, entity, entityId, metadata = {}) => {
    console.log(`[AUDIT] [${new Date().toISOString()}] [${actor}] ${action} on ${entity}:${entityId}`, JSON.stringify(metadata));
  }
};
