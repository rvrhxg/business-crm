import {execFileSync} from 'node:child_process';import {randomBytes} from 'node:crypto';import assert from 'node:assert/strict';
const suffix=randomBytes(8).toString('hex'),name=`crm-ci-${suffix}`,volume=`crm-ci-data-${suffix}`;
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8'}).trim();let created=false,volumeCreated=false,base;
const ready=async()=>{base=`http://${docker('port',name,'3001/tcp').split('\n')[0]}`;for(let i=0;i<40;i++){try{if((await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw Error('Container not ready');};
const request=(path,method='GET',data,cookie)=>fetch(base+'/api'+path,{method,headers:{origin:'http://localhost:3001','content-type':'application/json',...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});
try{
 docker('volume','create',volume);volumeCreated=true;docker('run','-d','--name',name,'-p','127.0.0.1::3001','-v',`${volume}:/data`,'crm-test');created=true;await ready();
 const credentials={email:'ci@example.test',name:'CI',password:randomBytes(24).toString('hex')};let r=await request('/auth/register','POST',credentials);assert.equal(r.status,201);let cookie=r.headers.get('set-cookie').split(';')[0];
 r=await request('/customers','POST',{name:'Persistent Customer'},cookie);assert.equal(r.status,201);const customer=await r.json();r=await request('/deals','POST',{customer_id:customer.id,title:'Persistent Contract',amount_cents:990050},cookie);assert.equal(r.status,201);const deal=await r.json();
 docker('restart',name);await ready();r=await request('/auth/login','POST',credentials);assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];r=await request(`/deals/${deal.id}`,'GET',null,cookie);assert.equal(r.status,200);assert.equal((await r.json()).amount_cents,990050);assert.equal(docker('exec',name,'id','-u'),'1000');console.log('CRM container persistence and non-root checks passed');
}catch(error){if(created)console.error(docker('logs',name));throw error;}finally{if(created)docker('rm','-f',name);if(volumeCreated)docker('volume','rm',volume);}
