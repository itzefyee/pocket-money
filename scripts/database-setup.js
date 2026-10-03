import {readFile} from 'node:fs/promises';
import {createPostgresStore} from '../db.js';
import {demoState} from '../seed.js';
import {validateState} from '../domain.js';

if(!process.env.DATABASE_URL)throw Error('Set DATABASE_URL before setting up the database.');
const args=process.argv.slice(2);
if(args.length>1)throw Error('Use --sample, a JSON backup path, or no argument to create tables only.');
const state=args[0]==='--sample'?demoState():args[0]?validateState(JSON.parse(await readFile(args[0],'utf8'))):null;
const store=await createPostgresStore(process.env.DATABASE_URL);
try{
 if(state){
  const revision=await store.write(0,state);
  if(revision===null)console.log('Database already contains a workspace. Existing records were preserved.');
  else console.log(`Imported ${state.transactions.length} transactions, ${state.accounts.length} accounts, ${Object.keys(state.budgets).length} budgets and ${state.goals.length} goals.`);
 }
 const saved=await store.read();
 console.log(`Neon tables are ready. Workspace revision: ${saved.revision}.`);
}finally{await store.close();}
