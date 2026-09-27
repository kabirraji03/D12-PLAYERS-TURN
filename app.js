const TURN_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-player-turn';
const MEMBER_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-membership';
const TICKET_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-player-ticket';
const CANONICAL='https://playersturn.d12cueclub.com/';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₦'+Number(n||0).toLocaleString('en-NG',{maximumFractionDigits:0});
let token=localStorage.getItem('d12turn_token')||'', role=localStorage.getItem('d12turn_role')||'', data=null, config=null, view='overview', poller=null, charts=[], audioCtx=null, alertEnabled=false, ticketParam=new URLSearchParams(location.search).get('ticket')||localStorage.getItem('d12turn_player_ticket')||'', scannerStream=null, scannerTimer=null;
let theme=localStorage.getItem('d12turn_theme')||'dark', deviceMode=localStorage.getItem('d12turn_device')||'auto';

function toast(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),3000)}
function applyTheme(v){theme=v;document.documentElement.dataset.theme=v;localStorage.setItem('d12turn_theme',v)}
function applyDevice(v){deviceMode=v;document.documentElement.dataset.device=v;localStorage.setItem('d12turn_device',v)}
applyTheme(theme);applyDevice(deviceMode);

async function api(url,action,payload={},auth=true){
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(auth&&token?{'Authorization':'Bearer '+token}:{})},body:JSON.stringify({action,...payload})});
  const j=await r.json().catch(()=>({ok:false,error:'Invalid server response'}));
  if(!r.ok||!j.ok)throw new Error(j.error||'Request failed');
  return j;
}
const turn=(a,p={},auth=true)=>api(TURN_API,a,p,auth), member=(a,p={},auth=true)=>api(MEMBER_API,a,p,auth), ticketApi=(a,p={})=>api(TICKET_API,a,p,false);
function logo(cls='brand-logo'){return `<img class="${cls}" src="./d12-cue-club-logo-v1-1.svg" alt="D12 Cue Club">`}
function avatar(p,size='md'){return p?.photo_data?`<img class="avatar ${size}" src="${p.photo_data}" alt="">`:`<div class="avatar ${size} placeholder">${esc((p?.full_name||'?').slice(0,1).toUpperCase())}</div>`}
function maps(){return{p:Object.fromEntries((data?.players||[]).map(x=>[x.id,x])),t:Object.fromEntries((data?.tables||[]).map(x=>[x.id,x])),s:Object.fromEntries((data?.table_states||[]).map(x=>[x.table_id,x]))}}
function player(id){return maps().p[id]||{id,full_name:'Unknown player'}}
function state(id){return maps().s[id]||{operational_status:'open',activity_status:'waiting',avg_match_minutes:12,holder_mode:'active'}}
function waiting(id){return (data?.queue||[]).filter(q=>q.table_id===id&&['awaiting_payment','queued','called'].includes(q.status)).sort((a,b)=>(a.priority-b.priority)||new Date(a.joined_at)-new Date(b.joined_at))}
function currentMatch(id){return (data?.matches||[]).find(m=>m.table_id===id&&m.status==='in_progress')}
function waitMin(id){const q=waiting(id).filter(x=>x.payment_status!=='pending');return Math.round(q.length*Number(state(id).avg_match_minutes||data?.settings?.default_match_minutes||12))}
function payBadge(q){return q.payment_status==='pending'?'<span class="pill pending">PAYMENT</span>':q.source==='membership'?'<span class="pill good">MEMBER</span>':q.source==='appeal'?'<span class="pill warn">APPEAL</span>':'<span class="pill cleared">CLEARED</span>'}
function tableOptions(selected=''){return (data?.tables||[]).map(t=>`<option value="${t.id}" ${selected===t.id?'selected':''}>${esc(t.table_name)} · ${waiting(t.id).length} in line · ~${waitMin(t.id)} min</option>`).join('')}
function allowedNav(){
  if(role==='admin')return[['overview','⌂','Overview'],['cashier','₦','Cashier'],['rackmaster','◎','Rackmaster'],['staff','♟','Staff'],['settings','⚙','Settings'],['audit','≡','Audit']];
  if(role==='cashier')return[['overview','⌂','Overview'],['cashier','₦','Cashier']];
  if(role==='rackmaster')return[['overview','⌂','Overview'],['rackmaster','◎','Rackmaster']];
  return [];
}
function nav(){return `<nav class="nav glass">${allowedNav().map(([v,i,l])=>`<button class="${view===v?'active':''}" onclick="go('${v}')"><span>${i}</span>${l}</button>`).join('')}</nav>`}
function themeSelect(){return `<select class="mini-select" onchange="applyTheme(this.value)"><option value="dark" ${theme==='dark'?'selected':''}>Dark Glass</option><option value="light" ${theme==='light'?'selected':''}>Plain White</option><option value="snooker" ${theme==='snooker'?'selected':''}>Snooker Green</option><option value="gold" ${theme==='gold'?'selected':''}>9-Ball Gold</option><option value="blue" ${theme==='blue'?'selected':''}>Midnight Blue</option></select>`}
function topbar(){return `<header class="topbar glass"><div class="brand">${logo('top-logo')}<div><h1>D12 PLAYERS TURN</h1><small>Version ${esc(data?.settings?.app_version||config?.app_version||'1.1')} · ${esc((role||'').toUpperCase())}</small></div></div><div class="top-actions">${themeSelect()}<button class="btn small" onclick="refresh(false)">↻ Sync</button><button class="btn small" onclick="logout()">Logout</button></div></header>`}
function shell(body){return `<div class="shell">${topbar()}${nav()}<main class="content">${body}</main></div>`}
function go(v){view=v;renderApp()}

async function logout(){try{await member('logout')}catch{}token='';role='';data=null;localStorage.removeItem('d12turn_token');localStorage.removeItem('d12turn_role');clearInterval(poller);renderLogin()}
function saveSession(j){token=j.token;localStorage.setItem('d12turn_token',token)}
async function boot(){
  config=await turn('public_config',{},false).catch(()=>({app_version:'1.1'}));
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  if(ticketParam){localStorage.setItem('d12turn_player_ticket',ticketParam);renderPlayerShell();pollPlayer(true);poller=setInterval(()=>pollPlayer(false),2200);return}
  if(token){try{await enterApp();return}catch{token='';localStorage.removeItem('d12turn_token')}}
  renderLogin();
}
function renderLogin(tab='admin'){
  clearInterval(poller);
  $('#root').innerHTML=`<div class="login-wrap">
    <section class="login-card glass">
      <div class="login-logo-wrap">${logo('login-logo')}</div>
      <h1>D12 PLAYERS TURN</h1><p>Realtime table turns, player alerts and rack control.</p>
      <div class="login-tabs">
        ${['admin','cashier','rackmaster','player'].map(x=>`<button class="${tab===x?'active':''}" onclick="renderLogin('${x}')">${x[0].toUpperCase()+x.slice(1)}</button>`).join('')}
      </div>
      ${tab==='player'?`<form id="loginForm" class="stack"><div class="field"><label>PLAYER TICKET CODE</label><input name="ticket" autocomplete="off" placeholder="Paste the code from your QR link" required></div><button class="btn primary block">Open My Playing Turn</button></form>`:
      `<form id="loginForm" class="stack">${tab==='admin'?'':`<div class="field"><label>${tab.toUpperCase()} USERNAME</label><input name="username" autocomplete="username" required></div>`}<div class="field"><label>${tab.toUpperCase()} PASSWORD</label><input name="password" type="password" autocomplete="current-password" required></div><button class="btn primary block">Sign in as ${tab[0].toUpperCase()+tab.slice(1)}</button></form>`}
      <div class="device-picker"><span>Display</span>${[['auto','Auto'],['mobile','Mobile'],['tablet','Tablet'],['pc','PC']].map(([v,l])=>`<button class="${deviceMode===v?'active':''}" onclick="applyDevice('${v}');renderLogin('${tab}')">${l}</button>`).join('')}</div>
      <div class="login-theme"><span>Theme</span>${themeSelect()}</div>
    </section>
  </div>`;
  $('#loginForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);
    try{
      if(tab==='player'){
        let raw=String(f.get('ticket')||'').trim();
        try{const u=new URL(raw);raw=u.searchParams.get('ticket')||raw}catch{}
        const j=await turn('player_login',{ticket:raw},false);ticketParam=j.ticket;localStorage.setItem('d12turn_player_ticket',ticketParam);renderPlayerShell();pollPlayer(true);poller=setInterval(()=>pollPlayer(false),2200);return;
      }
      const j=tab==='admin'?await member('staff_login',{role:'admin',password:f.get('password')},false):await member('staff_login',{role:'staff',username:f.get('username'),password:f.get('password')},false);
      saveSession(j);await enterApp();
      if(tab!=='admin'&&role!==tab){await logout();toast(`This account is configured as ${role||'another role'}, not ${tab}.`)}
    }catch(x){toast(x.message)}
  });
}
async function enterApp(){
  data=await turn('bootstrap');role=data.role;localStorage.setItem('d12turn_role',role);
  view='overview';renderApp();clearInterval(poller);poller=setInterval(()=>refresh(true),2200);
}
async function refresh(silent=true){
  if(!token)return;
  try{const next=await turn('bootstrap');data=next;role=next.role;renderApp(true);if(!silent)toast('Live board refreshed')}catch(e){if(!silent)toast(e.message)}
}
function renderApp(preserveFocus=false){
  if(!data)return;
  if(preserveFocus&&document.activeElement&&['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
  charts.forEach(c=>{try{c.destroy()}catch{}});charts=[];
  const body=view==='cashier'?cashierView():view==='rackmaster'?rackmasterView():view==='staff'?staffView():view==='settings'?settingsView():view==='audit'?auditView():overviewView();
  $('#root').innerHTML=shell(body);bindForms();setTimeout(initCharts,0);
}

function overviewView(){
  const active=(data.matches||[]).length,waitingN=(data.queue||[]).filter(q=>['queued','called','awaiting_payment'].includes(q.status)).length,pending=(data.payments||[]).filter(p=>p.kind==='appeal'&&p.status==='pending').length,open=(data.table_states||[]).filter(s=>s.operational_status==='open').length;
  return `<section class="hero-panel glass">${logo('hero-logo')}<div><div class="eyebrow">LIVE OPERATIONS DASHBOARD</div><h2>Club Turn Intelligence</h2><p>${open} open tables · ${waitingN} waiting · ${active} matches live</p></div></section>
  <div class="grid kpis">
    <div class="card glass kpi"><span>OPEN TABLES</span><b>${open}</b><div class="meter"><i style="width:${Math.min(100,open/Math.max(1,(data.all_table_summaries||data.tables||[]).length)*100)}%"></i></div></div>
    <div class="card glass kpi"><span>LIVE MATCHES</span><b>${active}</b><div class="pulse-dot"></div></div>
    <div class="card glass kpi"><span>PLAYERS WAITING</span><b>${waitingN}</b><small>Across visible tables</small></div>
    <div class="card glass kpi"><span>UNPAID APPEALS</span><b>${pending}</b><small>Cashier action required</small></div>
  </div>
  <div class="grid charts">
    <div class="card glass chart-card"><h3>Queue by Table</h3><canvas id="queueChart"></canvas></div>
    <div class="card glass chart-card"><h3>Player Mix</h3><canvas id="sourceChart"></canvas></div>
    <div class="card glass chart-card"><h3>Estimated Wait</h3><canvas id="waitChart"></canvas></div>
  </div>
  <div class="grid table-summaries">${(data.all_table_summaries||[]).map(s=>`<div class="card glass summary-card"><div class="summary-ring">${s.queue_count}</div><div><b>${esc(s.table_name)}</b><p>${s.queue_count} in line · approximately ${s.estimated_wait_minutes} min wait</p></div>${role==='rackmaster'&&!data.tables.some(t=>t.id===s.id)?`<button class="btn small" onclick="requestTableAccess('${s.id}')">Request view</button>`:''}</div>`).join('')}</div>`;
}
function initCharts(){
  if(typeof Chart==='undefined'||view!=='overview')return;
  const sums=data.all_table_summaries||[];
  const q=$('#queueChart'),s=$('#sourceChart'),w=$('#waitChart');
  if(q)charts.push(new Chart(q,{type:'bar',data:{labels:sums.map(x=>x.table_name),datasets:[{label:'Players',data:sums.map(x=>x.queue_count)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}));
  const memberN=(data.queue||[]).filter(x=>x.source==='membership').length,dailyN=(data.queue||[]).filter(x=>x.source==='daily').length,appealN=(data.queue||[]).filter(x=>x.source==='appeal').length;
  if(s)charts.push(new Chart(s,{type:'doughnut',data:{labels:['Members','Daily','Appeals'],datasets:[{data:[memberN,dailyN,appealN]}]},options:{responsive:true,maintainAspectRatio:false}}));
  if(w)charts.push(new Chart(w,{type:'bar',data:{labels:sums.map(x=>x.table_name),datasets:[{label:'Minutes',data:sums.map(x=>x.estimated_wait_minutes)}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}));
}
function cashierView(){
  const appeals=(data.payments||[]).filter(p=>p.kind==='appeal'&&p.status==='pending');
  return `<div class="grid two">
    <section class="card glass"><div class="eyebrow">PAY AS YOU PLAY</div><h2>Cashier Check-in</h2>
      <form id="walkinForm" class="stack"><div class="field"><label>PLAYER FULL NAME</label><input name="full_name" required></div><div class="field"><label>WHATSAPP / PHONE</label><input name="phone" inputmode="tel"></div><div class="field"><label>PLAYER PHOTO</label><input name="photo" type="file" accept="image/*" capture="user"><small>Recommended for identification and identity-theft prevention.</small></div><div class="row"><div class="field grow"><label>AMOUNT</label><input name="amount" type="number" min="0" value="3000"></div><div class="field grow"><label>REFERENCE</label><input name="reference" placeholder="Cash / POS"></div></div><div class="field"><label>TABLE</label><select name="table_id">${tableOptions()}</select></div><button class="btn primary block">✓ Confirm Payment & Add to Queue</button></form>
    </section>
    <section class="card glass"><div class="eyebrow">MEMBERSHIP</div><h2>Scan Member Card</h2>
      <form id="memberQueueForm" class="stack"><div class="field"><label>CARD / QR TOKEN</label><div class="row"><input id="cardToken" name="card_token" required><button type="button" class="btn" onclick="startScanner()">▥ Scan</button></div></div><div class="field"><label>TABLE</label><select name="table_id">${tableOptions()}</select></div><button class="btn good block">Verify Member & Add to Queue</button></form>
    </section></div>
    <section class="card glass section"><div class="row split"><div><div class="eyebrow">APPEAL GATE</div><h2>Appeals Awaiting Cashier</h2></div><span class="pill ${appeals.length?'pending':'good'}">${appeals.length} PENDING</span></div>
      ${appeals.length?appeals.map(p=>`<div class="queue-row">${avatar(player(p.player_id),'sm')}<div class="grow"><b>${esc(player(p.player_id).full_name)}</b><small>${money(p.amount)} · ${esc(maps().t[p.table_id]?.table_name||'Table')}</small></div><button class="btn good" onclick="payAppeal('${p.id}')">Confirm Paid</button></div>`).join(''):'<div class="empty">No unpaid appeals.</div>'}
    </section>
    <section class="card glass"><h2>Live Queue</h2><div class="grid table-summaries">${(data.tables||[]).map(t=>queueMini(t.id)).join('')}</div></section>`;
}
function queueMini(tableId){return `<div class="mini-table"><b>${esc(maps().t[tableId]?.table_name||'Table')}</b><span>${waiting(tableId).length} in line</span><span>~${waitMin(tableId)} min</span></div>`}

function holderDisplay(tableId){
  const st=state(tableId),id=st.holder_mode==='break'||st.holder_mode==='ready'?st.break_owner_player_id:st.holder_player_id,p=player(id);
  if(!id)return `<div class="holder"><div class="avatar lg placeholder">–</div><div><span>TABLE HOLDER</span><b>None yet</b></div></div>`;
  const cls=st.holder_mode==='break'?'red':st.holder_mode==='ready'?'green flash':'';
  const label=st.holder_mode==='break'?'Table Holder Ready':st.holder_mode==='ready'?'Cancel Ready / Break':'Table Holder Break';
  return `<div class="holder">${avatar(p,'lg')}<div class="grow"><span>TABLE HOLDER</span><b>${esc(p.full_name)}</b></div><button class="holder-break ${cls}" onclick="toggleHolderBreak('${tableId}')"><i></i>${st.holder_mode==='break'?'⏸ ':st.holder_mode==='ready'?'● ':''}${label}</button></div>`;
}
function breakPair(tableId){
  const st=state(tableId);if(st.holder_mode!=='break')return '';
  const q=waiting(tableId).filter(x=>x.payment_status!=='pending'&&x.source!=='appeal').slice(0,2);
  if(q.length<2)return `<div class="break-pair warnbox">Holder on break · waiting for 2 cleared players.</div>`;
  return `<div class="break-pair"><span>BREAK MATCH READY</span><b>${esc(player(q[0].player_id).full_name)}</b><strong>VS</strong><b>${esc(player(q[1].player_id).full_name)}</b></div>`;
}
function rackmasterView(){
  const visible=data.tables||[];
  const others=(data.all_table_summaries||[]).filter(x=>!visible.some(t=>t.id===x.id));
  return `${role==='rackmaster'?`<section class="card glass section"><div class="eyebrow">MY TABLES</div><h2>${visible.length} table${visible.length===1?'':'s'} assigned</h2><p class="muted">Your primary assignment is limited to 2 tables. Extra table visibility requires Admin approval.</p>${others.length?`<div class="row wrap">${others.map(x=>`<button class="btn small" onclick="requestTableAccess('${x.id}')">Request ${esc(x.table_name)}</button>`).join('')}</div>`:''}</section>`:''}
  <div class="grid rack-grid">${visible.map(t=>rackTable(t)).join('')}</div>`;
}
function rackTable(t){
  const st=state(t.id),m=currentMatch(t.id),q=waiting(t.id);
  return `<section class="card glass rack-card"><div class="table-head"><div><div class="eyebrow">${esc(st.activity_status.replaceAll('_',' '))}</div><h2>${esc(t.table_name)}</h2></div><span class="status-light ${st.operational_status}">${st.operational_status}</span></div>
  ${holderDisplay(t.id)}${breakPair(t.id)}
  ${m?`<div class="match-box"><span>LIVE MATCH ${m.match_mode!=='normal'?`· ${esc(m.match_mode.replaceAll('_',' '))}`:''}</span><div class="versus">${avatar(player(m.holder_player_id),'md')}<b>${esc(player(m.holder_player_id).full_name)}</b><strong>VS</strong>${avatar(player(m.challenger_player_id),'md')}<b>${esc(player(m.challenger_player_id).full_name)}</b></div><button class="btn primary block" onclick="openFinishMatch('${m.id}')">Finish Match / Record Result</button></div>`:
  `<button class="btn primary block" onclick="startNext('${t.id}')">▶ Start Next Match</button>`}
  <div class="queue-list"><div class="queue-title"><b>QUEUE</b><span>${q.length} waiting · ~${waitMin(t.id)} min</span></div>
  ${q.length?q.map((x,i)=>queueRow(x,i,t.id)).join(''):'<div class="empty">No players waiting.</div>'}</div>
  <div class="row wrap table-tools"><button class="btn small" onclick="setTableStatus('${t.id}','open')">Open</button><button class="btn small" onclick="setTableStatus('${t.id}','paused')">Pause</button>${role==='admin'?`<button class="btn small danger" onclick="resetTable('${t.id}')">Reset</button>`:''}</div></section>`;
}
function queueRow(q,i,tableId){
  const p=player(q.player_id),pending=(data.move_requests||[]).some(r=>r.status==='pending'&&(r.requester_queue_id===q.id||r.target_queue_id===q.id));
  return `<div class="queue-row ${pending?'pending-move':''}"><div class="queue-num">${i+1}</div>${avatar(p,'sm')}<div class="grow"><b>${esc(p.full_name)}</b><small>${payBadge(q)} ${pending?'<span class="pill pending">MOVE PENDING</span>':''}</small></div><div class="queue-actions"><button class="icon-action" title="Upload photo" onclick="pickPlayerPhoto('${p.id}')">📷</button><button class="icon-action" title="Move up" onclick="requestMove('${q.id}','up')">↑</button><button class="icon-action" title="Move down" onclick="requestMove('${q.id}','down')">↓</button><button class="btn small call-btn" onclick="callPlayer('${q.id}')">🔔 Call</button></div></div>`;
}
function staffView(){
  if(role!=='admin')return '<div class="empty">Admin only.</div>';
  const rackRoles=(data.staff_roles||[]).filter(x=>x.turn_role==='rackmaster');
  return `<div class="grid two"><section class="card glass"><h2>Create Staff Login</h2><form id="createStaffForm" class="stack"><div class="field"><label>FULL NAME</label><input name="full_name" required></div><div class="field"><label>USERNAME</label><input name="username" required></div><div class="field"><label>PASSWORD</label><input name="password" type="password" minlength="6" required></div><div class="field"><label>ROLE</label><select name="turn_role" onchange="toggleTablePick(this.value)"><option value="cashier">Cashier</option><option value="rackmaster">Rackmaster</option><option value="manager">Manager</option></select></div><div id="tablePick" class="field hidden"><label>ASSIGN EXACTLY 2 TABLES</label><div class="check-grid">${(data.all_table_summaries||[]).map(t=>`<label><input type="checkbox" name="table_ids" value="${t.id}"> ${esc(t.table_name)}</label>`).join('')}</div></div><button class="btn primary">Create Staff</button></form></section>
  <section class="card glass"><h2>Rackmaster Structure</h2><p class="muted">D12 uses 2 rackmasters. Each rackmaster is assigned exactly 2 primary tables.</p><div class="staff-stack">${rackRoles.map(r=>staffCard(r)).join('')||'<div class="empty">Create the two rackmaster accounts here.</div>'}</div></section></div>
  <section class="card glass section"><h2>Access Requests</h2>${(data.access_requests||[]).filter(x=>x.status==='pending').map(r=>{const st=(data.staff||[]).find(s=>s.id===r.staff_id),tt=(data.all_table_summaries||[]).find(t=>t.id===r.table_id);return `<div class="queue-row"><div class="grow"><b>${esc(st?.full_name||'Rackmaster')}</b><small>Requests ${esc(tt?.table_name||'table')}</small></div><button class="btn good small" onclick="resolveAccess('${r.id}',true)">Approve</button><button class="btn danger small" onclick="resolveAccess('${r.id}',false)">Decline</button></div>`}).join('')||'<div class="empty">No pending table access requests.</div>'}</section>`;
}
function staffCard(r){
  const s=(data.staff||[]).find(x=>x.id===r.staff_id)||{},assign=(data.rackmaster_assignments||[]).filter(x=>x.staff_id===r.staff_id&&x.active),photo=r.profile_photo_data?{photo_data:r.profile_photo_data,full_name:s.full_name}:null;
  return `<div class="staff-card">${avatar(photo||{full_name:s.full_name},'md')}<div class="grow"><b>${esc(s.full_name||'Rackmaster')}</b><small>${esc(s.username||'')} · ${assign.map(a=>(data.all_table_summaries||[]).find(t=>t.id===a.table_id)?.table_name).filter(Boolean).join(', ')||'No tables assigned'}</small></div><button class="btn small" onclick="pickStaffPhoto('${r.staff_id}','${r.turn_role}')">📷 Photo</button><button class="btn small" onclick="editRackmaster('${r.staff_id}')">Tables</button></div>`;
}
function settingsView(){
  if(role!=='admin')return '<div class="empty">Admin only.</div>';
  const s=data.settings||{};
  return `<section class="card glass"><h2>Turn Rules</h2><form id="settingsForm" class="stack"><div class="form-grid"><div class="field"><label>APPEAL FEE</label><input name="appeal_fee" type="number" value="${Number(s.appeal_fee||0)}"></div><div class="field"><label>NO-SHOW GRACE (MIN)</label><input name="no_show_grace_minutes" type="number" value="${Number(s.no_show_grace_minutes||5)}"></div><div class="field"><label>DEFAULT MATCH TIME (MIN)</label><input name="default_match_minutes" type="number" value="${Number(s.default_match_minutes||12)}"></div></div><label class="check"><input name="no_consecutive_appeals" type="checkbox" ${s.no_consecutive_appeals?'checked':''}> Block consecutive appeals</label><button class="btn primary">Save Version 1.1 Settings</button></form></section>`;
}
function auditView(){
  if(role!=='admin')return '<div class="empty">Admin only.</div>';
  return `<section class="card glass"><h2>Audit Log</h2><div class="audit-list">${(data.audit||[]).map(a=>`<div><b>${esc(a.action)}</b><span>${esc(a.actor_name)} · ${new Date(a.created_at).toLocaleString()}</span></div>`).join('')||'<div class="empty">No activity yet.</div>'}</div></section>`;
}
function bindForms(){
  $('#walkinForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{const file=f.get('photo'),photo=file&&file.size?await compressImage(file):'';const j=await turn('add_walkin',{full_name:f.get('full_name'),phone:f.get('phone'),amount:Number(f.get('amount')),reference:f.get('reference'),table_id:f.get('table_id'),photo_data:photo});toast('Player cleared and queued');showTicket(j.ticket);await refresh(true)}catch(x){toast(x.message)}});
  $('#memberQueueForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{const j=await turn('enqueue_member',{card_token:f.get('card_token'),table_id:f.get('table_id')});toast(`${j.member.full_name} verified and queued`);showTicket(j.ticket);await refresh(true)}catch(x){toast(x.message)}});
  $('#settingsForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await turn('save_settings',{appeal_fee:Number(f.get('appeal_fee')),no_show_grace_minutes:Number(f.get('no_show_grace_minutes')),default_match_minutes:Number(f.get('default_match_minutes')),no_consecutive_appeals:f.get('no_consecutive_appeals')==='on'});toast('Settings saved');await refresh(true)}catch(x){toast(x.message)}});
  $('#createStaffForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),r=f.get('turn_role'),table_ids=f.getAll('table_ids');try{if(r==='rackmaster'&&table_ids.length!==2)throw new Error('Select exactly 2 tables for the rackmaster.');const j=await member('create_staff',{full_name:f.get('full_name'),username:f.get('username'),password:f.get('password'),permissions:{view_members:true,scan_cards:r==='cashier',payments:r==='cashier'}});await turn('assign_staff_role',{staff_id:j.staff.id,turn_role:r,table_ids});toast('Staff login created');await refresh(true)}catch(x){toast(x.message)}});
}
function toggleTablePick(v){$('#tablePick')?.classList.toggle('hidden',v!=='rackmaster')}
async function payAppeal(id){const reference=prompt('Payment reference (optional):','Cash')??'';try{await turn('pay_appeal',{payment_id:id,reference});toast('Appeal cleared — next match is current holder vs appeal player');await refresh(true)}catch(x){toast(x.message)}}
async function startNext(id){try{await turn('start_next',{table_id:id});hapticCall(false);toast('Match started');await refresh(true)}catch(x){toast(x.message)}}
async function callPlayer(id){try{const j=await turn('call_player',{queue_id:id});hapticCall(true);toast(j.message||'Player called');await refresh(true)}catch(x){toast(x.message)}}
async function requestMove(id,direction){try{await turn('request_queue_move',{queue_id:id,direction});toast('Move request sent. The exchange player must approve it.');await refresh(true)}catch(x){toast(x.message)}}
async function toggleHolderBreak(id){try{const j=await turn('toggle_holder_break',{table_id:id});toast(j.holder_mode==='break'?'Table holder is on break — next 2 players are selected':'Table holder is ready to return after the current/next match');await refresh(true)}catch(x){toast(x.message)}}
async function setTableStatus(id,status){try{await turn('set_table_status',{table_id:id,status});toast(`Table ${status}`);await refresh(true)}catch(x){toast(x.message)}}
async function resetTable(id){if(!confirm('Reset this table?'))return;try{await turn('reset_table',{table_id:id});toast('Table reset');await refresh(true)}catch(x){toast(x.message)}}
async function requestTableAccess(id){try{await turn('request_table_access',{table_id:id});toast('Admin access request sent');await refresh(true)}catch(x){toast(x.message)}}
async function resolveAccess(id,approve){try{await turn('resolve_table_access',{request_id:id,approve});toast(approve?'Access approved':'Access declined');await refresh(true)}catch(x){toast(x.message)}}

function openFinishMatch(matchId){
  const m=(data.matches||[]).find(x=>x.id===matchId);if(!m)return;const a=player(m.holder_player_id),b=player(m.challenger_player_id),others=(data.all_table_summaries||[]).filter(t=>t.id!==m.table_id&&t.operational_status==='open');
  openModal(`<div class="modal-head"><div><div class="eyebrow">RECORD RESULT</div><h2>Winner & Loser Decision</h2></div><button class="icon-btn" onclick="closeModal()">×</button></div>
  <form id="finishForm" class="stack"><div class="field"><label>WINNER</label><div class="winner-grid"><label>${avatar(a,'md')}<input type="radio" name="winner" value="${a.id}" required><b>${esc(a.full_name)}</b></label><label>${avatar(b,'md')}<input type="radio" name="winner" value="${b.id}" required><b>${esc(b.full_name)}</b></label></div></div>
  <div class="field"><label>LOSER CHOICE</label><div class="action-grid"><label><input type="radio" name="action" value="appeal" required onchange="finishChoice()">↻ <b>Appeal</b><small>Immediate rematch after cashier clears payment.</small></label><label><input type="radio" name="action" value="remain" required onchange="finishChoice()">⌛ <b>Remain</b><small>Join the end of this table queue.</small></label><label><input type="radio" name="action" value="change" required onchange="finishChoice()">⇄ <b>Change Table</b><small>Choose another table.</small></label><label><input type="radio" name="action" value="leave" required onchange="finishChoice()">↗ <b>Leave</b><small>End this playing session.</small></label></div></div>
  <div id="changeTarget" class="field hidden"><label>NEW TABLE</label><select name="target_table_id">${others.map(t=>`<option value="${t.id}">${esc(t.table_name)} · ${t.queue_count} in line · ~${t.estimated_wait_minutes} min</option>`).join('')}</select></div><button class="btn primary block">Save Result</button></form>`);
  $('#finishForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),act=f.get('action');try{await turn('finish_match',{match_id:matchId,winner_player_id:f.get('winner'),loser_action:act,target_table_id:act==='change'?f.get('target_table_id'):null});closeModal();toast(act==='appeal'?'Appeal created — cashier must clear payment':'Result saved');await refresh(true)}catch(x){toast(x.message)}})
}
function finishChoice(){$('#changeTarget')?.classList.toggle('hidden',document.querySelector('input[name="action"]:checked')?.value!=='change')}

async function compressImage(file){
  const img=new Image(),url=URL.createObjectURL(file);await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});
  const max=640,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);return c.toDataURL('image/jpeg',.76);
}
function pickPlayerPhoto(id){const i=document.createElement('input');i.type='file';i.accept='image/*';i.capture='user';i.onchange=async()=>{if(!i.files?.[0])return;try{const photo=await compressImage(i.files[0]);await turn('save_player_photo',{player_id:id,photo_data:photo});toast('Player photo saved');await refresh(true)}catch(x){toast(x.message)}};i.click()}
function pickStaffPhoto(id,turn_role){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async()=>{if(!i.files?.[0])return;try{const photo=await compressImage(i.files[0]);await turn('save_staff_photo',{staff_id:id,turn_role,photo_data:photo});toast('Rackmaster photo saved');await refresh(true)}catch(x){toast(x.message)}};i.click()}
function editRackmaster(staffId){const assigned=(data.rackmaster_assignments||[]).filter(a=>a.staff_id===staffId&&a.access_type==='primary'&&a.active).map(a=>a.table_id);openModal(`<div class="modal-head"><h2>Assign 2 Tables</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="check-grid">${(data.all_table_summaries||[]).map(t=>`<label><input type="checkbox" name="rmTables" value="${t.id}" ${assigned.includes(t.id)?'checked':''}> ${esc(t.table_name)}</label>`).join('')}</div><br><button class="btn primary block" onclick="saveRackTables('${staffId}')">Save 2 Tables</button>`)}
async function saveRackTables(id){const ids=$$('input[name="rmTables"]:checked').map(x=>x.value);if(ids.length!==2)return toast('Select exactly 2 tables.');try{await turn('assign_staff_role',{staff_id:id,turn_role:'rackmaster',table_ids:ids});closeModal();toast('Rackmaster tables updated');await refresh(true)}catch(x){toast(x.message)}}

function showTicket(ticket){const url=`${CANONICAL}?ticket=${encodeURIComponent(ticket)}`;openModal(`<div class="modal-head"><div><div class="eyebrow">PLAYER ALERT TICKET</div><h2>Queue Confirmed</h2></div><button class="icon-btn" onclick="closeModal()">×</button></div><div id="qr" class="qrbox"></div><div class="mono">${esc(url)}</div><div class="row wrap"><button class="btn primary" onclick="copyText('${url.replaceAll("'","\\'")}')">Copy Link</button><button class="btn" onclick="window.open('${url}','_blank')">Open Player View</button></div>`);setTimeout(()=>{const q=$('#qr');if(q&&window.QRCode)new QRCode(q,{text:url,width:190,height:190})},100)}
function copyText(v){navigator.clipboard?.writeText(v).then(()=>toast('Copied')).catch(()=>toast('Copy unavailable'))}
function openModal(html){$('#modalCard').innerHTML=html;$('#modal').classList.remove('hidden')}
function closeModal(){stopScanner();$('#modal').classList.add('hidden');$('#modalCard').innerHTML=''}

async function startScanner(){if(!navigator.mediaDevices?.getUserMedia)return toast('Camera scanning is unavailable. Enter the code manually.');openModal(`<div class="modal-head"><h2>Scan Membership Card</h2><button class="icon-btn" onclick="closeModal()">×</button></div><video id="scanVideo" class="scanner-video" autoplay playsinline muted></video>`);try{scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});const v=$('#scanVideo');v.srcObject=scannerStream;if('BarcodeDetector'in window){const fm=await BarcodeDetector.getSupportedFormats(),det=new BarcodeDetector({formats:['qr_code','code_128'].filter(x=>fm.includes(x))});scannerTimer=setInterval(async()=>{try{const c=await det.detect(v);if(c[0]?.rawValue){const val=c[0].rawValue;stopScanner();closeModal();if($('#cardToken'))$('#cardToken').value=val;toast('Card scanned')}}catch{}},500)}else toast('Live scanning not supported. Enter token manually.')}catch{closeModal();toast('Camera permission not granted')}}
function stopScanner(){clearInterval(scannerTimer);scannerTimer=null;if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop());scannerStream=null}}

function ensureAudio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume()}
function tone(freq,d=.12,delay=0){ensureAudio();const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+delay;o.frequency.value=freq;o.type='sine';g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.22,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(audioCtx.destination);o.start(t);o.stop(t+d+.03)}
function hapticCall(full=true){navigator.vibrate?.(full?[180,80,180,80,350]:[80,40,80]);tone(920,.1,0);tone(1180,.12,.14);if(full)tone(1450,.18,.31)}
async function enableAlerts(){alertEnabled=true;ensureAudio();if('Notification'in window&&Notification.permission==='default')await Notification.requestPermission();navigator.vibrate?.([100,60,100]);tone(780,.12);toast('Sound, haptic and browser alerts enabled')}

function renderPlayerShell(){$('#root').innerHTML=`<div class="player-shell"><header class="topbar glass"><div class="brand">${logo('top-logo')}<div><h1>D12 PLAYER TURN</h1><small>Personal queue & alert screen</small></div></div><div>${themeSelect()}</div></header><main id="playerBody" class="content"><div class="card glass empty">Loading your playing turn…</div></main></div>`}
let lastNotif='';
async function pollPlayer(first=false){try{const d=await ticketApi('ticket_status',{ticket:ticketParam});renderPlayer(d);const n=d.notifications?.[0];if(n&&n.id!==lastNotif){if(first)lastNotif=n.id;else{lastNotif=n.id;triggerPlayerAlert(n)}}}catch(e){$('#playerBody').innerHTML=`<div class="card glass empty">${esc(e.message)}</div>`}}
function renderPlayer(d){
  const q=d.queue,st=d.table_state,requests=d.move_requests||[];
  $('#playerBody').innerHTML=`<section class="card glass player-main">${avatar(d.player,'xl')}<div><div class="eyebrow">${d.player.member?'D12 MEMBER':'D12 PLAYER'}</div><h2>${esc(d.player.full_name)}</h2><div class="player-status">${esc(q.label)}</div><h3>${esc(d.table.table_name)}</h3>${q.position?`<div class="position-ring"><b>${q.position}</b><span>QUEUE POSITION</span></div><p>You are number <b>${q.position}</b> in the queue. Please stay close and be ready.</p><p class="muted">Estimated wait: ${q.estimated_wait_minutes} min</p>`:''}<button class="btn primary" onclick="enableAlerts()">🔔 Enable Sound, Vibration & Notifications</button></div></section>
  ${requests.map(r=>`<section class="card glass move-request">${avatar({full_name:r.requester_name,photo_data:r.requester_photo},'md')}<div class="grow"><b>Queue Exchange Request</b><p>${esc(r.requester_name)} wants to move ${esc(r.direction)} by exchanging position with you.</p></div><button class="btn good" onclick="respondMove('${r.id}',true)">Approve</button><button class="btn danger" onclick="respondMove('${r.id}',false)">Decline</button></section>`).join('')}
  <section class="card glass"><h3>Other Tables — Summary Only</h3><div class="grid table-summaries">${(d.other_tables_summary||[]).map(x=>`<div class="summary-card"><div class="summary-ring">${x.queue_count}</div><div><b>${esc(x.table_name)}</b><p>${x.queue_count} in line · ${x.estimated_wait_minutes} min wait</p></div></div>`).join('')}</div></section>`;
}
async function respondMove(id,approve){try{await ticketApi('respond_move',{ticket:ticketParam,request_id:id,approve});toast(approve?'Queue exchange approved':'Queue exchange declined');await pollPlayer(false)}catch(x){toast(x.message)}}
function triggerPlayerAlert(n){navigator.vibrate?.(n.kind==='call'?[300,120,300,120,550]:[180,80,180]);if(alertEnabled){if(n.kind==='call'){tone(920,.1,0);tone(1180,.12,.14);tone(1450,.2,.32)}else{tone(820,.18)}if('Notification'in window&&Notification.permission==='granted'){navigator.serviceWorker.ready.then(reg=>reg.showNotification('D12 Players Turn',{body:n.message,tag:'d12-'+n.id,renotify:true,icon:CANONICAL+'d12-app-icon.svg',data:{url:`${CANONICAL}?ticket=${encodeURIComponent(ticketParam)}`}})).catch(()=>{})}}toast(n.message)}

window.addEventListener('online',()=>toast('Live connection restored'));
window.addEventListener('offline',()=>toast('Offline — live updates paused'));
boot();