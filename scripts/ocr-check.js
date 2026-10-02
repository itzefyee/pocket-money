import {spawn} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--remote-debugging-port=9238','--user-data-dir='+process.cwd()+'/.browser-profile-ocr','about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
try{
 let targets;for(let i=0;i<100;i++){try{targets=await(await fetch('http://127.0.0.1:9238/json')).json();break;}catch{await sleep(100);}}
 assert.ok(targets,'Browser available');socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});let n=0;const pending=new Map();
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(m.error):p.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++n;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await send('Page.navigate',{url:'http://127.0.0.1:4317/'});await sleep(1500);
 console.log('Reading a generated receipt with actual browser OCR; first use downloads language assets.');
 const result=await evaluate(`(async()=>{const canvas=document.createElement('canvas');canvas.width=900;canvas.height=900;const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,900,900);c.fillStyle='black';c.font='34px Arial';['JAYA GROCER','2026-10-01','','Milk                  12.00','Bread                 10.00','Groceries             20.00','','SUBTOTAL              42.00','TAX                    2.52','TOTAL RM              44.52','CASH                  50.00','CHANGE                 5.48'].forEach((line,i)=>c.fillText(line,50,70+i*58));const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));const {recognizeReceipt}=await import('./capture.js');const {parseReceipt}=await import('./domain.js');const text=await Promise.race([recognizeReceipt(new File([blob],'receipt.png',{type:'image/png'})),new Promise((_,reject)=>setTimeout(()=>reject(Error('OCR timed out after 75 seconds')),75000))]);return {text,transaction:parseReceipt(text)};})()`);
 assert.equal(result.transaction.amount,4452);assert.equal(result.transaction.date,'2026-10-01');assert.match(result.transaction.merchant,/JAYA GROCER/i);assert.equal(result.transaction.category,'Groceries');await mkdir('.impeccable/review',{recursive:true});await writeFile('.impeccable/review/ocr-result.json',JSON.stringify(result,null,2));console.log('PASS actual image OCR: JAYA GROCER / RM 44.52 / 2026-10-01 / Groceries');
}finally{if(socket?.readyState===1)socket.close();browser.kill();}
