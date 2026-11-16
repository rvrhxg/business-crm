import {pathToFileURL} from 'node:url';import {openDatabase} from './database.js';import {hashPassword} from './security.js';import {createDeal,changeStage} from './crm.js';
export function seedDemo(db,password){
 if(typeof password!=='string'||password.length<12||password.length>128)throw Error('Use a 12–128 character password');
 if(db.prepare('SELECT count(*) AS n FROM users').get().n)throw Error('Demo requires an empty database');
 db.prepare('INSERT INTO users(email,name,password_hash) VALUES(?,?,?)').run('demo@example.test','Анна Волкова',hashPassword(password));
 const customers=[['Алексей Морозов','Северная студия'],['Мария Соколова','Линия пространства'],['Илья Орлов','Точка роста']];
 for(const[name,company]of customers)db.prepare('INSERT INTO customers(owner_id,name,company) VALUES(1,?,?)').run(name,company);
 for(const[customer,title,amount,stage]of [[1,'Клиентский портал',12500050,'proposal'],[2,'Поддержка сайта',4500000,'qualified'],[3,'Интеграция каталога',8900000,'lead'],[1,'Аудит процессов',3000000,'won'],[2,'Мобильный кабинет',21000000,'lost']]){
  const d=createDeal(db,1,{customer_id:customer,title,amount_cents:amount});if(stage!=='lead')changeStage(db,1,d.id,stage);
  if(stage==='proposal')db.prepare('INSERT INTO tasks(owner_id,deal_id,title,due_date) VALUES(1,?,?,?)').run(d.id,'Согласовать предложение','2026-12-01');
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(!process.env.DATABASE_PATH?.endsWith('.demo.sqlite'))throw Error('Set separate DATABASE_PATH ending .demo.sqlite');
 let password='';for await(const chunk of process.stdin){password+=chunk;if(password.length>256)throw Error('Password too long');}
 const db=openDatabase();try{seedDemo(db,password.replace(/\r?\n$/,''));console.log('Demo account: demo@example.test. Password is the value supplied through stdin.');}finally{db.close();}
}
