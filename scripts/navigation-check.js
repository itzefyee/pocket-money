import assert from 'node:assert/strict';
import {createServer} from '../server.js';
import {openBrowser} from './browser-tools.js';

const server=createServer({apiKey:'',accessPassword:''});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
process.env.POCKET_TEST_URL=`http://127.0.0.1:${server.address().port}/`;
let browser;
try{
 browser=await openBrowser({port:9257,profile:'navigation',width:1440,height:1000});
 const {evaluate,click,pointerClick,until,send,resize,screenshot}=browser;
 await evaluate("localStorage.clear();location.hash='overview';location.reload()");
 await until("!!document.querySelector('#navigation button')");
 const isOpen="document.querySelector('#profile-menu').matches(':popover-open')";
 const press=async key=>{const windowsVirtualKeyCode=({Escape:27,Tab:9,End:35,Home:36,ArrowUp:38,ArrowDown:40})[key];await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode});};
 await pointerClick('#profile');assert.equal(await evaluate(isOpen),true);
 assert.equal(await evaluate("document.querySelector('#profile-workspace').textContent"),'Sample workspace');
 assert.equal(await evaluate("document.querySelector('#profile-menu [data-action=sign-out]').hidden"),true);
 await screenshot('.impeccable/review/profile-expanded.png');
 await pointerClick('#profile');assert.equal(await evaluate(isOpen),false,'Clicking the same trigger closes the menu');
 await pointerClick('#profile');assert.equal(await evaluate(isOpen),true);
 await press('End');assert.equal(await evaluate('document.activeElement.id'),'profile-switch');
 await press('ArrowDown');assert.equal(await evaluate('document.activeElement.dataset.view'),'settings');
 await press('Escape');await until(`!(${isOpen})`);
 assert.equal(await evaluate('document.activeElement.id'),'profile');
 assert.equal(await evaluate("document.querySelector('#profile').getAttribute('aria-expanded')"),'false');
 await press('ArrowUp');assert.equal(await evaluate('document.activeElement.id'),'profile-switch');
 await press('Tab');assert.equal(await evaluate(isOpen),false);
 await pointerClick('#profile');await pointerClick('h1');assert.equal(await evaluate(isOpen),false);
 await pointerClick('#profile');await pointerClick('#profile-menu [data-view=settings]');
 await until("location.hash==='#settings' && !!document.querySelector('#settings-form')");
 assert.equal(await evaluate(isOpen),false);
 console.log('PASS profile menu, toggle, outside click, keyboard navigation, Escape focus and Settings');

 await evaluate("window.downloadName=null;const originalClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.downloadName=this.download;window.downloadData=fetch(this.href).then(r=>r.json());}else originalClick.call(this)}");
 await click('#profile');await click('#profile-menu [data-action=backup]');
 await until('!!window.downloadName');assert.match(await evaluate('window.downloadName'),/pocket.*\.json$/);
 assert.equal(await evaluate('window.downloadData.then(s=>s.transactions.length)'),99);
 await click('#profile');await click('#profile-switch');await until("!document.querySelector('.demo-banner') && location.hash==='#overview'");
 assert.equal(await evaluate("document.querySelector('#profile-workspace').textContent"),'Personal workspace');
 await click('#profile');await click('#profile-switch');await until("!!document.querySelector('.demo-banner')");
 console.log('PASS backup download and sample/personal workspace switching');

 await browser.fill('#quick-text','Keep this draft');
 await pointerClick('#sidebar-toggle');
 assert.equal(await evaluate("document.querySelector('.sidebar').getBoundingClientRect().width"),76);
 assert.equal(await evaluate("document.querySelector('#quick-text').value"),'Keep this draft');
 assert.equal(await evaluate("document.querySelector('#sidebar-toggle').getAttribute('aria-label')"),'Expand sidebar');
 assert.equal(await evaluate("document.querySelector('#navigation [data-view=overview]').getAttribute('aria-label')"),'Overview');
 assert.equal(await evaluate("Array.from(document.querySelectorAll('#profile,#top-avatar')).filter(e=>e.getClientRects().length).length"),1);
 await click('#profile');await screenshot('.impeccable/review/profile-collapsed.png');
 await send('Page.reload');await until("!!document.querySelector('#navigation button')");
 assert.equal(await evaluate("document.querySelector('.sidebar').getBoundingClientRect().width"),76);
 await click('#sidebar-toggle');assert.equal(await evaluate("document.querySelector('.sidebar').getBoundingClientRect().width"),218);
 await send('Page.reload');await until("!!document.querySelector('#navigation button')");
 assert.equal(await evaluate("document.querySelector('.sidebar').getBoundingClientRect().width"),218);
 console.log('PASS sidebar collapses and expands, preserves drafts, labels icons and remembers both choices');

 for(const [width,height] of [[1440,1000],[1024,768],[768,600],[390,844],[320,568],[740,390]]){
  await resize(width,height);
  const trigger=width>760?'#profile':'#top-avatar';
  assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('#profile,#top-avatar')).filter(e=>e.getClientRects().length).map(e=>'#'+e.id)"),[trigger],`One profile control at ${width}px`);
  await pointerClick(trigger);
  const fit=await evaluate("(()=>{const r=document.querySelector('#profile-menu').getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()");
  assert.ok(fit,`Menu fits ${width}x${height}`);
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,`No overflow at ${width}`);
  if(width===390)await screenshot('.impeccable/review/profile-mobile.png');
  await press('Escape');
  if(width>760){
   await pointerClick('#profile');
   assert.equal(await evaluate(isOpen),true,'Bottom profile remains reachable in short desktop viewports');
   await press('Escape');
  }else{
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#sidebar-toggle')).display"),'none');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('.sidebar')).display"),'none');
  }
 }
 await resize(768,900);
 await evaluate("localStorage.removeItem('pocket-sidebar');location.reload()");await until("!!document.querySelector('#navigation button')");
 assert.equal(await evaluate("document.querySelector('.sidebar').getBoundingClientRect().width"),76);
 await resize(1440,1000);await until("document.querySelector('.sidebar').getBoundingClientRect().width===218");
 assert.deepEqual(browser.errors,[]);
 console.log('PASS desktop, tablet, mobile, short viewport, responsive defaults and no browser exceptions');
}finally{
 await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
