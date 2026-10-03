import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

const sessionSeconds=7*24*60*60;
const digest=value=>createHash('sha256').update(value).digest('hex');

export function createSessionAuth(password,store){
 const passwordHash=Buffer.from(digest(password),'hex');
 const passwordTag=createHmac('sha256',password).update('Pocket session version').digest('hex');
 let failures=0,windowEnds=0;
 const cookieName=origin=>origin.startsWith('https:')?'__Host-pocket-session':'pocket-session';
 function token(req,origin){
  const value=String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName(origin)+'='))?.split('=')[1];
  return /^[a-f0-9]{64}$/.test(value||'')?value:null;
 }
 function cookie(origin,value,maxAge){return `${cookieName(origin)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${origin.startsWith('https:')?'; Secure':''}`;}
 return {
  async authenticated(req,origin){const value=token(req,origin);return !!value&&await store.hasSession(digest(value),passwordTag);},
  async login(req,res,origin,json){
   if(req.headers.origin!==origin){json(res,403,{error:'Sign in from the Pocket page.'});return;}
   if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'Expected a sign-in form.'});return;}
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>4096){json(res,413,{error:'Sign-in details are too long.'});return;}chunks.push(chunk);}
   let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{json(res,400,{error:'Enter your username and password.'});return;}
   if(Date.now()>=windowEnds){failures=0;windowEnds=Date.now()+60000;}
   if(failures>=10){res.setHeader('Retry-After',Math.ceil((windowEnds-Date.now())/1000));json(res,429,{error:'Too many attempts. Wait a minute, then try again.'});return;}
   const supplied=typeof input?.password==='string'?input.password:'';
   const valid=timingSafeEqual(Buffer.from(digest(supplied),'hex'),passwordHash);
   if(!valid||typeof input?.username!=='string'||input.username.trim().toLowerCase()!=='pocket'){
    failures++;json(res,401,{error:'That username or password is incorrect. Please try again.'});return;
   }
   failures=0;
   const value=randomBytes(32).toString('hex');
   await store.createSession(digest(value),passwordTag,new Date(Date.now()+sessionSeconds*1000));
   res.setHeader('Set-Cookie',cookie(origin,value,sessionSeconds));
   json(res,200,{redirect:'/'});
  },
  async logout(req,res,origin,json){
   if(req.headers.origin!==origin){json(res,403,{error:'Sign out from the Pocket page.'});return;}
   const value=token(req,origin);if(value)await store.deleteSession(digest(value));
   res.setHeader('Set-Cookie',cookie(origin,'',0));json(res,200,{redirect:'/login'});
  }
 };
}
