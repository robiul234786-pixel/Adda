const crypto=require('crypto');
const SA=JSON.parse(process.env.FCM_SA);
const DB='https://my-personal-efootball-default-rtdb.firebaseio.com/social';
const b64=o=>Buffer.from(typeof o==='string'?o:JSON.stringify(o)).toString('base64url');
async function tok(){
const n=Math.floor(Date.now()/1000),h=b64({alg:'RS256',typ:'JWT'}),c=b64({iss:SA.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',aud:'https://oauth2.googleapis.com/token',iat:n,exp:n+3600});
const s=crypto.createSign('RSA-SHA256').update(h+'.'+c).sign(SA.private_key,'base64url');
const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type='+encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')+'&assertion='+h+'.'+c+'.'+s});
const j=await r.json();if(!j.access_token)throw new Error(JSON.stringify(j));return j.access_token}
(async()=>{
const A=await tok();
const g=async(p,q)=>{const r=await fetch(DB+'/'+p+'.json?access_token='+A+(q||''));if(!r.ok)throw new Error(p+' '+r.status);return r.json()};
const Q='&orderBy='+encodeURIComponent('"$key"')+'&limitToLast=30';
const[news,posts,chat,tokens,m]=await Promise.all([g('news',Q),g('posts',Q),g('chat',Q),g('tokens'),g('meta/last')]);
const it=[];
Object.values(news||{}).forEach(n=>{if(n&&n.h&&n.t)it.push({t:n.t,u:'',title:'📰 '+n.h,body:n.tn||''})});
Object.values(posts||{}).forEach(p=>{if(p&&p.u&&p.t&&(p.x||p.im))it.push({t:p.t,u:p.u,title:p.n+' পোস্ট করেছেন',body:String(p.x||'').trim()||'📷 ছবি'})});
Object.values(chat||{}).forEach(c=>{if(c&&c.x&&c.t)it.push({t:c.t,u:c.u,title:'💬 '+c.n,body:c.x})});
const last=typeof m==='number'?m:0,mx=Math.max(last,...it.map(x=>x.t),0);
const put=()=>fetch(DB+'/meta/last.json?access_token='+A,{method:'PUT',body:JSON.stringify(mx)});
if(!last){await put();console.log('init');return}
const nw=it.filter(x=>x.t>last).sort((a,b)=>a.t-b.t).slice(-5);
await put();
for(const x of nw)for(const[uid,v]of Object.entries(tokens||{})){
if(uid===x.u||!v||!v.k)continue;
const r=await fetch('https://fcm.googleapis.com/v1/projects/'+SA.project_id+'/messages:send',{method:'POST',headers:{Authorization:'Bearer '+A,'Content-Type':'application/json'},body:JSON.stringify({message:{token:v.k,notification:{title:x.title.slice(0,80),body:String(x.body).slice(0,120)},android:{priority:'HIGH'}}})});
if(r.status===404)await fetch(DB+'/tokens/'+uid+'.json?access_token='+A,{method:'DELETE'});
else if(!r.ok)console.log(uid,r.status,await r.text())}
console.log('sent',nw.length)
})().catch(e=>{console.error(e);process.exit(1)});
