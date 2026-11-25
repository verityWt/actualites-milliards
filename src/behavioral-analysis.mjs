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

/**
 * Experimental protocol: controlled lexical sensitivity test.
 * The baseline and the alternate protocol count exactly the same terms;
 * the alternate excludes an initial reporting clause up to the first comma.
 * The difference measures preprocessing sensitivity, not psychology.
 */
export function experimentalSensitivity(sample) {
 const text=String(sample?.text||'');
 if(!text.trim())throw Error('Source text required');
 const baseline=publicSpeechMetrics(sample);
 const comma=text.indexOf(',');
 const processed=comma<0?text:text.slice(comma+1).trim();
 const alternative=publicSpeechMetrics({...sample,text:processed});
 const delta=Object.fromEntries(Object.keys(baseline.frequencies).map(key=>
   [key,alternative.frequencies[key]-baseline.frequencies[key]]));
 return {
  protocolId:'lexical-preprocessing-sensitivity-v1',
  status:'experimental_computation',
  baselineWords:baseline.words,
  alternateWords:alternative.words,
  changeInTermCounts:delta,
  transformed:comma>=0,
  limitation:'Preprocessing sensitivity on one excerpt. No psychometric validity; do not extrapolate to the speaker.'
 };
}
