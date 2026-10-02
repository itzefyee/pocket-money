import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretQuestion,validatePlan,answerQuery} from '../assistant-query.js';
const context={today:'2026-10-15',month:'2026-10',currency:'MYR',accounts:[{id:'bank',name:'Everyday account',opening:100000},{id:'cash',name:'Cash',opening:10000},{id:'ewallet',name:'Touch ’n Go',opening:20000}]};
const t=(id,date,merchant,amount,category='Food & drinks',account='bank',type='expense')=>({id,date,merchant,amount,category,account,type,note:''});
const state={accounts:context.accounts,settings:{currency:'MYR'},budgets:{'Food & drinks':10000,Transport:5000},transactions:[t('1','2026-10-02','ZUS Coffee',1290),t('2','2026-10-08','Village Park',1850),t('3','2026-10-11','Grab ride',2400,'Transport','ewallet'),t('4','2026-10-15','Grab ride',1800,'Transport','cash'),t('5','2026-10-01','Salary',500000,'Salary','bank','income'),t('6','2026-09-02','ZUS Coffee',900),t('7','2026-09-10','Grab ride',1200,'Transport'),t('8','2026-09-28','Dinner',9900),{...t('9','2026-10-03','Move cash',10000,'Other','bank','transfer'),toAccount:'cash'}]};
test('assistant aggregates a category with exact cents and excludes transfers',()=>{
 const plan=interpretQuestion('How much did I spend on food this month?',context);
 assert.equal(plan.category,'Food & drinks');assert.equal(plan.start,'2026-10-01');assert.equal(plan.end,'2026-10-15');
 const a=answerQuery(state,plan,context);assert.equal(a.total,3140);assert.equal(a.count,2);assert.deepEqual(a.rows.map(x=>x.id).sort(),['1','2']);
});
test('assistant filters merchant, strict amount threshold, account and last month',()=>{
 const p=interpretQuestion('Find Grab payments over RM 20 last month',context);
 assert.equal(p.search,'grab');assert.equal(p.min,2001);assert.equal(p.start,'2026-09-01');assert.equal(p.end,'2026-09-30');assert.equal(answerQuery(state,p,context).count,0);
 const cash=interpretQuestion('What did I spend using cash?',context);assert.equal(cash.account,'cash');assert.equal(answerQuery(state,cash,context).total,1800);
});
test('follow-ups preserve subject while changing time and grouping',()=>{
 const previous=interpretQuestion('How much did I spend on food?',context);
 const p=interpretQuestion('And last month?',{...context,previous});assert.equal(p.category,'Food & drinks');assert.equal(answerQuery(state,p,context).total,10800);
 const g=interpretQuestion('Break that down by merchant',{...context,previous});assert.equal(g.category,'Food & drinks');assert.equal(g.groupBy,'merchant');
 const change=interpretQuestion('What about groceries?',{...context,previous});assert.equal(change.category,'Groceries');
});
test('comparison aligns elapsed days and explains rather than invents causes',()=>{
 const p=interpretQuestion('Compare this month with last month',context),a=answerQuery(state,p,context);
 assert.equal(a.total,7340);assert.equal(a.previousTotal,2100);assert.equal(a.previousStart,'2026-09-01');assert.equal(a.previousEnd,'2026-09-15');assert.equal(a.delta,5240);
 assert.ok(a.drivers.some(d=>d.name==='Transport'&&d.delta===3000));
});
test('named date range, yesterday and all time are supported',()=>{
 const p=interpretQuestion('Show expenses from 2026-09-01 to 2026-09-30',context);assert.equal(p.start,'2026-09-01');assert.equal(p.end,'2026-09-30');assert.equal(answerQuery(state,p,context).total,12000);
 assert.equal(interpretQuestion('What did I spend yesterday?',context).start,'2026-10-14');
 assert.equal(interpretQuestion('Show all my expenses',context).start,'0001-01-01');
 assert.equal(interpretQuestion('Spending in September 2026',context).start,'2026-09-01');
});
test('income and transfer queries have explicit types',()=>{
 const p=interpretQuestion('How much did I earn this month?',context);assert.equal(p.type,'income');assert.equal(answerQuery(state,p,context).total,500000);
 const a=answerQuery(state,interpretQuestion('Show transfers',context),context);assert.equal(a.total,10000);assert.equal(a.count,1);
});
test('budget questions produce local limits and category remainders',()=>{
 const a=answerQuery(state,interpretQuestion('How are my budgets doing?',context),context);assert.equal(a.kind,'budget');assert.equal(a.budgets.find(b=>b.name==='Food & drinks').remaining,6860);
});
test('unsupported or ambiguous questions request clarification without invented totals',()=>{
 for(const q of ['What will Bitcoin do tomorrow?','Delete all transactions','How much did I spend at Totally Unknown Store?','How much last quarter?']){
 const p=interpretQuestion(q,context);if(q.includes('Store'))assert.ok(p.search.includes('totally unknown store'));else assert.equal(p.kind,'clarify');}
 assert.equal(answerQuery(state,interpretQuestion('What will Bitcoin do tomorrow?',context),context).total,undefined);
});
test('untrusted model plans are strictly validated',()=>{
 const base=interpretQuestion('Show expenses',context);
 for(const extra of [{kind:'execute'},{category:'Fake category'},{account:'missing'},{min:-1},{start:'2026-02-30'},{groupBy:'SQL'},{type:'all'},{start:'2026-12-01',end:'2026-01-01'}])assert.throws(()=>validatePlan({...base,...extra},context));
 assert.equal(validatePlan({...base,sql:'DELETE FROM transactions'},context).sql,undefined);
});
test('empty results and zero comparison baseline remain truthful',()=>{
 const a=answerQuery({...state,transactions:[]},interpretQuestion('Compare this month with last month',context),context);assert.equal(a.total,0);assert.equal(a.count,0);assert.equal(a.percentChange,null);
});
test('generic search and largest-expense requests do not become merchant filters',()=>{
 for(const q of ['Show my spending this month','Show my expenses','Show my biggest expenses','Find expenses'])assert.equal(interpretQuestion(q,context).search,'',q);
 const a=answerQuery(state,interpretQuestion('Show my biggest expenses',context),context);assert.equal(a.rows[0].id,'3');
 assert.equal(interpretQuestion('How much did I spend on Starbucks?',context).search,'starbucks');
});
test('since, before, year and merchant plus named month preserve date meaning',()=>{
 assert.equal(interpretQuestion('Expenses since 2026-09-01',context).end,'2026-10-15');
 assert.equal(interpretQuestion('Expenses before 2026-10-01',context).end,'2026-09-30');
 assert.equal(interpretQuestion('Spending in 2025',context).start,'2025-01-01');
 assert.equal(interpretQuestion('Spending at ZUS in September',context).search,'zus');
 assert.equal(interpretQuestion('Expenses between RM 20 and RM 50',context).kind,'clarify');
});
test('cash flow is not a cash-account filter and malformed thresholds clarify',()=>{
 assert.equal(interpretQuestion('Show my cash flow',context).account,null);
 assert.equal(interpretQuestion('Show expenses under RM -20',context).kind,'clarify');
 assert.equal(interpretQuestion('Expenses over RM 1,2',context).kind,'clarify');
});
test('budget plans cannot use income as if it were expense spending',()=>{
 const plan=interpretQuestion('How are my budgets doing?',context);assert.throws(()=>validatePlan({...plan,type:'income'},context));
});
test('unrelated questions with dates do not become financial summaries',()=>{
 assert.equal(interpretQuestion('What is the weather this month?',context).kind,'clarify');
 const merchant=interpretQuestion('Find Acme last 3 months',context);assert.equal(merchant.search,'acme');assert.equal(merchant.start,'2026-07-01');
 const p=interpretQuestion('How much did I spend in the last 3 months?',context);assert.equal(p.start,'2026-07-01');assert.equal(p.end,'2026-09-30');
});
test('two amount thresholds are both applied',()=>{
 assert.equal(interpretQuestion('Food spending over RM 20.',context).min,2001);
 const p=interpretQuestion('Food spending over RM 20 under RM 50',context);assert.equal(p.min,2001);assert.equal(p.max,4999);
 const a=answerQuery({...state,transactions:[t('a','2026-10-02','Lunch',3000),t('b','2026-10-03','Dinner',8000)]},p,context);assert.equal(a.total,3000);
});
test('follow-ups clear incompatible categories and explicitly removed filters',()=>{
 const previous=interpretQuestion('How much did I spend on food?',context);
 const income=interpretQuestion('And income?',{...context,previous});assert.equal(income.category,null);assert.equal(answerQuery(state,income,context).total,500000);
 assert.equal(interpretQuestion('What about all categories?',{...context,previous}).category,null);
 const account=interpretQuestion('How much did I spend with cash?',context);assert.equal(interpretQuestion('What about all accounts?',{...context,previous:account}).account,null);
});
