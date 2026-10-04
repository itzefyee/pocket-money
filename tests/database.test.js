import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPostgresStore} from '../db.js';
import {demoState} from '../seed.js';
import {readFile} from 'node:fs/promises';

test('existing single-workspace schema migrates without losing records and isolates new users',{skip:!process.env.POCKET_TEST_DATABASE_URL},async()=>{
 const {Pool}=await import('pg');const connectionString=process.env.POCKET_TEST_DATABASE_URL;
 const schema='pocket_test_'+randomUUID().replaceAll('-','');const pool=new Pool({connectionString});let store;
 try{
  const original=(await readFile(new URL('../schema.sql',import.meta.url),'utf8')).split('-- Keep workspace 1')[0];
  await pool.query(original.replace(/\bpocket\b/g,schema));
  await pool.query(`INSERT INTO ${schema}.workspaces (id,revision) VALUES (1,1);
   INSERT INTO ${schema}.settings (workspace_id,name,currency) VALUES (1,'Original owner','MYR');
   INSERT INTO ${schema}.accounts (workspace_id,id,name,opening_cents,position) VALUES (1,'cash','Cash',12345,1);
   INSERT INTO ${schema}.sessions (token_hash,password_tag,expires_at) VALUES ('original-session','version',now()+interval '1 day')`);
  store=await createPostgresStore(connectionString,{schema});
  const originalWorkspace=await store.read();assert.equal(originalWorkspace.state.accounts[0].opening,12345);
  assert.equal((await store.getSession('original-session','version')).workspaceId,1);
  const alice=await store.createUser('alice','hashed-password','Alice');const bob=await store.createUser('bob','another-hash','Bob');
  assert.notEqual(alice.workspaceId,bob.workspaceId);assert.notEqual(alice.workspaceId,1);
  const fresh=await store.read(alice.workspaceId);assert.equal(fresh.state.settings.name,'Alice');assert.deepEqual(fresh.state.budgets,{});
  assert.equal(fresh.state.transactions.length,0);assert.ok(fresh.state.accounts.every(a=>a.opening===0));
  const next=fresh.state;next.accounts[0].opening=5000;assert.equal(await store.write(1,next,alice.workspaceId),2);
  assert.equal((await store.read(bob.workspaceId)).state.accounts[0].opening,0);assert.deepEqual(await store.read(),originalWorkspace);
  await assert.rejects(store.createUser('alice','duplicate','Duplicate'),e=>e.code==='23505');
  const counts=await pool.query(`SELECT count(*)::int AS count FROM ${schema}.workspaces`);assert.equal(counts.rows[0].count,3);
  await store.createSession('alice-session','version',new Date(Date.now()+60000),alice.id);
  assert.equal((await store.getSession('alice-session','version')).workspaceId,alice.workspaceId);
  await store.close();store=await createPostgresStore(connectionString,{schema});
  assert.equal((await store.findUser('alice')).passwordHash,'hashed-password');
  assert.equal((await store.read(alice.workspaceId)).state.accounts[0].opening,5000);
  assert.equal((await store.getSession('alice-session','version')).id,alice.id);
  assert.deepEqual(await store.read(),originalWorkspace);
 }finally{
  await store?.close();assert.match(schema,/^pocket_test_[a-f0-9]{32}$/);
  await pool.query(`DROP SCHEMA ${schema} CASCADE`);await pool.end();
 }
});

test('Postgres preserves all records, commits atomically, rejects stale saves and enforces relationships',{skip:!process.env.POCKET_TEST_DATABASE_URL},async()=>{
 const {Pool}=await import('pg');
 const connectionString=process.env.POCKET_TEST_DATABASE_URL;
 const schema='pocket_test_'+randomUUID().replaceAll('-','');
 const pool=new Pool({connectionString});
 let store;
 try{
  store=await createPostgresStore(connectionString,{schema});
  await store.createSession('session-hash','password-version',new Date(Date.now()+60000));
  await store.createSession('expired-hash','password-version',new Date(0));
  assert.equal(await store.hasSession('session-hash','password-version'),true);
  assert.equal(await store.hasSession('session-hash','wrong-version'),false);
  assert.equal(await store.hasSession('expired-hash','password-version'),false);
  assert.deepEqual(await store.read(),{revision:0,state:null});
  const initial=demoState();
  initial.transactions.push({id:'transfer',date:'2026-10-03',merchant:'Move savings',amount:1250,type:'transfer',category:'Other',account:'bank',toAccount:'cash',note:'',source:'Test'});
  initial.transactions[0].extractedText='Optional receipt text is preserved';
  assert.equal(await store.write(0,initial),1);
  assert.deepEqual((await store.read()).state,initial);
  const counts=await pool.query(`SELECT (SELECT count(*)::int FROM ${schema}.transactions) AS transactions,(SELECT count(*)::int FROM ${schema}.accounts) AS accounts,(SELECT count(*)::int FROM ${schema}.budgets) AS budgets,(SELECT count(*)::int FROM ${schema}.goals) AS goals`);
  assert.deepEqual(counts.rows[0],{transactions:100,accounts:3,budgets:9,goals:2});
  const a=structuredClone(initial),b=structuredClone(initial);
  a.settings.name='First device';b.settings.name='Second device';
  const revisions=await Promise.all([store.write(1,a),store.write(1,b)]);
  assert.equal(revisions.filter(x=>x===2).length,1);
  assert.equal(revisions.filter(x=>x===null).length,1);
  const saved=await store.read();
  assert.equal(saved.state.settings.name,revisions[0]===2?a.settings.name:b.settings.name);
  // Force a SQL failure after the revision, settings and accounts were written.
  await pool.query(`ALTER TABLE ${schema}.transactions ADD CONSTRAINT test_failure CHECK (merchant <> 'Fail this save')`);
  const invalid=structuredClone(saved.state);invalid.transactions[0].merchant='Fail this save';invalid.settings.name='Must roll back';
  await assert.rejects(store.write(2,invalid),/test_failure/);
  assert.deepEqual(await store.read(),saved);
  await assert.rejects(pool.query(`UPDATE ${schema}.transactions SET account_id='missing' WHERE id='transfer'`),/foreign key/);
  await assert.rejects(pool.query(`UPDATE ${schema}.transactions SET amount_cents=0 WHERE id='transfer'`),/check constraint/);
  const trimmed=structuredClone(saved.state);
  trimmed.transactions=trimmed.transactions.filter(t=>t.account!=='cash'&&t.toAccount!=='cash');
  trimmed.accounts=trimmed.accounts.filter(a=>a.id!=='cash');trimmed.goals=[];trimmed.budgets={};
  assert.equal(await store.write(2,trimmed),3);
  await store.close();store=await createPostgresStore(connectionString,{schema});
  assert.equal(await store.hasSession('session-hash','password-version'),true);
  await store.deleteSession('session-hash');assert.equal(await store.hasSession('session-hash','password-version'),false);
  assert.deepEqual(await store.read(),{revision:3,state:trimmed});
  assert.equal(await store.write(0,initial),null);
 }finally{
  await store?.close();
  // Only this test's randomly named schema can be removed.
  assert.match(schema,/^pocket_test_[a-f0-9]{32}$/);
  await pool.query(`DROP SCHEMA ${schema} CASCADE`);await pool.end();
 }
});
