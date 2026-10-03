import {icon} from './icons.js';

// Shared account menu and browser-local sidebar preference.
export function createNavigationChrome(){
 const menu=document.querySelector('#profile-menu');
 const triggers=[document.querySelector('#profile'),document.querySelector('#top-avatar')];
 const toggle=document.querySelector('#sidebar-toggle');
 const compact=matchMedia('(max-width:980px)');
 let opener=null,preference=null;
 try{const saved=localStorage.getItem('pocket-sidebar');if(['expanded','collapsed'].includes(saved))preference=saved;}catch{}
 toggle.innerHTML=icon('panel',19);
 document.querySelector('#profile-icon').innerHTML=icon('chevrondown',16);
 menu.innerHTML=`<div class="profile-menu-heading"><strong id="profile-menu-name"></strong><small id="profile-menu-workspace"></small></div>
  <button role="menuitem" tabindex="-1" data-view="settings">${icon('settings',18)} Settings</button>
  <button role="menuitem" tabindex="-1" data-action="backup">${icon('download',18)} Download backup</button>
  <button role="menuitem" tabindex="-1" id="profile-switch">${icon('wallet',18)} <span></span></button>
  <button role="menuitem" tabindex="-1" data-action="sign-out" class="profile-sign-out" hidden>${icon('logout',18)} Sign out</button>`;
 const items=()=>Array.from(menu.querySelectorAll('[role=menuitem]')).filter(el=>!el.hidden&&!el.disabled);
 function close(){if(menu.matches(':popover-open'))menu.hidePopover();}
 function sidebar(){
  const collapsed=preference?preference==='collapsed':compact.matches;
  document.body.classList.toggle('sidebar-collapsed',collapsed);
  toggle.setAttribute('aria-expanded',String(!collapsed));
  toggle.setAttribute('aria-label',collapsed?'Expand sidebar':'Collapse sidebar');
  toggle.title=collapsed?'Expand sidebar':'Collapse sidebar';
 }
 toggle.addEventListener('click',()=>{
  close();preference=document.body.classList.contains('sidebar-collapsed')?'expanded':'collapsed';
  try{localStorage.setItem('pocket-sidebar',preference);}catch{}
  sidebar();
 });
 compact.addEventListener('change',sidebar);
 window.addEventListener('storage',event=>{if(event.key==='pocket-sidebar'){preference=['expanded','collapsed'].includes(event.newValue)?event.newValue:null;sidebar();close();}});
 function open(trigger,last=false){
  opener=trigger;
  menu.showPopover({source:trigger});
  triggers.forEach(el=>el.setAttribute('aria-expanded',String(el===trigger)));
  const anchor=trigger.getBoundingClientRect(),box=menu.getBoundingClientRect();
  const bottom=trigger.id==='profile';
  const rail=bottom&&document.body.classList.contains('sidebar-collapsed');
  const x=rail?document.querySelector('.sidebar').getBoundingClientRect().right+8:bottom?anchor.left:anchor.right-box.width;
  const y=bottom?rail?anchor.bottom-box.height:anchor.top-box.height-8:anchor.bottom+8;
  menu.style.left=Math.max(8,Math.min(x,document.documentElement.clientWidth-box.width-8))+'px';
  menu.style.top=Math.max(8,Math.min(y,innerHeight-box.height-8))+'px';
  const options=items();(last?options.at(-1):options[0])?.focus({preventScroll:true});
 }
 for(const trigger of triggers){
  trigger.setAttribute('popovertarget','profile-menu');
  trigger.addEventListener('click',event=>{event.preventDefault();const same=opener===trigger&&menu.matches(':popover-open');close();if(!same)open(trigger);});
  trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();close();open(trigger,event.key==='ArrowUp');}});
 }
 menu.addEventListener('beforetoggle',event=>{
  if(event.newState==='closed'){
   triggers.forEach(el=>el.setAttribute('aria-expanded','false'));
   if(menu.contains(document.activeElement))opener?.focus({preventScroll:true});
  }
 });
 menu.addEventListener('click',event=>{if(event.target.closest('[role=menuitem]'))close();});
 menu.addEventListener('keydown',event=>{
  if(event.key==='Tab'){close();return;}
  const options=items(),index=options.indexOf(document.activeElement);
  const next=event.key==='ArrowDown'?(index+1)%options.length:event.key==='ArrowUp'?(index-1+options.length)%options.length:event.key==='Home'?0:event.key==='End'?options.length-1:null;
  if(next!==null){event.preventDefault();options[next]?.focus();}
 });
 window.addEventListener('resize',close);
 window.addEventListener('hashchange',close);
 window.addEventListener('scroll',close,{passive:true});
 sidebar();
 return {update({name,mode,storageMode}){
  const workspace=mode==='demo'?'Sample workspace':'Personal workspace';
  document.querySelector('#profile-workspace').textContent=workspace;
  document.querySelector('#profile-menu-name').textContent=name;
  document.querySelector('#profile-menu-workspace').textContent=workspace;
  triggers.forEach(el=>{el.setAttribute('aria-label',`${name}, open profile menu`);el.title=`${name} - ${workspace}`;});
  const switcher=document.querySelector('#profile-switch');
  switcher.dataset.action=mode==='demo'?'start-personal':'switch-demo';
  switcher.querySelector('span').textContent=mode==='demo'?'Open personal workspace':'Explore sample workspace';
  menu.querySelector('[data-action=sign-out]').hidden=storageMode!=='database';
 }};
}
