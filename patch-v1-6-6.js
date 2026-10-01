// D12 PLAYERS TURN v1.6.6 — consolidated Move, Reset All approval, notification center, dated daily log and saved shifts
const V166_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-turn-v166';
const v166=(a,p={},auth=true)=>api(V166_API,a,p,auth);
let v166PlayerTab='turn';

function mergeV166(base,ext){return {...base,reset_all_requests:ext?.reset_all_requests||[],shift_templates:ext?.shift_templates||[],staff_v166:ext?.staff_v166||[],staff_roles_v166:ext?.staff_roles_v166||[],tables_v166:ext?.tables_v166||[]}}
function v166ExtSignature(ext){return JSON.stringify({ra:(ext?.reset_all_requests||[]).map(x=>[x.id,x.status,x.updated_at]),st:(ext?.shift_templates||[]).map(x=>[x.id,x.updated_at,x.active])})}

// Initial sign-in loads v1.6.6 extension once. No new timer is created here.
const v166EnterBase=enterApp;
enterApp=async function(){
  await v166EnterBase();
  try{const ext=await v166('bootstrap');data=mergeV166(data,ext);renderApp(true)}catch(e){console.warn('v1.6.6 bootstrap',e)}
};

// Extend the v1.6.5 heavy refresh only when the revision signal says data changed.
const v166FullRefreshBase=v165FullStaffRefresh;
v165FullStaffRefresh=async function(silent=true){
  const changed=await v166FullRefreshBase(silent),before=v166ExtSignature(data);
  try{
    const ext=await v166('bootstrap'),after=v166ExtSignature(ext);data=mergeV166(data,ext);
    if(before!==after){renderApp(true);if(typeof v162CheckApprovalNotifications==='function')v162CheckApprovalNotifications(false);return true}
  }catch(e){if(!silent)toast(e.message)}
  return changed;
};

// Count Reset All requests inside the existing Admin Approval notification system.
const v166AdminApprovalIdsBase=v162AdminApprovalIds;
v162AdminApprovalIds=function(){return [...v166AdminApprovalIdsBase(),...(data?.reset_all_requests||[]).filter(x=>x.status==='pending').map(x=>'rall:'+x.id)]};

function v166AbujaStamp(value=new Date()){
  try{return new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch{return new Date(value).toLocaleString()}
}
function v166TableOptions(current=''){
  const all=data?.all_table_summaries||data?.tables||[];
  return all.filter(t=>t.id!==current&&t.operational_status!=='closed').map(t=>`<option value="${t.id}">${esc(t.table_name)} · ${Number(t.queue_count||0)} in line · ~${Number(t.estimated_wait_minutes||0)} min</option>`).join('')
}

// One Move button replaces Up / Down / Table / Pass.
queueRow=function(q,i,tableId){
  const p=player(q.player_id),appeal=q.source==='appeal';
  return `<div class="queue-row v166-queue-row"><div class="queue-num">${i+1}</div>${avatar(p,'sm')}<div class="grow v166-player-copy"><b>${esc(p.full_name)}</b><small>${payBadge(q)}</small></div><div class="queue-actions v166-queue-actions"><button class="icon-action" title="Upload photo" onclick="pickPlayerPhoto('${p.id}')">📷</button><button class="btn small v166-move-btn" onclick="openMove166('${q.id}','${tableId}','${esc(p.full_name).replaceAll("'","&#39;")}','${appeal?'appeal':'normal'}')">↕ Move</button><button class="btn small call-btn" onclick="callPlayer('${q.id}')">🔔 Call</button><button class="btn small danger leave-arena-btn" onclick="staffLeaveArena('${q.id}','${esc(p.full_name).replaceAll("'","&#39;")}')">🚪 Leave</button></div></div>`;
};
function openMove166(queueId,tableId,name,kind='normal'){
  const protectedAppeal=kind==='appeal',opts=v166TableOptions(tableId);
  openModal(`<div class="modal-head"><div><div class="eyebrow">RACKMASTER · DIRECT QUEUE MOVE</div><h2>Move ${esc(name||'Player')}</h2><p class="muted">Changes apply immediately and the affected player portals are notified.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div>${protectedAppeal?'<div class="notice warnbox">This is a paid Appeal. Its next-challenger priority remains protected; only Change Table is available.</div>':''}<div class="v166-move-grid"><button class="v166-move-choice glass" ${protectedAppeal?'disabled':''} onclick="executeMove166('${queueId}','up')"><i>↑</i><b>Move Up</b><small>One position higher</small></button><button class="v166-move-choice glass" ${protectedAppeal?'disabled':''} onclick="executeMove166('${queueId}','down')"><i>↓</i><b>Move Down</b><small>One position lower</small></button><button class="v166-move-choice glass" ${protectedAppeal?'disabled':''} onclick="executeMove166('${queueId}','last')"><i>⇣</i><b>Move To Last</b><small>Bottom of this queue</small></button><button class="v166-move-choice glass" onclick="document.querySelector('#v166TableMovePanel').classList.toggle('hidden')"><i>⇄</i><b>Change Table</b><small>Last in selected table</small></button></div><div id="v166TableMovePanel" class="card glass hidden v166-table-move-panel"><div class="field"><label>DESTINATION TABLE</label><select id="v166MoveTarget" class="v166-contrast-select">${opts||'<option value="">No other open table</option>'}</select></div><button class="btn primary block" onclick="executeMove166('${queueId}','table')">Move To Selected Table</button></div>`);
}
async function executeMove166(queueId,mode){
  const target=mode==='table'?$('#v166MoveTarget')?.value:null;if(mode==='table'&&!target)return toast('Select a destination table.');
  try{const j=await v166('move_player',{queue_id:queueId,mode,target_table_id:target});closeModal();toast(j.message||'Queue updated');await refresh(false,true)}catch(e){toast(e.message)}
}

// Rackmaster header: dated tracking + Players Today + Reset All Tables.
const v166RackBase=rackmasterView;
rackmasterView=function(){
  return `<section class="v166-rack-command glass"><div class="v166-date-block"><span>TRACKING DATE</span><b>${esc(v166AbujaStamp())}</b></div><div class="v166-rack-command-actions"><button class="btn v164-players-today-btn" onclick="openPlayersToday()"><span class="v164-launch-icon">◉</span><span><small>DAILY ROOM INTELLIGENCE</small><b>Players Today</b></span><i>›</i></button>${role==='rackmaster'?'<button class="btn v166-reset-all-btn" onclick="requestResetAll166()"><span class="v164-launch-icon">↺</span><span><small>ADMIN APPROVAL REQUIRED</small><b>Reset All Tables</b></span><i>›</i></button>':''}</div></section>${v166RackBase()}`;
};
async function requestResetAll166(){
  if(!confirm('Request ADMIN approval to RESET ALL TABLES? This will clear every active player, live match, queue and pending player approval on all four tables if approved.'))return;
  try{const j=await v166('request_reset_all');toast(j.message||'Reset request sent');await refresh(false,true)}catch(e){toast(e.message)}
}
async function resolveResetAll166(id,approve){
  const verb=approve?'APPROVE full reset and clear ALL tables?':'Decline Reset All Tables request?';if(!confirm(verb))return;
  try{const j=await v166('resolve_reset_all',{request_id:id,approve});toast(j.message);await refresh(false,true)}catch(e){toast(e.message)}
}

// Dedicated Admin approval section for destructive Reset All Tables.
const v166ApprovalsBase=approvalsView;
approvalsView=function(){
  const base=v166ApprovalsBase();if(role!=='admin')return base;const req=(data?.reset_all_requests||[]).filter(x=>x.status==='pending');
  const section=`<section class="card glass approval-section v166-reset-approval"><div class="approval-section-head"><div><div class="eyebrow">HIGH-IMPACT ADMIN APPROVAL</div><h2>Reset All Tables</h2><p class="muted">Clears every active queue, live match and pending player workflow across all tables.</p></div><span class="pill ${req.length?'pending':'good'}">${req.length} PENDING</span></div>${req.length?req.map(r=>`<article class="approval-row crystal-approval"><div class="approval-icon danger">↺</div><div class="grow"><b>Reset all 4 tables</b><small>Requested ${esc(v166AbujaStamp(r.requested_at))} · ${esc(r.note||'Full table reset')}</small></div><button class="btn good" onclick="resolveResetAll166('${r.id}',true)">Approve</button><button class="btn danger" onclick="resolveResetAll166('${r.id}',false)">Decline</button></article>`).join(''):'<div class="empty">No Reset All Tables request is waiting.</div>'}</section>`;
  return section+base;
};

// Dated Players Today report; Membership means an active D12 subscription, otherwise Walk-in.
function v166TodayPlayerRow(p){
  const total=Math.max(1,p.wins+p.losses),rate=Math.round((p.wins/total)*100),member=p.status==='Membership';
  return `<article class="v164-player-row v166-player-row"><div class="v164-player-ident">${avatar(p,'md')}<div><b>${esc(p.full_name)}</b><small>${esc(p.player_code||'PLAYER')} · ${esc((p.tables||[]).join(', ')||'—')}</small><small class="v166-logtime">◷ ${p.first_play_at?esc(v166AbujaStamp(p.first_play_at)):'—'}${p.last_play_at&&p.last_play_at!==p.first_play_at?` → ${esc(v166AbujaStamp(p.last_play_at))}`:''}</small></div></div><div class="v164-form"><div><b>${p.wins}</b><span>W</span><em>–</em><b>${p.losses}</b><span>L</span></div><div class="v164-form-meter"><i style="width:${rate}%"></i></div><small>${rate}% win rate · ${p.matches} match${p.matches===1?'':'es'}</small></div><div class="v164-cleared"><small>CLEARED BY</small><b>${esc(p.clearance||'—')}</b></div><div class="v164-appeals"><span class="v164-mini-orb">↺</span><div><b>${p.appeals}</b><small>APPEALS</small></div></div><div><span class="pill ${member?'good':''}">${member?'◆ MEMBERSHIP':'○ WALK-IN · ₦3,000'}</span></div></article>`;
}
function v166RenderPlayersToday(d){
  const s=d.summary||{},rows=d.players||[];
  return `<div class="v164-players-today"><div class="modal-head v164-dialog-head"><div><div class="eyebrow">D12 DAILY ROOM INTELLIGENCE · ${esc(d.date||'TODAY')}</div><h2>Players Today</h2><p>Log generated ${esc(v166AbujaStamp(d.generated_at||new Date()))} · Abuja time</p></div><button class="icon-btn" onclick="v164ClosePlayersToday()">×</button></div><div class="v164-today-kpis"><article class="glass"><i>♟</i><b>${s.players||0}</b><span>Players</span></article><article class="glass"><i>🎱</i><b>${s.matches||0}</b><span>Completed Matches</span></article><article class="glass"><i>●</i><b>${s.active||0}</b><span>Live Now</span></article><article class="glass"><i>↺</i><b>${s.appeals||0}</b><span>Appeals</span></article><article class="glass"><i>◆</i><b>${s.members||0}</b><span>Membership</span></article><article class="glass"><i>○</i><b>${s.walkins||0}</b><span>Walk-ins</span></article></div><div class="v164-chart-grid"><section class="glass v164-chart-card"><div><div class="eyebrow">FORM BOARD</div><h3>Top Wins Today</h3></div><canvas id="v164WinsChart"></canvas></section><section class="glass v164-chart-card"><div><div class="eyebrow">PLAYER MIX</div><h3>Membership vs Walk-in</h3></div><canvas id="v164MixChart"></canvas></section></div><section class="glass v164-roster-panel"><div class="v164-roster-head"><div><div class="eyebrow">DATED PLAYER LOG</div><h3>${rows.length} player${rows.length===1?'':'s'} recorded · ${esc(d.date||'')}</h3></div></div><div class="v164-player-list">${rows.length?rows.map(v166TodayPlayerRow).join(''):'<div class="empty">No match activity recorded for this date.</div>'}</div></section></div>`;
}
openPlayersToday=async function(){
  openModal(`<div class="v164-loading"><div class="v164-loader"></div><b>Loading Players Today…</b><small>Reading today’s D12 match, clearance, membership and appeal records.</small></div>`);$('#modalCard')?.classList.add('v164-wide-modal');
  try{const d=await v166('players_today'),card=$('#modalCard');if(!card)return;card.innerHTML=v166RenderPlayersToday(d);requestAnimationFrame(()=>v164InitTodayCharts(d))}catch(e){const card=$('#modalCard');if(card)card.innerHTML=`<div class="modal-head"><div><div class="eyebrow">PLAYERS TODAY</div><h2>Could not load today’s report</h2></div><button class="icon-btn" onclick="v164ClosePlayersToday()">×</button></div><div class="notice danger-note">${esc(e.message)}</div>`}
};

// Player Portal Notification tab. Queue moves land here through the existing ticket notification feed.
const v166RenderPlayerBase=renderPlayer;
renderPlayer=function(d){
  v166RenderPlayerBase(d);const host=$('#playerBody');if(!host)return;const turnHtml=host.innerHTML,notes=d.notifications||[];
  const noteHtml=notes.length?notes.map(n=>`<article class="v166-notification ${n.acknowledged_at?'read':'unread'}"><div class="v166-note-icon">${n.kind==='queue_move'?'↕':n.kind==='call'?'🔔':n.kind==='reset_all'?'↺':'●'}</div><div class="grow"><b>${esc(String(n.kind||'update').replaceAll('_',' ').toUpperCase())}</b><p>${esc(n.message)}</p><small>${esc(v166AbujaStamp(n.created_at))}</small></div>${!n.acknowledged_at?`<button class="btn small" onclick="ackNote166('${n.id}')">Mark Read</button>`:''}</article>`).join(''):'<div class="empty">No turn notifications yet.</div>';
  host.innerHTML=`<nav class="v166-player-tabs glass"><button class="${v166PlayerTab==='turn'?'active':''}" onclick="setPlayerTab166('turn')">🎱 My Turn</button><button class="${v166PlayerTab==='notifications'?'active':''}" onclick="setPlayerTab166('notifications')">🔔 Notifications <span>${notes.filter(n=>!n.acknowledged_at).length}</span></button></nav><div id="v166TurnView" class="${v166PlayerTab==='turn'?'':'hidden'}">${turnHtml}</div><section id="v166NotificationView" class="card glass ${v166PlayerTab==='notifications'?'':'hidden'}"><div class="section-title"><div><div class="eyebrow">PLAYER COMMUNICATION CENTER</div><h2>Turn Notifications</h2><p class="muted">Queue moves, calls, resets and important turn changes appear here.</p></div><span class="glass-icon">🔔</span></div><div class="v166-notification-list">${noteHtml}</div></section>`;
};
function setPlayerTab166(tab){v166PlayerTab=tab;$('#v166TurnView')?.classList.toggle('hidden',tab!=='turn');$('#v166NotificationView')?.classList.toggle('hidden',tab!=='notifications');$$('.v166-player-tabs button').forEach((b,i)=>b.classList.toggle('active',(tab==='turn'&&i===0)||(tab==='notifications'&&i===1)))}
async function ackNote166(id){try{await ticketApi('ack_notification',{ticket:ticketParam,notification_id:id});v166PlayerTab='notifications';await pollPlayer(false,true)}catch(e){toast(e.message)}}

// Saved shift combinations live in the Cashier workspace. They do not create any polling.
function v166ShiftWorkspace(){
  if(!['admin','cashier'].includes(role))return '';
  const staff=data?.staff_v166||[],roles=data?.staff_roles_v166||[],tables=data?.tables_v166||data?.cue_tables_v12||[],templates=data?.shift_templates||[];
  const racks=roles.filter(r=>r.turn_role==='rackmaster').map(r=>staff.find(s=>s.id===r.staff_id)).filter(Boolean),cashiers=roles.filter(r=>r.turn_role==='cashier').map(r=>staff.find(s=>s.id===r.staff_id)).filter(Boolean),own=data?.actor?.staff_id||'';
  const cashierOptions=role==='cashier'?cashiers.filter(c=>c.id===own):cashiers;
  const tableChecks=(name)=>tables.map(t=>`<label><input type="checkbox" name="${name}" value="${t.id}"> ${esc(t.table_name)}</label>`).join('');
  const cards=templates.filter(t=>role==='admin'||t.cashier_staff_id===own).map(t=>{const c=staff.find(s=>s.id===t.cashier_staff_id),r1=staff.find(s=>s.id===t.rackmaster_1_staff_id),r2=staff.find(s=>s.id===t.rackmaster_2_staff_id);return `<article class="v166-shift-card glass"><div class="grow"><div class="eyebrow">SAVED SHIFT COMBINATION</div><h3>${esc(t.template_name)}</h3><p><b>Cashier:</b> ${esc(c?.full_name||'Cashier')} · <b>Rackmasters:</b> ${esc(r1?.full_name||'RM1')} + ${esc(r2?.full_name||'RM2')}</p></div><button class="btn primary" onclick="startShiftTemplate166('${t.id}')">▶ Load & Start</button></article>`}).join('')||'<div class="empty">No saved shift combination yet.</div>';
  return `<section class="card glass section v166-shift-workspace"><div class="section-title"><div><div class="eyebrow">START / CHANGE SHIFT</div><h2>Saved Staff Combinations</h2><p class="muted">Save the cashier + two Rackmasters + table allocation once, then load it in one touch next time.</p></div><span class="glass-icon">♟</span></div><div class="v166-shift-template-list">${cards}</div><details class="v166-save-template"><summary class="btn">＋ Save New Shift Combination</summary><form id="v166ShiftTemplateForm" class="stack"><div class="form-grid"><div class="field"><label>TEMPLATE NAME</label><input name="template_name" placeholder="Evening Shift A" required></div><div class="field"><label>CASHIER</label><select name="cashier_staff_id" class="v166-contrast-select" required><option value="">Select cashier</option>${cashierOptions.map(c=>`<option value="${c.id}" ${role==='cashier'?'selected':''}>${esc(c.full_name)} · @${esc(c.username||'')}</option>`).join('')}</select></div><div class="field"><label>RACKMASTER 1</label><select name="rackmaster_1_staff_id" class="v166-contrast-select" required><option value="">Select Rackmaster</option>${racks.map(r=>`<option value="${r.id}">${esc(r.full_name)}</option>`).join('')}</select></div><div class="field"><label>RACKMASTER 2</label><select name="rackmaster_2_staff_id" class="v166-contrast-select" required><option value="">Select Rackmaster</option>${racks.map(r=>`<option value="${r.id}">${esc(r.full_name)}</option>`).join('')}</select></div></div><div class="grid two"><div class="field"><label>RACKMASTER 1 · 2 TABLES</label><div class="check-grid">${tableChecks('v166_rm1_tables')}</div></div><div class="field"><label>RACKMASTER 2 · 2 TABLES</label><div class="check-grid">${tableChecks('v166_rm2_tables')}</div></div></div><button class="btn primary block">Save Combination</button></form></details></section>`;
}
const v166CashierBase=cashierView;
cashierView=function(){return `${v166CashierBase()}${v166ShiftWorkspace()}`};
const v166BindBase=bindForms;
bindForms=function(){v166BindBase();$('#v166ShiftTemplateForm')?.addEventListener('submit',saveShiftTemplate166)};
async function saveShiftTemplate166(e){e.preventDefault();const f=new FormData(e.currentTarget),t1=[...e.currentTarget.querySelectorAll('[name="v166_rm1_tables"]:checked')].map(x=>x.value),t2=[...e.currentTarget.querySelectorAll('[name="v166_rm2_tables"]:checked')].map(x=>x.value);try{const j=await v166('save_shift_template',{template_name:f.get('template_name'),cashier_staff_id:f.get('cashier_staff_id'),rackmaster_1_staff_id:f.get('rackmaster_1_staff_id'),rackmaster_2_staff_id:f.get('rackmaster_2_staff_id'),rackmaster_1_tables:t1,rackmaster_2_tables:t2});toast(j.message);await refresh(false,true)}catch(x){toast(x.message)}}
async function startShiftTemplate166(id){if(!confirm('Start this saved staff shift combination now? The currently active shift will be closed.'))return;try{const j=await v166('start_shift_template',{template_id:id});toast(j.message);await refresh(false,true)}catch(e){toast(e.message)}}
