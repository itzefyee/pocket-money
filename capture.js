let workerPromise,scriptPromise,recognition;
function loadOCR(){
 if(window.Tesseract)return Promise.resolve();if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.crossOrigin='anonymous';const timeout=setTimeout(()=>{script.remove();scriptPromise=null;reject(Error('OCR download timed out. Check your internet connection or enter the receipt manually.'));},30000);script.onload=()=>{clearTimeout(timeout);resolve();};script.onerror=()=>{clearTimeout(timeout);scriptPromise=null;reject(Error('OCR could not download. Check your connection, then try again or enter it manually.'));};document.head.append(script);});return scriptPromise;
}
let progressListener=()=>{},ocrQueue=Promise.resolve();
export function recognizeReceipt(file,onProgress=()=>{},signal){
 const job=ocrQueue.catch(()=>{}).then(()=>runOCR(file,onProgress,signal));ocrQueue=job;return job;
}
async function runOCR(file,onProgress,signal){
 signal?.throwIfAborted();progressListener=message=>{if(!signal?.aborted)onProgress(message);};await loadOCR();signal?.throwIfAborted();
 if(!workerPromise){workerPromise=window.Tesseract.createWorker('eng',1,{logger:m=>{if(m.status)progressListener(`${m.status[0].toUpperCase()+m.status.slice(1)}${m.progress?` · ${Math.round(m.progress*100)}%`:''}`);}}).catch(e=>{workerPromise=null;throw e;});}
 const worker=await workerPromise;signal?.throwIfAborted();onProgress('Reading the little details…');const result=await worker.recognize(file);signal?.throwIfAborted();if(!result.data.text.trim())throw Error('No text was found. Try a brighter, sharper photo or enter this receipt manually.');return result.data.text;
}
export function startVoice(onText,onEnd){
 stopVoice();const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech)throw Error('Voice dictation isn’t supported in this browser. Try Chrome or Edge, or type your transaction.');
 recognition=new Speech();recognition.lang='en-MY';recognition.interimResults=true;recognition.continuous=false;let ended=false;
 recognition.onresult=e=>{let text='';for(let i=0;i<e.results.length;i++)text+=e.results[i][0].transcript+' ';onText(text.trim());};
 recognition.onerror=e=>{ended=true;onEnd(({ 'not-allowed':'Microphone access was denied. Enable it in your browser, or type below.','no-speech':'Nothing heard yet. Try again or type below.',network:'Speech service is unavailable. You can type below.','audio-capture':'No microphone found. Connect one or type below.'})[e.error]||'Dictation stopped. You can edit your words below.');};
 recognition.onend=()=>{if(!ended)onEnd('Got it. Check your words below.');};recognition.start();
}
export function stopVoice(){if(recognition){recognition.onend=null;recognition.onerror=null;recognition.onresult=null;try{recognition.abort();}catch{}recognition=null;}}
export async function getCapabilities(){try{const r=await fetch('./api/capabilities',{signal:AbortSignal.timeout(4000)});return r.ok?await r.json():{ai:false};}catch{return {ai:false};}}
export async function aiExtract({text,file,signal}){
 const payload={};if(text)payload.text=text;if(file){payload.mimeType=file.type;payload.image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('This image could not be opened.'));reader.readAsDataURL(file);});}
 signal?.throwIfAborted();const requestSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(55000)]):AbortSignal.timeout(55000);
 const response=await fetch('./api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:requestSignal});const body=await response.json();if(!response.ok)throw Error(body.error||'AI extraction failed. Try on-device OCR or enter it manually.');return body.transaction;
}
