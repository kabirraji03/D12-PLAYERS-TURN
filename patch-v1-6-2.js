// D12 PLAYERS TURN v1.6.2 — dedicated approvals, staged membership verification, active-player and dashboard polish
let v162ApprovalSeen=new Set(),v162ApprovalPrimed=false,v162VerifiedMember=null;

function v162AdminApprovalIds(){
  if(role!=='admin')return [];
  return [
    ...(data?.checkin_requests||[]).filter(x=>x.status==='pending').map(x=>'ci:'+x.id),
    ...(data?.reset_requests||[]).filter(x=>x.status==='pending').map(x=>'rr:'+x.id),
    ...(data?.table_move_requests||[]).filter(x=>x.status==='pending').map(x=>'tm:'+x.id),
    ...(data?.access_requests||[]).filter(x=>x.status==='pending').map(x=>'ar:'+x.id)
  ];
}
function v162RackApprovalIds(){
  if(role!=='rackmaster')return [];
  const visible=new Set((data?.tables||[]).map(t=>t.id));
  const ci=(data?.checkin_requests||[]).filter(x=>x.status==='pending'&&visible.has(x.table_id)).map(x=>'ci:'+x.id);
  const tr=(data?.player_transfer_requests||[]).filter(x=>x.status==='pending'&&((visible.has(x.from_table_id)&&x.source_approval==='pending')||(visible.has(x.to_table_id)&&x.target_approval==='pending'))).map(x=>'tr:'+x.id);
  return [...ci,...tr];
}
function v162CashierApprovalIds(){
  if(role!=='cashier')return [];
  return (data?.payments||[]).filter(x=>x.kind==='appeal'&&x.status==='pending').map(x=>'ap:'+x.id);
}
function v162ApprovalIds(){return role==='admin'?v162AdminApprovalIds():role==='rackmaster'?v162RackApprovalIds():role==='cashier'?v162CashierApprovalIds():[]}
function v162ApprovalCount(){return v162ApprovalIds().length}
function v162ApprovalTone(){
  try{
    const C=window.AudioContext||window.webkitAudioContext;if(C){audioCtx=audioCtx||new C();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});const now=audioCtx.currentTime;[740,980,1240].forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.setValueAtTime(f,now+i*.11);g.gain.setValueAtTime(.0001,now+i*.11);g.gain.exponentialRampToValueAtTime(.12,now+i*.11+.025);g.gain.exponentialRampToValueAtTime(.0001,now+i*.11+.12);o.connect(g);g.connect(audioCtx.destination);o.start(now+i*.11);o.stop(now+i*.11+.14)})}
    navigator.vibrate?.([80,45,110]);
  }catch{}
}
function v162CheckApprovalNotifications(force=false){
  const ids=v162ApprovalIds(),set=new Set(ids),newOnes=ids.filter(id=>!v162ApprovalSeen.has(id));
  if((force&&ids.length)||(!force&&v162ApprovalPrimed&&newOnes.length)){
    v162ApprovalTone();toast(`${newOnes.length||ids.length} approval request${(newOnes.length||ids.length)===1?'':'s'} awaiting action`);
  }
  v162ApprovalSeen=set;v162ApprovalPrimed=true;
}

const v162EnterBase=enterApp;
enterApp=async function(){await v162EnterBase();v162ApprovalSeen=new Set();v162ApprovalPrimed=false;setTimeout(()=>v162CheckApprovalNotifications(true),180)};
const v162RefreshBase=refresh;
refresh=async function(silent=true){await v162RefreshBase(silent);v162CheckApprovalNotifications(false)};

allowedNav=function(){
  if(role==='admin')return [['overview','⌂','Overview'],['active','●','Active Players'],['registry','♙','Player Registry'],['cashier','₦','Cashier'],['rackmaster','◎','Rackmaster'],['approvals','✓',`Approvals${v162ApprovalCount()?` · ${v162ApprovalCount()}`:''}`],['staff','♟','Staff & Shifts'],['settings','⚙','Settings'],['audit','≡','Audit']];
  if(role==='cashier')return [['overview','⌂','Overview'],['cashier','₦',`Cashier${v162ApprovalCount()?` · ${v162ApprovalCount()}`:''}`]];
  if(role==='rackmaster')return [['overview','⌂','Overview'],['rackmaster','◎',`Rackmaster${v162ApprovalCount()?` · ${v162ApprovalCount()}`:''}`]];
  return [];
};

function v162TableName(id){return (data?.all_table_summaries||data?.tables||[]).find(t=>t.id===id)?.table_name||'Table'}
function approvalsView(){
  if(role!=='admin')return '<div class="empty">Admin only.</div>';
  const ci=(data.checkin_requests||[]).filter(x=>x.status==='pending'),rr=(data.reset_requests||[]).filter(x=>x.status==='pending'),tm=(data.table_move_requests||[]).filter(x=>x.status==='pending'),ar=(data.access_requests||[]).filter(x=>x.status==='pending');
  const total=ci.length+rr.length+tm.length+ar.length;
  const playerName=id=>(data.registry||data.players||[]).find(p=>p.id===id)?.full_name||player(id).full_name||'Player';
  const staffName=id=>(data.staff_v12||data.staff||[]).find(s=>s.id===id)?.full_name||'Rackmaster';
  return `<section class="hero-panel glass compact-hero approvals-hero"><div><div class="eyebrow">ADMIN APPROVAL CENTER</div><h2>${total} Pending Approval${total===1?'':'s'}</h2><p>All requests requiring Admin authority are centralized here.</p></div><div class="approval-bell ${total?'hot':''}">🔔<b>${total}</b></div></section>
  <div class="approval-kpis"><div class="card glass"><span>CHECK-INS</span><b>${ci.length}</b></div><div class="card glass"><span>TABLE RESETS</span><b>${rr.length}</b></div><div class="card glass"><span>TABLE MOVES</span><b>${tm.length}</b></div><div class="card glass"><span>ACCESS REQUESTS</span><b>${ar.length}</b></div></div>
  <section class="card glass approval-section"><div class="approval-section-head"><div><div class="eyebrow">CASHIER SUBMISSIONS</div><h2>Queue Check-In Approval</h2></div><span class="pill ${ci.length?'pending':'good'}">${ci.length}</span></div>${ci.length?ci.map(r=>`<article class="approval-row crystal-approval"><div class="approval-icon">＋</div><div class="grow"><b>${esc(playerName(r.player_id))}</b><small>${esc(v162TableName(r.table_id))} · ${money(r.amount||0)} · submitted for queue entry</small></div><button class="btn good" onclick="resolveCheckin161('${r.id}',true)">Approve</button><button class="btn danger" onclick="resolveCheckin161('${r.id}',false)">Decline</button></article>`).join(''):'<div class="empty">No check-in approvals pending.</div>'}</section>
  <section class="card glass approval-section"><div class="approval-section-head"><div><div class="eyebrow">RACKMASTER REQUESTS</div><h2>Table Reset Approval</h2></div><span class="pill ${rr.length?'pending':'good'}">${rr.length}</span></div>${rr.length?rr.map(r=>`<article class="approval-row crystal-approval"><div class="approval-icon">↺</div><div class="grow"><b>${esc(v162TableName(r.table_id))}</b><small>Requested by ${esc(staffName(r.requested_by_staff_id))}. Holder returns to Queue #1 after approval.</small></div><button class="btn good" onclick="resolveReset161('${r.id}',true)">Approve</button><button class="btn danger" onclick="resolveReset161('${r.id}',false)">Decline</button></article>`).join(''):'<div class="empty">No table reset approvals pending.</div>'}</section>
  <section class="card glass approval-section"><div class="approval-section-head"><div><div class="eyebrow">PLAYER TABLE MOVES</div><h2>Admin Table-Move Approval</h2></div><span class="pill ${tm.length?'pending':'good'}">${tm.length}</span></div>${tm.length?tm.map(r=>`<article class="approval-row crystal-approval">${avatar(r.player||{full_name:'Player'},'md')}<div class="grow"><b>${esc(r.player?.full_name||'Player')}</b><small>${esc(r.from_table_name||v162TableName(r.from_table_id))} → ${esc(r.to_table_name||v162TableName(r.to_table_id))}</small></div><button class="btn good" onclick="resolveTableMove('${r.id}',true)">Approve</button><button class="btn danger" onclick="resolveTableMove('${r.id}',false)">Decline</button></article>`).join(''):'<div class="empty">No Admin table-move approvals pending.</div>'}</section>
  <section class="card glass approval-section"><div class="approval-section-head"><div><div class="eyebrow">RACKMASTER ACCESS</div><h2>Temporary Table Access</h2></div><span class="pill ${ar.length?'pending':'good'}">${ar.length}</span></div>${ar.length?ar.map(r=>`<article class="approval-row crystal-approval"><div class="approval-icon">👁</div><div class="grow"><b>${esc(staffName(r.staff_id))}</b><small>Requests access to ${esc(v162TableName(r.table_id))}</small></div><button class="btn good" onclick="resolveAccess('${r.id}',true)">Approve</button><button class="btn danger" onclick="resolveAccess('${r.id}',false)">Decline</button></article>`).join(''):'<div class="empty">No table-access approvals pending.</div>'}</section>`;
}

const v162RenderBase=renderApp;
renderApp=function(preserveFocus=false){
  if(view!=='approvals')return v162RenderBase(preserveFocus);
  if(!data)return;if(role!=='admin'){view='overview';return v162RenderBase(preserveFocus)}
  const active=document.activeElement;if(preserveFocus&&active&&['INPUT','SELECT','TEXTAREA'].includes(active.tagName))return;
  charts.forEach(c=>{try{c.destroy()}catch{}});charts=[];$('#root').innerHTML=shell(approvalsView());bindForms();
};

function v162RackApprovalPanel(){
  if(role!=='rackmaster')return '';
  const visible=new Set((data.tables||[]).map(t=>t.id)),ci=(data.checkin_requests||[]).filter(x=>x.status==='pending'&&visible.has(x.table_id));
  const tr=(data.player_transfer_requests||[]).filter(x=>x.status==='pending'&&((visible.has(x.from_table_id)&&x.source_approval==='pending')||(visible.has(x.to_table_id)&&x.target_approval==='pending')));
  const pName=id=>(data.registry||data.players||[]).find(p=>p.id===id)?.full_name||player(id).full_name||'Player';
  if(!ci.length&&!tr.length)return '';
  return `<section class="card glass role-approval-panel"><div class="approval-section-head"><div><div class="eyebrow">RACKMASTER APPROVALS</div><h2>${ci.length+tr.length} Awaiting Your Decision</h2></div><div class="approval-bell hot">🔔<b>${ci.length+tr.length}</b></div></div>
  ${ci.map(r=>`<article class="approval-row crystal-approval"><div class="approval-icon">＋</div><div class="grow"><b>${esc(pName(r.player_id))}</b><small>Cashier check-in · ${esc(v162TableName(r.table_id))}</small></div><button class="btn good" onclick="resolveCheckin161('${r.id}',true)">Approve</button><button class="btn danger" onclick="resolveCheckin161('${r.id}',false)">Decline</button></article>`).join('')}
  ${tr.map(r=>{const leaving=visible.has(r.from_table_id)&&r.source_approval==='pending';return `<article class="approval-row crystal-approval"><div class="approval-icon">⇄</div><div class="grow"><b>${esc(pName(r.player_id))}</b><small>${leaving?'EXIT APPROVAL':'ENTRY APPROVAL'} · ${esc(v162TableName(r.from_table_id))} → ${esc(v162TableName(r.to_table_id))}</small></div><button class="btn good" onclick="resolveTransfer161('${r.id}',true)">Approve</button><button class="btn danger" onclick="resolveTransfer161('${r.id}',false)">Decline</button></article>`}).join('')}</section>`;
}
rackmasterView=function(){
  const visible=data.tables||[],others=(data.all_table_summaries||[]).filter(x=>!visible.some(t=>t.id===x.id));
  return `${role==='rackmaster'?`<section class="card glass section"><div class="eyebrow">MY TABLES</div><h2>${visible.length} table${visible.length===1?'':'s'} assigned</h2><p class="muted">Your current shift assignment controls approvals, resets and player transfers.</p>${others.length?`<div class="row wrap">${others.map(x=>`<button class="btn small" onclick="requestTableAccess('${x.id}')">Request ${esc(x.table_name)}</button>`).join('')}</div>`:''}</section>${v162RackApprovalPanel()}`:''}<div class="grid rack-grid">${visible.map(t=>rackTable(t)).join('')}</div>`;
};

function v162CashierApprovalBanner(){
  if(role!=='cashier')return '';
  const n=(data.payments||[]).filter(p=>p.kind==='appeal'&&p.status==='pending').length;
  return n?`<section class="card glass role-approval-panel cashier-approval-alert"><div class="approval-bell hot">🔔<b>${n}</b></div><div><div class="eyebrow">CASHIER APPROVALS</div><h3>${n} appeal payment${n===1?'':'s'} awaiting confirmation</h3><p class="muted">Confirm payment in the Appeal Gate below.</p></div></section>`:'';
}
const v162CashierBase=cashierView;
cashierView=function(){return `${v162CashierApprovalBanner()}${v162CashierBase()}`};

activePlayersView=function(){
  const rows=activePlayers(),playing=rows.filter(x=>x.status.includes('PLAYING')).length,waitingN=rows.filter(x=>x.position).length,holders=rows.filter(x=>x.status.includes('HOLDER')).length,tables=new Set(rows.map(x=>x.table_id)).size;
  const cards=rows.map(x=>{const pct=x.status.includes('PLAYING')?100:x.position?Math.max(12,100-Math.min(88,(x.position-1)*18)):42;return `<article class="active-player-card v162-player-card"><div class="player-card-top">${avatar(x.p,'lg')}<div class="grow"><div class="player-name-line"><b>${esc(x.p.full_name)}</b><span class="pill ${x.status.includes('PLAYING')?'good':x.status.includes('PAYMENT')?'pending':''}">${esc(x.status)}</span></div><small class="mono-id">${esc(x.p.player_code||'ID pending')}</small></div><button class="icon-action" title="Update photo" onclick="pickPlayerPhoto('${x.p.id}')">📷</button></div><div class="player-info-strip"><span><i>🎱</i><b>${esc(x.table_name)}</b><small>TABLE</small></span><span><i>↕</i><b>${x.position?'#'+x.position:'—'}</b><small>QUEUE</small></span><span><i>◷</i><b>${x.position?Math.max(0,(x.position-1)*Number(state(x.table_id).avg_match_minutes||12))+'m':'LIVE'}</b><small>WAIT</small></span></div><div class="player-progress"><i style="width:${pct}%"></i></div><button class="btn go-table-btn block" onclick="goToTable('${x.table_id}')">🎱 Go To ${esc(x.table_name)}</button></article>`}).join('');
  return `<section class="hero-panel glass compact-hero v162-active-hero"><div><div class="eyebrow">ACTIVE PLAYER LIST</div><h2>${rows.length} Players In The Turn System</h2><p>Live identity, table assignment, queue position and estimated movement.</p></div><button class="btn danger delete-select-btn" onclick="openDeletePlayerDialog('active')">🗑 Delete Player</button></section><div class="active-infographics"><div class="card glass"><i>▶</i><b>${playing}</b><span>Playing Now</span></div><div class="card glass"><i>↕</i><b>${waitingN}</b><span>In Queue</span></div><div class="card glass"><i>♛</i><b>${holders}</b><span>Table Holders</span></div><div class="card glass"><i>🎱</i><b>${tables}</b><span>Tables Used</span></div></div><section class="card glass active-list-shell"><div class="active-player-grid v162-active-grid">${cards||'<div class="empty">No active players.</div>'}</div></section>`;
};

const v162OverviewBase=overviewView;
overviewView=function(){return v162OverviewBase().replace('Club Turn Intelligence','Players Turn Intelligence')};
function v162ChartGradient(ctx,a,b){const g=ctx.createLinearGradient(0,0,0,240);g.addColorStop(0,a);g.addColorStop(1,b);return g}
initCharts=function(){
  if(typeof Chart==='undefined'||view!=='overview')return;const sums=data.all_table_summaries||[],common={responsive:true,maintainAspectRatio:false,animation:v13AnimateOverview?{duration:650}:false,plugins:{legend:{labels:{color:getComputedStyle(document.documentElement).getPropertyValue('--text').trim()||'#fff'}}},scales:{x:{ticks:{color:getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()},grid:{color:'rgba(255,255,255,.06)'}},y:{ticks:{color:getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()},grid:{color:'rgba(255,255,255,.06)'}}}};
  const q=$('#queueChart');if(q){const c=q.getContext('2d');charts.push(new Chart(q,{type:'bar',data:{labels:sums.map(x=>x.table_name),datasets:[{label:'Players',data:sums.map(x=>x.queue_count),backgroundColor:v162ChartGradient(c,'rgba(106,255,190,.82)','rgba(83,142,255,.26)'),borderColor:'rgba(220,255,244,.72)',borderWidth:1,borderRadius:12,borderSkipped:false}]},options:common}))}
  const memberN=(data.queue||[]).filter(x=>x.source==='membership').length,dailyN=(data.queue||[]).filter(x=>x.source==='daily').length,appealN=(data.queue||[]).filter(x=>x.source==='appeal').length,s=$('#sourceChart');if(s)charts.push(new Chart(s,{type:'doughnut',data:{labels:['Members','Daily','Appeals'],datasets:[{data:[memberN,dailyN,appealN],backgroundColor:['rgba(105,245,176,.82)','rgba(126,185,255,.80)','rgba(255,197,102,.80)'],borderColor:'rgba(255,255,255,.58)',borderWidth:2,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'67%',animation:v13AnimateOverview?{duration:650}:false,plugins:{legend:{position:'bottom',labels:{color:getComputedStyle(document.documentElement).getPropertyValue('--text').trim()||'#fff',usePointStyle:true}}}}}))
  const w=$('#waitChart');if(w){const c=w.getContext('2d');charts.push(new Chart(w,{type:'bar',data:{labels:sums.map(x=>x.table_name),datasets:[{label:'Minutes',data:sums.map(x=>x.estimated_wait_minutes),backgroundColor:v162ChartGradient(c,'rgba(157,205,255,.85)','rgba(109,95,255,.26)'),borderColor:'rgba(235,245,255,.70)',borderWidth:1,borderRadius:12,borderSkipped:false}]},options:{...common,indexAxis:'y',plugins:{legend:{display:false}}}}))}
  v13AnimateOverview=false;
};

function v162MembershipCard(m){
  return `<article class="d12-member-card ${m.membership_status==='ACTIVE'?'active':'expired'}"><div class="member-card-shine"></div><div class="member-card-brand">D12 CUE CLUB <span>MEMBERSHIP</span></div><div class="member-card-body">${m.photo_data?`<img class="member-card-photo" src="${m.photo_data}" alt="">`:`<div class="member-card-photo placeholder">${esc((m.full_name||'?').slice(0,1))}</div>`}<div><small>MEMBER ID</small><b>${esc(m.member_code||'')}</b><h3>${esc(m.full_name||'Member')}</h3><p>${esc(m.current_plan_name||'No plan')}</p></div></div><div class="member-card-footer"><span class="membership-status ${m.membership_status==='ACTIVE'?'good':'bad'}">${esc(m.membership_status)}</span><span>Expires ${esc(m.expiry_date||'—')}</span></div></article>`;
}
wireCashier161=function(){
  const rf=$('#registeredQueueForm');if(rf){const fresh=rf.cloneNode(true);rf.replaceWith(fresh);fresh.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(fresh);try{const j=await v161('request_registered_checkin',{player_id:f.get('player_id'),table_id:f.get('table_id'),amount:f.get('amount'),reference:f.get('reference')});toast(j.message);await refresh(false)}catch(x){toast(x.message)}});showSelectedPlayer()}
  const wf=$('#walkinForm');if(wf){const fresh=wf.cloneNode(true);wf.replaceWith(fresh);fresh.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(fresh);try{const file=f.get('photo'),photo=file&&file.size?await compressImage(file):'';const j=await v161('request_walkin_checkin',{full_name:f.get('full_name'),phone:f.get('phone'),table_id:f.get('table_id'),amount:f.get('amount'),reference:f.get('reference'),photo_data:photo});toast(j.message);fresh.reset();await refresh(false)}catch(x){toast(x.message)}})}
  const mf=$('#memberQueueForm');if(!mf)return;
  v162VerifiedMember=null;const label=mf.querySelector('label');if(label)label.textContent='MEMBER ID';const inp=mf.querySelector('#cardToken');if(inp){inp.name='member_id';inp.placeholder='e.g. D12-2026-648647';inp.addEventListener('input',()=>{v162VerifiedMember=null;const add=$('#v162AddMember');if(add)add.disabled=true;const h=$('#membershipPreview');if(h)h.innerHTML='<div class="empty">Verify the Member ID to display the membership card.</div>'})}
  mf.querySelectorAll('button,a').forEach(el=>el.remove());const section=mf.closest('section');section?.querySelectorAll('p.muted').forEach(p=>p.remove());let preview=mf.querySelector('#membershipPreview');if(!preview){preview=document.createElement('div');preview.id='membershipPreview';preview.className='membership-preview';const table=mf.querySelector('select[name="table_id"]')?.closest('.field');table?.before(preview)}preview.innerHTML='<div class="empty">Enter a Member ID, verify it, review the membership card, then add the verified member.</div>';
  const controls=document.createElement('div');controls.className='member-action-row';controls.innerHTML='<button type="button" id="v162VerifyMember" class="btn primary">✓ Verify Member ID</button><button type="button" id="v162AddMember" class="btn good" disabled>＋ Add Verified Member to Table</button>';mf.appendChild(controls);
  $('#v162VerifyMember')?.addEventListener('click',async()=>{const id=String(inp?.value||'').trim();if(!id)return toast('Enter a Member ID first');try{const lookup=await v161('membership_lookup',{member_id:id}),m=lookup.member;v162VerifiedMember=m;preview.innerHTML=v162MembershipCard(m);const add=$('#v162AddMember');if(add)add.disabled=m.membership_status!=='ACTIVE';toast(m.membership_status==='ACTIVE'?`${m.full_name} verified · review card before adding`:'Membership is not active')}catch(x){v162VerifiedMember=null;preview.innerHTML=`<div class="notice danger-note">${esc(x.message)}</div>`;const add=$('#v162AddMember');if(add)add.disabled=true;toast(x.message)}});
  $('#v162AddMember')?.addEventListener('click',async()=>{const m=v162VerifiedMember,id=String(inp?.value||'').trim(),tableId=mf.querySelector('select[name="table_id"]')?.value;if(!m||m.member_code!==id)return toast('Verify this Member ID first');if(m.membership_status!=='ACTIVE')return toast('Membership is not active');if(!tableId)return toast('Select a table');try{const j=await turn('enqueue_member',{card_token:m.card_token,table_id:tableId});toast(`${m.full_name} added to ${v162TableName(tableId)}`);showTicket(j.ticket);v162VerifiedMember=null;mf.reset();preview.innerHTML='<div class="empty">Member added. Enter another Member ID to continue.</div>';const add=$('#v162AddMember');if(add)add.disabled=true;await refresh(true)}catch(x){toast(x.message)}});
};
