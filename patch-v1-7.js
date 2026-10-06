// D12 PLAYERS TURN v1.7 — dynamic shift labels, compact Cashier flows and monthly Staff Conduct reset

// ----- Start / Change Shift: use selected Rackmaster names in table-allocation labels -----
function v170UpdateShiftTableLabels(){
  const form=$('#shiftForm');if(!form)return;
  const update=(slot,boxName)=>{
    const sel=form.querySelector('select[name="rackmaster_'+slot+'_staff_id"]');
    const field=form.querySelector('input[name="'+boxName+'"]')?.closest('.field');
    const label=field?.querySelector('label');if(!sel||!label)return;
    const name=(typeof v169StaffName==='function'&&sel.value?v169StaffName(sel.value):'')||('RACKMASTER '+slot);
    label.textContent=name.toUpperCase()+' · SELECT 2 TABLES';
  };
  update('1','rm1_tables');update('2','rm2_tables');
}
function v170BindShiftTableLabels(){
  const form=$('#shiftForm');if(!form)return;
  ['rackmaster_1_staff_id','rackmaster_2_staff_id'].forEach(name=>{
    const sel=form.querySelector('select[name="'+name+'"]');if(!sel||sel.dataset.v170Labels==='1')return;
    sel.dataset.v170Labels='1';sel.addEventListener('change',v170UpdateShiftTableLabels);
  });
  v170UpdateShiftTableLabels();
}
const v170PopulateShiftBase=typeof v169PopulateShiftSelectors==='function'?v169PopulateShiftSelectors:null;
if(v170PopulateShiftBase){
  v169PopulateShiftSelectors=function(){v170PopulateShiftBase();v170BindShiftTableLabels()};
}
const v170ApplyShiftTemplateBase=typeof applyShiftTemplate169==='function'?applyShiftTemplate169:null;
if(v170ApplyShiftTemplateBase){
  applyShiftTemplate169=function(id){v170ApplyShiftTemplateBase(id);setTimeout(v170UpdateShiftTableLabels,0)};
}

// ----- Mobile / Tablet Cashier launcher -----
let v170CashierState={type:'',player:null,playerId:'',tableId:'',fullName:'',phone:'',photoFile:null,member:null,memberInput:''};

function v170CashierTables(){
  const source=(data?.all_table_summaries?.length?data.all_table_summaries:(data?.cue_tables_v12?.length?data.cue_tables_v12:data?.tables||[])),m=new Map();
  source.forEach(t=>{if(t?.id&&!m.has(t.id))m.set(t.id,t)});
  return [...m.values()].sort((a,b)=>String(a.table_name||'').localeCompare(String(b.table_name||''))).slice(0,4);
}
function v170CashierLauncher(){
  const appeals=(data?.payments||[]).filter(p=>p.kind==='appeal'&&p.status==='pending').length;
  return `<section class="v170-cashier-launcher">
    <div class="v170-cashier-intro glass"><div><div class="eyebrow">CASHIER QUICK ACTIONS</div><h2>Player Check-In</h2><p>Choose a player type to begin. Each check-in follows a focused step-by-step flow.</p></div><span class="v170-cashier-orb">₦</span></div>
    <div class="v170-cashier-buttons">
      <button class="v170-cashier-main glass" onclick="openRegisteredCashier170()"><i>♙</i><div><small>EXISTING D12 PLAYER</small><b>Registered Player</b><span>Search or scan player QR</span></div><em>›</em></button>
      <button class="v170-cashier-main glass" onclick="openNewCashier170()"><i>＋</i><div><small>WALK-IN / NEW PROFILE</small><b>New Player</b><span>Register and check in</span></div><em>›</em></button>
      <button class="v170-cashier-main glass" onclick="openMemberCashier170()"><i>◆</i><div><small>D12 SUBSCRIPTION</small><b>Member</b><span>Verify active membership</span></div><em>›</em></button>
      <button class="v170-cashier-main glass ${appeals?'has-pending':''}" onclick="openAppealGate170()"><i>↺</i><div><small>PAYMENT CONFIRMATION</small><b>Appeal Gate</b><span>${appeals?appeals+' awaiting approval':'No pending appeals'}</span></div><strong>${appeals||''}</strong><em>›</em></button>
    </div>
  </section>`;
}
const v170CashierBase=cashierView;
cashierView=function(){
  const base=v170CashierBase();
  if(role==='cashier'&&data?.active_shift&&data?.is_on_shift===false)return base;
  return `<div class="v170-cashier-mobile">${v170CashierLauncher()}</div><div class="v170-cashier-desktop">${base}</div>`;
};

function v170PlayerSearchRows(q=''){
  const term=String(q||'').trim().toLowerCase(),rows=(data?.registry||[]).filter(p=>!term||(`${p.full_name||''} ${p.player_code||''} ${p.phone||''}`).toLowerCase().includes(term)).slice(0,30);
  return rows.length?rows.map(p=>`<button class="v170-player-pick" onclick="selectRegisteredCashier170('${p.id}')">${avatar(p,'sm')}<span><b>${esc(p.full_name)}</b><small>${esc(p.player_code||'')} · ${esc(p.phone||'No phone')}</small></span><i>›</i></button>`).join(''):'<div class="empty">No registered player matches that search.</div>';
}
function openRegisteredCashier170(){
  v170CashierState={type:'registered',player:null,playerId:'',tableId:'',fullName:'',phone:'',photoFile:null,member:null,memberInput:''};
  openModal(`<div class="modal-head"><div><div class="eyebrow">REGISTERED PLAYER · STEP 1 OF 3</div><h2>Find Player</h2><p class="muted">Search the D12 registry or scan the player's QR code.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div>
    <div class="v170-search-tools"><div class="field grow"><label>SEARCH PLAYER</label><input id="v170PlayerSearch" placeholder="Name, Player ID or phone" oninput="filterRegisteredCashier170(this.value)" autofocus></div><button class="btn v170-scan-btn" onclick="startCashierScanner170('registered')">▦ Scan Player QR</button></div>
    <div id="v170PlayerResults" class="v170-player-results">${v170PlayerSearchRows('')}</div>`);
}
function filterRegisteredCashier170(q){const h=$('#v170PlayerResults');if(h)h.innerHTML=v170PlayerSearchRows(q)}
function selectRegisteredCashier170(id){
  const p=(data?.registry||[]).find(x=>x.id===id);if(!p)return toast('Player not found.');
  v170CashierState.player=p;v170CashierState.playerId=p.id;openCashierTable170();
}
function openNewCashier170(){
  v170CashierState={type:'new',player:null,playerId:'',tableId:'',fullName:'',phone:'',photoFile:null,member:null,memberInput:''};
  openModal(`<div class="modal-head"><div><div class="eyebrow">NEW PLAYER · STEP 1 OF 3</div><h2>Quick Registration</h2><p class="muted">Create the player identity before choosing a table.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div>
    <form id="v170NewPlayerForm" class="stack" onsubmit="continueNewCashier170(event)">
      <div class="field"><label>PLAYER FULL NAME</label><input name="full_name" required autocomplete="name"></div>
      <div class="field"><label>WHATSAPP / PHONE</label><input name="phone" inputmode="tel"></div>
      <div class="field"><label>PLAYER PHOTO</label><input name="photo" type="file" accept="image/*" capture="user" onchange="v170CashierState.photoFile=this.files&&this.files[0]?this.files[0]:null"></div>
      <button class="btn primary block">Next · Select Table ›</button>
    </form>`);
}
function continueNewCashier170(e){
  e.preventDefault();const f=new FormData(e.currentTarget),name=String(f.get('full_name')||'').trim();if(!name)return toast('Enter the player name.');
  v170CashierState.fullName=name;v170CashierState.phone=String(f.get('phone')||'').trim();openCashierTable170();
}
function openMemberCashier170(){
  v170CashierState={type:'member',player:null,playerId:'',tableId:'',fullName:'',phone:'',photoFile:null,member:null,memberInput:''};
  openModal(`<div class="modal-head"><div><div class="eyebrow">D12 MEMBER · STEP 1 OF 3</div><h2>Verify Membership</h2><p class="muted">Enter the Member ID or scan the membership QR before selecting a table.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div>
    <div class="field"><label>MEMBER ID / CARD</label><input id="v170MemberInput" placeholder="D12-2026-XXXXXX"></div>
    <div class="row wrap"><button class="btn primary grow" onclick="verifyMemberCashier170()">✓ Verify Member</button><button class="btn grow" onclick="startCashierScanner170('member')">▦ Scan Membership QR</button></div>
    <div id="v170MemberPreview" class="v170-member-preview"><div class="empty">Verify the member to continue.</div></div>`);
}
async function v170LookupMember(raw){
  const id=String(raw||'').trim();if(!id)return toast('Enter or scan a Member ID.');
  try{
    const lookup=await v161('membership_lookup',{member_id:id}),m=lookup.member;
    v170CashierState.member=m;v170CashierState.memberInput=id;
    const h=$('#v170MemberPreview');if(h)h.innerHTML=v162MembershipCard(m)+`<button class="btn primary block v170-member-next" ${m.membership_status==='ACTIVE'?'':'disabled'} onclick="openCashierTable170()">Next · Select Table ›</button>`;
    if(m.membership_status!=='ACTIVE')toast('Membership is not active');
  }catch(e){v170CashierState.member=null;const h=$('#v170MemberPreview');if(h)h.innerHTML=`<div class="notice danger-note">${esc(e.message)}</div>`;toast(e.message)}
}
function verifyMemberCashier170(){v170LookupMember($('#v170MemberInput')?.value||'')}

function v170TableCards(){
  const tables=v170CashierTables();
  return tables.map((t,i)=>{
    const status=String(t.operational_status||t.status||'open').toLowerCase(),disabled=status==='closed',q=Number(t.queue_count||0);
    return `<button class="v170-table-choice ${disabled?'disabled':''}" ${disabled?'disabled':''} onclick="selectCashierTable170('${t.id}')"><span class="v170-table-surface"><i></i></span><b>${esc(t.table_name||('Table '+(i+1)))}</b><small>${status.toUpperCase()}${Number.isFinite(q)?' · '+q+' in queue':''}</small></button>`;
  }).join('');
}
function openCashierTable170(){
  if(v170CashierState.type==='registered'&&!v170CashierState.player)return toast('Select a registered player first.');
  if(v170CashierState.type==='new'&&!v170CashierState.fullName)return toast('Enter the new player details first.');
  if(v170CashierState.type==='member'&&(!v170CashierState.member||v170CashierState.member.membership_status!=='ACTIVE'))return toast('Verify an active member first.');
  const name=v170CashierState.type==='registered'?v170CashierState.player.full_name:v170CashierState.type==='new'?v170CashierState.fullName:v170CashierState.member.full_name;
  openModal(`<div class="modal-head"><div><div class="eyebrow">${esc(v170CashierState.type.toUpperCase())} · STEP 2 OF 3</div><h2>Select Table</h2><p class="muted">${esc(name)} · choose the desired playing table.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v170-table-picker">${v170TableCards()}</div><button class="btn block" onclick="v170CashierBackStep()">‹ Back</button>`);
}
function selectCashierTable170(id){v170CashierState.tableId=id;openCashierFinal170()}
function v170CashierBackStep(){if(v170CashierState.type==='registered')openRegisteredCashier170();else if(v170CashierState.type==='new')openNewCashier170();else openMemberCashier170()}

function openCashierFinal170(){
  const t=v170CashierTables().find(x=>x.id===v170CashierState.tableId),tableName=t?.table_name||'Table';
  if(v170CashierState.type==='member'){
    const m=v170CashierState.member;
    return openModal(`<div class="modal-head"><div><div class="eyebrow">MEMBER · STEP 3 OF 3</div><h2>Confirm Check-In</h2><p class="muted">${esc(m.full_name)} · ${esc(tableName)}</p></div><button class="icon-btn" onclick="closeModal()">×</button></div>${v162MembershipCard(m)}<div class="v170-payment-summary glass"><div><small>TABLE</small><b>${esc(tableName)}</b></div><div><small>AMOUNT</small><b>₦0</b></div><div><small>REFERENCE</small><b>ACTIVE MEMBERSHIP</b></div></div><button class="btn good block" onclick="submitCashierMember170()">＋ Add Member To ${esc(tableName)}</button><button class="btn block" onclick="openCashierTable170()">‹ Change Table</button>`);
  }
  const p=v170CashierState.type==='registered'?v170CashierState.player:{full_name:v170CashierState.fullName,phone:v170CashierState.phone};
  openModal(`<div class="modal-head"><div><div class="eyebrow">${v170CashierState.type==='registered'?'REGISTERED PLAYER':'NEW PLAYER'} · STEP 3 OF 3</div><h2>Payment & Check-In</h2><p class="muted">${esc(p.full_name)} · ${esc(tableName)}</p></div><button class="icon-btn" onclick="closeModal()">×</button></div>
    <div class="v170-final-player glass">${v170CashierState.type==='registered'?avatar(p,'md'):'<div class="avatar md placeholder">'+esc((p.full_name||'?').slice(0,1))+'</div>'}<div><b>${esc(p.full_name)}</b><small>${v170CashierState.type==='registered'?esc(p.player_code||'REGISTERED PLAYER'):esc(p.phone||'NEW WALK-IN')}</small></div><span>${esc(tableName)}</span></div>
    <form id="v170CashierPaymentForm" class="stack" onsubmit="submitCashierPaid170(event)">
      <div class="row"><div class="field grow"><label>AMOUNT</label><input name="amount" type="number" min="0" value="3000" required></div><div class="field grow"><label>REFERENCE</label><input name="reference" placeholder="Cash / POS" value="Cash"></div></div>
      <button class="btn primary block">✓ Pay & Add Selected Player</button>
      <button type="button" class="btn block" onclick="openCashierTable170()">‹ Change Table</button>
    </form>`);
}
async function submitCashierPaid170(e){
  e.preventDefault();const f=new FormData(e.currentTarget),amount=Number(f.get('amount')||0),reference=String(f.get('reference')||'');
  try{
    if(v170CashierState.type==='registered'){
      const j=await v161('request_registered_checkin',{player_id:v170CashierState.playerId,table_id:v170CashierState.tableId,amount,reference});
      closeModal();toast(j.message||'Check-in submitted for approval');
    }else{
      let photo='';if(v170CashierState.photoFile)photo=await compressImage(v170CashierState.photoFile);
      const j=await v161('request_walkin_checkin',{full_name:v170CashierState.fullName,phone:v170CashierState.phone,table_id:v170CashierState.tableId,amount,reference,photo_data:photo});
      closeModal();toast(j.message||'New player submitted for approval');
    }
    await refresh(false,true);
  }catch(e){toast(e.message)}
}
async function submitCashierMember170(){
  const m=v170CashierState.member,id=String(v170CashierState.memberInput||'').trim();
  if(!m||String(m.member_code||'').toUpperCase()!==id.toUpperCase())return toast('Verify this Member ID first.');
  if(m.membership_status!=='ACTIVE')return toast('Membership is not active.');
  try{const j=await turn('enqueue_member',{card_token:m.card_token,table_id:v170CashierState.tableId});closeModal();toast(`${m.full_name} added to ${v162TableName(v170CashierState.tableId)}`);showTicket(j.ticket);await refresh(true,true)}catch(e){toast(e.message)}
}

function openAppealGate170(){
  const rows=(data?.payments||[]).filter(p=>p.kind==='appeal'&&p.status==='pending');
  openModal(`<div class="modal-head"><div><div class="eyebrow">APPEAL GATE</div><h2>Payment Approval</h2><p class="muted">Confirm paid appeals before the player becomes the next challenger.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v170-appeal-list">${rows.length?rows.map(p=>`<article class="v170-appeal-row glass">${avatar(player(p.player_id),'sm')}<div class="grow"><b>${esc(player(p.player_id).full_name)}</b><small>${money(p.amount)} · ${esc(maps().t[p.table_id]?.table_name||'Table')}</small></div><button class="btn good" onclick="confirmAppeal170('${p.id}')">✓ Confirm Paid</button></article>`).join(''):'<div class="empty">No appeal payments are awaiting approval.</div>'}</div>`);
}
async function confirmAppeal170(id){closeModal();await payAppeal(id)}

// Dedicated QR scanner for the focused Cashier flows; uses the existing scanner lifecycle.
async function startCashierScanner170(kind){
  try{await stopScanner()}catch{}
  openModal(`<div class="modal-head"><div><div class="eyebrow">QR SCANNER</div><h2>${kind==='registered'?'Scan Player QR':'Scan Membership QR'}</h2></div><button class="icon-btn" onclick="closeModal()">×</button></div><div id="v170QrReader" class="qr-reader"></div><p class="muted">Point the camera at the D12 QR code.</p>`);
  if(!window.Html5Qrcode)return toast('Camera scanner is unavailable. Enter the ID manually.');
  try{
    html5Scanner=new Html5Qrcode('v170QrReader');
    await html5Scanner.start({facingMode:'environment'},{fps:8,qrbox:{width:230,height:230}},async raw=>{
      try{await stopScanner()}catch{}
      if(kind==='registered'){
        try{const j=await v12('player_qr_lookup',{qr_value:raw});v170CashierState.player=j.player;v170CashierState.playerId=j.player.id;openCashierTable170()}catch(e){toast(e.message);openRegisteredCashier170()}
      }else{
        openMemberCashier170();const inp=$('#v170MemberInput');if(inp)inp.value=String(raw||'');await v170LookupMember(raw);
      }
    },()=>{});
  }catch(e){toast('Camera could not start. Enter the ID manually.');kind==='registered'?openRegisteredCashier170():openMemberCashier170()}
}

// ----- Staff Conduct naming + month-end clearing -----
const v170AllowedNavBase=allowedNav;
allowedNav=function(){
  const list=v170AllowedNavBase();
  if(role!=='admin')return list;
  const open=v1610ConductLoaded?(v1610ConductData.complaints||[]).filter(c=>['submitted','query_issued'].includes(c.status)).length:0;
  return list.map(x=>x[0]==='complaints'?['complaints','⚑',`Staff Conduct${open?' · '+open:''}`]:x);
};

const v170ComplaintsBase=v1610ComplaintsView;
v1610ComplaintsView=function(){
  let html=v170ComplaintsBase();
  html=html.replace('Loading staff complaints…','Loading staff conduct…');
  html=html.replace('<h2>Staff Complaints</h2><p>Player-submitted conduct reports and official staff queries. Records load on demand only.</p>','<h2>Staff Conduct Report</h2>');
  html=html.replace('<button class="btn" onclick="refreshComplaints1610()">↻ Refresh Complaints</button>','<button class="btn danger" onclick="clearAllConduct170()">⌫ Clear All Queries & Reports</button>');
  return html;
};
async function clearAllConduct170(){
  const total=(v1610ConductData.complaints||[]).length+(v1610ConductData.queries||[]).length;
  if(!confirm('CLEAR ALL STAFF CONDUCT QUERIES AND REPORTS? This clears the entire review queue and all monthly query bars.'))return;
  const pin=prompt('Enter the 6-digit Admin PIN to confirm month-end clearing:','');if(pin===null)return;if(!/^\d{6}$/.test(pin))return toast('Admin PIN must contain exactly 6 digits.');
  if(!confirm(`Final confirmation: permanently clear ${total} loaded conduct record${total===1?'':'s'} from Staff Conduct?`))return;
  try{const j=await v1610Conduct('clear_all_records',{pin});toast(j.message||'Staff Conduct cleared');v1610ConductData={staff:v1610ConductData.staff||[],complaints:[],queries:[]};v1610ConductLoaded=true;v1610ConductAt=Date.now();if(view==='complaints'||view==='staff')renderApp()}catch(e){toast(e.message)}
}
