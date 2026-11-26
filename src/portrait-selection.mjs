// Editorial priority indicates human display preference, never identity or copyright verification.
export const hasPhoto=(p)=>Boolean(p&&typeof(p.src||p.fichier)==='string'&&/^(https?:\/\/|photos\/|assets\/)/.test(p.src||p.fichier));
export function pickPortrait(entries){
 if(!Array.isArray(entries))return null;
 const images=entries.filter(p=>p?.type==='portrait'&&hasPhoto(p));
 if(!images.length)return entries.find(hasPhoto)||null;
 return images.map((photo,index)=>({photo,index})).sort((a,b)=>{
  const priority=(Number(b.photo.editorial_priority)||0)-(Number(a.photo.editorial_priority)||0);
  return priority||a.index-b.index;
 })[0].photo;
}
export function portraitCandidates(entries){
 if(!Array.isArray(entries))return [];
 return entries.filter(p=>p?.type==='portrait'&&hasPhoto(p))
 .map((photo,index)=>({photo,index}))
 .sort((a,b)=>(Number(b.photo.editorial_priority)||0)-(Number(a.photo.editorial_priority)||0)||a.index-b.index)
 .map(x=>x.photo);
}
export function photoInitials(name){
 return String(name||'?').trim().replace(/\s*& family$/i,'').split(/\s+/).filter(w=>w&&!['von','van','der','de','du','the','of'].includes(w.toLowerCase())).slice(0,2).map(w=>w[0]).join('').toLocaleUpperCase('fr')||'?';
}
export function photoReviewQueue(data){
 const rows=Object.entries(data).filter(([id,v])=>!id.startsWith('_')&&Array.isArray(v));
 return rows.map(([slug,entries])=>{
  const selected=pickPortrait(entries),issues=[];
  if(!selected)issues.push('missing_photo');
  if(selected&&selected.identity_verified!==true)issues.push('identity_review_missing');
  if(selected&&selected.publication_autorisee!==true)issues.push('republication_rights_unconfirmed');
  if(selected&&(!selected.image_width||!selected.image_height))issues.push('photo_dimensions_not_measured');
  if(selected&&selected.quality_review!=='candidate_user_selected'&&!selected.visual_reviewed_at)issues.push('editorial_quality_review_missing');
  const query=slug.replace(/-/g,' ');
  return {slug,selectedUrl:selected?.src||selected?.fichier||null,selectedSource:selected?.source||null,
   candidates:entries.length,issues,reviewed:issues.length===0,
   researchQueries:{
    photoSearch:'https://www.google.com/search?tbm=isch&q='+encodeURIComponent('"'+query+'" portrait'),
    linkedinSearch:'https://www.google.com/search?q='+encodeURIComponent('"'+query+'" site:linkedin.com/in'),
    pressSearch:'https://www.google.com/search?q='+encodeURIComponent('"'+query+'" portrait interview')
   }};
 }).sort((a,b)=>b.issues.length-a.issues.length||a.slug.localeCompare(b.slug,'fr'));
}
export function photoAudit(data){
 const rows=Object.entries(data).filter(([id,v])=>!id.startsWith('_')&&Array.isArray(v));
 const total=rows.reduce((n,[,v])=>n+v.length,0);
 const selected=rows.map(([id,photos])=>({id,photo:pickPortrait(photos)}));
 return {profiles:rows.length,candidates:total,
  selected: selected.filter(x=>x.photo).length,
  identityUnverified:selected.filter(x=>x.photo&&x.photo.identity_verified!==true).length,
  permissionsUnknown:selected.filter(x=>x.photo&&x.photo.publication_autorisee!==true).length,
  protectedSources: selected.filter(x=>x.photo&&/droits réservés|non renseignée/i.test(x.photo.licence||'')).length,
  noPortrait:selected.filter(x=>!x.photo).map(x=>x.id),reviewQueue:photoReviewQueue(data)};
}
