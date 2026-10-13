// Staff imports must use an explicitly provided JSON array.
import fs from 'node:fs';
import { staffImportService } from '../src/services/staffImportService.js';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node server/scripts/importStaffData.js <staff.json>');
  process.exit(1);
}
const dataset = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (!Array.isArray(dataset)) throw new Error('Staff file must contain a JSON array.');
const result = await staffImportService.importAuthoritativeStaff(dataset);
console.log(JSON.stringify(result, null, 2));
if (result.errors.length) process.exitCode = 1;
