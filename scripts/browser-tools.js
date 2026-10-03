import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';

export const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function openBrowser({port=9246,profile='quality',width=1440,height=1000,init='',headers={},ready="!!document.querySelector('#navigation button')"}={}){
 const browser=spawn(process.env.POCKET_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--in-process-gpu','--no-sandbox','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${process.cwd()}/.browser-profile-${profile}`,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let socket;const errors=[],stderr=[],pending=new Map();let sequence=0;browser.stderr.on('data',d=>stderr.push(d.toString()));
 try{
  let targets;for(let i=0;i<80;i++){try{targets=await(await fetch(`http://127.0.0.1:${port}/json`)).json();break;}catch{await delay(100);}}
  if(!targets)throw Error('Browser did not start: '+stderr.join('').slice(-500));
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
  function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},30000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});socket.send(JSON.stringify({id,method,params}));});}
  async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
  async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(60);}throw Error('Condition failed: '+expression);}
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const fill=(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  async function pointerClick(selector){const pos=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control: '+${JSON.stringify(selector)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',...pos,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...pos,button:'left',clickCount:1});}
  const resize=(width,height=900)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<760});
  async function route(name){await evaluate(`location.hash=${JSON.stringify(name)}`);await until(`document.querySelector('#navigation [data-view=${name}]')?.getAttribute('aria-current')==='page'`);}
  async function reset(routeName='overview'){await evaluate(`localStorage.removeItem('pocket-demo');localStorage.removeItem('pocket-personal');localStorage.removeItem('pocket-mode');location.hash=${JSON.stringify(routeName)};location.reload()`);await until(`!!document.querySelector('#navigation [data-view=${routeName}][aria-current]')`);}
  async function screenshot(file){await evaluate('document.fonts.ready');await evaluate("document.querySelector('#toast')?.classList.remove('visible')");const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await mkdir(file.slice(0,file.lastIndexOf('/')),{recursive:true});await writeFile(file,Buffer.from(result.data,'base64'));}
  async function close(){if(socket?.readyState===1){try{await send('Browser.close');}catch{}socket.close();}browser.kill();}
  await send('Runtime.enable');await send('Page.enable');await resize(width,height);
  if(Object.keys(headers).length){await send('Network.enable');await send('Network.setExtraHTTPHeaders',{headers});}
  if(init)await send('Page.addScriptToEvaluateOnNewDocument',{source:init});
  await send('Page.navigate',{url:process.env.POCKET_TEST_URL||'http://127.0.0.1:4317/'});await until(ready);
  return {send,evaluate,until,click,fill,pointerClick,resize,route,reset,screenshot,close,errors};
 }catch(e){if(socket?.readyState===1)socket.close();browser.kill();throw e;}
}
