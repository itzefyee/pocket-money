const numbers=new Map(),dates=new Map();
function numberFormatter(currency,decimals){
 const key=`${currency||'number'}:${decimals}`;
 if(!numbers.has(key))numbers.set(key,new Intl.NumberFormat('en-MY',{...(currency?{style:'currency',currency}:{}),minimumFractionDigits:decimals,maximumFractionDigits:decimals}));
 return numbers.get(key);
}
export const formatMoney=(cents,currency='MYR',decimals=2)=>numberFormatter(currency,decimals).format(cents/100);
export const formatNumber=(cents,decimals=2)=>numberFormatter(null,decimals).format(cents/100);
export function formatCalendar(value,style='short'){
 const options=style==='month'?{month:'long',year:'numeric'}:style==='monthShort'?{month:'short',year:'numeric'}:style==='monthLabel'?{month:'short'}:style==='full'?{day:'numeric',month:'short',year:'numeric'}:{day:'numeric',month:'short'};
 if(!dates.has(style))dates.set(style,new Intl.DateTimeFormat('en-MY',{...options,timeZone:'UTC'}));
 return dates.get(style).format(new Date((value.length===7?value+'-01':value)+'T12:00:00Z'));
}
