// v1.7.13: paint operational cards without rebuilding the staff shell.
// Server actions, optimistic predictions and revision reconciliation stay authoritative.
const v1713RenderBase=v1712Render;
function v1713PaintRack(){
  if(!data||!token||view!=='rackmaster')return false;
  const grid=document.querySelector('.rack-grid');
  const tables=data.tables||[],cards=grid?[...grid.children].filter(x=>x.classList.contains('rack-card')):[];
  if(!tables.length||cards.length!==tables.length)return false;
  // Prepare every card before touching the live DOM, so failures can use the full renderer.
  // player()/state() otherwise rebuild all lookup maps for every queue row.
  const baseMaps=maps,lookup=baseMaps();let next;
  try{
    maps=()=>lookup;
    next=tables.map(t=>{
      const template=document.createElement('template');
      template.innerHTML=rackTable(t);
      const card=template.content.firstElementChild;
      if(!card?.classList.contains('rack-card'))throw new Error('Rack card unavailable');
      return card;
    });
  }finally{maps=baseMaps}
  cards.forEach((card,i)=>{
    if(card.innerHTML!==next[i].innerHTML){
      const scroll=card.querySelector('.queue-list')?.scrollTop||0;
      card.replaceWith(next[i]);
      const queue=next[i].querySelector('.queue-list');if(queue)queue.scrollTop=scroll;
    }
  });
  v15RefreshRackStates();
  return true;
}
v1712Render=function(){
  // Approval panels still use the complete renderer. Common table-only actions
  // paint immediately even when the nav or a modal select retains focus.
  const local=[...v1712Busy].every(k=>/^(holder|move|call|status|pass):/.test(k));
  if(local&&v1712Busy.size){try{if(v1713PaintRack())return}catch(e){console.warn('Rack paint fallback',e)}}
  return v1713RenderBase();
};
const v1713RestoreBase=v1712Restore;
v1712Restore=function(snapshot){
  if(!data||!snapshot)return;
  const local=[...v1712Busy].every(k=>/^(holder|move|call|status|pass):/.test(k));
  if(local&&v1712Busy.size&&view==='rackmaster'){
    Object.keys(snapshot).forEach(k=>{data[k]=snapshot[k]});
    return v1712Render();
  }
  return v1713RestoreBase(snapshot);
};

// Keep v1.7.8 Start/Finish functions intact; accelerate only their paint calls.
const v1713AppBase=renderApp;
renderApp=function(preserveFocus=false){
  if(preserveFocus&&(v178StartInFlight.size||v178FinishInFlight.size)){
    try{if(v1713PaintRack())return}catch(e){console.warn('Match paint fallback',e)}
  }
  return v1713AppBase(preserveFocus);
};

let v1713QueueTable=null;
function v1713QueueTables(){
  const d=v172PlayerData;if(!d)return [];
  return [{...d.table,operational_status:d.table_state?.operational_status},...(d.other_tables_summary||[])]
    .filter(t=>t.id===d.table?.id||t.operational_status==='open');
}
function v1713QueueButtons(){
  if(!v172PlayerData||$('#v1713QueueButtons'))return;
  const actions=$('#modalCard .v172-turn-actions');if(!actions)return;
  const box=document.createElement('div');box.id='v1713QueueButtons';box.className='row wrap';
  box.innerHTML='<button class="btn" onclick="openQueue1713()">☷ Current Table Queue List</button><button class="btn" onclick="openQueue1713(true)">☷ Other Open Tables</button>';
  actions.before(box);
}
const v1713MyTurnBase=openMyTurn172;
openMyTurn172=function(...args){const out=v1713MyTurnBase(...args);v1713QueueButtons();return out};
function openQueue1713(other=false){
  const tables=v1713QueueTables(),current=v172PlayerData?.table?.id;
  const table=other?tables.find(t=>t.id!==current):tables.find(t=>t.id===current);
  if(!table)return toast(other?'No other open tables.':'No active table.');
  v1713QueueTable=table.id;v1711LiveDialog='queue1713';v1713RenderQueue();
}
function selectQueue1713(id){v1713QueueTable=id;v1713RenderQueue()}
function v1713RenderQueue(){
  const d=v172PlayerData,tables=v1713QueueTables();
  if(!d||!tables.length){closeModal();return}
  let table=tables.find(t=>t.id===v1713QueueTable)||tables[0];v1713QueueTable=table.id;
  const list=(d.table_queues||[]).find(t=>t.table_id===table.id);
  const rows=list?.players||[];
  openModal(`<div class="modal-head"><div><div class="eyebrow">MY TURN · QUEUE LISTS</div><h2>${esc(table.table_name)}</h2></div><button class="icon-btn" onclick="closeModal()">×</button></div>
    <div class="field"><label for="v1713QueueSelect">CURRENT TABLE & OTHER OPEN TABLES</label><select id="v1713QueueSelect" class="v166-contrast-select" onchange="selectQueue1713(this.value)">${tables.map(t=>`<option value="${esc(t.id)}" ${t.id===table.id?'selected':''}>${esc(t.table_name)}${t.id===d.table.id?' · Your table':''}</option>`).join('')}</select></div>
    <div class="v1713-queue-list" aria-live="polite">${!list?'<div class="empty">Queue list is not available yet.</div>':rows.length?rows.map(q=>`<article class="v1713-queue-row ${q.player_id===d.player.id?'current':''}"><strong>#${Number(q.position)}</strong><span>${esc(q.full_name)}${q.player_id===d.player.id?' · You':''}</span>${q.status==='called'?'<b>CALLED</b>':''}</article>`).join(''):'<div class="empty">No players waiting.</div>'}</div>
    <p class="muted">${rows.length} waiting. Queue changes appear automatically. A table move still requires Rackmaster approval.</p>
    <button class="btn" onclick="openMyTurn172()">Back to My Turn</button>`);
}
const v1713LiveBase=v1711RenderLiveDialog;
v1711RenderLiveDialog=function(){
  if(v1711LiveDialog==='queue1713'&&v1711DialogVisible()){
    const card=$('#modalCard'),scroll=card?.scrollTop||0;
    v1713RenderQueue();if(card)card.scrollTop=scroll;return;
  }
  const out=v1713LiveBase();
  if(v1711LiveDialog==='myturn'&&v1711DialogVisible())v1713QueueButtons();
  return out;
};
