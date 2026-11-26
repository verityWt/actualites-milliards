import test from 'node:test';
import assert from 'node:assert/strict';
import service,{PEOPLE,selection,slotFor,discover,batchSelection,discoverBatch,researchOne,BATCH_SIZE} from './biography-discovery.mjs';
function kv(){const m=new Map();return {m,async get(k){return m.has(k)?JSON.parse(m.get(k)):null},async put(k,v){m.set(k,v)},async list({prefix}){return {keys:[...m.keys()].filter(k=>k.startsWith(prefix)).map(name=>({name}))}}}}
test('coverage: all people are visited across a full rotation',()=>{
 assert.equal(PEOPLE.length,207);
 assert.equal(new Set(PEOPLE.map(p=>p.slug)).size,PEOPLE.length);
 const first=slotFor('2026-11-25T00:00:00Z');
 const visited=new Set(Array.from({length:PEOPLE.length},(_,i)=>selection(new Date((first+i)*900000)).slug));
 assert.equal(visited.size,PEOPLE.length);
});
test('a verified run stores suggestions as unverified candidates',async()=>{
 const store=kv(),date=new Date('2026-11-25T00:00:00Z');
 const mock=async()=>({ok:true,json:async()=>({search:[{id:'Q1234',label:'Sample Person',description:'business person'},{id:'invalid',label:'skip'}]})});
 const x=await discover({RESEARCH:store},date,mock);
 assert.equal(x.state,'candidate_found');
 const record=await store.get('profile:'+x.person);
 assert.equal(record.suggestions.length,1);
 assert.equal(record.suggestions[0].status,'candidate_identity_unverified');
 assert.equal(record.verifiedFacts,0);
 assert.equal(record.analysisStatus,'not_executed');
 assert.ok(await store.get('run:'+slotFor(date)));
});
test('provider error is recorded without publishing a false match',async()=>{
 const store=kv(),date=new Date('2026-11-25T00:15:00Z');
 const state=await discover({RESEARCH:store},date,async()=>({ok:false,status:429}));
 assert.equal(state.state,'error');
 assert.match(state.error,/429/);
 assert.ok(await store.get('error:'+state.person));
 assert.equal(await store.get('profile:'+state.person),null);
});
test('public API is read-only and shows true waiting state',async()=>{
 const store=kv();
 const status=await service.fetch(new Request('https://example.com/status'),{RESEARCH:store});
 assert.equal(status.status,200);
 const value=await status.json();
 assert.equal(value.state,'waiting_for_first_cron');
 assert.equal(value.totalProfiles,207);
 const blocked=await service.fetch(new Request('https://example.com/status',{method:'POST'}),{RESEARCH:store});
 assert.equal(blocked.status,405);
});

test('batch selects four distinct biographies and covers all 207 within 52 ticks',()=>{
 assert.equal(BATCH_SIZE,4);
 const first=slotFor('2026-11-25T00:00:00Z'),selected=new Set();
 for(let i=0;i<Math.ceil(PEOPLE.length/BATCH_SIZE);i++){
   const people=batchSelection(new Date((first+i)*900000));
   assert.equal(people.length,4);
   assert.equal(new Set(people.map(x=>x.slug)).size,4);
   people.forEach(x=>selected.add(x.slug));
 }
 assert.equal(selected.size,207);
});
test('batch persists outcomes when provider has transient errors',async()=>{
 const store=kv(),date=new Date('2026-11-25T00:00:00Z');
 const mock=async()=>({ok:false,status:429});
 const result=await discoverBatch({RESEARCH:store},date,mock);
 assert.equal(result.items.length,4);
 assert.equal(result.items.every(x=>x.state==='error'),true);
 assert.equal((await store.get('batch:last')).count,4);
});

test('scheduled batch stays within six KV writes per 15-minute tick',async()=>{
 const store=kv();let writes=0;
 const put=store.put.bind(store);
 store.put=async(k,v)=>{writes++;return put(k,v);};
 const raw=async url=>({ok:true,json:async()=>({search:[]})});
 const run=await discoverBatch({RESEARCH:store},new Date('2026-11-26T03:00:00Z'),raw);
 assert.equal(run.count,4);
 assert.equal(writes,6);
 assert.equal((await store.get('batch:history')).length,1);
 assert.equal(await store.get('batch:slot:1'),null);
});
test('single-profile discovery never writes fabricated evidence after fetch error',async()=>{
 const store=kv();let writes=0;
 const put=store.put.bind(store);store.put=async(k,v)=>{writes++;return put(k,v);};
 const person=PEOPLE[0];
 const result=await researchOne({RESEARCH:store},person,new Date('2026-11-26T03:00:00Z'),
   async()=>({ok:false,status:429}));
 assert.equal(result.state,'error');
 assert.equal(writes,1);
 const saved=await store.get('profile:'+person.slug);
 assert.equal(saved.state,'error');
 assert.equal(saved.verifiedFacts,0);
 assert.equal(saved.wikipedia,undefined);
});
