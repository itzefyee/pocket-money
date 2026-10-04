const form=document.querySelector('#login-form');
const password=document.querySelector('#password');
const error=document.querySelector('#login-error');
const submit=form.querySelector('[type=submit]');
const label=submit.querySelector('span');
let pending=false,register=false;
const switcher=document.querySelector('#account-switch');
switcher.addEventListener('click',()=>{
 if(pending)return;register=!register;error.textContent='';password.value='';password.removeAttribute('aria-invalid');
 document.querySelector('#login-heading').textContent=register?'Your fresh start.':'Hello, you.';
 document.querySelector('.login-description').textContent=register?'An empty Pocket, ready for your own money story.':'Sign in and make yourself at home.';
 document.querySelector('#name-field').hidden=!register;form.elements.name.disabled=!register;form.elements.name.required=register;
 form.elements.username.value='';form.elements.username.maxLength=register?32:80;
 password.autocomplete=register?'new-password':'current-password';password.minLength=register?12:1;
 document.querySelector('#account-hint').hidden=!register;
 document.querySelector('#account-switch-label').textContent=register?'Already have an account?':'New to Pocket?';
 switcher.textContent=register?'Sign in':'Create an account';label.textContent=register?'Create my Pocket':'Open my Pocket';
 (register?form.elements.name:form.elements.username).focus();
});
document.querySelector('#show-password').addEventListener('click',event=>{
 const show=password.type==='password';password.type=show?'text':'password';
 event.currentTarget.textContent=show?'Hide':'Show';
 event.currentTarget.setAttribute('aria-label',show?'Hide password':'Show password');
 event.currentTarget.setAttribute('aria-pressed',String(show));
});
form.addEventListener('input',()=>{error.textContent='';password.removeAttribute('aria-invalid');});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(pending)return;pending=true;submit.disabled=true;switcher.disabled=true;label.textContent=register?'Creating your Pocket...':'Opening your Pocket...';error.textContent='';
 try{
  const response=await fetch(register?'/api/auth/register':'/api/auth/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.elements.username.value,password:password.value,...register?{name:form.elements.name.value}:{}}),signal:AbortSignal.timeout(15000)});
  const result=await response.json();if(!response.ok){if(response.status===401)password.setAttribute('aria-invalid','true');throw Error(result.error||'Could not sign in. Please try again.');}
  // Verify the browser accepted the cookie before leaving this page.
  const session=await fetch('/api/capabilities',{credentials:'same-origin',signal:AbortSignal.timeout(15000)});
  if(session.status===401)throw Error('Allow cookies for this site, then sign in again.');
  if(!session.ok)throw Error('Your workspace is temporarily unavailable. Please try again.');
  password.value='';location.replace('/'+location.hash);
 }catch(reason){
  error.textContent=reason.name==='TypeError'||reason.name==='TimeoutError'?'Could not connect. Check your connection and try again.':reason.message;
  pending=false;submit.disabled=false;switcher.disabled=false;label.textContent=register?'Create my Pocket':'Open my Pocket';
  if(password.getAttribute('aria-invalid')==='true')password.focus();
 }
});
