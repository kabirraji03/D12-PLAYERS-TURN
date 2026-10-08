// D12 PLAYERS TURN v1.7.5 — shift cleanup, deletion and accurate active-staff reporting

// Keep ONE authoritative Start / Change Shift cell.
// v1.7.4 restored the original shift form; the older v1.6.6 workspace is no longer needed in Staff & Shifts.
const v175ShiftWorkspaceBase=v166ShiftWorkspace;
v166ShiftWorkspace=function(){
  if(role==='admin')return '';
  return v175ShiftWorkspaceBase();
};

// Keep saved-combination controls directly below the original Start / Change Shift form.
v169ShiftShortcutBar=function(){
  const n=(data?.shift_templates||[]).filter(t=>t.active!==false).length;
  return `<section class="v169-shift-shortcuts glass v175-shift-shortcuts">
    <div><div class="eyebrow">SAVED STAFF COMBINATIONS</div><b>${n} Saved Combination${n===1?'':'s'}</b><small>Save the selected standard shift, load a saved standard or All Staff setup, or delete an old combination.</small></div>
    <div class="v169-shift-buttons v175-shift-buttons">
      <button class="btn primary" onclick="saveCurrentShiftCombination169()">💾 Save Combination</button>
      <button class="btn" onclick="openSavedCombinations169()">⚡ Load Combination</button>
      <button class="btn danger" onclick="openDeleteCombinations175()">🗑 Delete Combination</button>
    </div>
  </section>`;
};

function v175TemplateStaffSummary(t){
  if(t.shift_mode==='all_staff'){
    const cash=(t.cashier_staff_ids||[]).map(id=>v169StaffName(id)).filter(Boolean);
    const racks=(Array.isArray(t.rackmaster_assignments)?t.rackmaster_assignments:[]).map(x=>v169StaffName(x.staff_id)).filter(Boolean);
    return `Cashiers · ${cash.join(' + ')||'2 Cashiers'} · Rackmasters · ${racks.join(' · ')||'4 Rackmasters'}`;
  }
  return `Cashier · ${v169StaffName(t.cashier_staff_id)||'Unknown'} · Rackmasters · ${v169StaffName(t.rackmaster_1_staff_id)||'RM1'} + ${v169StaffName(t.rackmaster_2_staff_id)||'RM2'}`;
}
openSavedCombinations169=async function(){
  const templates=(data?.shift_templates||[]).filter(t=>t.active!==false);
  const cards=templates.map(t=>{
    const all=t.shift_mode==='all_staff';
    return `<article class="v169-preset-card glass ${all?'v173-full-preset':''}">
      <div class="grow"><div class="row wrap"><b>${esc(t.template_name)}</b>${all?'<span class="pill good">ALL STAFF ACTIVE</span>':'<span class="pill">STANDARD</span>'}</div><small>${esc(v175TemplateStaffSummary(t))}</small></div>
      <div class="v175-preset-actions">
        <button class="btn primary" onclick="${all?`loadAllStaffCombination173('${t.id}')`:`applyShiftTemplate169('${t.id}')`}">Load</button>
        <button class="btn good" onclick="startShiftTemplate166('${t.id}',event)">▶ Start</button>
        <button class="btn danger" onclick="deleteShiftCombination175('${t.id}')">🗑 Delete</button>
      </div>
    </article>`;
  }).join('');
  openModal(`<div class="modal-head"><div><div class="eyebrow">SAVED STAFF COMBINATIONS</div><h2>Load Staff Combination</h2><p class="muted">Standard and All Staff Active presets are kept in one library.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v169-preset-list">${cards||'<div class="empty">No saved staff combinations yet.</div>'}</div>`);
};
function openDeleteCombinations175(){
  const templates=(data?.shift_templates||[]).filter(t=>t.active!==false);
  openModal(`<div class="modal-head"><div><div class="eyebrow">DELETE SAVED COMBINATION</div><h2>Saved Staff Combinations</h2><p class="muted">Deleting removes the combination from the active preset list. The audit record is retained.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v175-delete-list">${templates.length?templates.map(t=>`<article class="glass v175-delete-row"><div class="grow"><b>${esc(t.template_name)}</b><small>${esc(v175TemplateStaffSummary(t))}</small></div><button class="btn danger" onclick="deleteShiftCombination175('${t.id}')">🗑 Delete</button></article>`).join(''):'<div class="empty">No saved staff combinations to delete.</div>'}</div>`);
}
async function deleteShiftCombination175(id){
  const t=(data?.shift_templates||[]).find(x=>x.id===id);
  if(!t)return toast('Saved staff combination not found.');
  if(!confirm(`Delete saved combination "${t.template_name}"?`))return;
  try{
    const j=await v166('delete_shift_template',{template_id:id});
    data.shift_templates=(data.shift_templates||[]).filter(x=>x.id!==id);
    toast(j.message||'Saved combination deleted.');
    openDeleteCombinations175();
    if(view==='staff')setTimeout(()=>renderApp(true),0);
  }catch(e){toast(e.message)}
}

// Accurate active shift model: count every actually-selected active Cashier and Rackmaster.
function v175ActiveShiftModel(){
  const sh=data?.active_shift;if(!sh)return null;
  const staff=typeof v169StaffRecords==='function'?v169StaffRecords():[],staffMap=Object.fromEntries(staff.map(s=>[s.id,s]));
  const isActive=id=>id&&(!staffMap[id]||staffMap[id].active!==false);
  const rawCash=(Array.isArray(sh.cashier_staff_ids)&&sh.cashier_staff_ids.length?sh.cashier_staff_ids:[sh.cashier_staff_id]).filter(Boolean);
  const cashIds=[...new Set(rawCash)].filter(isActive);
  const assignments=(Array.isArray(sh.table_assignments)?sh.table_assignments:[]).filter(x=>x?.rackmaster_staff_id&&x?.table_id);
  let rackIds=[...new Set(assignments.map(x=>x.rackmaster_staff_id))].filter(isActive);
  if(!rackIds.length)rackIds=[...new Set([sh.rackmaster_1_staff_id,sh.rackmaster_2_staff_id].filter(Boolean))].filter(isActive);
  const tableRows=[...(data?.cue_tables_v12||[]),...(data?.tables_v166||[]),...(data?.all_table_summaries||[]),...(data?.tables||[])],tm=new Map();
  tableRows.forEach(t=>{if(t?.id&&!tm.has(t.id))tm.set(t.id,t.table_name||'Table')});
  const name=id=>v169StaffName(id)||staffMap[id]?.full_name||'Staff';
  const rackRows=rackIds.map(id=>({id,name:name(id),tables:assignments.filter(x=>x.rackmaster_staff_id===id).map(x=>tm.get(x.table_id)||'Table')}));
  const cashRows=cashIds.map(id=>({id,name:name(id)}));
  return {sh,cashRows,rackRows,total:new Set([...cashIds,...rackIds]).size};
}
function v175PatchActiveShiftPanel(){
  if(view!=='staff'||role!=='admin')return;
  const model=v175ActiveShiftModel(),sections=[...document.querySelectorAll('section.card.glass')];
  const panel=sections.find(s=>[...s.children].some(ch=>ch.tagName==='H2'&&ch.textContent.trim()==='Active Shift'));
  if(panel){
    if(!model){panel.innerHTML='<h2>Active Shift</h2><div class="empty">No staff shift is currently active.</div>'}
    else{
      const {sh,cashRows,rackRows,total}=model,mode=sh.shift_mode==='all_staff'?'ALL STAFF ACTIVE':'STANDARD SHIFT';
      panel.innerHTML=`<div class="v175-active-head"><div><div class="eyebrow">CURRENT SHIFT · ${mode}</div><h2>Active Shift</h2></div><div class="v175-active-count"><b>${total}</b><span>STAFF ACTIVE</span></div></div>
        <div class="shift-live"><span class="live-dot"></span><div><b>${esc(sh.shift_name)}</b><small>Started ${esc(v166AbujaStamp(sh.started_at))}</small></div></div>
        <div class="v175-active-groups">
          <div><small>CASHIERS · ${cashRows.length}</small>${cashRows.map((x,i)=>`<div class="shift-person"><b>Cashier ${i+1}</b><span>${esc(x.name)}</span></div>`).join('')||'<div class="shift-person"><b>Cashier</b><span>None selected</span></div>'}</div>
          <div><small>RACKMASTERS · ${rackRows.length}</small>${rackRows.map((x,i)=>`<div class="shift-person"><b>Rackmaster ${i+1}</b><span>${esc(x.name)}${x.tables.length?' · '+esc(x.tables.join(', ')):''}</span></div>`).join('')||'<div class="shift-person"><b>Rackmaster</b><span>None selected</span></div>'}</div>
        </div>
        <button class="btn danger block" onclick="endShift()">End Current Shift</button>`;
    }
  }
  // Update the green All Staff banner too, so it never claims 6 when fewer are actually active.
  const banner=document.querySelector('.v173-active-banner');
  if(banner&&model){
    const h=banner.querySelector('h2'),p=banner.querySelector('p');
    if(h)h.textContent=`${model.total} Staff On Shift`;
    if(p)p.textContent=`${model.cashRows.length} Cashier${model.cashRows.length===1?'':'s'} · ${model.rackRows.length} Rackmaster${model.rackRows.length===1?'':'s'} covering ${new Set(model.rackRows.flatMap(x=>x.tables)).size} table${new Set(model.rackRows.flatMap(x=>x.tables)).size===1?'':'s'}`;
  }
  // Remove any old duplicate Saved Staff Combination workspace if a cached layer injected it.
  document.querySelectorAll('.v166-shift-workspace').forEach(el=>el.remove());
}

// Preserve v1.7.4 universal response layer; only add the post-render shift correction.
const v175RenderBase=renderApp;
renderApp=function(preserveFocus=false){
  v175RenderBase(preserveFocus);
  if(view==='staff'&&role==='admin')setTimeout(v175PatchActiveShiftPanel,0);
};
