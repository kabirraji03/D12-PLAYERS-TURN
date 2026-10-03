// D12 PLAYERS TURN v1.6.9 — compact shift presets, Rackmaster identity and mobile queue density

function v169StaffRecords(){
  const rows=[...(data?.staff_v12||[]),...(data?.staff_v166||[]),...(data?.staff||[])],m=new Map();
  rows.forEach(x=>{if(x?.id&&!m.has(x.id))m.set(x.id,x)});
  return [...m.values()];
}
function v169RoleRecords(){
  const rows=[...(data?.staff_roles_v12||[]),...(data?.staff_roles_v166||[]),...(data?.staff_roles||[])],m=new Map();
  rows.forEach(x=>{if(x?.staff_id&&!m.has(x.staff_id))m.set(x.staff_id,x)});
  return [...m.values()];
}
function v169StaffByRole(turnRole){
  const staff=v169StaffRecords(),roles=v169RoleRecords();
  let rows=roles.filter(r=>r.turn_role===turnRole&&r.active!==false).map(r=>staff.find(s=>s.id===r.staff_id)).filter(x=>x&&x.active!==false);
  if(turnRole==='cashier'){const operational=rows.filter(x=>!/front desk/i.test(x.full_name||''));if(operational.length)rows=operational}
  return rows.sort((a,b)=>(a.full_name||'').localeCompare(b.full_name||''));
}
function v169StaffName(id){return v169StaffRecords().find(s=>s.id===id)?.full_name||''}
function v169CurrentRackmasterId(){
  if(role!=='rackmaster')return null;
  if(data?.actor?.staff_id)return data.actor.staff_id;
  const sh=data?.active_shift;if(!sh)return null;
  const visible=new Set((data?.tables||[]).map(t=>t.id)),counts={};
  (sh.table_assignments||[]).forEach(a=>{if(visible.has(a.table_id))counts[a.rackmaster_staff_id]=(counts[a.rackmaster_staff_id]||0)+1});
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
}
function v169CurrentRackmasterName(){const id=v169CurrentRackmasterId();return id?v169StaffName(id):''}
function v169RackmasterForTable(tableId){const sh=data?.active_shift,assignment=(sh?.table_assignments||[]).find(a=>a.table_id===tableId);return assignment?v169StaffName(assignment.rackmaster_staff_id):''}

topbar=function(){
  const roleLabel=esc((role||'STAFF').toUpperCase()),rm=role==='rackmaster'?v169CurrentRackmasterName():'';
  const subtitle=role==='rackmaster'?('RACKMASTER PORTAL · REALTIME TURN MANAGER'+(rm?' · RACKMASTER '+esc(rm.toUpperCase()):'')):(roleLabel+' PORTAL · REALTIME TURN MANAGER');
  return '<header class="topbar glass"><div class="brand">'+logo('top-logo')+'<div><h1>D12 PLAYERS TURN</h1><small>'+subtitle+'</small></div></div><div class="top-actions">'+themeSelect()+'<button class="btn small welcome-btn" onclick="v163GoWelcome(\'staff\')">⌂ Welcome Screen</button><button class="btn small" onclick="logout()">Logout</button></div></header>';
};

const v169RackTableBase=rackTable;
rackTable=function(t){
  let html=v169RackTableBase(t),rm=v169RackmasterForTable(t.id);
  if(!rm)return html;
  const needle='<h2>'+esc(t.table_name)+'</h2>';
  return html.replace(needle,needle+'<div class="v169-table-rackmaster"><span>RACKMASTER</span><b>'+esc(rm)+'</b></div>');
};

queueRow=function(q,i,tableId){
  const p=player(q.player_id),appeal=q.source==='appeal',safeName=esc(p.full_name).replaceAll("'","&#39;");
  return '<div class="queue-row v169-queue-row"><div class="queue-num">'+(i+1)+'</div>'+avatar(p,'sm')+'<div class="grow v169-queue-copy" role="button" tabindex="0" onclick="openQueueActions169(\''+q.id+'\',\''+tableId+'\',\''+safeName+'\',\''+(appeal?'appeal':'normal')+'\',\''+p.id+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.click()}"><b>'+esc(p.full_name)+'</b><small>'+payBadge(q)+'</small></div><button class="v169-mobile-action-trigger" onclick="openQueueActions169(\''+q.id+'\',\''+tableId+'\',\''+safeName+'\',\''+(appeal?'appeal':'normal')+'\',\''+p.id+'\')" aria-label="Player actions">•••</button><div class="queue-actions v169-desktop-actions"><button class="icon-action" title="Upload photo" onclick="pickPlayerPhoto(\''+p.id+'\')">📷</button><button class="btn small v166-move-btn" onclick="openMove166(\''+q.id+'\',\''+tableId+'\',\''+safeName+'\',\''+(appeal?'appeal':'normal')+'\')">↕ Move</button><button class="btn small call-btn" onclick="callPlayer(\''+q.id+'\')">🔔 Call</button><button class="btn small danger leave-arena-btn" onclick="staffLeaveArena(\''+q.id+'\',\''+safeName+'\')">🚪 Leave</button></div></div>';
};
function openQueueActions169(queueId,tableId,name,kind='normal',playerId=''){
  if(!window.matchMedia('(max-width: 980px)').matches)return;
  const safe=esc(name).replaceAll("'","&#39;");
  openModal('<div class="modal-head"><div><div class="eyebrow">QUEUE PLAYER ACTIONS</div><h2>'+esc(name||'Player')+'</h2><p class="muted">Choose an action for this player without expanding the queue list.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v169-player-action-grid"><button class="v169-player-action glass" onclick="closeModal();openMove166(\''+queueId+'\',\''+tableId+'\',\''+safe+'\',\''+kind+'\')"><i>↕</i><b>Move</b><small>Up, down, last or another table</small></button><button class="v169-player-action glass" onclick="closeModal();callPlayer(\''+queueId+'\')"><i>🔔</i><b>Call</b><small>Alert the player to report</small></button><button class="v169-player-action glass danger" onclick="closeModal();staffLeaveArena(\''+queueId+'\',\''+safe+'\')"><i>🚪</i><b>Leave Arena</b><small>Remove from the active queue</small></button>'+(playerId?'<button class="v169-player-action glass" onclick="closeModal();pickPlayerPhoto(\''+playerId+'\')"><i>📷</i><b>Photo</b><small>Update player profile image</small></button>':'')+'</div>');
}

function v169PopulateShiftSelectors(){
  const form=$('#shiftForm');if(!form)return;
  const fill=(name,rows,label)=>{const sel=form.querySelector('select[name="'+name+'"]');if(!sel)return;const current=sel.value;sel.innerHTML='<option value="">'+label+'</option>'+rows.map(s=>'<option value="'+s.id+'">'+esc(s.full_name)+(s.username?' · @'+esc(s.username):'')+'</option>').join('');if(rows.some(s=>s.id===current))sel.value=current};
  fill('cashier_staff_id',v169StaffByRole('cashier'),'Select cashier');
  const racks=v169StaffByRole('rackmaster');fill('rackmaster_1_staff_id',racks,'Select rackmaster');fill('rackmaster_2_staff_id',racks,'Select rackmaster');
}
function v169ShiftShortcutBar(){return '<section class="v169-shift-shortcuts glass"><div><div class="eyebrow">SHIFT PRESETS</div><b>Reuse a Cashier + 2 Rackmasters combination</b><small>Choose staff and tables in Start / Change Shift, then save that exact combination for faster loading next time.</small></div><div class="v169-shift-buttons"><button class="btn primary" onclick="saveCurrentShiftCombination169()">💾 Save Staff Combination</button><button class="btn" onclick="openSavedCombinations169()">⚡ Load Saved Combination</button></div></section>'}

staffView=function(){if(role!=='admin')return v167StaffBase();const html=v167StaffBase();setTimeout(v169PopulateShiftSelectors,0);return html+v169ShiftShortcutBar()};

async function saveCurrentShiftCombination169(){
  const form=$('#shiftForm');if(!form)return toast('Open Staff & Shifts and select the shift staff first.');
  v169PopulateShiftSelectors();
  const f=new FormData(form),cashier=f.get('cashier_staff_id'),r1=f.get('rackmaster_1_staff_id'),r2=f.get('rackmaster_2_staff_id'),t1=f.getAll('rm1_tables'),t2=f.getAll('rm2_tables');
  if(!cashier||!r1||!r2)return toast('Select a Cashier and both Rackmasters first.');if(r1===r2)return toast('Select two different Rackmasters.');if(t1.length!==2||t2.length!==2||new Set([...t1,...t2]).size!==4)return toast('Assign exactly 2 different tables to each Rackmaster.');
  const defaultName=String(f.get('shift_name')||'').trim()||(v169StaffName(r1)+' + '+v169StaffName(r2)+' + '+v169StaffName(cashier));
  const templateName=prompt('Name this saved staff combination:',defaultName);if(!templateName)return;
  try{const j=await v166('save_shift_template',{template_name:templateName,cashier_staff_id:cashier,rackmaster_1_staff_id:r1,rackmaster_2_staff_id:r2,rackmaster_1_tables:t1,rackmaster_2_tables:t2});toast(j.message||'Staff combination saved');await refresh(false,true)}catch(e){toast(e.message)}
}
async function openSavedCombinations169(){
  try{const ext=await v166('bootstrap');data=mergeV166(data,ext);const templates=data.shift_templates||[];openModal('<div class="modal-head"><div><div class="eyebrow">SAVED STAFF COMBINATIONS</div><h2>Load Shift Preset</h2><p class="muted">Loads the saved Cashier, Rackmasters and table allocation into Start / Change Shift. It does not activate the shift until you press Activate Shift.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v169-preset-list">'+(templates.length?templates.map(t=>'<article class="v169-preset-card glass"><div class="grow"><b>'+esc(t.template_name)+'</b><small>Cashier · '+esc(v169StaffName(t.cashier_staff_id)||'Unknown')+'</small><span>'+esc(v169StaffName(t.rackmaster_1_staff_id)||'Rackmaster 1')+' + '+esc(v169StaffName(t.rackmaster_2_staff_id)||'Rackmaster 2')+'</span></div><button class="btn primary" onclick="applyShiftTemplate169(\''+t.id+'\')">Load Into Shift</button></article>').join(''):'<div class="empty">No saved staff combinations yet. Select a shift combination and press Save Staff Combination.</div>')+'</div>')}catch(e){toast(e.message)}
}
function applyShiftTemplate169(id){
  const t=(data.shift_templates||[]).find(x=>x.id===id),form=$('#shiftForm');if(!t||!form)return toast('Saved combination is unavailable.');
  v169PopulateShiftSelectors();const set=(name,val)=>{const el=form.querySelector('[name="'+name+'"]');if(el)el.value=val||''};set('cashier_staff_id',t.cashier_staff_id);set('rackmaster_1_staff_id',t.rackmaster_1_staff_id);set('rackmaster_2_staff_id',t.rackmaster_2_staff_id);
  form.querySelectorAll('[name="rm1_tables"],[name="rm2_tables"]').forEach(x=>x.checked=false);(t.rackmaster_1_tables||[]).forEach(id=>{const x=form.querySelector('[name="rm1_tables"][value="'+id+'"]');if(x)x.checked=true});(t.rackmaster_2_tables||[]).forEach(id=>{const x=form.querySelector('[name="rm2_tables"][value="'+id+'"]');if(x)x.checked=true});
  const shiftName=form.querySelector('[name="shift_name"]');if(shiftName&&!shiftName.value)shiftName.value=t.template_name||'';closeModal();form.scrollIntoView({behavior:'smooth',block:'center'});toast(t.template_name+' loaded. Press Activate Shift when ready.');
}