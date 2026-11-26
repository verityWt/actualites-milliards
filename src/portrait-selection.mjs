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
export function photoInitials(name){
 return String(name||'?').trim().replace(/\s*& family$/i,'').split(/\s+/).filter(w=>w&&!['von','van','der','de','du','the','of'].includes(w.toLowerCase())).slice(0,2).map(w=>w[0]).join('').toLocaleUpperCase('fr')||'?';
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
  noPortrait:selected.filter(x=>!x.photo).map(x=>x.id)};
}
