import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPostgresStore} from '../db.js';
import {demoState} from '../seed.js';

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
