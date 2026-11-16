import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';
import {openDatabase} from '../src/database.js';import {createApp} from '../src/server.js';
test('CRM HTTP customer/deal/task workflow enforces account isolation',async()=>{
 const db=openDatabase(':memory:');const server=createApp({db});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}/api`;
 const call=(path,method='GET',data,cookie)=>fetch(base+path,{method,headers:{origin:'http://localhost:3001','content-type':'application/json',...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});
 try{
  const register=async email=>{const r=await call('/auth/register','POST',{email,name:'User',password:'long-test-password'});assert.equal(r.status,201);return r.headers.get('set-cookie').split(';')[0];};
  const alice=await register('a@example.test'),bob=await register('b@example.test');
  assert.equal((await call('/deals','POST',{title:'Missing customer',amount_cents:1},alice)).status,400);
  assert.equal((await call('/deals','POST',{customer_id:'1',title:'String ID',amount_cents:1},alice)).status,400);
  assert.equal((await call('/customers','POST',{name:'Bad contact',email:'not-email'},alice)).status,400);
  const customer=await(await call('/customers','POST',{name:'Acme'},alice)).json();
  assert.equal((await call(`/customers/${customer.id}`,'PATCH',{company:'Stolen'},bob)).status,404);
  const edited=await call(`/customers/${customer.id}`,'PATCH',{company:'Acme Studio'},alice);assert.equal(edited.status,200);assert.equal((await edited.json()).company,'Acme Studio');
  const created=await call('/deals','POST',{customer_id:customer.id,title:'Annual contract',amount_cents:150000},alice);assert.equal(created.status,201);const deal=await created.json();
  assert.equal((await call(`/deals/${deal.id}`,'GET',null,bob)).status,404);
  assert.equal((await call('/deals','POST',{customer_id:customer.id,title:'Stolen',amount_cents:1},bob)).status,404);
  assert.equal((await call(`/deals/${deal.id}`,'PATCH',{stage:'proposal'},alice)).status,200);
  assert.equal((await call(`/deals/${deal.id}/tasks`,'POST',{title:'Call',due_date:'2026-02-30'},alice)).status,400);
  const task=await(await call(`/deals/${deal.id}/tasks`,'POST',{title:'Call',due_date:'2026-12-01'},alice)).json();
  assert.equal((await call(`/tasks/${task.id}`,'PATCH',{done:true},bob)).status,404);
  assert.equal((await call(`/tasks/${task.id}`,'PATCH',{done:true},alice)).status,200);
  assert.equal((await(await call('/stats','GET',null,alice)).json())[0].amount_cents,150000);
  assert.deepEqual(await(await call('/stats','GET',null,bob)).json(),[]);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));db.close();}
});
