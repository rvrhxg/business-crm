import http from 'node:http';
import { customer, deal, createDeal, changeStage, text, stages } from './crm.js';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { openDatabase } from './database.js';
import { hashPasswordAsync, verifyPasswordAsync, newToken, tokenHash } from './security.js';

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const field = (value, max, min = 1) => {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) fail(400, 'Invalid field');
  return value.trim();
};
async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32768) fail(413, 'Request too large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try { const data = JSON.parse(raw); if (!data || Array.isArray(data) || typeof data !== 'object') fail(400, 'Invalid JSON'); return data; }
  catch { fail(400, 'Invalid JSON'); }
}

export function createApp({ db, origin = process.env.APP_ORIGIN || 'http://localhost:3001', secure = process.env.NODE_ENV === 'production' } = {}) {
  let configured;
  try { configured = new URL(origin); } catch { throw new Error('APP_ORIGIN must be an absolute HTTP(S) origin'); }
  if (!['http:','https:'].includes(configured.protocol) || configured.origin !== origin) throw new Error('APP_ORIGIN must contain only scheme, hostname and optional port');
  if (secure && configured.protocol !== 'https:') throw new Error('Production requires an HTTPS APP_ORIGIN');
  const ownsDatabase = !db;
  db ||= openDatabase();
  const attempts = new Map();
  const dummyHash = hashPasswordAsync('dummy-password-value');
  let activeAuth = 0;
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      const url = new URL(req.url, origin);
      const path = url.pathname;
      const assets = { '/': ['index.html','text/html'], '/app.js': ['app.js','text/javascript'], '/style.css': ['style.css','text/css'] };
      if (req.method === 'GET' && Object.hasOwn(assets,path)) {
        const [file, type] = assets[path];
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
        const content = await readFile(new URL(`../public/${file}`, import.meta.url));
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
        return res.end(content);
      }
      const write = !['GET', 'HEAD'].includes(req.method);
      if (write && req.headers.origin !== origin) fail(403, 'Origin rejected');
      if (write && req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') fail(415, 'JSON required');
      if (path === '/api/health' && req.method === 'GET') return send(200, { status: 'ok' });
      if (['/api/auth/register', '/api/auth/login'].includes(path) && req.method === 'POST') {
        if (activeAuth >= 4) fail(503, 'Authentication busy; try again');
        activeAuth++;
        try {
        const now = Date.now();
        for (const [key, entry] of attempts) if (entry.until < now) attempts.delete(key);
        const key = req.socket.remoteAddress;
        const entry = attempts.get(key) || { count: 0, until: now + 60000 };
        attempts.set(key, entry);
        if (++entry.count > 15) fail(429, 'Try again later');
        const data = await body(req);
        const email = field(data.email, 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Invalid email');
        if (typeof data.password !== 'string' || data.password.length < 12 || data.password.length > 128) fail(400, 'Password must contain 12–128 characters');
        const password = data.password;
        let user;
        if (path.endsWith('register')) {
          const name = field(data.name, 100);
          if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) fail(409, 'Email unavailable');
          const passwordHash = await hashPasswordAsync(password);
          if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) fail(409, 'Email unavailable');
          const result = db.prepare('INSERT INTO users(email,name,password_hash) VALUES(?,?,?)').run(email, name, passwordHash);
          user = db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid);
        } else {
          user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
          const valid = await verifyPasswordAsync(password, user?.password_hash || await dummyHash);
          if (!user || !valid) fail(401, 'Invalid credentials');
        }
        const token = newToken();
        db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
        db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(tokenHash(token), user.id, now + 86400000);
        res.setHeader('Set-Cookie', `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secure ? '; Secure' : ''}`);
        return send(path.endsWith('register') ? 201 : 200, { id: user.id, name: user.name, email: user.email });
        } finally { activeAuth--; }
      }
      const token = /(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
      const user = token && db.prepare('SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(tokenHash(token), Date.now());
      if (!user) fail(401, 'Authentication required');
      if (path === '/api/auth/me' && req.method === 'GET') return send(200, user);
      if (path === '/api/auth/logout' && req.method === 'POST') {
        db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token));
        res.setHeader('Set-Cookie', `session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`);
        return send(200, { ok: true });
      }
      if(path==='/api/customers' && req.method==='GET') return send(200,db.prepare('SELECT * FROM customers WHERE owner_id=? ORDER BY id DESC LIMIT 200').all(user.id));
      if(path==='/api/customers' && req.method==='POST') {
        const data=await body(req);const name=text(data.name);
        const optional=value=>value==null||value===''?'':text(value,254);
        if(data.email && (typeof data.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)))fail(400,'Invalid customer email');
        const r=db.prepare('INSERT INTO customers(owner_id,name,company,email,phone) VALUES(?,?,?,?,?)').run(user.id,name,optional(data.company),optional(data.email),optional(data.phone));
        return send(201,customer(db,user.id,r.lastInsertRowid));
      }
      const customerMatch=/^\/api\/customers\/([1-9]\d*)$/.exec(path);
      if(customerMatch&&req.method==='PATCH'){
        const current=customer(db,user.id,customerMatch[1]),data=await body(req);
        const next={...current};
        for(const key of ['name','company','email','phone'])if(Object.hasOwn(data,key))next[key]=key==='name'?text(data[key]):data[key]===''?'':text(data[key],254);
        if(next.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email))fail(400,'Invalid customer email');
        db.prepare('UPDATE customers SET name=?,company=?,email=?,phone=? WHERE id=? AND owner_id=?').run(next.name,next.company,next.email,next.phone,current.id,user.id);
        return send(200,customer(db,user.id,current.id));
      }
      if(path==='/api/deals' && req.method==='GET') {
        const stage=url.searchParams.get('stage')||'';
        if(stage&&!stages.includes(stage))fail(400,'Invalid stage');
        return send(200,db.prepare("SELECT d.*,c.name AS customer_name FROM deals d JOIN customers c ON c.id=d.customer_id WHERE d.owner_id=? AND (?='' OR d.stage=?) ORDER BY d.id DESC LIMIT 200").all(user.id,stage,stage));
      }
      if(path==='/api/deals' && req.method==='POST')return send(201,createDeal(db,user.id,await body(req)));
      if(path==='/api/stats'&&req.method==='GET')return send(200,db.prepare('SELECT stage,count(*) AS count,sum(amount_cents) AS amount_cents FROM deals WHERE owner_id=? GROUP BY stage').all(user.id));
      const match=/^\/api\/deals\/([1-9]\d*)(?:\/(activities|tasks))?$/.exec(path);
      if(match){
        const current=deal(db,user.id,match[1]);
        if(!match[2]&&req.method==='GET')return send(200,current);
        if(!match[2]&&req.method==='PATCH')return send(200,changeStage(db,user.id,current.id,(await body(req)).stage));
        if(match[2]==='activities'&&req.method==='GET')return send(200,db.prepare('SELECT * FROM activities WHERE deal_id=? AND owner_id=? ORDER BY id').all(current.id,user.id));
        if(match[2]==='activities'&&req.method==='POST'){
          const data=await body(req);const r=db.prepare('INSERT INTO activities(owner_id,deal_id,body) VALUES(?,?,?)').run(user.id,current.id,text(data.body,5000));
          return send(201,db.prepare('SELECT * FROM activities WHERE id=?').get(r.lastInsertRowid));
        }
        if(match[2]==='tasks'&&req.method==='GET')return send(200,db.prepare('SELECT * FROM tasks WHERE deal_id=? AND owner_id=? ORDER BY due_date,id').all(current.id,user.id));
        if(match[2]==='tasks'&&req.method==='POST'){
          const data=await body(req);
          if(typeof data.due_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(data.due_date)||!Number.isFinite(Date.parse(data.due_date))||new Date(data.due_date).toISOString().slice(0,10)!==data.due_date)fail(400,'Invalid due date');
          const r=db.prepare('INSERT INTO tasks(owner_id,deal_id,title,due_date) VALUES(?,?,?,?)').run(user.id,current.id,text(data.title),data.due_date);
          return send(201,db.prepare('SELECT * FROM tasks WHERE id=?').get(r.lastInsertRowid));
        }
      }
      const taskMatch=/^\/api\/tasks\/([1-9]\d*)$/.exec(path);
      if(taskMatch&&req.method==='PATCH'){
        const task=db.prepare('SELECT * FROM tasks WHERE id=? AND owner_id=?').get(taskMatch[1],user.id);if(!task)fail(404,'Task not found');
        const data=await body(req);if(typeof data.done!=='boolean')fail(400,'Boolean done required');
        db.prepare('UPDATE tasks SET done=? WHERE id=? AND owner_id=?').run(data.done?1:0,task.id,user.id);
        return send(200,{...task,done:data.done?1:0});
      }

      fail(404, 'Not found');
    } catch (error) { if (!error.status) console.error(error); send(error.status || 500, { error: error.status ? error.message : 'Internal server error' }); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  if (ownsDatabase) server.once('close', () => db.close());
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createApp();
  server.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => console.log('HelpDesk server started'));
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    server.close();
    const deadline = setTimeout(() => server.closeAllConnections(), 8000);
    deadline.unref();
    server.once('close', () => clearTimeout(deadline));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
