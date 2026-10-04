export const CATEGORIES = ['Food & drinks','Groceries','Shopping','Transport','Bills & home','Health & fitness','Entertainment','Travel','Other','Salary','Freelance'];
export const COLORS = ['#244e3f','#aec09d','#e6ac8a','#a8b9c8','#c7b0c4','#c7be86','#7b9990','#b6a699','#a9ada7','#244e3f','#aec09d'];
export const today = () => { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export function cents(value) {
 const raw=String(value).trim();if(raw.includes(',')&&!/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(raw))throw new Error('Use commas only as thousands separators.');const s=raw.replace(/,/g,'');
 if(!/^\d+(\.\d{1,2})?$/.test(s))throw new Error('Enter a positive amount with up to two decimal places.');
 const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n)||n<=0||n>99999999999)throw new Error('Amount must be between 0.01 and 999,999,999.99.');return n;
}
export function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
export function validateTransaction(t) {
 if(!t||!Number.isSafeInteger(t.amount)||t.amount<=0||t.amount>99999999999)throw new Error('Enter a valid positive amount.');
 if(!validDate(t.date))throw new Error('Choose a valid date.');
 if(!['income','expense','transfer'].includes(t.type))throw new Error('Choose a transaction type.');
 if(typeof t.merchant!=='string'||!t.merchant.trim()||t.merchant.length>200)throw new Error('Add a description (up to 200 characters).');
 if(!CATEGORIES.includes(t.category))throw new Error('Choose a category.');
 if(typeof t.account!=='string'||!t.account)throw new Error('Choose an account.');
 if(t.type==='transfer'&&(!t.toAccount||t.toAccount===t.account))throw new Error('Transfer to a different account.');
 return {...t,merchant:t.merchant.trim(),note:String(t.note||'').slice(0,1000)};
}
export function validateState(s){
 if(!s||s.version!==1||!Array.isArray(s.transactions)||!Array.isArray(s.accounts)||!Array.isArray(s.goals)||!s.budgets||!s.settings)throw Error('This is not a Pocket backup.');
 if(s.transactions.length>50000||s.accounts.length<1||s.accounts.length>50||s.goals.length>100)throw Error('Backup exceeds workspace limits.');
 const ids=new Set();for(const a of s.accounts){if(typeof a.id!=='string'||!a.id||ids.has(a.id)||typeof a.name!=='string'||!a.name.trim()||a.name.length>80||!Number.isSafeInteger(a.opening))throw Error('Invalid account in backup.');ids.add(a.id);}
 const transactionIds=new Set();s.transactions=s.transactions.map(t=>{const v=validateTransaction(t);if(typeof t.id!=='string'||transactionIds.has(t.id)||!ids.has(t.account)||(t.type==='transfer'&&!ids.has(t.toAccount)))throw Error('Invalid transaction account or ID.');transactionIds.add(t.id);return v;});
 let budgetTotal=0n;for(const [k,n] of Object.entries(s.budgets)){if(!CATEGORIES.includes(k)||!Number.isSafeInteger(n)||n<=0)throw Error('Invalid budget.');budgetTotal+=BigInt(n);}
 if(budgetTotal>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Budget total is too large to calculate safely.');
 const accountTotals=new Map(s.accounts.map(a=>[a.id,BigInt(a.opening)]));
 for(const t of s.transactions){const amount=BigInt(t.amount);accountTotals.set(t.account,accountTotals.get(t.account)+(t.type==='income'?amount:-amount));if(t.type==='transfer')accountTotals.set(t.toAccount,accountTotals.get(t.toAccount)+amount);}
 for(const total of accountTotals.values())if(total>BigInt(Number.MAX_SAFE_INTEGER)||total<BigInt(Number.MIN_SAFE_INTEGER))throw Error('Account balance is too large to calculate safely.');
 const goalIds=new Set();for(const g of s.goals){if(typeof g.id!=='string'||goalIds.has(g.id)||typeof g.name!=='string'||g.name.length>100||!g.name.trim()||!Number.isSafeInteger(g.target)||g.target<=0||!Number.isSafeInteger(g.saved)||g.saved<0)throw Error('Invalid savings goal.');goalIds.add(g.id);}
 if(!['MYR','USD','SGD','EUR','GBP'].includes(s.settings.currency))throw Error('Unsupported currency.');s.settings.name=String(s.settings.name||'').slice(0,60);return s;
}
export function summarize(transactions,month){
 const rows=transactions.filter(t=>t.date.startsWith(month));const categories={};let income=0,expense=0;
 for(const t of rows){if(t.type==='income')income+=t.amount;if(t.type==='expense'){expense+=t.amount;categories[t.category]=(categories[t.category]||0)+t.amount;}}
 return {rows,income,expense,net:income-expense,categories};
}
export function balances(accounts,transactions){
 const b=Object.fromEntries(accounts.map(a=>[a.id,a.opening]));
 for(const t of transactions){if(!(t.account in b))continue;b[t.account]+=t.type==='income'?t.amount:-t.amount;if(t.type==='transfer'&&t.toAccount in b)b[t.toAccount]+=t.amount;}return b;
}
export function categoryFor(text){
 const rules=[['Salary',/salary|payroll|gaji/i],['Freelance',/freelance|client|invoice/i],['Groceries',/grocer|jaya|lotus|tesco|aeon|vegetable|supermarket|99 speed/i],['Food & drinks',/coffee|lunch|dinner|breakfast|cafe|café|food|restaurant|makan|kopi|zus|nasi|tealive/i],['Transport',/grab|petrol|fuel|train|mrt|lrt|parking|toll|bus|shell/i],['Bills & home',/rent|electric|water bill|internet|wifi|utility|tenaga|unifi/i],['Health & fitness',/gym|fitness|pharmacy|doctor|health|clinic/i],['Entertainment',/netflix|spotify|movie|cinema|anime|game/i],['Travel',/flight|hotel|airbnb|airasia/i],['Shopping',/shop|mouse|keyboard|shopee|lazada|pinduoduo|uniqlo|clothes|book/i]];
 return rules.find(([,r])=>r.test(text))?.[0]||'Other';
}
export function parseEntry(text,date=today()){
 const withoutDates=text.replace(/\b\d{4}-\d{2}-\d{2}\b/g,'').replace(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/g,'');
 const currency=[...withoutDates.matchAll(/(?:RM|MYR|\$)\s*([-+]?\d[\d,.]*)/gi)];
 const candidates=[...withoutDates.matchAll(/(?<![\w.,])([-+]?\d[\d,.]*)(?!\w)/g)];
 const decimals=candidates.filter(m=>m[1].replace(/[.,]$/,'').includes('.'));
 const integers=candidates.filter(m=>!m[1].replace(/[.,]$/,'').includes('.'));
 const quantity=integers.length===1&&/^\s*(?:coffees?|cups?|items?|tickets?|people|pax|bottles?|pieces?|x\b)/i.test(withoutDates.slice(integers[0].index+integers[0][0].length));
 const match=currency.length===1?currency[0]:currency.length>1?null:decimals.length===1?decimals[0]:decimals.length>1?null:integers.length===1&&!quantity?integers[0]:null;
 let amount=null;try{if(match)amount=cents(match[1].replace(/[.,]$/,''));}catch{}
 const explicit=text.match(/\b\d{4}-\d{2}-\d{2}\b/);let parsedDate=explicit&&validDate(explicit[0])?explicit[0]:date;
 if(/yesterday/i.test(text)){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);parsedDate=d.toISOString().slice(0,10);}
 const category=categoryFor(text);const type=/salary|payroll|received|earned|income|gaji|freelance/i.test(text)?'income':'expense';
 let merchant=withoutDates.replace(match?.[0]||'\u0000','').replace(/\b(spent|paid|received|earned|bought|for|at|today|yesterday)\b/gi,' ').replace(/\b(with|using|via|from)\s+.*$/i,'').replace(/\s+/g,' ').trim();
 return {merchant:merchant||'',amount,category,type,date:parsedDate,account:/cash|tunai/i.test(text)?'cash':/touch.?n.?go|tng|ewallet/i.test(text)?'ewallet':'bank',source:'Quick entry',note:''};
}
export function parseReceipt(text,date=today()){
 const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
 const total=lines.findLast(l=>/^(?:grand\s+total|total(?:\s+(?:due|amount|payable))?|amount\s+(?:due|paid))\b/i.test(l)&&/\d/.test(l));
 const amounts=total?.match(/[-+]?\d[\d,.]*/g);let amount=null;try{if(amounts?.length===1)amount=cents(amounts[0].replace(/[.,]$/,''));}catch{}
 let found=text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
 if(!found){const d=text.match(/\b(\d{2})[\/-](\d{2})[\/-](\d{4})\b/);if(d)found=`${d[3]}-${d[2]}-${d[1]}`;}
 const merchant=(lines.find(l=>/[a-zA-Z]{3}/.test(l))||'').slice(0,200);
 return {merchant,amount,date:validDate(found||'')?found:date,type:'expense',category:categoryFor(merchant+' '+text),account:'bank',source:'Receipt',note:'',extractedText:text};
}
export function parseCSV(input){
 const s=input.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',quoted=false;
 for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('CSV has an unclosed quoted field.');row.push(cell);if(row.some(Boolean))rows.push(row);
 const headers=(rows.shift()||[]).map(v=>v.trim().toLowerCase());if(new Set(headers).size!==headers.length)throw new Error('CSV has duplicate column names.');
 return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||''])));
}
export function exportCSV(rows){
 const keys=['date','merchant','amount','type','category','account','toAccount','note'];
 const quote=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,c=>"'"+c).replace(/"/g,'""')+'"';
 return [keys.join(','),...rows.map(r=>keys.map(k=>quote(k==='amount'?(r.amount/100).toFixed(2):r[k])).join(','))].join('\r\n');
}
export const fingerprint=t=>[t.date,t.merchant.trim().toLowerCase(),t.amount,t.type,t.account,t.toAccount||''].join('|');
export function importTransactions(csv,existing=[],accounts=['bank','cash','ewallet']){
 const data=parseCSV(csv);if(data.length>10000)throw new Error('Import up to 10,000 rows at a time.');const seen=new Set(existing.map(fingerprint));const rows=[],errors=[];let duplicates=0;
 data.forEach((r,i)=>{try{let value=r.amount?.trim();const negative=value?.startsWith('-');if(negative)value=value.slice(1);const t=validateTransaction({id:crypto.randomUUID(),date:r.date,merchant:r.merchant||r.description,amount:cents(value),type:r.type|| (negative?'expense':'expense'),category:r.category||categoryFor(r.merchant||r.description||''),account:r.account||accounts[0],toAccount:r.toaccount||'',note:r.note||'',source:'CSV import'});if(!accounts.includes(t.account)||(t.type==='transfer'&&!accounts.includes(t.toAccount)))throw new Error('Unknown account.');const key=fingerprint(t);if(seen.has(key)){duplicates++;return;}seen.add(key);rows.push(t);}catch(e){errors.push(`Row ${i+2}: ${e.message}`);}});return {rows,duplicates,errors};
}
