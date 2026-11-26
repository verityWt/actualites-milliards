const ORIGIN="https://actualites-milliardaires.pages.dev",HOST="actualites.fr";
const json=(v,status=200)=>Response.json(v,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
async function submit(request,env,url){
 if(request.headers.get("Origin")!=="https://"+HOST)return json({error:"origin"},403);
 if(!request.headers.get("Content-Type")?.startsWith("application/x-www-form-urlencoded"))return json({error:"format"},415);
 const reader=request.body?.getReader();if(!reader)return json({error:"body"},400);
 let size=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16000){await reader.cancel();return json({error:"size"},413)}parts.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length}
 const f=new URLSearchParams(new TextDecoder().decode(bytes)),get=(k)=>String(f.get(k)||"").trim();
 if(get("website"))return json({error:"spam"},400);
 const contact=url.pathname==="/api/contact/",slug=get("fiche"),vote=get("vote"),topic=get("topic");
 let record;
 if(contact){const name=get("name"),email=get("email"),message=get("message"),organisation=get("organisation"),objet=get("objet");
 if(!name||name.length>120||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||message.length<10||message.length>4000||organisation.length>160||slug.length>300||!["general","correction","professionnel"].includes(objet))return json({error:"validation"},400);
 record={type:"contact",name,email,message,organisation,objet,fiche:slug};
 }else{if(!/^[a-z0-9-]{1,120}$/.test(slug)||!["yes","no"].includes(vote)||!["","fortune","business","life","network","news"].includes(topic))return json({error:"validation"},400);record={type:"feedback",fiche:slug,vote,topic}}
 const ip=request.headers.get("CF-Connecting-IP")||"unknown",day=new Date().toISOString().slice(0,10),hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(day+"|"+ip)))).map(x=>x.toString(16).padStart(2,"0")).join("");
 const cache=caches.default,rate=new Request("https://"+HOST+"/_internal-rate/"+record.type+"/"+hash+(contact?"":"/"+slug));if(await cache.match(rate))return json({error:"rate"},429);
 await env.FEEDBACK.put(record.type+":"+crypto.randomUUID(),JSON.stringify({...record,receivedAt:new Date().toISOString(),status:"pending"}),{expirationTtl:90*86400});
 try{await cache.put(rate,new Response("1",{headers:{"Cache-Control":"public,max-age="+(contact?60:86400)}}))}catch{}
 return json({ok:true},201)
}
export default{async fetch(request,env){const url=new URL(request.url);if((url.hostname!==HOST||url.protocol!=="https:")&&(url.hostname===HOST||url.hostname.endsWith("."+HOST))){return Response.redirect("https://"+HOST+url.pathname+url.search,301)}if(["/api/contact/","/api/feedback/"].includes(url.pathname)&&request.method==="POST"){try{return await submit(request,env,url)}catch{return json({error:"storage"},503)}}if(request.method!=="GET"&&request.method!=="HEAD"){return new Response("Methode non autorisee",{status:405,headers:{Allow:"GET, HEAD"}})}const res=await fetch(ORIGIN+url.pathname+url.search,{method:request.method,headers:{Accept:request.headers.get("Accept")||"*/*"},redirect:"manual"});const headers=new Headers(res.headers);const loc=headers.get("Location");if(loc){headers.set("Location",loc.split(ORIGIN).join("https://"+HOST))}headers.set("X-Content-Type-Options","nosniff");return new Response(res.body,{status:res.status,headers})}};