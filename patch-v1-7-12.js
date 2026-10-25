// D12 PLAYERS TURN v1.7.12 — universal optimistic operational actions
// Keeps v1.6.5 revision-gated synchronization unchanged.
// Keeps v1.7.4 universal response feedback unchanged.
// Keeps v1.7.8 optimistic Start Next / Finish Match unchanged.

const v1712Busy=new Set();

function v1712Clone(v){return v==null?v:JSON.parse(JSON.stringify(v))}
function v1712Snap(keys){
  const s={};
  keys.forEach(k=>{s[k]=v1712Clone(data?.[k])});
  return s;
}
function v1712Restore(s){
  if(!data||!s)return;
  Object.keys(s).forEach(k=>{data[k]=s[k]});
  renderApp(true);
}
function v1712Render(){if(data&&token)renderApp(true)}
function v1712Now(){return new Date().toISOString()}
function v1712State(tableId){return (data?.table_states||[]).find(x=>x.table_id===tableId)||null}
function v1712Queue(queueId){return (data?.queue||[]).find(x=>x.id===queueId)||null}
function v1712NormalRows(tableId,excludeId=null){
  return (data?.queue||[])
    .filter(q=>q.table_id===tableId&&q.id!==excludeId&&['queued','called'].includes(q.status)&&['cleared','not_required'].includes(q.payment_status)&&q.source!=='appeal')
    .sort((a,b)=>Number(a.priority||0)-Number(b.priority||0)||new Date(a.joined_at||0)-new Date(b.joined_at||0));
}
function v1712EndPriority(tableId,excludeId=null){
  const vals=v1712NormalRows(tableId,excludeId).map(q=>Number(q.priority||0));
  return Math.max(99,...vals)+1;
}
function v1712Summary(tableId){return (data?.all_table_summaries||[]).find(x=>x.id===tableId)||null}
function v1712AdjustSummary(tableId,delta){
  const s=v1712Summary(tableId);if(!s)return;
  s.queue_count=Math.max(0,Number(s.queue_count||0)+delta);
  const st=v1712State(tableId),mins=Number(st?.avg_match_minutes||data?.settings?.default_match_minutes||12);
  s.estimated_wait_minutes=Math.round(s.queue_count*mins);
}
function v1712Renumber(tableId){
  const rows=v1712NormalRows(tableId);
  rows.forEach((q,i)=>{q.priority=100+i;q.called_at=null;if(q.status==='called')q.status='queued';q.updated_at=v1712Now()});
}
function v1712MoveLocal(queueId,mode,targetTableId=null){
  const q=v1712Queue(queueId);if(!q)throw new Error('Waiting player not found.');
  if(!['queued','called'].includes(q.status))throw new Error('Only a waiting player can be moved.');
  const oldTable=q.table_id;
  if(mode==='table'){
    if(!targetTableId||targetTableId===oldTable)throw new Error('Choose a different table.');
    q.table_id=targetTableId;q.status='queued';q.priority=v1712EndPriority(targetTableId,q.id);q.joined_at=v1712Now();q.called_at=null;q.updated_at=q.joined_at;
    v1712AdjustSummary(oldTable,-1);v1712AdjustSummary(targetTableId,1);
    if(data?.move_requests)data.move_requests=data.move_requests.filter(r=>r.requester_queue_id!==q.id&&r.target_queue_id!==q.id);
    return;
  }
  if(q.source==='appeal')throw new Error('Paid appeal priority is protected.');
  const rows=v1712NormalRows(oldTable),idx=rows.findIndex(x=>x.id===q.id);if(idx<0)throw new Error('Player is not in the movable queue.');
  let ni=idx;
  if(mode==='up')ni=Math.max(0,idx-1);
  else if(mode==='down')ni=Math.min(rows.length-1,idx+1);
  else if(mode==='last')ni=rows.length-1;
  else throw new Error('Invalid move option.');
  if(ni===idx)return;
  const [row]=rows.splice(idx,1);rows.splice(ni,0,row);
  rows.forEach((x,i)=>{x.priority=100+i;x.called_at=null;x.status='queued';x.updated_at=v1712Now()});
  if(data?.move_requests)data.move_requests=data.move_requests.filter(r=>r.requester_queue_id!==q.id&&r.target_queue_id!==q.id);
}

// TABLE HOLDER — immediate visible state, backend confirms.
toggleHolderBreak=async function(tableId){
  const key='holder:'+tableId;if(v1712Busy.has(key))return;
  const st=v1712State(tableId);if(!st)return toast('Table state unavailable.');
  const snap=v1712Snap(['table_states']);
  try{
    v1712Busy.add(key);
    if(st.current_match_id)throw new Error('Finish the current match before changing the table holder break status.');
    const now=v1712Now();
    if(st.holder_mode==='active'){
      if(!st.holder_player_id)throw new Error('There is no table holder to place on break.');
      st.break_owner_player_id=st.holder_player_id;st.holder_player_id=null;st.holder_mode='break';st.break_initial_match_done=false;st.break_started_at=now;st.holder_ready_at=null;st.activity_status='holder_break';st.last_activity_at=now;
    }else if(st.holder_mode==='break'){
      st.holder_mode='ready';st.holder_ready_at=now;st.activity_status='holder_ready';st.last_activity_at=now;
    }else{
      st.holder_mode='break';st.holder_ready_at=null;st.activity_status='holder_break';st.last_activity_at=now;
    }
    v1712Render();
    toast(st.holder_mode==='break'?'Holder break applied — confirming…':'Holder ready applied — confirming…');
    const j=await turn('toggle_holder_break',{table_id:tableId});
    st.holder_mode=j.holder_mode||st.holder_mode;
    toast(st.holder_mode==='break'?'Table holder is on break':'Table holder is ready to return');
    v1712Render();
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};

// DIRECT QUEUE MOVE — Up / Down / Last / Change Table immediately.
executeMove166=async function(queueId,mode){
  const key='move:'+queueId;if(v1712Busy.has(key))return;
  const target=mode==='table'?$('#v166MoveTarget')?.value:null;if(mode==='table'&&!target)return toast('Select a destination table.');
  const snap=v1712Snap(['queue','move_requests','all_table_summaries']);
  try{
    v1712Busy.add(key);
    v1712MoveLocal(queueId,mode,target);
    closeModal();v1712Render();toast('Queue updated — confirming…');
    const j=await v166('move_player',{queue_id:queueId,mode,target_table_id:target});
    toast(j.message||'Queue updated');
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};

// Legacy exchange-request arrows, where still exposed: show PENDING immediately.
requestMove=async function(queueId,direction){
  const key='reqmove:'+queueId;if(v1712Busy.has(key))return;
  const q=v1712Queue(queueId);if(!q)return toast('Waiting player not found.');
  const snap=v1712Snap(['move_requests']);
  try{
    v1712Busy.add(key);
    const rows=v1712NormalRows(q.table_id),idx=rows.findIndex(x=>x.id===queueId),ti=direction==='up'?idx-1:idx+1;
    if(idx<0||ti<0||ti>=rows.length)throw new Error(`Player cannot move ${direction} any further`);
    const target=rows[ti],temp='optimistic-move-'+Date.now();
    data.move_requests=(data.move_requests||[]).filter(r=>r.requester_queue_id!==queueId&&r.target_queue_id!==queueId);
    data.move_requests.unshift({id:temp,table_id:q.table_id,requester_queue_id:q.id,target_queue_id:target.id,requester_player_id:q.player_id,target_player_id:target.player_id,direction,status:'pending',requested_at:v1712Now(),__optimistic:true});
    v1712Render();toast('Move request sent — confirming…');
    const j=await turn('request_queue_move',{queue_id:queueId,direction});
    data.move_requests=(data.move_requests||[]).map(r=>r.id===temp?j.request:r);
    toast('Move request sent. The exchange player must approve it.');
    v1712Render();
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};

// CALL PLAYER
callPlayer=async function(queueId){
  const key='call:'+queueId;if(v1712Busy.has(key))return;
  const q=v1712Queue(queueId);if(!q)return toast('Waiting player not found.');
  const snap=v1712Snap(['queue','table_states']);
  try{
    v1712Busy.add(key);q.status='called';q.called_at=v1712Now();q.updated_at=q.called_at;
    const st=v1712State(q.table_id);if(st&&!st.current_match_id){st.activity_status='called';st.last_activity_at=v1712Now()}
    v1712Render();hapticCall(true);toast('Player called — confirming…');
    const j=await turn('call_player',{queue_id:queueId});toast(j.message||'Player called');
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};

// TABLE STATUS
setTableStatus=async function(tableId,status){
  const key='status:'+tableId;if(v1712Busy.has(key))return;
  const st=v1712State(tableId);if(!st)return toast('Table state unavailable.');
  const snap=v1712Snap(['table_states','all_table_summaries']);
  try{
    v1712Busy.add(key);st.operational_status=status;st.last_activity_at=v1712Now();const sm=v1712Summary(tableId);if(sm)sm.operational_status=status;
    v1712Render();toast(`Table ${status} — confirming…`);
    await turn('set_table_status',{table_id:tableId,status});toast(`Table ${status}`);
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};

// PASS TO LAST
passPlayer164=async function(id,name){
  if(!confirm(`Pass ${name||'this player'} and move them to the bottom of this table queue?`))return;
  const key='pass:'+id;if(v1712Busy.has(key))return;const snap=v1712Snap(['queue']);
  try{v1712Busy.add(key);v1712MoveLocal(id,'last');v1712Render();toast('Player moved to bottom — confirming…');const j=await v164('pass_player',{queue_id:id});toast(j.message||'Player moved to bottom of queue')}
  catch(e){v1712Restore(snap);toast(e.message)}finally{v1712Busy.delete(key)}
};

// LEAVE ARENA FROM STAFF
staffLeaveArena=async function(id,name){
  if(!confirm(`${name||'Player'} will leave the arena and be removed from this queue. Continue?`))return;
  const key='leave:'+id;if(v1712Busy.has(key))return;const q=v1712Queue(id);if(!q)return toast('Queue entry unavailable.');
  const snap=v1712Snap(['queue','player_transfer_requests','all_table_summaries']);
  try{
    v1712Busy.add(key);const wasWaiting=['queued','called'].includes(q.status);q.status='cancelled';q.finished_at=v1712Now();q.updated_at=q.finished_at;
    data.player_transfer_requests=(data.player_transfer_requests||[]).map(r=>r.queue_entry_id===id&&r.status==='pending'?{...r,status:'cancelled'}:r);
    if(wasWaiting)v1712AdjustSummary(q.table_id,-1);v1712Render();toast('Player removed — confirming…');
    const j=await v161('leave_queue_staff',{queue_id:id});toast(j.message||'Player left arena');
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};

// APPEAL PAYMENT
payAppeal=async function(id){
  const reference=prompt('Payment reference (optional):','Cash')??'';if(reference===null)return;
  const key='appeal:'+id;if(v1712Busy.has(key))return;
  const snap=v1712Snap(['payments','queue','table_states']);
  try{
    v1712Busy.add(key);const p=(data.payments||[]).find(x=>x.id===id);if(p)p.status='paid';
    const q=(data.queue||[]).find(x=>x.payment_id===id||x.id===p?.queue_entry_id);
    if(q){q.payment_status='cleared';q.status='queued';q.priority=0;q.updated_at=v1712Now()}
    v1712Render();toast('Appeal cleared — confirming…');
    await turn('pay_appeal',{payment_id:id,reference});toast('Appeal cleared — next match is current holder vs appeal player');
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};

// CASHIER CHECK-IN APPROVAL
resolveCheckin161=async function(id,approve){
  const key='checkin:'+id;if(v1712Busy.has(key))return;
  const req=(data.checkin_requests||[]).find(x=>x.id===id);if(!req)return toast('Pending check-in request not found.');
  const snap=v1712Snap(['checkin_requests','queue','all_table_summaries']);
  let tempId=null;
  try{
    v1712Busy.add(key);req.status=approve?'approved':'declined';req.resolved_at=v1712Now();
    if(approve){
      tempId='optimistic-checkin-'+Date.now();
      data.queue=[...(data.queue||[]),{id:tempId,player_id:req.player_id,table_id:req.table_id,source:'daily',status:'queued',payment_status:'cleared',priority:v1712EndPriority(req.table_id),joined_at:v1712Now(),clearance_label:'APPROVED',__optimistic:true}];
      v1712AdjustSummary(req.table_id,1);
    }
    v1712Render();toast(approve?'Player added to queue — confirming…':'Check-in declined — confirming…');
    const j=await v161('resolve_checkin',{request_id:id,approve});
    if(approve&&j.queue&&tempId)data.queue=(data.queue||[]).map(q=>q.id===tempId?j.queue:q);
    toast(j.message||'Check-in updated');v1712Render();
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};

// PLAYER TABLE TRANSFER APPROVAL
resolveTransfer161=async function(id,approve){
  const key='transfer:'+id;if(v1712Busy.has(key))return;
  const req=(data.player_transfer_requests||[]).find(x=>x.id===id);if(!req)return toast('Pending transfer request not found.');
  const snap=v1712Snap(['player_transfer_requests','queue','all_table_summaries']);
  try{
    v1712Busy.add(key);const actor=data?.actor?.staff_id||null;
    if(!approve){req.status='declined';if(req.source_rackmaster_staff_id===actor)req.source_approval='declined';if(req.target_rackmaster_staff_id===actor)req.target_approval='declined'}
    else{
      if(req.source_rackmaster_staff_id===actor)req.source_approval='approved';
      if(req.target_rackmaster_staff_id===actor)req.target_approval='approved';
      if(req.source_approval==='approved'&&req.target_approval==='approved'){
        req.status='approved';const q=v1712Queue(req.queue_entry_id);
        if(q){const from=q.table_id;q.table_id=req.to_table_id;q.status='queued';q.priority=v1712EndPriority(req.to_table_id,q.id);q.joined_at=v1712Now();q.called_at=null;q.updated_at=q.joined_at;v1712AdjustSummary(from,-1);v1712AdjustSummary(req.to_table_id,1)}
      }
    }
    v1712Render();toast(approve?'Transfer approval applied — confirming…':'Transfer declined — confirming…');
    const j=await v161('resolve_transfer',{request_id:id,approve});toast(j.message||'Transfer updated');
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};

// TABLE RESET REQUEST / ADMIN RESPONSE
resetTable=async function(tableId){
  if(!confirm('Send a table reset request to Admin? The current table holder will become first in queue if the reset is approved.'))return;
  const key='resetreq:'+tableId;if(v1712Busy.has(key))return;
  const snap=v1712Snap(['reset_requests']);const temp='optimistic-reset-'+Date.now();
  try{
    v1712Busy.add(key);data.reset_requests=[{id:temp,table_id:tableId,status:'pending',requested_at:v1712Now(),__optimistic:true},...(data.reset_requests||[])];v1712Render();toast('Reset request sent — confirming…');
    const j=await v161('request_reset',{table_id:tableId});data.reset_requests=(data.reset_requests||[]).map(r=>r.id===temp?j.request:r);toast(j.message);v1712Render();
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};
function v1712ApplyTableReset(tableId){
  const st=v1712State(tableId);if(!st)return;const holder=st.holder_player_id||st.break_owner_player_id||null,now=v1712Now();
  (data.matches||[]).forEach(m=>{if(m.table_id===tableId&&m.status==='in_progress'){m.status='void';m.ended_at=now}});
  (data.queue||[]).forEach(q=>{if(q.table_id===tableId&&q.status==='active'){q.status='queued';q.priority=50;q.joined_at=now;q.started_at=null;q.called_at=null;q.updated_at=now}});
  if(holder){
    let h=(data.queue||[]).find(q=>q.player_id===holder&&['queued','called','active'].includes(q.status));
    if(h){h.table_id=tableId;h.status='queued';h.priority=-100;h.joined_at=now;h.started_at=null;h.called_at=null;h.updated_at=now}
    else data.queue=[...(data.queue||[]),{id:'optimistic-holder-'+Date.now(),player_id:holder,table_id:tableId,source:'admin',status:'queued',payment_status:'not_required',priority:-100,joined_at:now,__optimistic:true}];
  }
  Object.assign(st,{holder_player_id:null,current_match_id:null,activity_status:'waiting',operational_status:'open',holder_mode:'active',break_owner_player_id:null,break_initial_match_done:false,break_started_at:null,holder_ready_at:null,last_activity_at:now});
}
resolveReset161=async function(id,approve){
  const key='resetresolve:'+id;if(v1712Busy.has(key))return;const req=(data.reset_requests||[]).find(x=>x.id===id);if(!req)return toast('Reset request not found.');
  const snap=v1712Snap(['reset_requests','queue','matches','table_states']);
  try{
    v1712Busy.add(key);req.status=approve?'approved':'declined';req.resolved_at=v1712Now();if(approve)v1712ApplyTableReset(req.table_id);v1712Render();toast(approve?'Table reset applied — confirming…':'Reset declined — confirming…');
    const j=await v161('resolve_reset',{request_id:id,approve});toast(j.message||'Reset request updated');
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};

// ACCESS REQUESTS — remove server-sync wait from the visible approval state.
requestTableAccess=async function(tableId){
  const key='access:'+tableId;if(v1712Busy.has(key))return;const snap=v1712Snap(['access_requests']);const temp='optimistic-access-'+Date.now();
  try{
    v1712Busy.add(key);data.access_requests=[{id:temp,table_id:tableId,staff_id:data?.actor?.staff_id,status:'pending',requested_at:v1712Now(),__optimistic:true},...(data.access_requests||[])];v1712Render();toast('Admin access request sent — confirming…');
    const j=await turn('request_table_access',{table_id:tableId});if(j.request)data.access_requests=(data.access_requests||[]).map(r=>r.id===temp?j.request:r);toast('Admin access request sent');v1712Render();
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};
resolveAccess=async function(id,approve){
  const key='accessresolve:'+id;if(v1712Busy.has(key))return;const req=(data.access_requests||[]).find(x=>x.id===id);if(!req)return toast('Access request not found.');const snap=v1712Snap(['access_requests']);
  try{v1712Busy.add(key);req.status=approve?'approved':'declined';req.resolved_at=v1712Now();v1712Render();toast(approve?'Access approved — confirming…':'Access declined — confirming…');await turn('resolve_table_access',{request_id:id,approve});toast(approve?'Access approved':'Access declined')}
  catch(e){v1712Restore(snap);toast(e.message)}finally{v1712Busy.delete(key)}
};

// RESET ALL request/approval: instant approval-panel state; destructive state is also mirrored locally on approval.
requestResetAll166=async function(){
  if(!confirm('Request ADMIN approval to RESET ALL TABLES? This will clear every active player, live match, queue and pending player approval on all four tables if approved.'))return;
  const key='resetallreq';if(v1712Busy.has(key))return;const snap=v1712Snap(['reset_all_requests']);const temp='optimistic-resetall-'+Date.now();
  try{v1712Busy.add(key);data.reset_all_requests=[{id:temp,status:'pending',requested_at:v1712Now(),note:'Full table reset',__optimistic:true},...(data.reset_all_requests||[])];v1712Render();toast('Reset All request sent — confirming…');const j=await v166('request_reset_all');if(j.request)data.reset_all_requests=(data.reset_all_requests||[]).map(r=>r.id===temp?j.request:r);toast(j.message||'Reset request sent');v1712Render()}
  catch(e){v1712Restore(snap);toast(e.message)}finally{v1712Busy.delete(key)}
};
function v1712ApplyResetAll(){
  const now=v1712Now();
  (data.matches||[]).forEach(m=>{if(m.status==='in_progress'){m.status='void';m.ended_at=now}});
  (data.queue||[]).forEach(q=>{if(['awaiting_payment','queued','called','active'].includes(q.status)){q.status='cancelled';q.finished_at=now;q.updated_at=now}});
  (data.table_states||[]).forEach(st=>Object.assign(st,{holder_player_id:null,current_match_id:null,activity_status:'waiting',operational_status:'open',holder_mode:'active',break_owner_player_id:null,break_initial_match_done:false,break_started_at:null,holder_ready_at:null,last_activity_at:now}));
  (data.payments||[]).forEach(p=>{if(p.kind==='appeal'&&p.status==='pending')p.status='void'});
  (data.checkin_requests||[]).forEach(r=>{if(r.status==='pending')r.status='declined'});
  (data.player_transfer_requests||[]).forEach(r=>{if(r.status==='pending')r.status='cancelled'});
  (data.reset_requests||[]).forEach(r=>{if(r.status==='pending')r.status='declined'});
  (data.move_requests||[]).forEach(r=>{if(r.status==='pending')r.status='expired'});
  (data.all_table_summaries||[]).forEach(s=>{s.queue_count=0;s.estimated_wait_minutes=0;s.operational_status='open'});
}
resolveResetAll166=async function(id,approve){
  const verb=approve?'APPROVE full reset and clear ALL tables?':'Decline Reset All Tables request?';if(!confirm(verb))return;
  const key='resetall:'+id;if(v1712Busy.has(key))return;
  const snap=v1712Snap(['reset_all_requests','matches','queue','table_states','payments','checkin_requests','player_transfer_requests','reset_requests','move_requests','all_table_summaries']);
  try{
    v1712Busy.add(key);const r=(data.reset_all_requests||[]).find(x=>x.id===id);if(r){r.status=approve?'approved':'declined';r.resolved_at=v1712Now()}if(approve)v1712ApplyResetAll();v1712Render();toast(approve?'All tables reset locally — confirming…':'Reset All declined — confirming…');
    const j=await v166('resolve_reset_all',{request_id:id,approve});toast(j.message);
  }catch(e){v1712Restore(snap);toast(e.message)}
  finally{v1712Busy.delete(key)}
};

// MOBILE/TABLET CASHIER: submit without full sync wait; inject returned request/queue locally.
submitCashierPaid170=async function(e){
  e.preventDefault();const f=new FormData(e.currentTarget),amount=Number(f.get('amount')||0),reference=String(f.get('reference')||''),tableId=v170CashierState.tableId;
  try{
    if(v170CashierState.type==='registered'){
      const j=await v161('request_registered_checkin',{player_id:v170CashierState.playerId,table_id:tableId,amount,reference});
      if(j.request)data.checkin_requests=[j.request,...(data.checkin_requests||[]).filter(x=>x.id!==j.request.id)];
      closeModal();toast(j.message||'Check-in submitted for approval');v1712Render();
    }else{
      let photo='';if(v170CashierState.photoFile)photo=await compressImage(v170CashierState.photoFile);
      const j=await v161('request_walkin_checkin',{full_name:v170CashierState.fullName,phone:v170CashierState.phone,table_id:tableId,amount,reference,photo_data:photo});
      if(j.player&&!((data.players||[]).some(p=>p.id===j.player.id)))data.players=[...(data.players||[]),j.player];
      if(j.request)data.checkin_requests=[j.request,...(data.checkin_requests||[]).filter(x=>x.id!==j.request.id)];
      closeModal();toast(j.message||'New player submitted for approval');v1712Render();
    }
  }catch(e){toast(e.message)}
};
submitCashierMember170=async function(){
  const m=v170CashierState.member,id=String(v170CashierState.memberInput||'').trim(),tableId=v170CashierState.tableId;
  if(!m||String(m.member_code||'').toUpperCase()!==id.toUpperCase())return toast('Verify this Member ID first.');
  if(m.membership_status!=='ACTIVE')return toast('Membership is not active.');
  try{
    const j=await turn('enqueue_member',{card_token:m.card_token,table_id:tableId});
    if(j.queue){
      if(!((data.players||[]).some(p=>p.id===j.queue.player_id)))data.players=[...(data.players||[]),{id:j.queue.player_id,member_id:m.id,full_name:m.full_name,phone:m.phone,photo_data:m.photo_data||null}];
      data.queue=[...(data.queue||[]).filter(q=>q.id!==j.queue.id),j.queue];v1712AdjustSummary(tableId,1);
    }
    closeModal();toast(`${m.full_name} added to ${v162TableName(tableId)}`);showTicket(j.ticket);v1712Render();
  }catch(e){toast(e.message)}
};
