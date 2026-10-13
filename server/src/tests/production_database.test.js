import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const databaseUrl = new URL('../config/database.js', import.meta.url).href;
function run(source, overrides) {
  const env = { ...process.env, NODE_ENV: 'production', TEST_MODE: '', SUPABASE_ANON_KEY: '', SUPABASE_KEY: '', VITE_SUPABASE_ANON_KEY: '', VITE_SUPABASE_URL: '', VERCEL: '', DATA_BACKEND: '', ...overrides };
  delete env.NODE_TEST_CONTEXT;
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], { env });
    let output=''; child.stdout.on('data', data => { output+=data; }); child.stderr.on('data', data => { output+=data; });
    child.on('exit', code => resolve({ code, output }));
  });
}
test('Production fails closed when configuration or cloud persistence is unavailable', async () => {
  const config = await run(`await import(${JSON.stringify(databaseUrl)})`, { SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', JWT_SECRET: '' });
  assert.notEqual(config.code, 0); assert.match(config.output, /Production requires JWT_SECRET/);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'edgewforce-cloud-test-'));
  const seen=[];
  const server=http.createServer((req,res)=>{ seen.push(req.headers.authorization); res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: 'Simulated database outage' })); });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const result = await run(`import assert from 'node:assert/strict'; const {db}=await import(${JSON.stringify(databaseUrl)}); for (const operation of [()=>db.find('users'),()=>db.insert('users',{full_name:'Must not be saved locally'}),()=>db.update('users',1,{full_name:'No local mirror'}),()=>db.delete('users',1)]) await assert.rejects(operation,/Database operation failed/);`, {
      SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, SUPABASE_SERVICE_ROLE_KEY: 'test-service-role', SUPABASE_ANON_KEY: 'test-anon', JWT_SECRET: 'test-production-secret-that-is-long-enough', EDGEWFORCE_DATA_DIR: directory
    });
    assert.equal(result.code,0,result.output);
    assert.ok(seen.length >= 4); assert.ok(seen.every(value=>value==='Bearer test-service-role'));
    assert.equal(fs.existsSync(path.join(directory,'store.json')),false);
  } finally {
    await new Promise(resolve=>server.close(resolve));
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(directory).startsWith('edgewforce-cloud-test-'));
    fs.rmSync(directory,{recursive:true,force:true});
  }
});
