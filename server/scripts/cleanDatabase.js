// Explicit local reset. Stop the backend before running this command.
// Cloud databases are handled separately by the SQL cleanup migration.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialState } from '../src/config/initialState.js';

const dataDir = process.env.EDGEWFORCE_DATA_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
fs.mkdirSync(dataDir, { recursive: true });
const storePath = path.join(dataDir, 'store.json');
fs.writeFileSync(storePath, JSON.stringify(initialState, null, 2), 'utf8');
console.log('Local database reset: zero accounts, staff, inventory and operational records.');
