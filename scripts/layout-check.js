import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser-tools.js';
const b=await openBrowser({port:9248,profile:'layout'}),results=[];
try{
 await b.reset();
 await b.evaluate(`(async()=>{const s=(await import('./seed.js')).demoState();s.settings.name='A'.repeat(60);s.accounts[0].name='長'.repeat(80);s.accounts[0].opening=99999999999;s.goals[0].name='Adventure'.repeat(11);s.transactions[0].merchant='Merchant'.repeat(25);const text=JSON.stringify(s);localStorage.setItem('pocket-demo',text);dispatchEvent(new StorageEvent('storage',{key:'pocket-demo',newValue:text}));})()`);
 for(const [width,height] of [[1440,1000],[768,900],[390,844],[320,568],[740,390]]){
  await b.resize(width,height);
  for(const route of ['overview','transactions','assistant','budgets','accounts','settings']){
   await b.route(route);
   const layout=await b.evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth+1,composer:${route==='assistant'?'(()=>{const c=document.querySelector(".assistant-composer").getBoundingClientRect(),n=document.querySelector("#mobile-navigation").getBoundingClientRect();return {bottom:c.bottom,navTop:n.top,height:c.height,threadHeight:document.querySelector(".assistant-thread").clientHeight}})()':'null'}})`);
   const okay=!layout.overflow&&(!layout.composer||width>760||height<500||layout.composer.bottom<=layout.composer.navTop+1);
   if(!process.env.POCKET_SKIP_SCREENSHOTS&&route==='overview'&&width===1440)await b.screenshot('.impeccable/review/optimization/long-labels-desktop.png');
   if(route==='assistant'&&width<760&&height<500){await b.evaluate("document.querySelector('.assistant-composer').scrollIntoView({block:'end',behavior:'instant'})");const usable=await b.evaluate("document.querySelector('.assistant-composer').getBoundingClientRect().bottom<=document.querySelector('#mobile-navigation').getBoundingClientRect().top");results.push({name:'Landscape composer stays reachable above navigation',passed:usable});}
   results.push({route,width,height,passed:okay,...layout});if(!okay){console.log('FAIL '+JSON.stringify(results.at(-1)));console.log(await b.evaluate("Array.from(document.querySelectorAll('#page *')).map(e=>({tag:e.tagName,cls:e.className,right:Math.round(e.getBoundingClientRect().right),width:Math.round(e.getBoundingClientRect().width)})).filter(e=>e.right>innerWidth+1).slice(0,12)"));}
  }
 }
 await b.resize(390,844);await b.route('overview');
 const controls=await b.evaluate("['.month-control .icon-button','#top-avatar'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {selector:s,width:r.width,height:r.height}})");
 results.push({name:'Mobile tap targets at least 44px',passed:controls.every(r=>r.width>=44&&r.height>=44),controls});
 if(!process.env.POCKET_SKIP_SCREENSHOTS){await b.reset();await b.resize(1440,1000);await b.screenshot('.impeccable/review/optimization/desktop.png');await b.resize(390,844);await b.screenshot('.impeccable/review/optimization/mobile.png');await b.route('assistant');await b.fill('#assistant-input','Break down my spending by category');await b.evaluate("document.querySelector('#assistant-form').requestSubmit()");await b.until("!!document.querySelector('.assistant-turn')&&!document.querySelector('.assistant-thinking')");await b.screenshot('.impeccable/review/optimization/assistant-mobile.png');}
 assert.deepEqual(b.errors,[]);
}finally{await mkdir('.impeccable/review/optimization',{recursive:true});await writeFile('.impeccable/review/optimization/layout.json',JSON.stringify({results,errors:b.errors},null,2));await b.close();}
console.log(`${results.filter(r=>r.passed).length}/${results.length} layout checks passed.`);if(results.some(r=>!r.passed))process.exitCode=1;
