import test from 'node:test';
import assert from 'node:assert/strict';
import { cents, validateTransaction, validateState, summarize, balances, parseEntry, parseReceipt, parseCSV, exportCSV, importTransactions } from '../domain.js';
import {emptyState} from '../seed.js';

test('money is represented as exact cents and invalid amounts rejected', () => {
  assert.equal(cents('1,234.56'),123456);
  assert.equal(cents('0.29'),29);
  for(const x of ['abc','-20','0','1.001','Infinity']) assert.throws(()=>cents(x));
});
const row = {id:'1',merchant:'Lunch',amount:1250,type:'expense',category:'Food & drinks',account:'cash',date:'2026-10-02'};
test('transaction validation refuses malformed dates and money',()=>{
  assert.equal(validateTransaction(row).amount,1250);
  assert.throws(()=>validateTransaction({...row,date:'2026-02-30'}));
  assert.throws(()=>validateTransaction({...row,amount:1.2}));
  assert.throws(()=>validateTransaction({...row,merchant:''}));
});
test('monthly totals exclude other months and transfers',()=>{
 const result=summarize([row,{...row,id:'2',type:'income',amount:500000},{...row,id:'3',type:'transfer',toAccount:'bank',amount:9000},{...row,id:'4',date:'2026-09-02'}],'2026-10');
 assert.equal(result.expense,1250);assert.equal(result.income,500000);assert.equal(result.net,498750);
 assert.equal(result.categories['Food & drinks'],1250);
});
test('transfers preserve total balances',()=>{
 const a=[{id:'cash',opening:10000},{id:'bank',opening:20000}];
 const b=balances(a,[{...row,type:'transfer',toAccount:'bank',amount:2500}]);
 assert.equal(b.cash,7500);assert.equal(b.bank,22500);
});
test('workspace validation rejects totals that would lose integer-cent precision',()=>{
 const state=emptyState();
 state.accounts[0].opening=Number.MAX_SAFE_INTEGER;
 state.transactions=[{...row,type:'income',account:state.accounts[0].id,amount:1}];
 assert.throws(()=>validateState(state),/Account balance is too large/);
 const budgetState=emptyState();
 budgetState.budgets['Food & drinks']=Number.MAX_SAFE_INTEGER;
 budgetState.budgets.Groceries=1;
 assert.throws(()=>validateState(budgetState),/Budget total is too large/);
});
test('quick entry extracts currency, payment method and relative date',()=>{
 const r=parseEntry('Spent RM 18.50 at Zus Coffee yesterday with cash','2026-10-02');
 assert.equal(r.amount,1850);assert.equal(r.category,'Food & drinks');assert.equal(r.date,'2026-10-01');assert.equal(r.account,'cash');assert.match(r.merchant,/Zus Coffee/i);
 assert.equal(parseEntry('Salary RM 5,000','2026-10-02').type,'income');
 assert.equal(parseEntry('coffee without an amount','2026-10-02').amount,null);
});
test('quick entry distinguishes prices from dates, quantities and merchant numbers',()=>{
 assert.equal(parseEntry('Lunch 2026-10-02 18.50').amount,1850);
 assert.equal(parseEntry('2 coffees 12.90').amount,1290);
 assert.equal(parseEntry('Paid 99 Speedmart 42.50').amount,4250);
 assert.equal(parseEntry('2 coffees').amount,null);
 assert.equal(parseEntry('Lunch 12.50 and taxi 15.00').amount,null);
 assert.equal(parseEntry('99 Speedmart 42').amount,null);
 assert.equal(parseEntry('Lunch 2026-10-02 18.50').merchant,'Lunch');
 assert.equal(parseEntry('Lunch 15 cash').amount,1500);
});
test('malformed thousands separators are not silently converted into different amounts',()=>{
 for(const amount of ['1,2','1,23.45','12,34,567','1,2345'])assert.throws(()=>cents(amount));
 assert.equal(cents('1,234,567.89'),123456789);
});
test('receipt chooses total over subtotal and cash tendered',()=>{
 const r=parseReceipt('JAYA GROCER\n2026-10-01\nSUBTOTAL 42.00\nTAX 2.52\nTOTAL RM 44.52\nCASH 50.00\nCHANGE 5.48','2026-10-02');
 assert.equal(r.amount,4452);assert.equal(r.merchant,'JAYA GROCER');assert.equal(r.date,'2026-10-01');assert.equal(r.category,'Groceries');
});

test('capture never truncates precision or converts a negative amount into an expense',()=>{
 for(const entry of ['Lunch RM 12.345','Lunch -20.00','Lunch RM -20.00','Lunch 12.345'])assert.equal(parseEntry(entry).amount,null,entry);
 for(const total of ['RM -20.00','12.345','RM 1,23.45'])assert.equal(parseReceipt('CAFE\nTOTAL '+total).amount,null,total);
 assert.equal(parseEntry('Lunch RM 12.90.').amount,1290);
 assert.equal(parseReceipt('CAFE\nTOTAL RM 20.00').amount,2000);
});
test('CSV round trips commas, quotes and newlines and prevents formula execution',()=>{
 const csv=exportCSV([{...row,merchant:'A, "B"\nC'}]);
 assert.equal(parseCSV(csv)[0].merchant,'A, "B"\nC');
 assert.match(exportCSV([{...row,merchant:'=HYPERLINK("evil")'}]),/'=HYPERLINK/);
});
test('CSV import validates each record and deduplicates existing and repeated rows',()=>{
 const csv='date,merchant,amount,type,category,account\n2026-10-02,Lunch,12.50,expense,Food & drinks,cash\n2026-10-03,Train,3.20,expense,Transport,cash\n2026-10-03,Train,3.20,expense,Transport,cash\n2026-02-30,Bad,4,expense,Other,cash';
 const r=importTransactions(csv,[row],['cash']);
 assert.equal(r.rows.length,1);assert.equal(r.duplicates,2);assert.equal(r.errors.length,1);assert.equal(r.rows[0].amount,320);
});
