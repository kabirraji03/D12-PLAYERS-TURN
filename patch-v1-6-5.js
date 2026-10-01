// D12 PLAYERS TURN v1.6.5 — Supabase IO optimization / revision-gated realtime refresh
const V165_REVISION_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-turn-revision-v165';
let v165StaffRevision=null,v165StaffLastProbe=0,v165StaffLastFull=0,v165StaffInFlight=false;
let v165PlayerRevision=null,v165PlayerLastProbe=0,v165PlayerLastFull=0,v165PlayerInFlight=false,v165PlayerState=null;

async function v165RevisionSignal(){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),4500);
  try{
    const r=await fetch(V165_REVISION_API,{method:'GET',cache:'no-store',signal:ctl.signal});
    const j=await r.json();
    if(!r.ok||!j.ok)throw new Error(j.error||'Revision signal unavailable');
    return Number(j.rev||0);
  }finally{clearTimeout(timer)}
}
function v165StaffDelay(){
  if(document.hidden)return 120000;
  if(role==='rackmaster')return view==='rackmaster'?6000:10000;
  if(role==='cashier')return view==='cashier'?9000:12000;
  return view==='approvals'?8000:12000;
}
function v165PlayerDelay(){
  if(document.hidden)return 60000;
  const q=v165PlayerState?.queue;
  if(q?.status==='called'||q?.position===1)return 4000;
  if(q?.position&&q.position<=3)return 7000;
  if(q?.status==='queued')return 15000;
  return 20000;
}
async function v165FullStaffRefresh(silent=true){
  const [base,ext12,ext13,ext14,ext161]=await Promise.all([
    turn('bootstrap'),
    v12('bootstrap').catch(()=>({})),
    v13('bootstrap').catch(()=>({})),
    v14('bootstrap').catch(()=>({})),
    v161('bootstrap').catch(()=>({}))
  ]);
  const next=mergeV161(mergeV14(mergeV13(mergeV12(base,ext12),ext13),ext14),ext161);
  const sig=v161Signature(next),changed=sig!==v13LastSignature;
  data=next;role=next.role;v165StaffLastFull=Date.now();
  if(changed){v13LastSignature=sig;v13AnimateOverview=view==='overview';renderApp(true)}
  if(typeof v162CheckApprovalNotifications==='function')v162CheckApprovalNotifications(false);
  if(!silent)toast(changed?'Live board updated':'Live board is already current');
  return changed;
}

// Replace the legacy 2.2 s multi-bootstrap refresh with a cheap revision probe.
// Heavy bootstraps now run only when operational data actually changed.
refresh=async function(silent=true,force=false){
  if(!token||v165StaffInFlight)return;
  const now=Date.now(),forced=force||silent===false;
  if(!forced&&now-v165StaffLastProbe<v165StaffDelay())return;
  v165StaffLastProbe=now;v165StaffInFlight=true;
  try{
    let rev=null;
    try{rev=await v165RevisionSignal()}catch{}
    const changedSignal=rev===null||v165StaffRevision===null||rev!==v165StaffRevision;
    if(!forced&&!changedSignal)return;
    if(rev!==null)v165StaffRevision=rev;
    await v165FullStaffRefresh(silent);
    if(rev===null){try{v165StaffRevision=await v165RevisionSignal()}catch{}}
  }catch(e){
    // Conservative fallback if the revision service is temporarily unavailable.
    if(forced||Date.now()-v165StaffLastFull>=30000){
      try{await v165FullStaffRefresh(silent)}catch(inner){if(!silent)toast(inner.message)}
    }else if(!silent)toast(e.message);
  }finally{v165StaffInFlight=false}
};

// Keep the working login/bootstrap protocol, but replace its 2.2 s timer after sign-in.
const v165EnterBase=enterApp;
enterApp=async function(){
  await v165EnterBase();
  try{v165StaffRevision=await v165RevisionSignal()}catch{v165StaffRevision=null}
  v165StaffLastProbe=Date.now();v165StaffLastFull=Date.now();
  clearInterval(poller);
  poller=setInterval(()=>refresh(true),5000);
};

async function v165FullPlayerRefresh(first=false){
  const d=await ticketApi('ticket_status',{ticket:ticketParam});
  v165PlayerState=d;v165PlayerLastFull=Date.now();
  if(typeof v163LoadInsights==='function')await v163LoadInsights(d.player,first).catch(()=>null);
  renderPlayer(d);
  const n=d.notifications?.[0];
  if(n&&n.id!==lastNotif){
    const age=Date.now()-new Date(n.created_at).getTime(),freshCall=n.kind==='call'&&!n.acknowledged_at&&age<180000;
    lastNotif=n.id;
    if(!first||freshCall)triggerPlayerAlert(n);
  }
}
// Player screens also use the revision signal, preserving fast Rackmaster-call alerts near the front of queue.
pollPlayer=async function(first=false,force=false){
  if(!ticketParam||v165PlayerInFlight)return;
  const now=Date.now(),forced=first||force;
  if(!forced&&now-v165PlayerLastProbe<v165PlayerDelay())return;
  v165PlayerLastProbe=now;v165PlayerInFlight=true;
  try{
    let rev=null;
    try{rev=await v165RevisionSignal()}catch{}
    const changedSignal=rev===null||v165PlayerRevision===null||rev!==v165PlayerRevision;
    if(!forced&&!changedSignal)return;
    if(rev!==null)v165PlayerRevision=rev;
    await v165FullPlayerRefresh(first);
    if(rev===null){try{v165PlayerRevision=await v165RevisionSignal()}catch{}}
  }catch(e){
    if(forced||Date.now()-v165PlayerLastFull>=30000){
      try{await v165FullPlayerRefresh(first)}catch(inner){const host=$('#playerBody');if(host)host.innerHTML=`<div class="card glass empty">${esc(inner.message)}</div>`}
    }
  }finally{v165PlayerInFlight=false}
};

// Player login handlers in older layers install a 2.2 s timer. Replace it immediately after the shell opens.
const v165RenderPlayerShellBase=renderPlayerShell;
renderPlayerShell=function(){
  const out=v165RenderPlayerShellBase();
  setTimeout(()=>{
    clearInterval(poller);
    poller=setInterval(()=>pollPlayer(false),4000);
  },0);
  return out;
};

// When a hidden tab becomes active again, catch up once immediately rather than polling while hidden.
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)return;
  if(ticketParam){v165PlayerLastProbe=0;pollPlayer(false,true)}
  else if(token){v165StaffLastProbe=0;refresh(true,true)}
});
window.addEventListener('focus',()=>{
  if(document.hidden)return;
  if(ticketParam&&Date.now()-v165PlayerLastFull>5000){v165PlayerLastProbe=0;pollPlayer(false,true)}
  else if(token&&Date.now()-v165StaffLastFull>5000){v165StaffLastProbe=0;refresh(true,true)}
});
