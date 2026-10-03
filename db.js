import {readFile} from 'node:fs/promises';
import {validateState} from './domain.js';

// All entity changes and the revision commit together. Schema overrides isolate tests.
export async function createPostgresStore(connectionString,{schema='pocket'}={}) {
 if(!/^[a-z][a-z0-9_]{0,62}$/.test(schema))throw Error('Invalid database schema.');
 const {Pool}=await import('pg');
 const pool=new Pool({connectionString,max:5,connectionTimeoutMillis:15000,idleTimeoutMillis:30000,statement_timeout:30000});
 pool.on('error',()=>console.error('An idle database connection failed; the next request will reconnect.'));
 const query=(client,text,values)=>client.query(text.replace(/\bpocket\b/g,schema),values);
 async function transaction(fn){
  const client=await pool.connect();
  try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}
  catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{client.release();}
 }
 async function saveEntities(client,state){
  const json=JSON.stringify(state);
  await query(client,`INSERT INTO pocket.settings (workspace_id,name,currency,extra)
   SELECT 1,$1::jsonb->'settings'->>'name',$1::jsonb->'settings'->>'currency',($1::jsonb->'settings') - ARRAY['name','currency']
   ON CONFLICT (workspace_id) DO UPDATE SET name=excluded.name,currency=excluded.currency,extra=excluded.extra`,[json]);
  await query(client,`INSERT INTO pocket.accounts (workspace_id,id,name,kind,opening_cents,position,extra)
   SELECT 1,v->>'id',v->>'name',v->>'kind',(v->>'opening')::bigint,n,v - ARRAY['id','name','kind','opening']
   FROM jsonb_array_elements($1::jsonb->'accounts') WITH ORDINALITY AS a(v,n)
   ON CONFLICT (workspace_id,id) DO UPDATE SET name=excluded.name,kind=excluded.kind,opening_cents=excluded.opening_cents,position=excluded.position,extra=excluded.extra`,[json]);
  await query(client,`INSERT INTO pocket.transactions (workspace_id,id,date,merchant,amount_cents,type,category,account_id,to_account_id,note,position,extra)
   SELECT 1,v->>'id',(v->>'date')::date,v->>'merchant',(v->>'amount')::bigint,v->>'type',v->>'category',v->>'account',
    CASE WHEN v->>'type'='transfer' THEN v->>'toAccount' END,v->>'note',n,
    v - ARRAY['id','date','merchant','amount','type','category','account','note'] - CASE WHEN v->>'type'='transfer' THEN ARRAY['toAccount'] ELSE ARRAY[]::text[] END
   FROM jsonb_array_elements($1::jsonb->'transactions') WITH ORDINALITY AS t(v,n)
   ON CONFLICT (workspace_id,id) DO UPDATE SET date=excluded.date,merchant=excluded.merchant,amount_cents=excluded.amount_cents,type=excluded.type,category=excluded.category,account_id=excluded.account_id,to_account_id=excluded.to_account_id,note=excluded.note,position=excluded.position,extra=excluded.extra`,[json]);
  await query(client,`INSERT INTO pocket.budgets (workspace_id,category,amount_cents)
   SELECT 1,key,value::bigint FROM jsonb_each_text($1::jsonb->'budgets')
   ON CONFLICT (workspace_id,category) DO UPDATE SET amount_cents=excluded.amount_cents`,[json]);
  await query(client,`INSERT INTO pocket.goals (workspace_id,id,name,target_cents,saved_cents,position,extra)
   SELECT 1,v->>'id',v->>'name',(v->>'target')::bigint,(v->>'saved')::bigint,n,v - ARRAY['id','name','target','saved']
   FROM jsonb_array_elements($1::jsonb->'goals') WITH ORDINALITY AS g(v,n)
   ON CONFLICT (workspace_id,id) DO UPDATE SET name=excluded.name,target_cents=excluded.target_cents,saved_cents=excluded.saved_cents,position=excluded.position,extra=excluded.extra`,[json]);
  for(const table of ['transactions','goals','accounts'])await query(client,
   `DELETE FROM pocket.${table} WHERE workspace_id=1 AND id NOT IN (SELECT v->>'id' FROM jsonb_array_elements($1::jsonb->'${table}') AS a(v))`,[json]);
  await query(client,`DELETE FROM pocket.budgets WHERE workspace_id=1 AND NOT ($1::jsonb->'budgets' ? category)`,[json]);
 }
 try{
  const ddl=await readFile(new URL('./schema.sql',import.meta.url),'utf8');
  await transaction(async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['pocket-schema-'+schema]);
   await query(client,ddl);
   if(schema==='pocket'){
    const legacy=await client.query("SELECT to_regclass('public.pocket_workspace') AS name");
    if(legacy.rows[0].name){
     await client.query('LOCK TABLE public.pocket_workspace IN SHARE MODE');
     const old=await client.query('SELECT revision,data FROM public.pocket_workspace WHERE id=1');
     if(old.rows[0]){
      const state=validateState(old.rows[0].data);
      const inserted=await query(client,`INSERT INTO pocket.workspaces (id,revision,metadata)
       VALUES (1,$1,$2::jsonb - ARRAY['accounts','transactions','budgets','goals','settings']) ON CONFLICT (id) DO NOTHING RETURNING id`,[old.rows[0].revision,JSON.stringify(state)]);
      if(inserted.rowCount)await saveEntities(client,state);
     }
    }
   }
  });
 }catch(error){await pool.end();throw error;}
 return {
  async read(){
   // One SQL statement sees a consistent snapshot, including its revision.
   const result=await query(pool,`SELECT w.revision,w.metadata || jsonb_build_object(
    'settings',(SELECT extra || jsonb_build_object('name',name,'currency',currency) FROM pocket.settings WHERE workspace_id=w.id),
    'accounts',COALESCE((SELECT jsonb_agg(extra || jsonb_build_object('id',id,'name',name,'opening',opening_cents) || CASE WHEN kind IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('kind',kind) END ORDER BY position) FROM pocket.accounts WHERE workspace_id=w.id),'[]'::jsonb),
    'transactions',COALESCE((SELECT jsonb_agg(extra || jsonb_build_object('id',id,'date',to_char(date,'YYYY-MM-DD'),'merchant',merchant,'amount',amount_cents,'type',type,'category',category,'account',account_id,'note',note) || CASE WHEN to_account_id IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('toAccount',to_account_id) END ORDER BY position) FROM pocket.transactions WHERE workspace_id=w.id),'[]'::jsonb),
    'budgets',COALESCE((SELECT jsonb_object_agg(category,amount_cents) FROM pocket.budgets WHERE workspace_id=w.id),'{}'::jsonb),
    'goals',COALESCE((SELECT jsonb_agg(extra || jsonb_build_object('id',id,'name',name,'target',target_cents,'saved',saved_cents) ORDER BY position) FROM pocket.goals WHERE workspace_id=w.id),'[]'::jsonb)
   ) AS state FROM pocket.workspaces w WHERE id=1`);
   const row=result.rows[0];return row?{revision:Number(row.revision),state:validateState(row.state)}:{revision:0,state:null};
  },
  async write(expectedRevision,input){
   if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('Invalid workspace revision.');
   const state=validateState(structuredClone(input));
   return transaction(async client=>{
    const result=expectedRevision===0
     ?await query(client,`INSERT INTO pocket.workspaces (id,revision,metadata) VALUES (1,1,$1::jsonb - ARRAY['accounts','transactions','budgets','goals','settings']) ON CONFLICT (id) DO NOTHING RETURNING revision`,[JSON.stringify(state)])
     :await query(client,`UPDATE pocket.workspaces SET revision=revision+1,metadata=$2::jsonb - ARRAY['accounts','transactions','budgets','goals','settings'],updated_at=now() WHERE id=1 AND revision=$1 RETURNING revision`,[expectedRevision,JSON.stringify(state)]);
    if(!result.rows[0])return null;
    await saveEntities(client,state);
    return Number(result.rows[0].revision);
   });
  },
  close:()=>pool.end()
 };
}
