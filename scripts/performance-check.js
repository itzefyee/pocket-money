import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser-tools.js';
const stage=process.argv[2]||'after';
const b=await openBrowser({port:9247,profile:'performance',init:`window.perfEntries={lcp:0,cls:0,longTasks:[]};for(const type of ['largest-contentful-paint','layout-shift','longtask'])try{new PerformanceObserver(list=>{for(const e of list.getEntries()){if(type==='largest-contentful-paint')window.perfEntries.lcp=e.startTime;if(type==='layout-shift'&&!e.hadRecentInput)window.perfEntries.cls+=e.value;if(type==='longtask')window.perfEntries.longTasks.push(e.duration);}}).observe({type,buffered:true});}catch{}`});
try{
 await b.reset();
 await b.evaluate(`(async()=>{const {demoState}=await import('./seed.js');const s=demoState(),source=s.transactions;s.transactions=Array.from({length:10000},(_,i)=>({...source[i%source.length],id:'perf-'+i,merchant:'Merchant '+(i%40)}));localStorage.setItem('pocket-demo',JSON.stringify(s))})()`);
 await b.send('Page.reload');
 await b.until("!!document.querySelector('#quick-form')");
 await b.send('Emulation.setCPUThrottlingRate',{rate:4});
 const loading=await b.evaluate(`({lcpMs:Math.round(window.perfEntries.lcp),cls:window.perfEntries.cls,resources:performance.getEntriesByType('resource').length,encodedBytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.encodedBodySize,0)})`);
 const series={};
 async function measure(name,expression){const timings=[];for(let i=0;i<6;i++)timings.push(await b.evaluate(`(()=>{const i=${i},start=performance.now();${expression};document.querySelector('#page').getBoundingClientRect();return performance.now()-start;})()`));timings.shift();timings.sort((a,b)=>a-b);series[name]={medianMs:+timings[2].toFixed(1),maxMs:+timings.at(-1).toFixed(1)};console.log(name,series[name]);}
 await measure('dashboardChartToggle',"document.querySelector('[data-chart=spending]').click();document.querySelector('[data-chart=cashflow]').click()");
 await measure('dashboardMonthRoundTrip',"document.querySelector('[data-action=month-prev]').click();document.querySelector('[data-action=month-next]').click()");
 await b.route('transactions');
 await measure('transactionSearch',"const e=document.querySelector('#transaction-search');e.value=i%2?'Merchant 1':'Merchant';e.dispatchEvent(new Event('input',{bubbles:true}))");
 await b.route('assistant');
 for(let i=0;i<10;i++){await b.fill('#assistant-input','Break down all my expenses by merchant');await b.evaluate("document.querySelector('#assistant-form').requestSubmit()");await b.until(`document.querySelectorAll('.assistant-turn').length===${i+1}&&!document.querySelector('.assistant-thinking')`);}
 await measure('tenAnswerConversationRefresh',"document.querySelector('[data-action=month-prev]').click();document.querySelector('[data-action=month-next]').click()");
 const result={fixtureRows:10000,cpuThrottle:4,method:'Median and max of 5 synchronous interaction samples after warm-up; includes layout. Chart and month samples each perform a round trip. Headless Edge lab results, not field Core Web Vitals.',loading,series,errors:b.errors};
 await mkdir('.impeccable/review/optimization',{recursive:true});await writeFile(`.impeccable/review/optimization/performance-${stage}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await b.close();}
