import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { openDatabase } from '../src/database.js';
import { createApp } from '../src/server.js';

test('static CSP, invalid input, preserved passwords, expiry and request limits', async () => {
  const db = openDatabase(':memory:');
  const server = createApp({db}); server.listen(0,'127.0.0.1'); await once(server,'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, value, extra = {}) => fetch(base + path, {method:'POST',headers:{origin:'http://localhost:3001','content-type':'application/json',...extra},body:typeof value === 'string' ? value : JSON.stringify(value)});
  try {
    const page = await fetch(base + '/');
    assert.equal(page.status,200);
    assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
    assert.match(await page.text(), /Contour|contour/);
    assert.equal((await post('/api/auth/register','{')).status,400);
    assert.equal((await post('/api/auth/register',{})).status,400);
    assert.equal((await post('/api/auth/register',{}, {'content-type':'text/plain'})).status,415);
    assert.equal((await post('/api/auth/register',{}, {'content-type':'application/json-invalid'})).status,415);
    assert.equal((await post('/api/auth/register','x'.repeat(33000))).status,413);
    const credentials = {email:'spaces@example.com',name:'Space User',password:'  keep-these-spaces  '};
    const registered = await post('/api/auth/register',credentials);
    assert.equal(registered.status,201);
    assert.equal((await post('/api/auth/login',{...credentials,password:credentials.password.trim()})).status,401);
    const loggedIn = await post('/api/auth/login',credentials); assert.equal(loggedIn.status,200);
    const cookie = loggedIn.headers.get('set-cookie').split(';')[0];
    db.prepare('UPDATE sessions SET expires_at=0').run();
    assert.equal((await fetch(base+'/api/auth/me',{headers:{cookie}})).status,401);
    for(let i=0;i<15;i++) await post('/api/auth/login',{});
    assert.equal((await post('/api/auth/login',credentials)).status,429);
  } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); db.close(); }
});
