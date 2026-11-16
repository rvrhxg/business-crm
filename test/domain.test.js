import test from 'node:test';import assert from 'node:assert/strict';
import {openDatabase} from '../src/database.js';
import {createDeal,changeStage,deal,money} from '../src/crm.js';
test('owner isolation, integer money and terminal deal stages with activity audit',()=>{
  const db=openDatabase(':memory:');
  try{
    const u=db.prepare('INSERT INTO users(email,name,password_hash) VALUES(?,?,?)');u.run('a@example.test','A','hash');u.run('b@example.test','B','hash');
    db.prepare('INSERT INTO customers(owner_id,name) VALUES(?,?)').run(1,'Customer A');
    assert.throws(()=>createDeal(db,2,{customer_id:1,title:'Stolen',amount_cents:100}),e=>e.status===404);
    for(const n of [-1,0.1,NaN,Infinity,Number.MAX_SAFE_INTEGER])assert.throws(()=>money(n),e=>e.status===400);
    const created=createDeal(db,1,{customer_id:1,title:'Contract',amount_cents:123456});
    assert.equal(created.amount_cents,123456);assert.equal(created.stage,'lead');
    assert.throws(()=>deal(db,2,created.id),e=>e.status===404);
    changeStage(db,1,created.id,'proposal');changeStage(db,1,created.id,'won');
    assert.equal(db.prepare('SELECT count(*) AS n FROM activities').get().n,2);
    assert.throws(()=>changeStage(db,1,created.id,'lead'),e=>e.status===409);
    assert.equal(deal(db,1,created.id).stage,'won');
  }finally{db.close();}
});
