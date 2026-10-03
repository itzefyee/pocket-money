const form=document.querySelector('#login-form');
const password=document.querySelector('#password');
const error=document.querySelector('#login-error');
const submit=form.querySelector('[type=submit]');
const label=submit.querySelector('span');
let pending=false;
document.querySelector('#show-password').addEventListener('click',event=>{
 const show=password.type==='password';password.type=show?'text':'password';
 event.currentTarget.textContent=show?'Hide':'Show';
 event.currentTarget.setAttribute('aria-label',show?'Hide password':'Show password');
 event.currentTarget.setAttribute('aria-pressed',String(show));
});
form.addEventListener('input',()=>{error.textContent='';password.removeAttribute('aria-invalid');});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(pending)return;pending=true;submit.disabled=true;label.textContent='Opening your Pocket...';error.textContent='';
 try{
  const response=await fetch('/api/auth/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.elements.username.value,password:password.value}),signal:AbortSignal.timeout(15000)});
  const result=await response.json();if(!response.ok){if(response.status===401)password.setAttribute('aria-invalid','true');throw Error(result.error||'Could not sign in. Please try again.');}
  // Verify the browser accepted the cookie before leaving this page.
  const session=await fetch('/api/capabilities',{credentials:'same-origin',signal:AbortSignal.timeout(15000)});
  if(session.status===401)throw Error('Allow cookies for this site, then sign in again.');
  if(!session.ok)throw Error('Your workspace is temporarily unavailable. Please try again.');
  password.value='';location.replace('/'+location.hash);
 }catch(reason){
  error.textContent=reason.name==='TypeError'||reason.name==='TimeoutError'?'Could not connect. Check your connection and try again.':reason.message;
  pending=false;submit.disabled=false;label.textContent='Open my Pocket';
  if(password.getAttribute('aria-invalid')==='true')password.focus();
 }
});
