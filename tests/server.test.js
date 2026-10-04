import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createServer,normalizeExtraction} from '../server.js';
import {emptyState} from '../seed.js';

function sessionStore(store={}){const sessions=new Map();return Object.assign(store,{createSession:async(id,tag,expires)=>sessions.set(id,{tag,expires}),hasSession:async(id,tag)=>sessions.get(id)?.tag===tag&&sessions.get(id).expires>Date.now(),deleteSession:async id=>sessions.delete(id)});}
async function withServer(options,fn){if(options.store&&!options.store.hasSession)sessionStore(options.store);const s=createServer({accessPassword:'',publicUrl:'',customUrl:'',...options});await new Promise(r=>s.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${s.address().port}`;try{await fn(url);}finally{s.closeAllConnections();await new Promise(r=>s.close(r));}}
async function signIn(url,password='a very long private password'){
 const response=await fetch(url+'/api/auth/login',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:JSON.stringify({username:'pocket',password})});
 assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0];
}
function request(url,{method='GET',headers={},body}={}){return new Promise((resolve,reject)=>{const req=http.request(url,{method,headers},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end(body);});}
test('server exposes app but not secrets or source tests',()=>withServer({apiKey:''},async url=>{
 assert.equal((await fetch(url)).status,200);assert.equal((await fetch(url+'/.env')).status,404);assert.equal((await fetch(url+'/server.js')).status,404);assert.equal((await fetch(url+'/db.js')).status,404);assert.equal((await fetch(url+'/tests/domain.test.js')).status,404);assert.equal((await(await fetch(url+'/api/capabilities')).json()).ai,false);
}));
test('database mode shows an on-page login and protects private pages and records',async()=>{
 const store={read:async()=>({revision:0,state:null}),write:async()=>1};
 assert.throws(()=>createServer({store:null,accessPassword:'a very long private password'}),/requires DATABASE_URL/);
 assert.throws(()=>createServer({store,accessPassword:'short'}),/POCKET_ACCESS_PASSWORD/);
 await withServer({store,accessPassword:'a very long private password'},async url=>{
  assert.equal((await fetch(url+'/health')).status,200);
  const denied=await fetch(url,{redirect:'manual'});assert.equal(denied.status,303);assert.equal(denied.headers.get('location'),'/login');assert.equal(denied.headers.get('www-authenticate'),null);
  const login=await fetch(url+'/login');assert.equal(login.status,200);assert.match(await login.text(),/id="login-form"/);
  assert.equal((await fetch(url+'/%69ndex.html',{redirect:'manual'})).status,303);
  assert.equal((await fetch(url+'/api/workspace')).status,401);
  assert.equal((await fetch(url+'/login.css')).status,200);
  assert.equal((await fetch(url+'/auth.js')).status,404);
  const cookie=await signIn(url);
  assert.equal((await fetch(url,{headers:{Cookie:cookie}})).status,200);
  assert.equal((await(await fetch(url+'/api/capabilities',{headers:{Cookie:cookie}})).json()).storage,'database');
 });
});
test('database workspace API validates writes and rejects stale revisions',()=>withServer({accessPassword:'a very long private password',store:(()=>{
 let revision=0,state=null;return {read:async()=>({revision,state}),write:async(expected,next)=>{if(expected!==revision)return null;state=next;return ++revision;}};
})()},async url=>{
 const cookie=await signIn(url);
 const headers={Cookie:cookie,Origin:url,'Content-Type':'application/json'};
 const initial=emptyState();
 assert.deepEqual(await(await fetch(url+'/api/workspace',{headers})).json(),{revision:0,state:null});
 assert.equal((await fetch(url+'/api/workspace',{method:'PUT',headers:{...headers,Origin:'https://other.example'},body:JSON.stringify({revision:0,state:initial})})).status,403);
 assert.equal((await fetch(url+'/api/workspace',{method:'PUT',headers,body:JSON.stringify({revision:0,state:{...initial,accounts:[]}})})).status,400);
 assert.deepEqual(await(await fetch(url+'/api/workspace',{method:'PUT',headers,body:JSON.stringify({revision:0,state:initial})})).json(),{revision:1});
 const saved=await(await fetch(url+'/api/workspace',{headers})).json();assert.equal(saved.state.accounts.length,3);
 assert.equal((await fetch(url+'/api/workspace',{method:'PUT',headers,body:JSON.stringify({revision:0,state:initial})})).status,409);
 initial.settings.name='Private';
 assert.deepEqual(await(await fetch(url+'/api/workspace',{method:'PUT',headers,body:JSON.stringify({revision:1,state:initial})})).json(),{revision:2});
 assert.equal((await(await fetch(url+'/api/workspace',{headers})).json()).state.settings.name,'Private');
}));

test('login errors are actionable, sessions are HttpOnly, and logout revokes the cookie',()=>withServer({store:sessionStore(),accessPassword:'a very long private password'},async url=>{
 const headers={Origin:url,'Content-Type':'application/json'};
 const login=(value,extra={})=>fetch(url+'/api/auth/login',{method:'POST',headers:{...headers,...extra},body:JSON.stringify(value)});
 assert.equal((await login({username:'pocket',password:'wrong'})).status,401);
 assert.equal((await login({username:'pocket',password:'a very long private password'},{Origin:'https://other.example'})).status,403);
 assert.equal((await login({username:'pocket',password:'a very long private password'},{'Content-Type':'text/plain'})).status,415);
 const response=await login({username:' POCKET ',password:'a very long private password'});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{redirect:'/'});
 const setCookie=response.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Lax/);assert.match(setCookie,/Max-Age=604800/);
 assert.doesNotMatch(setCookie,/a very long private password/);const cookie=setCookie.split(';')[0];
 assert.equal((await fetch(url+'/login',{headers:{Cookie:cookie},redirect:'manual'})).headers.get('location'),'/');
 assert.equal((await fetch(url+'/api/capabilities',{headers:{Cookie:cookie}})).status,200);
 const logout=await fetch(url+'/api/auth/logout',{method:'POST',headers:{Cookie:cookie,Origin:url}});
 assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
 assert.equal((await fetch(url+'/api/capabilities',{headers:{Cookie:cookie}})).status,401);
 assert.equal((await fetch(url+'/api/capabilities',{headers:{Authorization:'Basic '+Buffer.from('pocket:a very long private password').toString('base64')}})).status,401);
}));

test('sessions survive server recreation, expire, and are invalidated by password changes',async()=>{
 const store=sessionStore();let cookie;
 await withServer({store,accessPassword:'a very long private password'},async url=>{cookie=await signIn(url);});
 await withServer({store,accessPassword:'a very long private password'},async url=>{
  assert.equal((await fetch(url+'/api/capabilities',{headers:{Cookie:cookie}})).status,200);
 });
 await withServer({store,accessPassword:'a different private password'},async url=>{
  assert.equal((await fetch(url+'/api/capabilities',{headers:{Cookie:cookie}})).status,401);
 });
 const expired=sessionStore();await expired.createSession('expired','tag',new Date(0));assert.equal(await expired.hasSession('expired','tag'),false);
});

test('public-origin sign in protects AI and uses a Secure host-only session cookie',()=>withServer({store:sessionStore(),accessPassword:'a very long private password',publicUrl:'https://pocket.example',apiKey:'test-key',fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({merchant:'Coffee',amount:12.9,date:'2026-10-02',category:'Food & drinks',type:'expense',account:'cash'})}]}}]})})},async url=>{
 const headers={Host:'pocket.example',Origin:'https://pocket.example','Content-Type':'application/json'};
 const post=password=>new Promise((resolve,reject)=>{const req=http.request(url+'/api/auth/login',{method:'POST',headers},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:res.headers}));});req.on('error',reject);req.end(JSON.stringify({username:'pocket',password}));});
 const login=await post('a very long private password');
 assert.equal(login.status,200);const cookie=login.headers['set-cookie'][0];assert.match(cookie,/^__Host-pocket-session=/);assert.match(cookie,/; Secure/);assert.doesNotMatch(cookie,/Domain=/);
 const body=JSON.stringify({text:'Coffee RM 12.90'}),apiHeaders={...headers,'Content-Type':'application/json'};
 assert.equal(await request(url+'/api/extract',{method:'POST',headers:apiHeaders,body}),401);
 assert.equal(await request(url+'/api/extract',{method:'POST',headers:{...apiHeaders,Cookie:cookie.split(';')[0]},body}),200);
 for(let i=0;i<10;i++)assert.equal((await post('incorrect')).status,401);
 const limited=await post('incorrect');
 assert.equal(limited.status,429);assert.ok(Number(limited.headers['retry-after'])>0);
}));
test('public AI cannot start without authenticated database storage',()=>{
 assert.throws(()=>createServer({apiKey:'test-key',publicUrl:'https://pocket.example',store:null,accessPassword:''}),/Public AI requires/);
});
test('Render hostname serves the app and requires its HTTPS origin for provider requests',()=>withServer({apiKey:'',publicUrl:'https://pocket-test.onrender.com'},async url=>{
 const host='pocket-test.onrender.com',headers={Host:host};
 assert.equal(await request(url,{headers}),200);
 assert.equal(await request(url+'/api/capabilities',{headers}),200);
 assert.equal(await request(url+'/app.js',{headers}),200);
 assert.equal(await request(url,{headers:{Host:'other.example'}}),403);
 const body=JSON.stringify({text:'Coffee RM12.90'});
 assert.equal(await request(url+'/api/extract',{method:'POST',headers:{...headers,Origin:'http://'+host,'Content-Type':'application/json'},body}),403);
 assert.equal(await request(url+'/api/extract',{method:'POST',headers:{...headers,Origin:'https://'+host,'Content-Type':'application/json'},body}),503);
 assert.equal(await request(url+'/api/assistant-plan',{method:'POST',headers:{...headers,Origin:'http://'+host,'Content-Type':'application/json'},body:'{}'}),403);
 assert.equal(await request(url+'/health',{headers:{Host:'render-internal'}}),200);
}));
test('configured custom domain serves the app and accepts only its own HTTPS origin',()=>withServer({apiKey:'',publicUrl:'https://pocket-test.onrender.com',customUrl:'https://pocket.example'},async url=>{
 const headers={Host:'pocket.example'},body=JSON.stringify({text:'Coffee RM12.90'});
 assert.equal(await request(url,{headers}),200);
 assert.equal(await request(url+'/api/extract',{method:'POST',headers:{...headers,Origin:'https://pocket-test.onrender.com','Content-Type':'application/json'},body}),403);
 assert.equal(await request(url+'/api/extract',{method:'POST',headers:{...headers,Origin:'https://pocket.example','Content-Type':'application/json'},body}),503);
 assert.equal(await request(url,{headers:{Host:'other.example'}}),403);
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
