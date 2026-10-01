// D12 PLAYERS TURN v1.6.7 — staff workspace, Admin reset, dashboard time, approval cleanup
const V167_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-turn-v167';
const v167=(a,p={},auth=true)=>api(V167_API,a,p,auth);

// Saved Staff Combinations belong only in Admin > Staff & Shifts.
cashierView=function(){return v166CashierBase()};
const v167StaffBase=staffView;
staffView=function(){
  if(role!=='admin')return v167StaffBase();
  return `${v167StaffBase()}${v166ShiftWorkspace()}`;
};

// Rackmaster keeps Players Today, but Reset All Tables is removed from this portal.
rackmasterView=function(){
  return `<section class="v166-rack-command glass"><div class="v166-date-block"><span>TRACKING DATE</span><b>${esc(v166AbujaStamp())}</b></div><div class="v166-rack-command-actions v167-rack-actions"><button class="btn v164-players-today-btn" onclick="openPlayersToday()"><span class="v164-launch-icon">◉</span><span><small>DAILY ROOM INTELLIGENCE</small><b>Players Today</b></span><i>›</i></button></div></section>${v166RackBase()}`;
};

// Admin-only Settings control. No Rackmaster request and no Approval-tab round trip.
const v167SettingsBase=settingsView;
settingsView=function(){
  if(role!=='admin')return v167SettingsBase();
  return `${v167SettingsBase()}<section class="card glass v167-danger-zone"><div class="v167-danger-copy"><div class="eyebrow">ADMIN SYSTEM CONTROL</div><h2>Reset All Tables</h2><p>Immediately clears all active tables, live matches, player queues and pending player workflow requests. This control is restricted to Admin and requires two confirmations.</p></div><button class="btn danger v167-reset-all-settings" onclick="adminResetAll167()">↺ Reset All Tables</button></section>`;
};
async function adminResetAll167(){
  if(role!=='admin')return toast('Admin access required.');
  if(!confirm('RESET ALL TABLES? This will clear every active player, queue and live match on all D12 tables.'))return;
  const typed=prompt('For safety, type RESET ALL TABLES to confirm:','');
  if(String(typed||'').trim().toUpperCase()!=='RESET ALL TABLES')return toast('Reset cancelled — confirmation text did not match.');
  try{const j=await v167('admin_reset_all');toast(j.message||'All tables reset');await refresh(false,true)}catch(e){toast(e.message)}
}

// Admin approval center no longer includes Table Move Approval or Reset All.
// Rackmaster direct Move v1.6.6 applies immediately and notifies affected Player Portals.
v162AdminApprovalIds=function(){
  if(role!=='admin')return [];
  return [
    ...(data?.checkin_requests||[]).filter(x=>x.status==='pending').map(x=>'ci:'+x.id),
    ...(data?.reset_requests||[]).filter(x=>x.status==='pending').map(x=>'rr:'+x.id),
    ...(data?.access_requests||[]).filter(x=>x.status==='pending').map(x=>'ar:'+x.id)
  ];
};
approvalsView=function(){
  if(role!=='admin')return '<div class="empty">Admin only.</div>';
  const ci=(data.checkin_requests||[]).filter(x=>x.status==='pending'),
        rr=(data.reset_requests||[]).filter(x=>x.status==='pending'),
        ar=(data.access_requests||[]).filter(x=>x.status==='pending');
  const total=ci.length+rr.length+ar.length;
  const playerName=id=>(data.registry||data.players||[]).find(p=>p.id===id)?.full_name||player(id).full_name||'Player';
  const staffName=id=>(data.staff_v12||data.staff||[]).find(s=>s.id===id)?.full_name||'Rackmaster';
  return `<section class="hero-panel glass compact-hero approvals-hero"><div><div class="eyebrow">ADMIN APPROVAL CENTER</div><h2>${total} Pending Approval${total===1?'':'s'}</h2><p>Check-ins, individual table resets and temporary access requests requiring Admin authority.</p></div><div class="approval-bell ${total?'hot':''}">🔔<b>${total}</b></div></section>
  <div class="approval-kpis v167-approval-kpis"><div class="card glass"><span>CHECK-INS</span><b>${ci.length}</b></div><div class="card glass"><span>TABLE RESETS</span><b>${rr.length}</b></div><div class="card glass"><span>ACCESS REQUESTS</span><b>${ar.length}</b></div></div>
  <section class="card glass approval-section"><div class="approval-section-head"><div><div class="eyebrow">CASHIER SUBMISSIONS</div><h2>Queue Check-In Approval</h2></div><span class="pill ${ci.length?'pending':'good'}">${ci.length}</span></div>${ci.length?ci.map(r=>`<article class="approval-row crystal-approval"><div class="approval-icon">＋</div><div class="grow"><b>${esc(playerName(r.player_id))}</b><small>${esc(v162TableName(r.table_id))} · ${money(r.amount||0)} · submitted for queue entry</small></div><button class="btn good" onclick="resolveCheckin161('${r.id}',true)">Approve</button><button class="btn danger" onclick="resolveCheckin161('${r.id}',false)">Decline</button></article>`).join(''):'<div class="empty">No check-in approvals pending.</div>'}</section>
  <section class="card glass approval-section"><div class="approval-section-head"><div><div class="eyebrow">RACKMASTER REQUESTS</div><h2>Table Reset Approval</h2></div><span class="pill ${rr.length?'pending':'good'}">${rr.length}</span></div>${rr.length?rr.map(r=>`<article class="approval-row crystal-approval"><div class="approval-icon">↺</div><div class="grow"><b>${esc(v162TableName(r.table_id))}</b><small>Requested by ${esc(staffName(r.requested_by_staff_id))}. Holder returns to Queue #1 after approval.</small></div><button class="btn good" onclick="resolveReset161('${r.id}',true)">Approve</button><button class="btn danger" onclick="resolveReset161('${r.id}',false)">Decline</button></article>`).join(''):'<div class="empty">No table reset approvals pending.</div>'}</section>
  <section class="card glass approval-section"><div class="approval-section-head"><div><div class="eyebrow">RACKMASTER ACCESS</div><h2>Temporary Table Access</h2></div><span class="pill ${ar.length?'pending':'good'}">${ar.length}</span></div>${ar.length?ar.map(r=>`<article class="approval-row crystal-approval"><div class="approval-icon">👁</div><div class="grow"><b>${esc(staffName(r.staff_id))}</b><small>Requests access to ${esc(v162TableName(r.table_id))}</small></div><button class="btn good" onclick="resolveAccess('${r.id}',true)">Approve</button><button class="btn danger" onclick="resolveAccess('${r.id}',false)">Decline</button></article>`).join(''):'<div class="empty">No table-access approvals pending.</div>'}</section>`;
};

// Dashboard date/time is local-only. It never calls Supabase or any network endpoint.
function v167ClockText(){
  const now=new Date();
  try{
    const date=new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(now);
    const time=new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now);
    return {date,time};
  }catch{return {date:now.toLocaleDateString(),time:now.toLocaleTimeString()}}
}
function v167StartClock(){
  clearInterval(window.__d12V167Clock);
  const tick=()=>{
    const host=document.querySelector('#v167DashboardClock');
    if(!host){clearInterval(window.__d12V167Clock);window.__d12V167Clock=null;return}
    const t=v167ClockText(),d=host.querySelector('[data-date]'),tm=host.querySelector('[data-time]');
    if(d)d.textContent=t.date;if(tm)tm.textContent=t.time;
  };
  tick();
  window.__d12V167Clock=setInterval(tick,30000);
}
const v167OverviewBase=overviewView;
overviewView=function(){
  const t=v167ClockText();
  setTimeout(v167StartClock,0);
  return `<section id="v167DashboardClock" class="v167-dashboard-clock glass"><div class="v167-clock-icon">◷</div><div><small>ABUJA · D12 OPERATIONS DATE</small><b data-date>${esc(t.date)}</b></div><div class="v167-clock-time"><small>CURRENT TIME</small><strong data-time>${esc(t.time)}</strong></div></section>${v167OverviewBase()}`;
};

// Players Today: keep classification, remove price wording from Walk-in.
v166TodayPlayerRow=function(p){
  const total=Math.max(1,p.wins+p.losses),rate=Math.round((p.wins/total)*100),member=p.status==='Membership';
  return `<article class="v164-player-row v166-player-row"><div class="v164-player-ident">${avatar(p,'md')}<div><b>${esc(p.full_name)}</b><small>${esc(p.player_code||'PLAYER')} · ${esc((p.tables||[]).join(', ')||'—')}</small><small class="v166-logtime">◷ ${p.first_play_at?esc(v166AbujaStamp(p.first_play_at)):'—'}${p.last_play_at&&p.last_play_at!==p.first_play_at?` → ${esc(v166AbujaStamp(p.last_play_at))}`:''}</small></div></div><div class="v164-form"><div><b>${p.wins}</b><span>W</span><em>–</em><b>${p.losses}</b><span>L</span></div><div class="v164-form-meter"><i style="width:${rate}%"></i></div><small>${rate}% win rate · ${p.matches} match${p.matches===1?'':'es'}</small></div><div class="v164-cleared"><small>CLEARED BY</small><b>${esc(p.clearance||'—')}</b></div><div class="v164-appeals"><span class="v164-mini-orb">↺</span><div><b>${p.appeals}</b><small>APPEALS</small></div></div><div><span class="pill ${member?'good':''}">${member?'◆ MEMBERSHIP':'○ WALK-IN'}</span></div></article>`;
};
