import {createPostgresStore} from '../db.js';
import {createServer} from '../server.js';

const vercelOrigin=value=>value?new URL(`https://${value}`).origin:null;
function restoreRequestPath(req){
 const routed=new URL(req.url,'http://pocket.internal');
 const path=routed.searchParams.get('__pocket_path');
 if(path===null)return;
 routed.searchParams.delete('__pocket_path');
 req.url='/'+path.replace(/^\/+/, '')+routed.search;
}

export function createVercelHandler({env=process.env,createStore=createPostgresStore}={}){
 let app;
 async function server(){
  if(!app){
   const deploymentOrigin=vercelOrigin(env.VERCEL_URL);
   const store=env.DATABASE_URL?await createStore(env.DATABASE_URL):null;
   app=createServer({apiKey:env.GEMINI_API_KEY||'',model:env.GEMINI_MODEL||'gemini-2.5-flash',publicUrl:deploymentOrigin||env.RENDER_EXTERNAL_URL||env.POCKET_PUBLIC_URL||'',customUrl:env.POCKET_PUBLIC_URL||'',store,maxAiImageBytes:env.VERCEL?3*1024*1024:null});
  }
  return app;
 }
 return async(req,res)=>{
  try{restoreRequestPath(req);(await server()).emit('request',req,res);}
  catch(error){console.error('Pocket startup failed.',{code:error?.code,message:error instanceof Error?error.message:String(error)});if(!res.headersSent){res.writeHead(500,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Pocket could not start.'}));}}
 };
}

export default createVercelHandler();
