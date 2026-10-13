// ==============================================================================
// EDGEWFORCE - FULL OFFLINE DATA CACHE & SYNCHRONIZATION ENGINE
// IndexedDB Persistence via localForage with Idempotency Protection
// ==============================================================================

import localforage from 'localforage';

// 1. Configure Offline Queue Store
export const queueStore = localforage.createInstance({
  name: 'EdgeWForce',
  storeName: 'offline_action_queue',
  description: 'Transactional offline queue for orders, visits, and attendance'
});

// 2. Configure Offline Data Cache Store (for GET queries)
export const dataCacheStore = localforage.createInstance({
  name: 'EdgeWForce',
  storeName: 'api_data_cache',
  description: 'Cached GET responses for full offline operation'
});

/**
 * Generates an idempotency key for offline operations.
 */
export function generateIdempotencyKey(actionType = 'ACTION') {
  return `IDEMP-${actionType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Cache an API GET response locally for offline browsing.
 */
export async function cacheApiResponse(endpoint, data) {
  try {
    const key = `cache:${endpoint}`;
    await dataCacheStore.setItem(key, {
      data,
      cachedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to cache API response:', err);
  }
}

/**
 * Retrieve cached API GET response when offline.
 */
export async function getCachedApiResponse(endpoint) {
  try {
    const key = `cache:${endpoint}`;
    const item = await dataCacheStore.getItem(key);
    return item ? item.data : null;
  } catch {
    return null;
  }
}

/**
 * Enqueues an action to be executed when the network recovers.
 */
export async function enqueueOfflineAction(path, method = 'POST', payload = {}, actionName = 'Action') {
  const idempotencyKey = payload.idempotency_key || generateIdempotencyKey(actionName);
  const queueItem = {
    id: `queue:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`,
    path,
    method,
    payload: { ...payload, idempotency_key: idempotencyKey },
    actionName,
    createdAt: new Date().toISOString(),
    retries: 0
  };

  await queueStore.setItem(queueItem.id, queueItem);
  window.dispatchEvent(new CustomEvent('ewf_queue_updated'));
  return { queued: true, idempotency_key: idempotencyKey, action: queueItem };
}

/**
 * Retrieves all currently queued offline actions.
 */
export async function getQueuedActions() {
  const keys = await queueStore.keys();
  const queueKeys = keys.filter(k => k.startsWith('queue:'));
  const items = [];

  for (const k of queueKeys) {
    const item = await queueStore.getItem(k);
    if (item) items.push(item);
  }

  return items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export const getOfflineQueue = getQueuedActions;

/**
 * Flushes all pending actions when connection is restored.
 */
export async function flushOfflineQueue(apiInstance) {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const items = await getQueuedActions();
  if (items.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      if (item.method === 'POST') {
        await apiInstance.post(item.path, item.payload);
      } else if (item.method === 'PUT') {
        await apiInstance.put(item.path, item.payload);
      }
      await queueStore.removeItem(item.id);
      synced++;
    } catch (err) {
      failed++;
      item.retries = (item.retries || 0) + 1;
      item.lastError = err.message;
      if (item.retries > 5) {
        await queueStore.removeItem(item.id); // Drop broken item after 5 retries
      } else {
        await queueStore.setItem(item.id, item);
      }
    }
  }

  window.dispatchEvent(new CustomEvent('ewf_queue_updated', { detail: { synced, failed } }));
  return { synced, failed, remaining: items.length - synced };
}
