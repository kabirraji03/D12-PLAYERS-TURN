// D12 PLAYERS TURN v1.7.3 — All Staff Active shifts, preserving v1.6.5 low-I/O
const V173_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-turn-v173';
const v173=(a,p={},auth=true)=>api(V173_API,a,p,auth);

function v173Cashiers(){return typeof v169StaffByRole==='function'?v169StaffByRole('cashier'):[]}
function v173Rackmasters(){return typeof v169StaffByRole==='function'?v169StaffByRole('rackmaster'):[]}
function v173Tables(){
  const rows=[...(data?.tables_v166||[]),...(data?.cue_tables_v12||[]),...(data?.all_table_summaries||[])],m=new Map();
  rows.forEach(t=>{if(t?.id&&!m.has(t.id))m.set(t.id,t)});
  return [...m.values()].sort((a,b)=>String(a.table_name||'').localeCompare(String(b.table_name||''))).slice(0,4);
}
function v173Options(rows,selected=''){return rows.map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${esc(x.full_name||x.table_name||'Option')}</option>`).join('')}
function v173AllStaffShiftSection(){
  if(role!=='admin')return '';
  const cash=v173Cashiers(),racks=v173Rackmasters(),tables=v173Tables();
  return `<section class="card glass v173-shift-card">
    <div class="v173-shift-head"><div><div class="eyebrow">ADMIN · CREATE STAFF SHIFT</div><h2>All Staff Active Shift</h2><p>Activate both Cashiers and all four Rackmasters together. Each Rackmaster owns one table, keeping all four tables covered without overlapping authority.</p></div><label class="v173-toggle"><input id="v173EnableAllStaff" type="checkbox" onchange="toggleAllStaff173(this.checked)"><span></span><b>Enable All Staff</b></label></div>
    <div id="v173AllStaffPanel" class="v173-allstaff-panel hidden">
      <div class="field"><label>SHIFT / COMBINATION NAME</label><input id="v173ShiftName" placeholder="All Staff Evening Shift"></div>
      <div class="v173-cashier-grid">
        <div class="field"><label>CASHIER 1</label><select id="v173Cashier1"><option value="">Select Cashier</option>${v173Options(cash,cash[0]?.id||'')}</select></div>
        <div class="field"><label>CASHIER 2</label><select id="v173Cashier2"><option value="">Select Cashier</option>${v173Options(cash,cash[1]?.id||'')}</select></div>
      </div>
      <div class="v173-rack-grid">
        ${[0,1,2,3].map(i=>`<article class="glass v173-rack-row"><div class="field"><label>RACKMASTER ${i+1}</label><select id="v173Rack${i+1}" onchange="v173RefreshRackLabels()"><option value="">Select Rackmaster</option>${v173Options(racks,racks[i]?.id||'')}</select></div><div class="field"><label id="v173RackLabel${i+1}">TABLE ASSIGNMENT</label><select id="v173Table${i+1}"><option value="">Select Table</option>${v173Options(tables,tables[i]?.id||'')}</select></div></article>`).join('')}
      </div>
      <div class="v173-shift-summary glass"><i>◉</i><div><b>6 STAFF ACTIVE</b><span>2 Cashiers · 4 Rackmasters · 4 uniquely assigned tables</span></div></div>
      <div class="v173-shift-actions"><button class="btn" onclick="saveAllStaffCombination173()">💾 Save Staff Combination</button><button class="btn primary" onclick="startAllStaffShift173()">▶ Activate All Staff Shift</button><button class="btn" onclick="openSavedCombinations169()">⚡ Load Saved Combination</button></div>
    </div>
  </section>`;
}
function toggleAllStaff173(on){
  $('#v173AllStaffPanel')?.classList.toggle('hidden',!on);
  if(on){v173RefreshRackLabels();setTimeout(()=>$('#v173ShiftName')?.focus(),50)}
}
function v173RefreshRackLabels(){
  for(let i=1;i<=4;i++){const id=$('#v173Rack'+i)?.value,name=typeof v169StaffName==='function'?v169StaffName(id):'';const l=$('#v173RackLabel'+i);if(l)l.textContent=(name?name.toUpperCase():'RACKMASTER '+i)+' · TABLE'}
}
function v173ReadConfig(){
  const name=String($('#v173ShiftName')?.value||'').trim(),cashiers=[$('#v173Cashier1')?.value,$('#v173Cashier2')?.value].filter(Boolean),assignments=[];
  for(let i=1;i<=4;i++)assignments.push({staff_id:$('#v173Rack'+i)?.value||'',table_id:$('#v173Table'+i)?.value||''});
  if(!name)throw new Error('Enter a shift / combination name.');
  if(cashiers.length!==2||new Set(cashiers).size!==2)throw new Error('Select both different Cashiers.');
  if(assignments.some(x=>!x.staff_id||!x.table_id))throw new Error('Select all four Rackmasters and all four table assignments.');
  if(new Set(assignments.map(x=>x.staff_id)).size!==4)throw new Error('Each Rackmaster must be selected once.');
  if(new Set(assignments.map(x=>x.table_id)).size!==4)throw new Error('Each table must be assigned to one Rackmaster.');
  return {shift_name:name,cashier_staff_ids:cashiers,rackmaster_assignments:assignments};
}
function v173Busy(btn,on,label='Working…'){
  if(!btn)return;if(on){btn.dataset.v173Text=btn.innerHTML;btn.disabled=true;btn.innerHTML='<span class="v173-spinner"></span> '+label}else{btn.disabled=false;if(btn.dataset.v173Text)btn.innerHTML=btn.dataset.v173Text}
}
async function saveAllStaffCombination173(){
  const btn=event?.currentTarget;try{const cfg=v173ReadConfig();v173Busy(btn,true,'Saving…');const j=await v173('save_all_staff_template',{template_name:cfg.shift_name,cashier_staff_ids:cfg.cashier_staff_ids,rackmaster_assignments:cfg.rackmaster_assignments});const list=data.shift_templates||[];data.shift_templates=[...list.filter(x=>x.id!==j.template.id),j.template];toast(j.message||'All Staff Active combination saved.');renderApp(true);setTimeout(()=>{const cb=$('#v173EnableAllStaff');if(cb){cb.checked=true;toggleAllStaff173(true);v173FillConfig(j.template)}},0)}catch(e){toast(e.message)}finally{v173Busy(btn,false)}}
async function startAllStaffShift173(){
  const btn=event?.currentTarget;try{const cfg=v173ReadConfig();if(!confirm('Activate ALL STAFF now? Both Cashiers and all 4 Rackmasters will be active on the selected tables.'))return;v173Busy(btn,true,'Activating…');const j=await v173('start_all_staff',cfg);data.active_shift=j.shift;data.shift_tables=j.shift.table_assignments||[];if(data.shifts)data.shifts=[j.shift,...data.shifts.filter(x=>x.id!==j.shift.id)];toast(j.message||'All Staff Active shift started.');renderApp(true)}catch(e){toast(e.message)}finally{v173Busy(btn,false)}}

const v173SettingsBase=settingsView;
settingsView=function(){const base=v173SettingsBase();return role==='admin'?v173AllStaffShiftSection()+base:base};

function v173FillConfig(t){
  if(!t)return;$('#v173ShiftName').value=t.template_name||t.shift_name||'';
  const cash=t.cashier_staff_ids||[];if($('#v173Cashier1'))$('#v173Cashier1').value=cash[0]||'';if($('#v173Cashier2'))$('#v173Cashier2').value=cash[1]||'';
  const a=Array.isArray(t.rackmaster_assignments)?t.rackmaster_assignments:[];
  for(let i=1;i<=4;i++){if($('#v173Rack'+i))$('#v173Rack'+i).value=a[i-1]?.staff_id||'';if($('#v173Table'+i))$('#v173Table'+i).value=a[i-1]?.table_id||''}
  v173RefreshRackLabels();
}
function loadAllStaffCombination173(id){
  const t=(data.shift_templates||[]).find(x=>x.id===id);if(!t)return toast('Saved combination is unavailable.');
  closeModal();view='settings';renderApp();setTimeout(()=>{const cb=$('#v173EnableAllStaff');if(cb){cb.checked=true;toggleAllStaff173(true);v173FillConfig(t);$('#v173AllStaffPanel')?.scrollIntoView({behavior:'smooth',block:'center'});toast(t.template_name+' loaded. Review and activate when ready.')}},40);
}

const v173OpenSavedBase=openSavedCombinations169;
openSavedCombinations169=async function(){
  const templates=data.shift_templates||[],full=templates.filter(t=>t.shift_mode==='all_staff'),standard=templates.filter(t=>t.shift_mode!=='all_staff');
  const standardHtml=standard.map(t=>`<article class="v169-preset-card glass"><div class="grow"><b>${esc(t.template_name)}</b><small>STANDARD SHIFT</small><span>${esc(v169StaffName(t.rackmaster_1_staff_id)||'Rackmaster 1')} + ${esc(v169StaffName(t.rackmaster_2_staff_id)||'Rackmaster 2')}</span></div><button class="btn primary" onclick="applyShiftTemplate169('${t.id}')">Load Into Shift</button></article>`).join('');
  const fullHtml=full.map(t=>{const cash=(t.cashier_staff_ids||[]).map(v169StaffName).filter(Boolean).join(' + '),racks=(Array.isArray(t.rackmaster_assignments)?t.rackmaster_assignments:[]).map(x=>v169StaffName(x.staff_id)).filter(Boolean).join(' · ');return `<article class="v169-preset-card glass v173-full-preset"><div class="grow"><div class="row wrap"><b>${esc(t.template_name)}</b><span class="pill good">ALL STAFF ACTIVE</span></div><small>Cashiers · ${esc(cash||'2 Cashiers')}</small><span>${esc(racks||'4 Rackmasters')}</span></div><button class="btn primary" onclick="loadAllStaffCombination173('${t.id}')">Load Setup</button><button class="btn good" onclick="startShiftTemplate166('${t.id}')">▶ Start</button></article>`}).join('');
  openModal(`<div class="modal-head"><div><div class="eyebrow">SAVED STAFF COMBINATIONS</div><h2>Load Shift Preset</h2><p class="muted">Standard and All Staff Active combinations use the same saved-combination library.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v169-preset-list">${fullHtml}${standardHtml}${!templates.length?'<div class="empty">No saved staff combinations yet.</div>':''}</div>`);
};
const v173StartTemplateBase=startShiftTemplate166;
startShiftTemplate166=async function(id){
  const t=(data.shift_templates||[]).find(x=>x.id===id);
  if(!t||t.shift_mode!=='all_staff')return v173StartTemplateBase(id);
  if(!confirm('Start this ALL STAFF ACTIVE combination now? Both Cashiers and all 4 Rackmasters will become active.'))return;
  const btn=event?.currentTarget;try{v173Busy(btn,true,'Starting…');const j=await v173('start_all_staff_template',{template_id:id});data.active_shift=j.shift;data.shift_tables=j.shift.table_assignments||[];closeModal();toast(j.message);renderApp(true)}catch(e){toast(e.message)}finally{v173Busy(btn,false)}
};

// Add a clear badge to the existing Staff & Shifts workspace when All Staff Active mode is running.
const v173StaffViewBase=staffView;
staffView=function(){
  const html=v173StaffViewBase();if(role!=='admin'||data?.active_shift?.shift_mode!=='all_staff')return html;
  const sh=data.active_shift,cash=(sh.cashier_staff_ids||[]).map(v169StaffName).filter(Boolean);
  return `<section class="v173-active-banner glass"><div class="v173-active-pulse"></div><div><div class="eyebrow">CURRENT SHIFT · ALL STAFF ACTIVE</div><h2>6 Staff On Shift</h2><p>${esc(cash.join(' + ')||'2 Cashiers')} · 4 Rackmasters covering all 4 tables</p></div></section>${html}`;
};
