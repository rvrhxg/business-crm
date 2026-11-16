export const stages=['lead','qualified','proposal','won','lost'];
export class DomainError extends Error {constructor(status,message){super(message);this.status=status;}}
const reject=(code,message)=>{throw new DomainError(code,message);};
export function text(value,max=200){if(typeof value!=='string'||!value.trim()||value.length>max)reject(400,'Invalid text');return value.trim();}
export function money(value){if(!Number.isSafeInteger(value)||value<0||value>100000000000)reject(400,'Use integer kopecks within supported range');return value;}
export function customer(db,owner,id){const row=db.prepare('SELECT * FROM customers WHERE id=? AND owner_id=?').get(id,owner);if(!row)reject(404,'Customer not found');return row;}
export function deal(db,owner,id){const row=db.prepare('SELECT * FROM deals WHERE id=? AND owner_id=?').get(id,owner);if(!row)reject(404,'Deal not found');return row;}
export function createDeal(db,owner,data){
  if(!Number.isSafeInteger(data.customer_id)||data.customer_id<1)reject(400,'Valid integer customer_id required');
  customer(db,owner,data.customer_id);
  const title=text(data.title),amount=money(data.amount_cents);
  const r=db.prepare('INSERT INTO deals(owner_id,customer_id,title,amount_cents) VALUES(?,?,?,?)').run(owner,data.customer_id,title,amount);
  return deal(db,owner,r.lastInsertRowid);
}
export function changeStage(db,owner,id,stage){
  const current=deal(db,owner,id);
  if(!stages.includes(stage))reject(400,'Invalid stage');
  if(current.stage===stage)return current;
  if(['won','lost'].includes(current.stage))reject(409,'Closed deals cannot change stage');
  db.exec('BEGIN');
  try{
    db.prepare('UPDATE deals SET stage=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(stage,id);
    db.prepare('INSERT INTO activities(owner_id,deal_id,body) VALUES(?,?,?)').run(owner,id,`Stage: ${current.stage} → ${stage}`);
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return deal(db,owner,id);
}
