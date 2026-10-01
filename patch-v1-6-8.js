// D12 PLAYERS TURN v1.6.8 — responsive top rows, graphical clocks, notification audio and strict reset
const V168_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-turn-v168';
const v168=(a,p={},auth=true)=>api(V168_API,a,p,auth);

function v168TimeParts(){
  const now=new Date();
  try{
    const parts=new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',weekday:'long',day:'2-digit',month:'short',year:'numeric'}).formatToParts(now);
    const get=t=>parts.find(x=>x.type===t)?.value||'';
    const time=new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
    return {weekday:get('weekday').toUpperCase(),day:get('day'),month:get('month').toUpperCase(),year:get('year'),time};
  }catch{
    return {weekday:now.toLocaleDateString(undefined,{weekday:'long'}).toUpperCase(),day:String(now.getDate()).padStart(2,'0'),month:now.toLocaleDateString(undefined,{month:'short'}).toUpperCase(),year:String(now.getFullYear()),time:now.toLocaleTimeString()};
  }
}
function v168TimePanel(scope='overview'){
  const t=v168TimeParts();
  return `<section class="v168-time-panel glass ${scope==='rackmaster'?'v168-rack-time':''}" data-v168-clock>
    <div class="v168-day-orb"><small>DAY</small><b data-v168-weekday>${esc(t.weekday)}</b></div>
    <div class="v168-date-tile"><span class="v168-calendar-icon">▣</span><div><small>D12 OPERATIONS DATE</small><strong><i data-v168-day>${esc(t.day)}</i> <span data-v168-month>${esc(t.month)}</span> <em data-v168-year>${esc(t.year)}</em></strong></div></div>
    <div class="v168-time-tile"><span class="v168-time-icon">◷</span><div><small>ABUJA · WAT</small><strong data-v168-time>${esc(t.time)}</strong></div><i class="v168-live-dot"></i></div>
  </section>`;
}
function v168StartLocalClock(){
  clearInterval(window.__d12V168Clock);
  const tick=()=>{
    const hosts=[...document.querySelectorAll('[data-v168-clock]')];
    if(!hosts.length){clearInterval(window.__d12V168Clock);window.__d12V168Clock=null;return}
    const t=v168TimeParts();
    hosts.forEach(h=>{
      const set=(s,v)=>{const el=h.querySelector(s);if(el)el.textContent=v};
      set('[data-v168-weekday]',t.weekday);set('[data-v168-day]',t.day);set('[data-v168-month]',t.month);set('[data-v168-year]',t.year);set('[data-v168-time]',t.time);
    });
  };
  tick();
  // Local device clock only — no fetch, Supabase query or session write.
  window.__d12V168Clock=setInterval(tick,1000);
}

// Overview: graphical date/time replaces the conventional text clock.
overviewView=function(){
  setTimeout(v168StartLocalClock,0);
  return `${v168TimePanel('overview')}${v167OverviewBase()}`;
};

// Rackmaster: graphical date/time + centered Players Today launcher.
rackmasterView=function(){
  setTimeout(v168StartLocalClock,0);
  return `${v168TimePanel('rackmaster')}<section class="v168-rack-center"><button class="btn v164-players-today-btn v168-players-today" onclick="openPlayersToday()"><span class="v164-launch-icon">◉</span><span><small>DAILY ROOM INTELLIGENCE</small><b>Players Today</b></span><i>›</i></button></section>${v166RackBase()}`;
};

// Distinctive sounds/haptics for approval requests and player notifications.
function v168Sound(kind='notification'){
  try{
    ensureAudio();
    if(audioCtx?.state==='suspended')audioCtx.resume().catch(()=>{});
    const approval=kind==='approval';
    const seq=approval?[[740,.10,0],[980,.11,.12],[1240,.15,.26]]:[[820,.10,0],[1060,.12,.13]];
    seq.forEach(([f,d,delay])=>tone(f,d,delay));
    navigator.vibrate?.(approval?[90,45,120,45,180]:[110,55,150]);
  }catch{}
}
// All Admin, Cashier and Rackmaster approval notifications use this shared tone.
v162ApprovalTone=function(){v168Sound('approval')};
// Unlock staff audio after the first intentional interaction, without any network activity.
document.addEventListener('pointerdown',()=>{try{ensureAudio();if(audioCtx?.state==='suspended')audioCtx.resume().catch(()=>{})}catch{}},{once:true,capture:true});

// Player notifications: calls retain the strong call alarm; all other turn notifications get a clear two-tone chime.
triggerPlayerAlert=function(n){
  if(n.kind==='call'){v163CallAlarm();v163ShowCallOverlay(n)}else{v168Sound('notification')}
  if('Notification'in window&&Notification.permission==='granted'){
    navigator.serviceWorker.ready.then(reg=>reg.showNotification(n.kind==='call'?'D12 · Rackmaster Calling':'D12 Players Turn',{body:n.message,tag:'d12-'+n.id,renotify:true,icon:CANONICAL+'d12-app-icon.svg',vibrate:n.kind==='call'?[260,90,260,90,520]:[110,55,150],data:{url:`${CANONICAL}?ticket=${encodeURIComponent(ticketParam)}`}})).catch(()=>{});
  }
  toast(n.message);
};

// Settings keeps the same protected button, but v1.6.8 uses a stricter verified reset backend.
adminResetAll167=async function(){
  if(role!=='admin')return toast('Admin access required.');
  if(!confirm('RESET ALL TABLES? This clears EVERY queue, live match, table holder and holder-on-break record on all four D12 tables.'))return;
  const typed=prompt('For safety, type RESET ALL TABLES to confirm:','');
  if(String(typed||'').trim().toUpperCase()!=='RESET ALL TABLES')return toast('Reset cancelled — confirmation text did not match.');
  try{
    const j=await v168('admin_reset_all');
    toast(j.message||'All tables fully reset');
    await refresh(false,true);
  }catch(e){toast(e.message)}
};
