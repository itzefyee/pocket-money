import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../server.js';
import {emptyState} from '../seed.js';

function accountStore(){
 const users=new Map(),sessions=new Map(),workspaces=new Map([[1,{revision:1,state:emptyState()}]]);
 let next=2;
 return {
  findUser:async username=>users.get(username),
  createUser:async(username,passwordHash,name)=>{
   if(users.has(username))throw Object.assign(Error('Duplicate'),{code:'23505'});
   const user={id:String(next),workspaceId:next++,username,passwordHash,legacy:false};users.set(username,user);
   const state=emptyState();state.settings.name=name;state.budgets={};workspaces.set(user.workspaceId,{revision:1,state});return user;
  },
  createSession:async(token,tag,expires,id)=>sessions.set(token,{tag,expires,user:id?[...users.values()].find(u=>u.id===id):{id:null,username:'pocket',workspaceId:1,legacy:true}}),
  getSession:async(token,tag)=>{const s=sessions.get(token);return s?.tag===tag&&s.expires>Date.now()?s.user:null;},
  deleteSession:async token=>sessions.delete(token),
  read:async id=>structuredClone(workspaces.get(id)),
  write:async(revision,state,id)=>{const w=workspaces.get(id);if(w.revision!==revision)return null;workspaces.set(id,{revision:revision+1,state});return revision+1;}
 };
}
test('registration creates private ledgers, validates credentials and protects account switches',async()=>{
 const server=createServer({store:accountStore(),accessPassword:'original private password',apiKey:'',publicUrl:'',customUrl:''});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const post=(path,body,headers={})=>fetch(url+path,{method:'POST',headers:{Origin:url,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 const alice={username:' Alice ',name:'Alice',password:'my own strong password'};
 try{
  assert.equal((await post('/api/auth/register',alice,{Origin:'https://other.example'})).status,403);
  assert.equal((await post('/api/auth/register',{...alice,username:'pocket'})).status,400);
  assert.equal((await post('/api/auth/register',{...alice,password:'short'})).status,400);
  assert.equal((await post('/api/auth/register',{...alice,name:''})).status,400);
  const registered=await post('/api/auth/register',alice);assert.equal(registered.status,200);
  const cookie=registered.headers.get('set-cookie').split(';')[0];
  const read=c=>fetch(url+'/api/workspace',{headers:{Cookie:c}}).then(r=>r.json());
  const first=await read(cookie);assert.equal(first.state.settings.name,'Alice');assert.deepEqual(first.state.transactions,[]);assert.deepEqual(first.state.budgets,{});
  assert.equal((await post('/api/auth/register',alice)).status,409);
  assert.equal((await post('/api/auth/login',{username:'alice',password:'wrong'})).status,401);
  assert.equal((await post('/api/auth/login',{username:'missing',password:'wrong'})).status,401);
  const bob=await post('/api/auth/register',{username:'bob',name:'Bob',password:alice.password});assert.equal(bob.status,200);
  const bobCookie=bob.headers.get('set-cookie').split(';')[0];
  const aliceUser=(await(await fetch(url+'/api/capabilities',{headers:{Cookie:cookie}})).json()).user;
  assert.equal(aliceUser.username,'alice');assert.equal(aliceUser.legacy,false);assert.equal('passwordHash' in aliceUser,false);
  const state=first.state;state.transactions.push({id:'private',date:'2026-10-04',merchant:'Private purchase',amount:1250,type:'expense',category:'Other',account:'cash',note:''});
  const save=await fetch(url+'/api/workspace',{method:'PUT',headers:{Origin:url,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({revision:1,state,workspaceId:3,userId:'3'})});assert.equal(save.status,200);
  assert.equal((await read(bobCookie)).state.transactions.length,0);
  assert.equal((await read(cookie)).state.transactions.length,1);
  assert.equal((await fetch(url+'/api/workspace',{method:'PUT',headers:{Origin:url,'Content-Type':'application/json',Cookie:bobCookie,'X-Pocket-User':aliceUser.id},body:JSON.stringify({revision:1,state})})).status,409);
  assert.equal((await read(bobCookie)).state.transactions.length,0);
  const again=await post('/api/auth/login',alice);assert.equal(again.status,200);
  assert.equal((await read(again.headers.get('set-cookie').split(';')[0])).state.transactions.length,1);
  await post('/api/auth/logout',{}, {Cookie:cookie});assert.equal((await fetch(url+'/api/workspace',{headers:{Cookie:cookie}})).status,401);
  assert.equal((await read(bobCookie)).state.settings.name,'Bob');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
