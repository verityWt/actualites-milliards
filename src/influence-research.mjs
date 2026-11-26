// Publicly reproducible descriptive indicators. Only known values enter denominators.
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const sorted=(map,limit)=>[...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'fr')).slice(0,limit).map(([label,count])=>({label,count}));
export function analyzeInfluence(people,companyGroups){
 const all=people.length;
 const origins={self:0,herit:0,mix:0,unknown:0};
 for(const p of people)origins[p.orig in origins?p.orig:'unknown']++;
 const known=all-origins.unknown;
 const byCountry=new Map(),bySector=new Map(),ages={'Moins de 40 ans':0,'40 à 59 ans':0,'60 à 79 ans':0,'80 ans ou plus':0,'Âge non renseigné':0};
 for(const p of people){
  const country=p.country||'Non renseigné',sector=p.secLabel||p.sec||'Non renseigné';
  byCountry.set(country,(byCountry.get(country)||0)+1);
  bySector.set(sector,(bySector.get(sector)||0)+1);
  if(p.age==null||!Number.isFinite(p.age))ages['Âge non renseigné']++;
  else if(p.age<40)ages['Moins de 40 ans']++;
  else if(p.age<60)ages['40 à 59 ans']++;
  else if(p.age<80)ages['60 à 79 ans']++;
  else ages['80 ans ou plus']++;
 }
 const groups=(companyGroups||[]).filter(g=>g.people.length>=2).map(g=>({
  name:g.name,people:g.people.map(p=>({id:p.id,name:p.name,country:p.country,wealth:p.nw,orig:p.orig,age:p.age,company:p.co})),
  count:g.people.length,combinedFortunesEstimate:sum(g.people.map(p=>Number(p.nw)||0))
 })).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'fr'));
 return {
  total:all,origins,knownOrigin:known,
  inheritedOrMixed:origins.herit+origins.mix,
  originBreakdown:[{label:'Création / origine personnelle',count:origins.self},{label:'Patrimoine hérité',count:origins.herit},{label:'Origine mixte',count:origins.mix},{label:'Non renseignée',count:origins.unknown}],
  countries:sorted(byCountry,9),
  sectors:sorted(bySector,9),
  ages:Object.entries(ages).map(([label,count])=>({label,count})),
  groups,groupsCount:groups.length,
  peopleWithGroup:new Set(groups.flatMap(g=>g.people.map(p=>p.id))).size
 };
}
export function wealthRank(people,n=10){
 return people.filter(p=>Number.isFinite(p.nw)&&p.nw>0).sort((a,b)=>b.nw-a.nw).slice(0,n).map(p=>({name:p.name,wealth:p.nw,company:p.co||'',id:p.id}));
}
export const BRAND_LOGOS=Object.freeze({
 'google':'google','alphabet':'google','amazon':'amazon','microsoft':'microsoft','meta':'meta','facebook':'facebook',
 'oracle':'oracle','nvidia':'nvidia','tesla':'tesla','walmart':'walmart','paypal':'paypal',
 'chanel':'chanel','loreal':'loreal','l’oréal':'loreal',"l'oréal":'loreal','netflix':'netflix',
 'spotify':'spotify','samsung':'samsung','nike':'nike','adidas':'adidas','tiktok':'tiktok','bytedance':'tiktok',
 'pinterest':'pinterest','uber':'uber','airbnb':'airbnb','stripe':'stripe','salesforce':'salesforce',
 'zoom':'zoom','ibm':'ibm','intel':'intel','apple':'apple','dell':'dell',
 'berkshire hathaway':'berkshirehathaway','lvmh':'lvmh','sephora':'sephora','zara':'zara'
});
export function brandIcon(name){
 const key=String(name||'').trim().toLowerCase().replace(/^the /,'');
 return BRAND_LOGOS[key]||null;
}
