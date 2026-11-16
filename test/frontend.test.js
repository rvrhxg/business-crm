import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.value='';this.hidden=false;this.textContent='';}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
 setAttribute(name,value){this[name]=value;}
}
test('CRM frontend initializes pipeline and opens real deal detail without interpreting user HTML',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8'),source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const ids=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));ids.get('auth-form').elements={name:new Element()};
 const deal={id:1,title:'<script>unsafe</script>',customer_name:'Client',amount_cents:125050,stage:'lead'};
 const data={'/auth/me':{id:1,name:'Tester'},'/customers':[{id:1,name:'Client'}],'/deals':[deal],'/stats':[{stage:'lead',count:1,amount_cents:125050}],'/deals/1':deal,'/deals/1/activities':[],'/deals/1/tasks':[]};
 const document={getElementById:id=>{assert.ok(ids.has(id),`Missing HTML id ${id}`);return ids.get(id);},createElement:tag=>new Element(tag)};
 const fetch=async path=>{const key=path.replace('/api','');assert.ok(Object.hasOwn(data,key),`Unexpected API path ${path}`);return{ok:true,status:200,json:async()=>data[key]};};
 await vm.runInContext(`(async()=>{${source}\n})()`,vm.createContext({document,fetch,Intl,console}));
 assert.equal(ids.get('workspace').hidden,false);assert.equal(ids.get('board').children.length,5);
 const card=ids.get('board').children[0].children[1];assert.equal(card.children[0].textContent,deal.title);assert.equal(card.children[0].children.length,0);
 card.onclick();await new Promise(resolve=>setImmediate(resolve));assert.equal(ids.get('detail').hidden,false);
 assert.equal(ids.get('detail').children[1].textContent,deal.title);assert.equal(ids.get('detail').children.at(-1).children.length,2);
});
