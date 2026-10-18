import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { db, resetTestData } from './helpers/database.js';
import { authService, findUserByIdentifier } from '../services/authService.js';
import { syncSessionEvent } from '../../../client/src/lib/sessionState.js';
import { locationService } from '../services/locationService.js';

test('Refreshed browser sessions replace the API token without signing staff out', () => {
  const items = new Map([['ewf_token','expired'], ['ewf_user','profile']]);
  const storage = { setItem: (k,v) => items.set(k,v), removeItem: k => items.delete(k) };
  assert.equal(syncSessionEvent(storage, 'TOKEN_REFRESHED', { access_token: 'renewed' }), 'authenticated');
  assert.equal(items.get('ewf_token'), 'renewed');
  assert.equal(items.get('ewf_user'), 'profile');
  syncSessionEvent(storage, 'SIGNED_OUT', null);
  assert.equal(items.size, 0);
});

test('Staff sign in, receive a workstation live, verify GPS and complete attendance', async t => {
  await resetTestData();
  const staff = await db.findById('users',4), admin = await db.findById('users',1);
  await t.test('Identifiers resolve exactly and do not extract staff IDs from arbitrary input', async () => {
    const employee = await db.findOne('employees',{user_id:staff.id});
    for (const identifier of [staff.email.toUpperCase(), staff.phone, employee.employee_code]) assert.equal((await findUserByIdentifier(identifier)).id,staff.id);
    assert.equal(await findUserByIdentifier('not-a-real-account-004'),null);
    await assert.rejects(authService.login({},'password'), /Please enter/);
    await assert.rejects(authService.login(staff.email,'incorrect'), /Invalid/);
    const duplicate = await db.insert('employees',{company_id:2,user_id:999,employee_code:employee.employee_code,staff_id:'duplicate',first_name:'Duplicate',status:'active'});
    await assert.rejects(findUserByIdentifier(employee.employee_code), /shared/);
    await db.update('employees', duplicate.id, { employee_code:'OTHER-TEST' });
  });
  await t.test('Workstations reject missing coordinates, partial GPS updates and invalid radii', async () => {
    await assert.rejects(locationService.createLocation({name:'Blank pin',latitude:' ',longitude:''},admin),/Coordinates/);
    await assert.rejects(locationService.createLocation({name:'Zero radius',latitude:6.6,longitude:3.4,geofence_radius:0},admin),/radius/i);
    const office = await locationService.createLocation({name:'Validation office',latitude:0,longitude:0},admin);
    await assert.rejects(locationService.updateLocation(office.id,{latitude:7},admin),/together/);
  });
  process.env.NODE_ENV='test';
  const { default:app } = await import('../index.js');
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}/api`;
  let staffToken,adminToken,officeId;
  const call = async (path, token, body) => {
    const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:r.status,body:await r.json()};
  };
  try {
    mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-18T07:00:00Z')});
    await t.test('A real sign-in returns the linked employee, company and a working session',async()=>{
      const login=await call('/auth/login',null,{identifier:staff.email,password:'ChangeMe123!'});
      assert.equal(login.status,200);staffToken=login.body.data.token;
      assert.equal(login.body.data.user.company_id,1);
      assert.equal(login.body.data.user.employee.user_id,staff.id);
      adminToken=(await call('/auth/login',null,{identifier:admin.email,password:'ChangeMe123!'})).body.data.token;
      assert.equal((await call('/auth/me',staffToken)).status,200);
      assert.equal((await call('/field/shifts/window-status',staffToken)).body.data.can_record,false);
    });
    await t.test('HR assignment reaches an already signed-in staff account without another login',async()=>{
      const office=await call('/locations',adminToken,{name:'Flow test workstation',latitude:6.6,longitude:3.4,geofence_radius:150});
      assert.equal(office.status,201);officeId=office.body.data.id;
      const emp=(await db.findOne('employees',{user_id:staff.id})).id;
      assert.equal((await call(`/locations/employee/${emp}/assign`,adminToken,{location_id:officeId})).status,201);
      const state=(await call('/field/shifts/window-status',staffToken)).body.data;
      assert.equal(state.can_record,true);assert.equal(state.assigned_locations[0].id,officeId);
    });
    await t.test('GPS preflight distinguishes valid, outside and missing location without creating attendance',async()=>{
      const verified=await call('/employee/attendance/verify-location',staffToken,{latitude:6.6,longitude:3.4,accuracy:8});
      assert.equal(verified.status,200);assert.equal(verified.body.data.verified,true);
      assert.equal((await call('/employee/attendance/verify-location',staffToken,{latitude:7,longitude:4,accuracy:8})).body.data.verified,false);
      assert.equal((await call('/employee/attendance/verify-location',staffToken,{})).status,400);
      assert.equal((await db.find('attendance')).length,0);
    });
    await t.test('Clock-in saves once, midday preserves it, and evening clock-out completes the day',async()=>{
      const gps={latitude:6.6,longitude:3.4,accuracy:8};
      assert.equal((await call('/employee/attendance/clock',staffToken,gps)).status,200);
      assert.equal((await call('/employee/attendance/clock',staffToken,gps)).status,400);
      const morning=(await db.find('attendance'))[0].clock_in_time;
      mock.timers.setTime(Date.parse('2026-10-18T12:00:00Z'));
      assert.equal((await call('/employee/attendance/clock',staffToken,gps)).status,200);
      assert.equal((await db.find('attendance'))[0].clock_in_time,morning);
      mock.timers.setTime(Date.parse('2026-10-18T15:30:00Z'));
      assert.equal((await call('/employee/attendance/clock',staffToken,gps)).status,200);
      assert.equal((await call('/field/shifts/window-status',staffToken)).body.data.can_record,false);
      assert.ok((await db.find('attendance'))[0].clock_out_time);
    });
    await t.test('Inactive staff profiles cannot record attendance even with an active login',async()=>{
      const employee=await db.findOne('employees',{user_id:staff.id});
      await db.update('employees',employee.id,{status:'inactive'});
      assert.equal((await call('/employee/attendance/verify-location',staffToken,{latitude:6.6,longitude:3.4,accuracy:8})).status,400);
    });
  } finally { mock.timers.reset(); await new Promise(resolve=>server.close(resolve)); }
});
