// D12 PLAYERS TURN v1.6.10 — Player staff reports + Admin complaints/query management
const V1610_CONDUCT_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-staff-conduct-v1610';
const v1610Conduct=(a,p={},auth=true)=>api(V1610_CONDUCT_API,a,p,auth);
let v1610ConductData={staff:[],complaints:[],queries:[]},v1610ConductLoaded=false,v1610ConductAt=0,v1610PublicStaff=null,v1610ConductPromise=null;

function v1610MonthKey(value=new Date()){
  try{
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit'}).formatToParts(new Date(value));
    const y=p.find(x=>x.type==='year')?.value||'',m=p.find(x=>x.type==='month')?.value||'';
    return y+'-'+m;
  }catch{const d=new Date(value);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
}
function v1610QueriesForStaff(staffId,currentMonthOnly=true){
  const month=v1610MonthKey();
  return (v1610ConductData.queries||[]).filter(q=>q.staff_id===staffId&&q.active!==false&&(!currentMonthOnly||v1610MonthKey(q.issued_at)===month));
}
function v1610Complaint(id){return (v1610ConductData.complaints||[]).find(c=>c.id===id)}
function v1610ConductStaff(id){return (v1610ConductData.staff||[]).find(s=>s.id===id)||{id,full_name:v169StaffName?.(id)||'Staff',turn_role:''}}
async function v1610LoadConduct(force=false){
  if(role!=='admin')return v1610ConductData;
  if(!force&&v1610ConductLoaded&&Date.now()-v1610ConductAt<60000)return v1610ConductData;
  if(v1610ConductPromise)return v1610ConductPromise;
  v1610ConductPromise=(async()=>{
    const j=await v1610Conduct('admin_bootstrap');
    v1610ConductData={staff:j.staff||[],complaints:j.complaints||[],queries:j.queries||[]};v1610ConductLoaded=true;v1610ConductAt=Date.now();
    return v1610ConductData;
  })();
  try{return await v1610ConductPromise}finally{v1610ConductPromise=null}
}

const v1610AllowedNavBase=allowedNav;
allowedNav=function(){
  const list=v1610AllowedNavBase();
  if(role!=='admin'||list.some(x=>x[0]==='complaints'))return list;
  const open=v1610ConductLoaded?(v1610ConductData.complaints||[]).filter(c=>['submitted','query_issued'].includes(c.status)).length:0;
  const item=['complaints','⚑',`Staff Complaints${open?' · '+open:''}`],idx=list.findIndex(x=>x[0]==='staff');
  if(idx>=0)list.splice(idx,0,item);else list.push(item);return list;
};

function v1610ComplaintsView(){
  if(role!=='admin')return '<div class="empty">Admin only.</div>';
  if(!v1610ConductLoaded)return '<section class="card glass empty"><b>Loading staff complaints…</b><small>Conduct records are loaded only when this tab is opened to preserve the low-I/O protocol.</small></section>';
  const staffMap=Object.fromEntries((v1610ConductData.staff||[]).map(s=>[s.id,s])),rows=v1610ConductData.complaints||[];
  const open=rows.filter(c=>c.status==='submitted').length,queried=rows.filter(c=>c.status==='query_issued').length,closed=rows.filter(c=>c.status==='closed').length;
  return `<section class="hero-panel glass compact-hero v1610-complaints-hero"><div><div class="eyebrow">ADMIN · STAFF CONDUCT</div><h2>Staff Complaints</h2><p>Player-submitted conduct reports and official staff queries. Records load on demand only.</p></div><button class="btn" onclick="refreshComplaints1610()">↻ Refresh Complaints</button></section>
  <div class="v1610-complaint-kpis"><article class="glass"><span>NEW REPORTS</span><b>${open}</b></article><article class="glass"><span>QUERY ISSUED</span><b>${queried}</b></article><article class="glass"><span>CLOSED</span><b>${closed}</b></article><article class="glass"><span>TOTAL RECORDS</span><b>${rows.length}</b></article></div>
  <section class="card glass"><div class="section-title"><div><div class="eyebrow">PLAYER REPORTS</div><h3>Conduct Review Queue</h3></div><span class="glass-icon">⚑</span></div><div class="v1610-complaint-list">${rows.length?rows.map(c=>{const st=staffMap[c.reported_staff_id]||{full_name:'Staff',turn_role:''},q=(v1610ConductData.queries||[]).find(x=>x.complaint_id===c.id&&x.active!==false);return `<article class="v1610-complaint-card ${c.status}"><div class="v1610-complaint-top"><div class="v1610-staff-badge"><i>${st.turn_role==='rackmaster'?'◎':'₦'}</i><div><small>${esc((st.turn_role||'staff').toUpperCase())}</small><b>${esc(st.full_name)}</b></div></div><span class="pill ${c.status==='query_issued'?'warn':c.status==='submitted'?'pending':'good'}">${esc(c.status.replaceAll('_',' ').toUpperCase())}</span></div><p>${esc(c.description)}</p><div class="v1610-report-meta"><span>♙ <b>${esc(c.reporter_player_name)}</b> ${c.reporter_player_code?'· '+esc(c.reporter_player_code):''}</span><span>◷ ${esc(v166AbujaStamp(c.reported_at))}</span></div>${q?`<div class="v1610-linked-query">QUERY ISSUED · ${esc(v166AbujaStamp(q.issued_at))}${q.admin_note?' · '+esc(q.admin_note):''}</div>`:''}<div class="row wrap">${c.status==='submitted'?`<button class="btn primary" onclick="openIssueQuery1610('${c.id}')">⚠ Issue Query</button>`:''}${c.status!=='closed'? `<button class="btn" onclick="closeComplaint1610('${c.id}')">✓ Close Complaint</button>`:''}</div></article>`}).join(''):'<div class="empty">No staff complaints have been submitted.</div>'}</div></section>`;
}
async function refreshComplaints1610(){try{await v1610LoadConduct(true);if(view==='complaints')renderApp()}catch(e){toast(e.message)}}
function openIssueQuery1610(id){
  const c=v1610Complaint(id),st=v1610ConductStaff(c?.reported_staff_id);if(!c)return;
  openModal(`<div class="modal-head"><div><div class="eyebrow">ISSUE OFFICIAL STAFF QUERY</div><h2>${esc(st.full_name)}</h2><p class="muted">${esc(v166AbujaStamp(c.reported_at))} · Reported by ${esc(c.reporter_player_name)}</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><section class="v1610-query-source glass"><small>PLAYER COMPLAINT</small><p>${esc(c.description)}</p></section><div class="field"><label>ADMIN QUERY / NOTE</label><textarea id="v1610QueryNote" rows="5" placeholder="State the official query, required explanation, or disciplinary note…"></textarea></div><button class="btn primary block" onclick="issueStaffQuery1610('${id}')">⚠ Issue Query To Staff</button>`);
}
async function issueStaffQuery1610(id){try{const note=$('#v1610QueryNote')?.value||'';const j=await v1610Conduct('issue_query',{complaint_id:id,admin_note:note});closeModal();toast(j.message);await v1610LoadConduct(true);if(view==='complaints'||view==='staff')renderApp()}catch(e){toast(e.message)}}
async function closeComplaint1610(id){if(!confirm('Close this complaint without any further action?'))return;try{const j=await v1610Conduct('close_complaint',{complaint_id:id});toast(j.message);await v1610LoadConduct(true);if(view==='complaints')renderApp()}catch(e){toast(e.message)}}

const v1610RenderBase=renderApp;
renderApp=function(preserveFocus=false){
  if(view==='complaints'){
    if(!data)return;
    $('#root').innerHTML=shell(v1610ComplaintsView());bindForms();
    if(!v1610ConductLoaded)v1610LoadConduct(true).then(()=>{if(view==='complaints')renderApp()}).catch(e=>toast(e.message));
    return;
  }
  v1610RenderBase(preserveFocus);
  if(view==='staff'&&role==='admin')setTimeout(v1610DecorateStaffQueries,0);
};
const v1610GoBase=go;
go=function(v){
  v1610GoBase(v);
  if(role==='admin'&&['staff','complaints'].includes(v))v1610LoadConduct(true).then(()=>{if(view===v)renderApp()}).catch(e=>toast(e.message));
};

function v1610QuerySeverity(n){if(n>=5)return ['CRITICAL','danger'];if(n===4)return ['SERIOUS','danger'];if(n===3)return ['ELEVATED','warn'];if(n===2)return ['MODERATE','pending'];if(n===1)return ['MONITOR','pending'];return ['CLEAR','good']}
function v1610DecorateStaffQueries(){
  if(view!=='staff'||role!=='admin')return;
  if(!v1610ConductLoaded){v1610LoadConduct(true).then(()=>v1610DecorateStaffQueries()).catch(e=>toast(e.message));return}
  $$('.staff-slot').forEach(slot=>{
    if(slot.querySelector('.v1610-query-bar'))return;
    const btn=slot.querySelector('[onclick*="pickStaffPhoto"]'),m=btn?.getAttribute('onclick')?.match(/pickStaffPhoto\('([^']+)'/);if(!m)return;
    const id=m[1],qs=v1610QueriesForStaff(id),n=qs.length,pct=Math.min(100,n*20),sev=v1610QuerySeverity(n);
    const bar=document.createElement('button');bar.className='v1610-query-bar';bar.onclick=()=>openStaffQueryDetails1610(id);
    bar.innerHTML=`<span><b>MONTHLY QUERY LOAD</b><em class="${sev[1]}">${sev[0]} · ${n} QUERY${n===1?'':'IES'}</em></span><i><u style="width:${pct}%"></u></i><small>${pct}%</small>`;
    slot.appendChild(bar);
  });
}
function openStaffQueryDetails1610(staffId){
  const st=v1610ConductStaff(staffId),qs=v1610QueriesForStaff(staffId),sev=v1610QuerySeverity(qs.length);
  openModal(`<div class="modal-head"><div><div class="eyebrow">MONTHLY STAFF QUERY RECORD</div><h2>${esc(st.full_name)}</h2><p class="muted">${esc((st.turn_role||'staff').toUpperCase())} · ${esc(v1610MonthKey())}</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v1610-query-summary glass"><b>${qs.length}</b><span>ACTIVE QUERIES THIS MONTH</span><em class="${sev[1]}">${sev[0]}</em></div><div class="v1610-query-detail-list">${qs.length?qs.map(q=>{const c=v1610Complaint(q.complaint_id);return `<article class="glass"><div class="row split"><b>QUERY · ${esc(v166AbujaStamp(q.issued_at))}</b><span class="pill warn">ACTIVE</span></div>${q.admin_note?`<p><strong>Admin Query:</strong> ${esc(q.admin_note)}</p>`:''}${c?`<div class="v1610-source-detail"><small>LINKED PLAYER COMPLAINT · ${esc(v166AbujaStamp(c.reported_at))}</small><p>${esc(c.description)}</p><span>Reported by ${esc(c.reporter_player_name)}${c.reporter_player_code?' · '+esc(c.reporter_player_code):''}</span></div>`:''}</article>`}).join(''):'<div class="empty">No active queries for this staff member this month.</div>'}</div>`);
}

const v1610SettingsBase=settingsView;
settingsView=function(){
  const base=v1610SettingsBase();if(role!=='admin')return base;
  return `${base}<section class="card glass v1610-query-reset"><div><div class="eyebrow">ADMIN · STAFF CONDUCT CONTROL</div><h2>Reset All Staff Queries</h2><p>Clears all active query bars while retaining complaint and audit history. Requires the 6-digit Admin PIN.</p></div><button class="btn danger" onclick="resetAllQueries1610()">↺ Reset All Queries</button></section>`;
};
async function resetAllQueries1610(){
  const pin=prompt('Enter the 6-digit Admin PIN to reset ALL active staff queries:','');if(pin===null)return;if(!/^\d{6}$/.test(pin))return toast('Admin PIN must contain exactly 6 digits.');
  if(!confirm('Reset all active staff query bars? Complaint history will remain available.'))return;
  try{const j=await v1610Conduct('reset_queries',{pin});toast(j.message);await v1610LoadConduct(true);if(view==='settings'||view==='staff')renderApp()}catch(e){toast(e.message)}
}

async function v1610PublicStaffList(){
  if(v1610PublicStaff)return v1610PublicStaff;
  const j=await v1610Conduct('staff_list',{},false);v1610PublicStaff=j.staff||[];return v1610PublicStaff;
}
function v1610PlayerContext(){
  return window.__d12Player1610||window.__d12IdentityPlayer1610||null;
}
async function openReportStaff1610(){
  const p=v1610PlayerContext();if(!p)return toast('Player identity is unavailable. Reopen the Player Portal.');
  try{
    const staff=await v1610PublicStaffList(),racks=staff.filter(x=>x.turn_role==='rackmaster'),cashiers=staff.filter(x=>x.turn_role==='cashier'),stamp=v166AbujaStamp();
    openModal(`<div class="modal-head"><div><div class="eyebrow">PLAYER PORTAL · CONFIDENTIAL REPORT</div><h2>Report Staff</h2><p class="muted">Submit conduct concerns directly to D12 Admin for review.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v1610-reporter-card glass"><div><small>REPORTING PLAYER</small><b>${esc(p.full_name)}</b><span>${esc(p.player_code||'D12 PLAYER')}</span></div><div><small>DATE & TIME · ABUJA</small><b>${esc(stamp)}</b></div></div><div class="field"><label>STAFF MEMBER</label><select id="v1610ReportedStaff"><option value="">Select staff member</option><optgroup label="RACKMASTERS">${racks.map(s=>`<option value="${s.id}">${esc(s.full_name)}</option>`).join('')}</optgroup><optgroup label="CASHIERS">${cashiers.map(s=>`<option value="${s.id}">${esc(s.full_name)}</option>`).join('')}</optgroup></select></div><div class="field"><label>NATURE OF BAD BEHAVIOUR / ISSUE</label><textarea id="v1610ComplaintText" rows="7" maxlength="1200" placeholder="Describe what happened, including relevant details."></textarea><small>Reports are sent to D12 Admin and recorded with your Player identity and submission time.</small></div><button class="btn primary block" onclick="submitStaffReport1610()">⚑ Submit Staff Report</button>`);
  }catch(e){toast(e.message)}
}
async function submitStaffReport1610(){
  const p=v1610PlayerContext(),staffId=$('#v1610ReportedStaff')?.value,description=$('#v1610ComplaintText')?.value||'';if(!p)return;
  if(!staffId)return toast('Select the staff member being reported.');if(description.trim().length<10)return toast('Please describe the issue in at least 10 characters.');
  if(!confirm('Submit this staff report to D12 Admin?'))return;
  try{const j=await v1610Conduct('submit_complaint',{reported_staff_id:staffId,description,ticket:ticketParam||'',player_code:p.player_code||'',phone:p.phone||''},false);closeModal();toast(j.message||'Staff report submitted.')}catch(e){toast(e.message)}
}

const v1610RenderPlayerBase=renderPlayer;
renderPlayer=function(d){
  window.__d12Player1610=d.player;
  v1610RenderPlayerBase(d);
  const nav=$('.v166-player-tabs');if(nav&&!nav.querySelector('.v1610-report-tab'))nav.insertAdjacentHTML('beforeend','<button class="v1610-report-tab" onclick="openReportStaff1610()">⚑ Report Staff</button>');
};
const v1610IdentityBase=renderIdentityDashboard;
renderIdentityDashboard=function(j){
  window.__d12IdentityPlayer1610=j.player;
  v1610IdentityBase(j);
  const main=$('.player-shell main.content');if(main&&!main.querySelector('.v1610-identity-report'))main.insertAdjacentHTML('afterbegin','<nav class="v166-player-tabs glass v1610-identity-report"><button onclick="openReportStaff1610()">⚑ Report Staff</button></nav>');
};
