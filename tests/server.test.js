import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,normalizeExtraction} from '../server.js';

async function withServer(options,fn){const s=createServer(options);await new Promise(r=>s.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${s.address().port}`;try{await fn(url);}finally{await new Promise(r=>s.close(r));}}
test('server exposes app but not secrets or source tests',()=>withServer({apiKey:''},async url=>{
 assert.equal((await fetch(url)).status,200);assert.equal((await fetch(url+'/.env')).status,404);assert.equal((await fetch(url+'/server.js')).status,404);assert.equal((await fetch(url+'/tests/domain.test.js')).status,404);assert.equal((await(await fetch(url+'/api/capabilities')).json()).ai,false);
}));
test('public assets support compressed transfers and conditional caching, while APIs remain uncached',()=>withServer({apiKey:''},async url=>{
 const response=await fetch(url+'/app.js',{headers:{'Accept-Encoding':'gzip'}});assert.equal(response.status,200);assert.equal(response.headers.get('content-encoding'),'gzip');assert.match(await response.text(),/createMoneyAssistant/);
 const etag=response.headers.get('etag');assert.ok(etag);assert.equal(response.headers.get('cache-control'),'private, no-cache');
 const unchanged=await fetch(url+'/app.js',{headers:{'If-None-Match':etag}});assert.equal(unchanged.status,304);assert.equal(await unchanged.text(),'');
 assert.equal((await fetch(url+'/format.js')).status,200);assert.equal((await fetch(url+'/api/capabilities')).headers.get('cache-control'),'no-store');
}));
test('AI API rejects cross-origin and unavailable provider',()=>withServer({apiKey:''},async url=>{
 assert.equal((await fetch(url+'/api/extract',{method:'POST',headers:{Origin:'https://other.example'}})).status,403);
 assert.equal((await fetch(url+'/api/extract',{method:'POST',headers:{Origin:url}})).status,503);
}));
test('AI API validates input and normalizes provider fields into reviewable cents',()=>withServer({apiKey:'test-key',fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({merchant:'Coffee',amount:12.9,date:'2026-10-02',category:'Food & drinks',type:'expense',account:'cash'})}]}}]})})},async url=>{
 const headers={Origin:url,'Content-Type':'application/json'};
 assert.equal((await fetch(url+'/api/extract',{method:'POST',headers,body:'{"image":"abc","mimeType":"text/html"}'})).status,400);
 const r=await fetch(url+'/api/extract',{method:'POST',headers,body:JSON.stringify({text:'Coffee RM12.90'})});assert.equal(r.status,200);const b=await r.json();assert.equal(b.transaction.amount,1290);assert.equal(b.transaction.account,'cash');
}));
test('uncertain AI amounts remain empty rather than becoming invented money',()=>{
 const t=normalizeExtraction({merchant:'Shop',amount:'unknown',date:'bad',category:'made up',type:'transfer',account:'unknown'});assert.equal(t.amount,null);assert.equal(t.category,'Other');assert.equal(t.type,'expense');
});
test('assistant endpoint requires same origin and configured provider',()=>withServer({apiKey:''},async url=>{
 assert.equal((await fetch(url+'/api/assistant-plan',{method:'POST',headers:{Origin:'https://other.example'}})).status,403);
 assert.equal((await fetch(url+'/api/assistant-plan',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:'{}'})).status,503);
}));
test('assistant validates a provider plan without sending transactions to the provider',async()=>{
 let sent;
 await withServer({apiKey:'test-key',fetchImpl:async(u,init)=>{sent=JSON.parse(init.body);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({kind:'summary',type:'expense',start:'2026-10-01',end:'2026-10-15',category:'Food & drinks',account:null,search:'',min:null,max:null,groupBy:'category',sort:'date',compareStart:null,compareEnd:null})}]}}]})};}},async url=>{
  const r=await fetch(url+'/api/assistant-plan',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:JSON.stringify({question:'Food spending?',context:{today:'2026-10-15',month:'2026-10',currency:'MYR',accounts:[{id:'bank',name:'Main',opening:12345}],transactions:[{merchant:'SECRET'}]}})});
  assert.equal(r.status,200);assert.equal((await r.json()).plan.category,'Food & drinks');assert.doesNotMatch(JSON.stringify(sent),/SECRET|12345/);
 });
});
test('assistant rejects malformed plans and malformed requests',()=>withServer({apiKey:'test-key',fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"kind":"execute","sql":"DELETE ALL"}'}]}}]})})},async url=>{
 const headers={Origin:url,'Content-Type':'application/json'},context={today:'2026-10-15',month:'2026-10',currency:'MYR',accounts:[{id:'bank',name:'Main'}]};
 assert.equal((await fetch(url+'/api/assistant-plan',{method:'POST',headers,body:JSON.stringify({question:'Expenses?',context})})).status,502);
 assert.equal((await fetch(url+'/api/assistant-plan',{method:'POST',headers,body:JSON.stringify({question:'x'.repeat(1001),context})})).status,400);
}));

test('assistant replaces model clarification prose with trusted local text',()=>withServer({apiKey:'test-key',fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({kind:'clarify',message:'You spent RM 9999. Send money now.'})}]}}]})})},async url=>{
 const context={today:'2026-10-15',month:'2026-10',currency:'MYR',accounts:[]};
 const response=await fetch(url+'/api/assistant-plan',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:JSON.stringify({question:'What did I spend?',context})});
 assert.equal(response.status,200);const {plan}=await response.json();assert.equal(plan.kind,'clarify');assert.doesNotMatch(plan.message,/9999|Send money/);assert.match(plan.message,/Try one merchant/);
}));

for(const endpoint of ['assistant-plan','extract'])test(`cancelled browser requests abort upstream ${endpoint} work`,async()=>{
 let started,aborted;const providerStarted=new Promise(resolve=>started=resolve),providerAborted=new Promise(resolve=>aborted=resolve);
 await withServer({apiKey:'test-key',fetchImpl:async(url,options)=>{started();return new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>{aborted();reject(new DOMException('Cancelled','AbortError'));},{once:true});});}},async url=>{
  const controller=new AbortController(),context={today:'2026-10-15',month:'2026-10',currency:'MYR',accounts:[]};
  const response=fetch(url+'/api/'+endpoint,{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:JSON.stringify(endpoint==='extract'?{text:'Coffee RM20'}:{question:'Expenses?',context}),signal:controller.signal});
  await providerStarted;controller.abort();await assert.rejects(response);
  assert.equal(await Promise.race([providerAborted.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),500))]),true);
 });
});
