// D12 PLAYERS TURN v1.7.2 — compact 6-button Player Portal
let v172PlayerData=null,v172IdentityData=null;

function v172Insights(){return v163InsightsData||{today_stats:{played:0,wins:0,losses:0,win_rate:0,streak:0},head_to_head:[],top_winners:[]}}
function v172PortalButtons(){
  return `<section class="v172-player-launch-grid">
    <button class="v172-player-launch glass" onclick="openMyTurn172()"><i>🎱</i><span><small>QUEUE & TABLE</small><b>My Turn</b></span><em>›</em></button>
    <button class="v172-player-launch glass" onclick="openTodayD12172()"><i>◎</i><span><small>DAILY PERFORMANCE</small><b>Today at D12</b></span><em>›</em></button>
    <button class="v172-player-launch glass" onclick="openMomentum172()"><i>⚡</i><span><small>FORM & WIN RATE</small><b>Momentum</b></span><em>›</em></button>
    <button class="v172-player-launch glass" onclick="openMatchRadar172()"><i>⚔</i><span><small>CHALLENGES & PLAYERS TO WATCH</small><b>Match Radar</b></span><em>›</em></button>
    <button class="v172-player-launch glass" onclick="openArenaPulse172()"><i>◉</i><span><small>LIVE TABLE ACTIVITY</small><b>Arena Pulse</b></span><em>›</em></button>
    <button class="v172-player-launch glass" onclick="openAlerts172()"><i>🔔</i><span><small>CALLS & TURN CHANGES</small><b>Alerts</b></span><em>›</em></button>
  </section>`;
}
function v172UtilityButtons(notes=[]){
  const unread=(notes||[]).filter(n=>!n.acknowledged_at).length;
  return `<div class="v172-player-utilities">
    <button class="btn" onclick="openAlerts172()">🔔 Notifications${unread?` <span class="v172-unread">${unread}</span>`:''}</button>
    <button class="btn" onclick="openReportStaff1610()">⚑ Report Staff</button>
  </div>`;
}
function v172PlayerSummary(p,active=false){
  return `<section class="v172-player-summary glass">${avatar(p,'lg')}<div class="grow"><div class="eyebrow">${active?(p.member?'D12 MEMBER':'D12 PLAYER'):'REGISTERED PLAYER'} · ${esc(p.player_code||'')}</div><h2>${esc(p.full_name||'Player')}</h2><p>${active?'Your live D12 turn controls and room intelligence are below.':'You are ready for check-in. Your D12 activity and room intelligence remain available below.'}</p></div><span class="v172-status-dot ${active?'live':'idle'}"></span></section>`;
}

function openMyTurn172(){
  const d=v172PlayerData;
  if(!d){
    const p=v172IdentityData?.player;
    return openModal(`<div class="modal-head"><div><div class="eyebrow">MY TURN</div><h2>No Active Turn</h2><p class="muted">${esc(p?.full_name||'Player')} is not currently linked to a live D12 playing turn.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v172-no-turn glass"><i>🎱</i><b>READY FOR CHECK-IN</b><span>See the Cashier when you are ready to join a table.</span></div>`);
  }
  const q=d.queue,requests=d.move_requests||[],transfers=d.transfer_requests||[],pendingTransfer=transfers.find(x=>x.status==='pending'),canMove=['queued','called'].includes(q.status),pos=q.position||'—';
  const queueRequests=requests.length?`<section class="v172-subpanel glass"><div class="eyebrow">QUEUE EXCHANGE REQUEST</div>${requests.map(r=>`<article class="v172-request-row">${r.requester_photo?`<img class="avatar md" src="${r.requester_photo}" alt="">`:`<div class="avatar md placeholder">${esc((r.requester_name||'?').slice(0,1))}</div>`}<div class="grow"><b>${esc(r.requester_name||'Player')}</b><small>Wants to exchange queue position with you.</small></div><button class="btn good" onclick="respondMove('${r.id}',true)">Approve</button><button class="btn danger" onclick="respondMove('${r.id}',false)">Decline</button></article>`).join('')}</section>`:'';
  openModal(`<div class="modal-head"><div><div class="eyebrow">MY TURN · LIVE</div><h2>${esc(d.player.full_name)}</h2><p class="muted">${esc(q.label||'Active D12 turn')}</p></div><button class="icon-btn" onclick="closeModal()">×</button></div>
    <section class="v172-turn-hero glass">
      <div class="v172-big-position"><small>QUEUE POSITION</small><b>${esc(String(pos))}</b></div>
      <div class="v172-big-table"><small>CURRENT TABLE</small><b>${esc(d.table?.table_name||'—')}</b><span>${q.estimated_wait_minutes!=null?'Estimated wait · '+Number(q.estimated_wait_minutes)+' min':''}</span></div>
    </section>
    ${pendingTransfer?`<section class="v172-subpanel glass"><div class="eyebrow">TABLE MOVE STATUS</div><b>Transfer request pending</b><p class="muted">Your current table remains active until the move finishes.</p></section>`:''}
    ${queueRequests}
    <div class="v172-turn-actions">
      <button class="btn primary" onclick="enableAlerts()">🔔 Enable Alerts</button>
      ${canMove&&!pendingTransfer?`<button class="btn" onclick="closeModal();openPlayerTableMoveFromData()">⇄ Move To Table</button>`:''}
      <button class="btn danger" onclick="closeModal();playerLeaveArena()">🚪 Leave Arena</button>
    </div>`);
}
function openTodayD12172(){
  const s=v172Insights().today_stats||{played:0,wins:0,losses:0,win_rate:0,streak:0};
  openModal(`<div class="modal-head"><div><div class="eyebrow">TODAY AT D12</div><h2>Daily Performance</h2><p class="muted">Your completed D12 results for today.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v172-kpi-grid"><article class="glass"><i>🎯</i><b>${Number(s.played||0)}</b><span>Matches</span></article><article class="glass"><i>🏆</i><b>${Number(s.wins||0)}</b><span>Wins</span></article><article class="glass"><i>◌</i><b>${Number(s.losses||0)}</b><span>Losses</span></article><article class="glass"><i>⚡</i><b>${Number(s.streak||0)}</b><span>Win Streak</span></article></div>`);
}
function openMomentum172(){
  const s=v172Insights().today_stats||{played:0,wins:0,losses:0,win_rate:0,streak:0},pct=Math.max(0,Math.min(100,Number(s.win_rate||0)));
  const msg=!s.played?'Your first completed match will start today’s momentum.':s.wins>s.losses?'Positive momentum — keep pressing.':s.wins===s.losses?'Balanced form — next result can swing the day.':'Building momentum — one strong run can change the day.';
  openModal(`<div class="modal-head"><div><div class="eyebrow">MOMENTUM</div><h2>Current Form</h2><p class="muted">${esc(msg)}</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><section class="v172-momentum glass"><div class="v172-momentum-orb" style="--pct:${pct}"><span><b>${pct}%</b><small>WIN RATE</small></span></div><div class="grow"><div class="v172-momentum-meter"><i style="width:${pct}%"></i></div><div class="v172-momentum-stats"><span><b>${Number(s.wins||0)}</b> WINS</span><span><b>${Number(s.losses||0)}</b> LOSSES</span><span><b>${Number(s.streak||0)}</b> STREAK</span></div></div></section>`);
}
function openMatchRadar172(){
  const ins=v172Insights(),h=ins.head_to_head||[],tops=ins.top_winners||[],current=v172PlayerData?.table?.id||null;
  const head=h.length?h.slice(0,8).map(x=>`<article class="v172-radar-row">${avatar(x,'sm')}<div class="grow"><b>${esc(x.full_name)}</b><small>${Number(x.matches||0)} match${Number(x.matches||0)===1?'':'es'} today</small></div><strong>${Number(x.wins||0)}W · ${Number(x.losses||0)}L</strong></article>`).join(''):'<div class="empty">No head-to-head results recorded yet today.</div>';
  const watch=tops.length?tops.slice(0,8).map(x=>`<article class="v172-radar-row ${x.table_id===current?'current':''}">${avatar(x,'sm')}<div class="grow"><b>${esc(x.full_name)}</b><small>${esc(x.table_name||'Table')}${x.table_id===current?' · YOUR TABLE':''}</small></div><strong>🔥 ${Number(x.wins||0)}W</strong></article>`).join(''):'<div class="empty">Table leaders will appear after completed matches.</div>';
  openModal(`<div class="modal-head"><div><div class="eyebrow">MATCH RADAR</div><h2>Challenges & Players To Watch</h2><p class="muted">Today’s head-to-head activity and strongest table form.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v172-radar-grid"><section class="glass"><div class="section-title"><div><small>CHALLENGES TODAY</small><h3>Head-to-Head</h3></div><span>⚔</span></div>${head}</section><section class="glass"><div class="section-title"><div><small>PLAYERS TO WATCH</small><h3>Challenge Radar</h3></div><span>🔥</span></div>${watch}</section></div>`);
}
function v172ArenaRows(){
  const active=v172PlayerData,rows=active?(active.other_tables_summary||[]):((v172IdentityData?.table_summaries)||[]);
  const full=active&&active.table? [{id:active.table.id,table_name:active.table.table_name,queue_count:active.queue?.position?Math.max(1,active.queue.position):0,estimated_wait_minutes:active.queue?.estimated_wait_minutes||0},...rows]:rows;
  const seen=new Set();return full.filter(x=>x?.id&&!seen.has(x.id)&&seen.add(x.id));
}
function openArenaPulse172(){
  const rows=v172ArenaRows();
  openModal(`<div class="modal-head"><div><div class="eyebrow">ARENA PULSE</div><h2>Live Table Activity</h2><p class="muted">Track queue depth and approximate wait across D12.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v172-arena-grid">${rows.length?rows.map(x=>`<article class="glass"><div class="v172-arena-ring">${Number(x.queue_count||0)}</div><div><b>${esc(x.table_name||'Table')}</b><span>${Number(x.queue_count||0)} in line</span><small>~${Number(x.estimated_wait_minutes||0)} min wait</small></div></article>`).join(''):'<div class="empty">No table information available.</div>'}</div>`);
}
function v172Notes(){
  return v172PlayerData?.notifications||[];
}
function openAlerts172(){
  const notes=v172Notes();
  const html=notes.length?notes.map(n=>`<article class="v172-alert-row ${n.acknowledged_at?'read':'unread'}"><div class="v172-alert-icon">${n.kind==='call'?'🔔':n.kind==='queue_move'?'↕':n.kind==='reset_all'?'↺':'●'}</div><div class="grow"><b>${esc(String(n.kind||'update').replaceAll('_',' ').toUpperCase())}</b><p>${esc(n.message||'')}</p><small>${esc(v166AbujaStamp(n.created_at))}</small></div>${!n.acknowledged_at?`<button class="btn small" onclick="ackNote172('${n.id}')">Mark Read</button>`:''}</article>`).join(''):'<div class="empty">No turn notifications yet.</div>';
  openModal(`<div class="modal-head"><div><div class="eyebrow">ALERTS</div><h2>Player Notifications</h2><p class="muted">Rackmaster calls, queue moves, resets and important turn changes.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><button class="btn primary block" onclick="enableAlerts()">🔔 Enable Sound, Vibration & Notifications</button><div class="v172-alert-list">${html}</div>`);
}
async function ackNote172(id){try{await ticketApi('ack_notification',{ticket:ticketParam,notification_id:id});await pollPlayer(false,true);openAlerts172()}catch(e){toast(e.message)}}

const v172RenderPlayerBase=renderPlayer;
renderPlayer=function(d){
  v172PlayerData=d;window.__d12Player1610=d.player;
  v172RenderPlayerBase(d);
  const host=$('#playerBody');if(!host)return;
  host.innerHTML=`${v172PlayerSummary(d.player,true)}${v172PortalButtons()}${v172UtilityButtons(d.notifications||[])}`;
  window.__d12PlayerTableSummaries=d.other_tables_summary||[];
};
const v172IdentityBase=renderIdentityDashboard;
renderIdentityDashboard=function(j){
  v172IdentityData=j;window.__d12IdentityPlayer1610=j.player;
  v172IdentityBase(j);
  const main=$('.player-shell main.content');if(!main)return;
  main.innerHTML=`${v172PlayerSummary(j.player,false)}${v172PortalButtons()}${v172UtilityButtons([])}<div class="player-bottom-actions"><button class="btn welcome-btn" onclick="v163GoWelcome('player')">⌂ Go To Welcome Screen</button><button class="btn danger" onclick="renderLogin('player','identity')">Sign Out</button></div>`;
};
