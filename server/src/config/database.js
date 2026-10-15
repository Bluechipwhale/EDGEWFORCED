// ==============================================================================
// EDGEWFORCE - UNIFIED DATABASE DATA ACCESS LAYER
// Supports Supabase PostgreSQL and Transactional In-Memory / File Persistent Store
// ==============================================================================

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AsyncLocalStorage } from 'node:async_hooks';
import { fileURLToPath } from 'url';
import { initialState as initialSeed } from './initialState.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isTestMode = process.env.NODE_ENV === 'test' || Boolean(process.env.TEST_MODE) || Boolean(process.env.NODE_TEST_CONTEXT) || process.execArgv.includes('--test');
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const dataDir = process.env.EDGEWFORCE_DATA_DIR || (isTestMode ? path.join(os.tmpdir(), `edgewforce-test-${process.pid}`) : (isServerless ? path.join(os.tmpdir(), 'edgewforce-data') : path.resolve(__dirname, '../../data')));
const storePath = path.join(dataDir, 'store.json');
const transactionContext = new AsyncLocalStorage();
let transactionQueue = Promise.resolve();

try {
  fs.mkdirSync(dataDir, { recursive: true });
} catch {
  // Gracefully ignore filesystem errors in read-only serverless runtimes
}

export let supabase = null;
export let supabaseAdmin = null;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

if (!isTestMode && (process.env.NODE_ENV === 'production' || isServerless)) {
  if (!process.env.JWT_SECRET || (process.env.JWT_SECRET.length < 32 || /^(your_|replace|example|changeme)/i.test(process.env.JWT_SECRET))) throw new Error('Production requires JWT_SECRET of at least 32 characters.');
  if (!(supabaseUrl && serviceRoleKey) && !(process.env.DATA_BACKEND === 'local' && process.env.EDGEWFORCE_DATA_DIR && !isServerless)) throw new Error('Production requires Supabase URL and service role key, or an explicitly configured durable local data directory.');
}
// Dynamically initialize Supabase if credentials are provided and not in test runner
if (!isTestMode && supabaseUrl && (serviceRoleKey || anonKey)) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    if (anonKey || serviceRoleKey) {
      supabase = createClient(supabaseUrl, anonKey || serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
    if (serviceRoleKey) {
      supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      logger.info('Supabase Admin Client initialized with Service Role.');
    }
    logger.info('Connected to Supabase database.');
  } catch (err) {
    throw new Error(`Supabase initialization failed: ${err.message}`);
  }
} else {
  logger.info('Supabase credentials not set or in test mode; utilizing high-fidelity local transactional store with persistence.');
}



// Initialize or load local store
let store = JSON.parse(JSON.stringify(initialSeed));

function loadPersistedStore() {
  try {
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, 'utf8');
      const loaded = JSON.parse(data);
      store = { ...initialSeed, ...loaded };
      store.companies = loaded.companies?.length ? loaded.companies : initialSeed.companies;
      store.company_settings = loaded.company_settings?.length ? loaded.company_settings : initialSeed.company_settings;
      store.regions = loaded.regions?.length ? loaded.regions : initialSeed.regions;
      store.territories = loaded.territories?.length ? loaded.territories : initialSeed.territories;
      store.departments = loaded.departments?.length ? loaded.departments : initialSeed.departments;
      store.ranks = loaded.ranks?.length ? loaded.ranks : initialSeed.ranks;
      store.permissions = loaded.permissions?.length ? loaded.permissions : initialSeed.permissions;
    } else {
      savePersistedStoreSync();
    }
  } catch (err) {
    throw new Error(`Cannot load local store: ${err.message}`);
  }
}

function savePersistedStoreSync(force = false) {
  if (transactionContext.getStore() && !force) return;
  const temporary = storePath + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(temporary, storePath);
}
const savePersistedStore = savePersistedStoreSync;
if (!supabase) loadPersistedStore();

async function cloudResult(query) {
  const { data, error } = await fetchWithTimeout(query, 15000);
  if (error) throw new Error('Database operation failed: ' + error.message);
  return data;
}

// Helper to race promise against a timeout
function fetchWithTimeout(promise, ms = 450) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

// Canonical Table Name Mapper
function resolveCanonicalTable(table) {
  const map = {
    visits: 'field_visits',
    orders: 'sales',
    order_items: 'sale_items',
    alerts: 'idle_alerts'
  };
  return map[table] || table;
}

const cloud = supabaseAdmin || supabase;
function cloudTable(table) { return table === 'alerts' ? 'idle_alerts' : process.env.SUPABASE_SCHEMA_LAYOUT === 'canonical' ? resolveCanonicalTable(table) : table; }
export const db = {
  isCloud: Boolean(cloud),
  async rpc(name, args) { if (!cloud) throw new Error('Database RPC requires Supabase.'); return cloudResult(cloud.rpc(name, args)); },
  resetToSeed() {
    store = JSON.parse(JSON.stringify(initialSeed));
    savePersistedStore();
    return true;
  },

  async find(table, filter = {}, options = {}) {
    const canonicalTable = resolveCanonicalTable(table);

    if (cloud) {
      let q = cloud.from(cloudTable(table)).select(options.select || '*');
      for (const [key, value] of Object.entries(filter)) if (value !== undefined && value !== null) q = q.eq(process.env.SUPABASE_SCHEMA_LAYOUT === 'canonical' && table === 'attendance' && key === 'date' ? 'attendance_date' : key, value);
      for (const [key, value] of Object.entries(options.gt || {})) q = q.gt(key, value);
      for (const [key, value] of Object.entries(options.lt || {})) q = q.lt(key, value);
      if (options.order) q = q.order(options.order.column, { ascending: options.order.ascending !== false });
      if (options.limit) q = q.limit(options.limit);
      const data = await cloudResult(q);
      return (data || []).map(item => table === 'attendance' ? { ...item, date: item.attendance_date || item.date, clock_in_time: item.clock_in || item.clock_in_time, clock_out_time: item.clock_out || item.clock_out_time, clock_in_lat: item.clock_in_latitude ?? item.clock_in_lat, clock_in_lng: item.clock_in_longitude ?? item.clock_in_lng } : item);
    }

    const targetList = store[canonicalTable] || store[table] || [];
    let items = targetList.filter(item => {
      if (Object.entries(options.gt || {}).some(([k,v]) => !(item[k] > v)) || Object.entries(options.lt || {}).some(([k,v]) => !(item[k] < v))) return false;
      return Object.entries(filter).every(([k, v]) => {
        if (v === undefined || v === null) return true;
        const itemVal = item[k] !== undefined ? item[k] : (k === 'date' ? item.attendance_date : (k === 'attendance_date' ? item.date : undefined));
        return String(itemVal) === String(v);
      });
    });

    if (options.order) {
      const col = options.order.column;
      const asc = options.order.ascending !== false;
      items.sort((a, b) => {
        const valA = a[col] ?? '';
        const valB = b[col] ?? '';
        if (typeof valA === 'number' && typeof valB === 'number') {
          return asc ? valA - valB : valB - valA;
        }
        return asc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }

    if (options.limit) {
      items = items.slice(0, options.limit);
    }

    return JSON.parse(JSON.stringify(items));
  },

  async findOne(table, filter = {}) {
    const list = await this.find(table, filter, { limit: 1 });
    return list[0] || null;
  },

  async findById(table, id) {
    return this.findOne(table, { id });
  },

  async insert(table, record) {
    const canonicalTable = resolveCanonicalTable(table);

    // Normalize canonical attendance columns
    const normalized = { ...record };
    if (canonicalTable === 'attendance') {
      if (normalized.date && !normalized.attendance_date) normalized.attendance_date = normalized.date;
      if (normalized.clock_in_time && !normalized.clock_in) normalized.clock_in = normalized.clock_in_time;
      if (normalized.clock_out_time && !normalized.clock_out) normalized.clock_out = normalized.clock_out_time;
      if (normalized.clock_in_lat && !normalized.clock_in_latitude) normalized.clock_in_latitude = normalized.clock_in_lat;
      if (normalized.clock_in_lng && !normalized.clock_in_longitude) normalized.clock_in_longitude = normalized.clock_in_lng;
      if (normalized.clock_out_lat && !normalized.clock_out_latitude) normalized.clock_out_latitude = normalized.clock_out_lat;
      if (normalized.clock_out_lng && !normalized.clock_out_longitude) normalized.clock_out_longitude = normalized.clock_out_lng;
    }

    let supabaseRecord = null;
    if (cloud) {
      const cloudData = { ...normalized };
      if (table === 'attendance') {
        if (process.env.SUPABASE_SCHEMA_LAYOUT === 'canonical') delete cloudData.date; else { cloudData.date = normalized.date || normalized.attendance_date; delete cloudData.attendance_date; }
        for (const key of ['clock_in_lat','clock_in_lng','clock_out_lat','clock_out_lng']) delete cloudData[key];
      }
      return cloudResult(cloud.from(cloudTable(table)).insert(cloudData).select().single());
    }

    if (!store[canonicalTable]) store[canonicalTable] = [];
    const maxId = store[canonicalTable].reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);
    const newRecord = {
      ...(supabaseRecord || {}),
      id: supabaseRecord?.id || record.id || maxId + 1,
      created_at: supabaseRecord?.created_at || new Date().toISOString(),
      ...normalized
    };

    store[canonicalTable].push(newRecord);
    savePersistedStore();
    return JSON.parse(JSON.stringify(newRecord));
  },

  async update(table, id, updates) {
    const canonicalTable = resolveCanonicalTable(table);

    // Normalize canonical attendance columns
    const normalized = { ...updates };
    if (canonicalTable === 'attendance') {
      if (normalized.date && !normalized.attendance_date) normalized.attendance_date = normalized.date;
      if (normalized.clock_in_time && !normalized.clock_in) normalized.clock_in = normalized.clock_in_time;
      if (normalized.clock_out_time && !normalized.clock_out) normalized.clock_out = normalized.clock_out_time;
      if (normalized.clock_in_lat && !normalized.clock_in_latitude) normalized.clock_in_latitude = normalized.clock_in_lat;
      if (normalized.clock_in_lng && !normalized.clock_in_longitude) normalized.clock_in_longitude = normalized.clock_in_lng;
      if (normalized.clock_out_lat && !normalized.clock_out_latitude) normalized.clock_out_latitude = normalized.clock_out_lat;
      if (normalized.clock_out_lng && !normalized.clock_out_longitude) normalized.clock_out_longitude = normalized.clock_out_lng;
    }

    let supabaseRecord = null;
    if (cloud) {
      const cloudData = { ...normalized };
      if (table === 'attendance') {
        if (process.env.SUPABASE_SCHEMA_LAYOUT === 'canonical') delete cloudData.date; else { cloudData.date = normalized.date || normalized.attendance_date; delete cloudData.attendance_date; }
        for (const key of ['clock_in_lat','clock_in_lng','clock_out_lat','clock_out_lng']) delete cloudData[key];
      }
      return cloudResult(cloud.from(cloudTable(table)).update(cloudData).eq('id', id).select().single());
    }

    const targetTable = store[canonicalTable] ? canonicalTable : table;
    if (!store[targetTable]) store[targetTable] = [];
    const index = store[targetTable].findIndex(r => String(r.id) === String(id));
    if (index !== -1) {
      store[targetTable][index] = {
        ...store[targetTable][index],
        ...normalized,
        updated_at: new Date().toISOString()
      };
      savePersistedStore();
      return JSON.parse(JSON.stringify(store[targetTable][index]));
    }

    if (supabaseRecord) {
      store[targetTable].push(supabaseRecord);
      savePersistedStore();
      return supabaseRecord;
    }

    return null;
  },

  async delete(table, id) {
    const canonicalTable = resolveCanonicalTable(table);

    if (cloud) { const deleted = await cloudResult(cloud.from(cloudTable(table)).delete().eq('id', id).select('id')); return deleted.length > 0; }

    const targetTable = store[canonicalTable] ? canonicalTable : table;
    if (!store[targetTable]) return false;
    const initialLen = store[targetTable].length;
    store[targetTable] = store[targetTable].filter(r => String(r.id) !== String(id));
    const deleted = store[targetTable].length < initialLen;
    if (deleted) savePersistedStore();
    return deleted;
  },

  /**
   * Executes an atomic transaction callback with safe rollback capability.
   */
  async transaction(callback) {
    if (cloud) return callback(this); // Multi-row cloud operations use RPC or explicit compensation.
    if (transactionContext.getStore()) return callback(this);
    const operation = transactionQueue.then(() => transactionContext.run(true, async () => {
      const snapshot = JSON.stringify(store);
      try {
        const result = await callback(this);
        savePersistedStore(true);
        return result;
      } catch (error) {
        store = JSON.parse(snapshot);
        savePersistedStore(true);
        throw error;
      }
    }));
    transactionQueue = operation.catch(() => {});
    return operation;
  }
};
