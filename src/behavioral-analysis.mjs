// Public speech analytics, strictly descriptive. Never infer personality, health or intent.
const lexicons=Object.freeze({
 future:['will','future','next','tomorrow','avenir','futur','demain','prochain'],
 collective:['we','our','us','nous','notre','nos','ensemble'],
 uncertainty:['may','might','could','perhaps','possibly','possible','peut','pourrait','incertain'],
 business:['business','company','customers','product','entreprise','clients','produit']
});
export function tokenize(text){
 return (String(text||'').toLocaleLowerCase('en').normalize('NFKD')
 .replace(/[\u0300-\u036f]/g,'').match(/[\p{L}\p{N}]+/gu)||[]);
}
export function publicSpeechMetrics(sample){
 if(!sample||typeof sample.text!=='string'||!sample.text.trim())throw Error('Source text required');
 const tokens=tokenize(sample.text),length=tokens.length;
 const unique=new Set(tokens).size;
 const byTheme=Object.fromEntries(Object.entries(lexicons).map(([key,terms])=>[key,tokens.filter(t=>terms.includes(t)).length]));
 return {method:'lexical_count_v1',words:length,uniqueWords:unique,
  lexicalDiversity:length?Number((unique/length).toFixed(3)):null,
  frequencies:byTheme,
  denominator:'observed tokens',language:sample.language||'und',
  limitations:'Counts of words in this excerpt only. Not a personality, emotion, health, sincerity, risk or intent estimate.'};
}
export function validateSpeechSamples(samples){
 if(!Array.isArray(samples))throw Error('Speech samples must be an array');
 for(const s of samples){
  if(!s||typeof s.text!=='string'||s.text.trim().length<15 || s.text.length>1000||
    typeof s.url!=='string'||!s.url.startsWith('https://')||
    typeof s.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||
    !['quotation','transcript'].includes(s.kind) || s.reviewed!==true)throw Error('Invalid editorial speech excerpt');
 }
 return true;
}
