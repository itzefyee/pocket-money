import {CATEGORIES,validDate,today as localToday,balances,cents} from './domain.js';

const KINDS=['summary','search','breakdown','compare','budget','largest','balance','clarify'];
const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
const aliases=[['Food & drinks',/\b(food|dining|meals?|eating out|restaurants?)\b/i],['Groceries',/\b(grocer(?:y|ies)|supermarkets?)\b/i],['Shopping',/\b(shopping|clothes|clothing)\b/i],['Transport',/\b(transport(?:ation)?|commut(?:e|ing)|petrol|fuel)\b/i],['Bills & home',/\b(bills?|utilities|rent|home)\b/i],['Health & fitness',/\b(health|fitness|gym|medical)\b/i],['Entertainment',/\b(entertainment|movies?|games?)\b/i],['Travel',/\b(travel|holidays?|trips?)\b/i],['Salary',/\b(salary|payroll)\b/i],['Freelance',/\b(freelance)\b/i],['Other',/\b(other|uncategori[sz]ed)\b/i]];
const iso=d=>d.toISOString().slice(0,10);
const date=s=>new Date(s+'T12:00:00Z');
const shift=(s,n)=>{const d=date(s);d.setUTCDate(d.getUTCDate()+n);return iso(d);};
const endMonth=m=>{const d=date(m+'-01');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return iso(d);};
const monthOffset=(m,n)=>{const d=date(m+'-01');d.setUTCMonth(d.getUTCMonth()+n);return iso(d).slice(0,7);};
const has=(q,word)=>new RegExp('\\b'+word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(q);
const clarify=message=>({kind:'clarify',message});
function basePlan(context){const today=context.today||localToday(),month=context.month||today.slice(0,7);return {kind:'summary',type:'expense',start:month+'-01',end:month===today.slice(0,7)?today:endMonth(month),category:null,account:null,search:'',min:null,max:null,groupBy:'category',sort:'date',compareStart:null,compareEnd:null};}

export function validatePlan(input,context={}){
 if(!input||typeof input!=='object'||!KINDS.includes(input.kind))throw Error('Unknown question type.');
 if(input.kind==='clarify')return clarify(typeof input.message==='string'?input.message.slice(0,300):'Please ask about recorded spending, income, budgets or a specific merchant.');
 const p={...basePlan(context)};
 for(const key of Object.keys(p))if(input[key]!==undefined)p[key]=input[key];
 if(!['expense','income','transfer'].includes(p.type))throw Error('Unknown transaction type.');
 if(p.kind==='budget'&&p.type!=='expense')throw Error('Budgets use expense transactions.');
 if(!validDate(p.start)||!validDate(p.end)||p.start>p.end)throw Error('Invalid date range.');
 if(p.category!==null&&!CATEGORIES.includes(p.category))throw Error('Unknown category.');
 if(p.account!==null&&!(context.accounts||[]).some(a=>a.id===p.account))throw Error('Unknown account.');
 if(typeof p.search!=='string'||p.search.length>200)throw Error('Invalid merchant search.');
 for(const key of ['min','max'])if(p[key]!==null&&(!Number.isSafeInteger(p[key])||p[key]<0||p[key]>99999999999))throw Error('Invalid amount filter.');
 if(p.min!==null&&p.max!==null&&p.min>p.max)throw Error('Amount range is reversed.');
 if(!['category','merchant','account','month'].includes(p.groupBy))throw Error('Unknown grouping.');
 if(!['date','amount'].includes(p.sort))throw Error('Unknown sort.');
 if(p.compareStart!==null||p.compareEnd!==null){if(!validDate(p.compareStart)||!validDate(p.compareEnd)||p.compareStart>p.compareEnd)throw Error('Invalid comparison range.');}
 if(p.kind!=='compare'){p.compareStart=null;p.compareEnd=null;}
 p.search=p.search.trim().toLowerCase();return p;
}

function interpretDates(q,p,context){
 const today=context.today||localToday(),current=today.slice(0,7);let explicit=false;
 const dates=q.match(/\b\d{4}-\d{2}-\d{2}\b/g)||[];
 if(dates.length){if(dates.some(d=>!validDate(d))||dates.length>2)return {error:'Use a valid date or a range such as 2026-09-01 to 2026-09-30.'};p.start=dates[0];p.end=dates[1]||dates[0];if(dates.length===1){if(/\b(?:since|from)\b/.test(q))p.end=today;else if(/\bafter\b/.test(q)){p.start=shift(p.start,1);p.end=today;}else if(/\bbefore\b/.test(q)){p.end=shift(p.end,-1);p.start='0001-01-01';}else if(/\b(?:until|through)\b/.test(q))p.start='0001-01-01';}explicit=true;}
 else if(/\b(all time|ever|all my (?:expenses|transactions|spending|income)|everything)\b/.test(q)){p.start='0001-01-01';p.end='9999-12-31';explicit=true;}
 else if(/\byesterday\b/.test(q)){p.start=p.end=shift(today,-1);explicit=true;}
 else if(/\btoday\b/.test(q)){p.start=p.end=today;explicit=true;}
 else if(/\b(last|past)\s+(\d+)\s+days?\b/.test(q)){const n=Number(q.match(/\b(?:last|past)\s+(\d+)\s+days?\b/)[1]);if(n<1||n>3660)return {error:'Choose a period between 1 and 3,660 days.'};p.start=shift(today,1-n);p.end=today;explicit=true;}
 else if(/\b(last|past)\s+(\d+)\s+months?\b/.test(q)){const n=Number(q.match(/\b(?:last|past)\s+(\d+)\s+months?\b/)[1]);if(n<1||n>120)return {error:'Choose between 1 and 120 complete calendar months.'};p.start=monthOffset(current,-n)+'-01';p.end=endMonth(monthOffset(current,-1));explicit=true;}
 else if(/\b(this|last) week\b/.test(q)){const weekday=(date(today).getUTCDay()+6)%7;const monday=shift(today,-weekday);const last=/\blast week\b/.test(q);p.start=last?shift(monday,-7):monday;p.end=last?shift(monday,-1):today;explicit=true;}
 else if(/\b(this|last) year\b/.test(q)){const last=/\blast year\b/.test(q),year=Number(today.slice(0,4))-(last?1:0);p.start=`${year}-01-01`;p.end=last?`${year}-12-31`:today;explicit=true;}
 else if(/\bthis month\b/.test(q)){p.start=current+'-01';p.end=today;explicit=true;}
 else if(/\b(last|previous) month\b/.test(q)){const m=monthOffset(current,-1);p.start=m+'-01';p.end=endMonth(m);explicit=true;}
 else {
  const matches=MONTHS.map((name,i)=>({name,i,match:q.match(new RegExp(`\\b(?:${name}|${name.slice(0,3)})\\b(?:\\s+(20\\d{2}))?`))})).filter(x=>x.match);
  if(matches.length>1)return {error:'For a range across months, use exact dates, for example “from 2026-08-01 to 2026-09-30”.'};
  if(matches.length){const {i,match}=matches[0],year=match[1]||today.slice(0,4),m=`${year}-${String(i+1).padStart(2,'0')}`;p.start=m+'-01';p.end=endMonth(m);explicit=true;}
  else{const year=q.match(/\b(?:in|for|during)\s+(20\d{2})\b/);if(year){p.start=year[1]+'-01-01';p.end=year[1]===today.slice(0,4)?today:year[1]+'-12-31';explicit=true;}}
 }
 if(p.start>p.end)return {error:'The end date must be on or after the start date.'};return {explicit};
}

function cleanSearch(value){return value.replace(/\b(?:last|past)\s+\d+\s+(?:days?|months?)\b.*$/,'').replace(/\b(?:this|last|previous)\s+(?:month|week|year)\b.*$/,'').replace(/\b(?:today|yesterday|all time)\b.*$/,'').replace(/\b(?:in|during)\s+(?:20\d{2}|jan\w*|feb\w*|mar\w*|apr\w*|may|jun\w*|jul\w*|aug\w*|sep\w*|oct\w*|nov\w*|dec\w*)\b.*$/,'').replace(/\b(?:over|above|under|below|more than|less than|at least|at most|between|from|since|before|after|paid|using|with)\b.*$/,'').replace(/\b(?:payments?|transactions?|expenses?|spending|purchases?|receipts?)\b/g,'').replace(/\b\d{4}-\d{2}-\d{2}\b.*$/,'').replace(/[?!.]+$/,'').replace(/\s+/g,' ').trim();}

export function interpretQuestion(question,context={}){
 if(typeof question!=='string'||!question.trim())return clarify('Ask a question about your spending, or choose one below.');
 const q=question.toLowerCase().trim().replace(/[’]/g,"'");if(q.length>1000)return clarify('Keep your question under 1,000 characters.');
 if(/\b(delete|remove|change|edit|create|add|send|buy|sell|invest|bitcoin|crypto|stock|predict|forecast|tomorrow|quarter|fortnight|weekends?|weekdays?|median|recurring|subscriptions?)\b/.test(q))return clarify('I can search and summarize recorded transactions. Try a merchant, category, date range, budget or month-to-month comparison. Changes to records still happen in the transaction editor.');
 if(/\b(?:except|excluding|exclude|without|not including|not from)\b/.test(q))return clarify('For exclusions, ask about one category, merchant or account at a time so I can show the exact scope.');
 const follow=/^(and\b|what about\b|how about\b|same\b|break (?:that|it|those)\b|show (?:those|them|the matching)\b|why\b|compare (?:that|those|it)\b)/.test(q);
 let p=follow&&context.previous&&context.previous.kind!=='clarify'?validatePlan(context.previous,context):basePlan(context);
 if(follow&&!context.previous&&!/what about|how about/.test(q))return clarify('Start with a question such as “How much did I spend on food this month?” Then we can dig into it.');
 const dates=interpretDates(q,p,context);if(dates.error)return clarify(dates.error);
 if(dates.explicit){p.compareStart=null;p.compareEnd=null;}
 if(/\bbetween\b/.test(q)&&!/\d{4}-\d{2}-\d{2}/.test(q))return clarify('Use “over RM 20” or “under RM 50”, or an exact date range. Amount-between filters are not supported in on-device mode.');
 const categoryMatches=aliases.filter(([name,re])=>re.test(q)||q.includes(name.toLowerCase()));
 if(categoryMatches.length>1)return clarify('Ask about one category at a time, or say “Break down spending by category” to compare every category.');
 let recognized=categoryMatches.length>0||follow;
 const previousType=p.type;
 if(categoryMatches.length){p.category=categoryMatches[0][0];p.search='';p.type=['Salary','Freelance'].includes(p.category)?'income':'expense';}
 if(/\b(income|earn(?:ed|ings)?|salary|payroll)\b/.test(q)){p.type='income';recognized=true;}
 if(/\b(expenses?|spend|spent|spending|payments?|purchases?)\b/.test(q)){p.type='expense';recognized=true;}
 if(/\btransfers?\b/.test(q)){p.type='transfer';recognized=true;}
 if(follow&&p.type!==previousType&&!categoryMatches.length)p.category=null;
 if(follow&&['budget','balance'].includes(p.kind)&&/\b(income|earn(?:ed|ings)?|expenses?|spend|spent|spending|transfers?)\b/.test(q))p.kind='summary';
 if(/\ball categories\b/.test(q))p.category=null;
 const accountText=q.replace(/\bcash flow\b/g,'cashflow');
 const namedAccounts=(context.accounts||[]).filter(a=>has(accountText,a.name)||has(accountText,a.id));
 if(namedAccounts.length>1)return clarify('Choose one account, or ask for a breakdown by account.');
 if(namedAccounts.length){p.account=namedAccounts[0].id;recognized=true;}
 else if(/\b(tng|touch\s*'?n'?\s*go|e-?wallet)\b/.test(q)){p.account=(context.accounts||[]).find(a=>a.id==='ewallet')?.id||null;recognized=!!p.account||recognized;}
 if(/\ball accounts\b/.test(q))p.account=null;
 const amounts=[...q.matchAll(/\b(over|above|more than|under|below|less than|at least|at most)\s*(?:rm|myr|usd|sgd|eur|gbp|\$)?\s*(-?\d[\d,.]*)/g)];
 const amountPrefixes=[...q.matchAll(/\b(?:over|above|more than|under|below|less than|at least|at most)\s*(?=rm|myr|usd|sgd|eur|gbp|\$|-?\d)/g)];
 if(amounts.length!==amountPrefixes.length)return clarify('Use a positive amount, for example “over RM 20” or “under RM 50”.');
 let lower=null,upper=null;
 for(const amount of amounts){let n;const valueText=amount[2].replace(/[.,]$/,'');try{n=/^0(?:\.0{1,2})?$/.test(valueText)?0:cents(valueText);}catch{return clarify('Use a valid positive amount, with commas only as thousands separators and at most two decimal places.');}const op=amount[1];if(['over','above','more than','at least'].includes(op)){const value=n+(op==='at least'?0:1);lower=lower===null?value:Math.max(lower,value);}else{const value=n-(op==='at most'?0:1);upper=upper===null?value:Math.min(upper,value);}recognized=true;}
 if(lower!==null)p.min=lower;if(upper!==null)p.max=upper;
 const quoted=q.match(/["“]([^"”]+)["”]/);
 const at=q.match(/\b(?:at|for merchant|merchant named|containing|called)\s+(.+)/);
 const on=q.match(/\b(?:spend|spent|spending|expenses?|payments?)\s+(?:on|for)\s+(.+)/);
 const find=q.match(/^(?:find|search(?: for)?|show(?: me)?)\s+(.+)/);
 const knownMerchant=/\b(grab|zus|coffee|netflix|spotify|shopee|lazada|uniqlo|shell|jaya|lotus|unifi|village park|bookxcess)\b/.exec(q);
 if(quoted){p.search=quoted[1].trim();p.category=null;recognized=true;}
 else if(at&&!/^(least|most)\b/.test(at[1])){p.search=cleanSearch(at[1]);p.category=null;recognized=true;}
 else if(on&&!categoryMatches.length&&!namedAccounts.length){p.search=cleanSearch(on[1]);recognized=true;}
 else if(knownMerchant&&!categoryMatches.length){p.search=knownMerchant[1];recognized=true;}
 else if(find&&!categoryMatches.length&&!namedAccounts.length){const residual=cleanSearch(find[1]).replace(/^(my|all my|all|the|matching)(?:\s+|$)/,'').trim();if(residual&&!/^(those|them|category|categories|income|transfers|cash\s*flow|biggest|largest|highest|most expensive|top\b|balances?|budgets?|by\b|in\b|for\b)/.test(residual)){p.search=residual;recognized=true;}}
 if(/\b(balance|balances|net worth)\b/.test(q)){p.kind='balance';p.start='0001-01-01';if(!dates.explicit)p.end=context.today||localToday();recognized=true;}
 else if(/\b(compare|comparison|versus|vs|higher|lower|increase|decrease|changed|change in)\b/.test(q)||/^why\b/.test(q)){p.kind='compare';recognized=true;}
 else if(/\b(budgets?|cut back|save more|saving|overspend|overspent|afford)\b/.test(q)){p.kind='budget';p.type='expense';recognized=true;}
 else if(/\b(biggest|largest|highest|most expensive|top\s+\d+\s+(?:expenses|transactions|purchases))\b/.test(q)){p.kind='largest';p.sort='amount';recognized=true;}
 else if(/\b(break\s*down|breakdown|by category|by merchant|by account|by month|where.*(?:go|went)|top merchants)\b/.test(q)){p.kind='breakdown';recognized=true;}
 else if(/^(?:find|search|show)\b/.test(q)){p.kind='search';}
 else if(!follow)p.kind='summary';
 if(/\b(?:by merchant|top merchants)\b/.test(q))p.groupBy='merchant';else if(/\bby account\b/.test(q))p.groupBy='account';else if(/\bby month\b/.test(q))p.groupBy='month';else if(/\b(?:by category|categories)\b/.test(q))p.groupBy='category';
 if(/\b(?:income\s*(?:vs|versus|and)|cashflow|cash flow|overview|summary|how am i doing)\b/.test(q)){p.kind='summary';p.type='expense';recognized=true;}
 if(p.kind==='compare'&&p.compareStart===null){
  const m=p.start.slice(0,7),previous=monthOffset(m,-1),fullEnd=endMonth(m);
  if(p.start.endsWith('-01')&&p.end.slice(0,7)===m){p.compareStart=previous+'-01';p.compareEnd=p.end===fullEnd?endMonth(previous):`${previous}-${String(Math.min(Number(p.end.slice(8)),Number(endMonth(previous).slice(8)))).padStart(2,'0')}`;}
  else{const days=Math.round((date(p.end)-date(p.start))/86400000)+1;if(days>3660)return clarify('Choose a shorter date range to compare with the preceding period.');p.compareEnd=shift(p.start,-1);p.compareStart=shift(p.start,-days);}
 }
 if(p.kind==='compare'&&/this month/.test(q)&&/last month/.test(q)){p.compareStart=monthOffset((context.today||localToday()).slice(0,7),-1)+'-01';const prev=p.compareStart.slice(0,7);p.compareEnd=`${prev}-${String(Math.min(Number(p.end.slice(8)),Number(endMonth(prev).slice(8)))).padStart(2,'0')}`;}
 if(!recognized)return clarify('I can total spending, find a merchant, compare periods or check budgets. Try “Find ZUS”, “Food spending this month” or “Break down expenses by category”.');
 try{return validatePlan(p,context);}catch{return clarify('I couldn’t match that date, account or amount. Try one merchant or category with a clear date range.');}
}

function filterRows(state,p,start=p.start,end=p.end){
 return state.transactions.filter(t=>t.date>=start&&t.date<=end&&t.type===p.type&&(!p.category||t.category===p.category)&&(!p.account||t.account===p.account||(t.type==='transfer'&&t.toAccount===p.account))&&(!p.search||`${t.merchant} ${t.note||''}`.toLowerCase().includes(p.search))&&(p.min===null||t.amount>=p.min)&&(p.max===null||t.amount<=p.max));
}
function grouped(rows,by,accounts){
 const groups=new Map();for(const t of rows){const key=by==='merchant'?t.merchant:by==='account'?(accounts.find(a=>a.id===t.account)?.name||t.account):by==='month'?t.date.slice(0,7):t.category;const g=groups.get(key)||{name:key,total:0,count:0};g.total+=t.amount;g.count++;groups.set(key,g);}return [...groups.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
}
export function answerQuery(state,input,context={}){
 const p=validatePlan(input,{...context,accounts:state.accounts});if(p.kind==='clarify')return p;
 const rows=filterRows(state,p).sort((a,b)=>p.sort==='amount'||p.kind==='largest'?b.amount-a.amount||b.date.localeCompare(a.date):b.date.localeCompare(a.date)||b.amount-a.amount);
 const total=rows.reduce((n,t)=>n+t.amount,0);const result={kind:p.kind,plan:p,total,count:rows.length,rows,groups:grouped(rows,p.groupBy,state.accounts),average:rows.length?Math.round(total/rows.length):0};
 if(p.kind==='compare'){
  if(!p.compareStart||!p.compareEnd)return clarify('Choose a comparison period, for example “Compare this month with last month”.');
  const previous=filterRows(state,p,p.compareStart,p.compareEnd),previousTotal=previous.reduce((n,t)=>n+t.amount,0),currentGroups=grouped(rows,'category',state.accounts),previousGroups=grouped(previous,'category',state.accounts);
  Object.assign(result,{previousRows:previous,previousTotal,previousStart:p.compareStart,previousEnd:p.compareEnd,delta:total-previousTotal,percentChange:previousTotal?Math.round((total-previousTotal)/previousTotal*1000)/10:null,drivers:[...new Set([...currentGroups,...previousGroups].map(g=>g.name))].map(name=>({name,current:currentGroups.find(g=>g.name===name)?.total||0,previous:previousGroups.find(g=>g.name===name)?.total||0})).map(g=>({...g,delta:g.current-g.previous})).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))});
 }
 if(p.kind==='budget'){
  if(p.start.slice(0,7)!==p.end.slice(0,7)||!p.start.endsWith('-01')||p.search||p.account||p.min!==null||p.max!==null)return clarify('Budgets are monthly category limits. Ask “How are my budgets this month?” or name a category without merchant, account or amount filters.');
  const spending=grouped(rows,'category',state.accounts);result.budgets=Object.entries(state.budgets).filter(([name])=>!p.category||name===p.category).map(([name,limit])=>{const spent=spending.find(g=>g.name===name)?.total||0;return {name,limit,spent,remaining:limit-spent,percent:Math.round(spent/limit*100)};}).sort((a,b)=>b.percent-a.percent);
  const unbudgeted=spending.filter(g=>state.budgets[g.name]===undefined);result.unbudgeted=unbudgeted;
 }
 if(p.kind==='balance'){
  if(p.category||p.search||p.min!==null||p.max!==null)return clarify('Account balances use every recorded entry and the opening balance. Ask “What is my balance?” or name an account.');
  const b=balances(state.accounts,state.transactions.filter(t=>t.date<=p.end));result.accounts=state.accounts.filter(a=>!p.account||a.id===p.account).map(a=>({name:a.name,total:b[a.id]}));result.total=result.accounts.reduce((s,a)=>s+a.total,0);result.rows=state.transactions.filter(t=>t.date<=p.end&&(!p.account||t.account===p.account||t.toAccount===p.account)).sort((a,b)=>b.date.localeCompare(a.date));result.count=result.rows.length;
 }
 if(p.kind==='summary'&&!p.category&&!p.account&&!p.search&&p.min===null&&p.max===null){const period=state.transactions.filter(t=>t.date>=p.start&&t.date<=p.end);result.income=period.filter(t=>t.type==='income').reduce((n,t)=>n+t.amount,0);result.expenses=period.filter(t=>t.type==='expense').reduce((n,t)=>n+t.amount,0);result.net=result.income-result.expenses;}
 return result;
}
