// Validate editorial records before any public site build. No invented corroboration scores.
export function validateResearchProfiles(dataset,knownIds){
 if(dataset?.schemaVersion!==1||!dataset.profiles||typeof dataset.profiles!=='object')throw Error('Invalid biography research schema');
 const names=new Set(knownIds),sourceCount=new Set();
 let sections=0,events=0;
 for(const [slug,record] of Object.entries(dataset.profiles)){
  if(!names.has(slug))throw Error('Unknown biography slug: '+slug);
  if(!Array.isArray(record.sections)||!Array.isArray(record.events))throw Error('Invalid biography sections for '+slug);
  const validateSource=(url)=>{
   if(typeof url!=='string'||!url.startsWith('https://'))throw Error('Invalid evidence URL: '+slug);
   const parsed=new URL(url);if(!parsed.hostname||parsed.username||parsed.password)throw Error('Unsafe evidence URL: '+slug);
   sourceCount.add(parsed.href);
  };
  for(const section of record.sections){
   if(typeof section.heading!=='string'||section.heading.trim().length<8||
      typeof section.body!=='string'||section.body.trim().length<80)throw Error('Insufficient section: '+slug);
   validateSource(section.source);sections++;
  }
  if(record.personal!==undefined){
   if(!record.personal||typeof record.personal!=='object'||Array.isArray(record.personal))throw Error('Invalid public personal information: '+slug);
   const allowed=new Set(['personality','preferences','personalLife','relationships','documentedRisks']);
   for(const [key,items] of Object.entries(record.personal)){
    if(!allowed.has(key)||!Array.isArray(items))throw Error('Unsupported personal category: '+slug+'/'+key);
    for(const item of items){
     if(typeof item.heading!=='string'||item.heading.trim().length<8||
        typeof item.body!=='string'||item.body.trim().length<80)throw Error('Insufficient personal claim: '+slug+'/'+key);
     validateSource(item.source);sections++;
    }
   }
  }
  for(const event of record.events){
   if(typeof event.title!=='string'||event.title.trim().length<12||
     !/^\d{4}(?:-\d{2}){0,2}$/.test(event.date) ||
     !['company','governance','transaction','investment','philanthropy','regulation'].includes(event.type))throw Error('Invalid dated event: '+slug);
   validateSource(event.source);events++;
  }
 }
 return {profiles:Object.keys(dataset.profiles).length,sections,events,uniqueSourceUrls:sourceCount.size};
}
