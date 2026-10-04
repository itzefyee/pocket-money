import {createHash,createHmac,randomBytes,timingSafeEqual,scrypt as scryptCallback} from 'node:crypto';
import {promisify} from 'node:util';

const sessionSeconds=7*24*60*60;
const digest=value=>createHash('sha256').update(value).digest('hex');
const scrypt=promisify(scryptCallback);
const derive=(password,salt)=>scrypt(password,salt,64,{N:65536,r:8,p:1,maxmem:96*1024*1024});
async function hashPassword(password){const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${(await derive(password,salt)).toString('hex')}`;}
async function verifyPassword(password,stored){
 const [,salt,hash]=String(stored||'').split(':');
 const actual=await derive(password,salt||'00000000000000000000000000000000');
 const expected=/^[a-f0-9]{128}$/.test(hash||'')?Buffer.from(hash,'hex'):Buffer.alloc(64);
 return timingSafeEqual(actual,expected)&&!!stored;
}

export function createSessionAuth(password,store){
 const passwordHash=Buffer.from(digest(password),'hex');
 const passwordTag=createHmac('sha256',password).update('Pocket session version').digest('hex');
 const attempts=new Map();let active=0;
 const cookieName=origin=>origin.startsWith('https:')?'__Host-pocket-session':'pocket-session';
 function token(req,origin){
  const value=String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName(origin)+'='))?.split('=')[1];
  return /^[a-f0-9]{64}$/.test(value||'')?value:null;
 }
 function cookie(origin,value,maxAge){return `${cookieName(origin)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${origin.startsWith('https:')?'; Secure':''}`;}
 async function session(res,origin,json,user){
  const value=randomBytes(32).toString('hex');
  await store.createSession(digest(value),passwordTag,new Date(Date.now()+sessionSeconds*1000),user?.id||null);
  res.setHeader('Set-Cookie',cookie(origin,value,sessionSeconds));json(res,200,{redirect:'/'});
 }
 async function authenticate(req,res,origin,json,register){
  if(req.headers.origin!==origin){json(res,403,{error:'Sign in from the Pocket page.'});return;}
  if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'Expected a sign-in form.'});return;}
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>4096){json(res,413,{error:'Sign-in details are too long.'});return;}chunks.push(chunk);}
  let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{json(res,400,{error:'Enter your username and password.'});return;}
  const now=Date.now();for(const [key,value] of attempts)if(value.until<=now)attempts.delete(key);
  const key=req.socket.remoteAddress||'unknown';
  if(!attempts.has(key)){if(attempts.size>=10000){json(res,429,{error:'Too many attempts. Try again shortly.'});return;}attempts.set(key,{count:0,until:now+60000});}
  const attempt=attempts.get(key);
  if(attempt.count>=10||active>=2){res.setHeader('Retry-After',Math.max(1,Math.ceil((attempt.until-now)/1000)));json(res,429,{error:'Too many attempts. Wait a minute, then try again.'});return;}
  attempt.count++;active++;
  try{
   const username=typeof input?.username==='string'?input.username.trim().toLowerCase():'';
   const supplied=typeof input?.password==='string'?input.password:'';
   if(supplied.length>1024){json(res,400,{error:'Use a password with at most 1024 characters.'});return;}
   if(register){
    if(!store.createUser){json(res,503,{error:'Account creation is unavailable. Please try again later.'});return;}
    if(!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(username)||username==='pocket'){json(res,400,{error:'Choose a username with 3-32 letters, numbers, underscores or dashes. The name pocket is reserved.'});return;}
    if(supplied.length<12){json(res,400,{error:'Use a password with at least 12 characters.'});return;}
    const name=typeof input.name==='string'?input.name.trim():'';
    if(!name||name.length>60){json(res,400,{error:'Enter your name using at most 60 characters.'});return;}
    const passwordHash=await hashPassword(supplied);
    let user;try{user=await store.createUser(username,passwordHash,name);}catch(error){if(error.code==='23505'){json(res,409,{error:'That username is already taken. Choose another one.'});return;}throw error;}
    attempt.count=0;await session(res,origin,json,user);return;
   }
   let user=null,valid=false;
   if(username==='pocket')valid=timingSafeEqual(Buffer.from(digest(supplied),'hex'),passwordHash);
   else{user=await store.findUser?.(username);valid=await verifyPassword(supplied,user?.passwordHash);}
   if(!valid){json(res,401,{error:'That username or password is incorrect. Please try again.'});return;}
   attempt.count=0;await session(res,origin,json,user);
  }finally{active--;}
 }
 return {
  async authenticated(req,origin){
   const value=token(req,origin);if(!value)return null;
   if(store.getSession)return store.getSession(digest(value),passwordTag);
   return await store.hasSession(digest(value),passwordTag)?{id:null,username:'pocket',workspaceId:1,legacy:true}:null;
  },
  login:(req,res,origin,json)=>authenticate(req,res,origin,json,false),
  register:(req,res,origin,json)=>authenticate(req,res,origin,json,true),
  async logout(req,res,origin,json){
   if(req.headers.origin!==origin){json(res,403,{error:'Sign out from the Pocket page.'});return;}
   const value=token(req,origin);if(value)await store.deleteSession(digest(value));
   res.setHeader('Set-Cookie',cookie(origin,'',0));json(res,200,{redirect:'/login'});
  }
 };
}
