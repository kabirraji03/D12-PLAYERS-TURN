// D12 PLAYERS TURN v1.7.8 — instant Rackmaster Start/Finish response without extra reads
// Uses optimistic local state only. Server queue/business logic remains authoritative.
// Existing v1.6.5 revision-gated polling reconciles naturally; no forced refresh is added.

const v178StartInFlight=new Set(),v178FinishInFlight=new Set();

function v178Clone(v){
  if(typeof structuredClone==='function')return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
}
function v178Snapshot(){
  return {
    queue:v178Clone(data?.queue||[]),
    matches:v178Clone(data?.matches||[]),
    table_states:v178Clone(data?.table_states||[])
  };
}
function v178Restore(snap){
  if(!data||!snap)return;
  data.queue=snap.queue;data.matches=snap.matches;data.table_states=snap.table_states;
  renderApp(true);
}
function v178TableState(tableId){
  return (data?.table_states||[]).find(x=>x.table_id===tableId)||null;
}
function v178Eligible(tableId,excludePlayerId=null){
  return (data?.queue||[])
    .filter(q=>q.table_id===tableId&&['queued','called'].includes(q.status)&&['cleared','not_required'].includes(q.payment_status)&&q.player_id!==excludePlayerId)
    .sort((a,b)=>{
      const aa=a.source==='appeal'?0:1,bb=b.source==='appeal'?0:1;
      return aa-bb||Number(a.priority||0)-Number(b.priority||0)||new Date(a.joined_at||0)-new Date(b.joined_at||0);
    });
}
function v178PredictStart(tableId){
  const st=v178TableState(tableId);if(!st)throw new Error('Table state unavailable.');
  const tempId='optimistic-match-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
  let holder=null,challenger=null,mode='normal',holderQueue=null,challengerQueue=null;

  if(st.holder_mode==='ready'&&st.break_owner_player_id){
    if(st.holder_player_id&&st.holder_player_id!==st.break_owner_player_id){
      holder=st.holder_player_id;challenger=st.break_owner_player_id;mode='holder_return';
      st.break_owner_player_id=null;st.holder_mode='active';st.break_initial_match_done=false;st.break_started_at=null;st.holder_ready_at=null;
    }else{
      st.holder_player_id=st.break_owner_player_id;st.break_owner_player_id=null;st.holder_mode='active';st.break_initial_match_done=false;st.break_started_at=null;st.holder_ready_at=null;
    }
  }

  if(!holder&&st.holder_mode==='break'&&st.break_owner_player_id&&!st.break_initial_match_done){
    const q=v178Eligible(tableId);if(q.length<2)throw new Error('At least two cleared players are required while the table holder is on break.');
    holderQueue=q[0];challengerQueue=q[1];holder=q[0].player_id;challenger=q[1].player_id;mode='holder_break';st.break_initial_match_done=true;
  }

  if(!holder){
    if(st.holder_player_id){
      holder=st.holder_player_id;
      const q=v178Eligible(tableId,holder);if(!q.length)throw new Error('No cleared challenger is waiting.');
      challengerQueue=q[0];challenger=q[0].player_id;mode=st.holder_mode==='break'?'holder_break':'normal';
    }else{
      const q=v178Eligible(tableId);if(q.length<2)throw new Error('At least two cleared players are required.');
      holderQueue=q[0];challengerQueue=q[1];holder=q[0].player_id;challenger=q[1].player_id;mode='normal';
    }
  }

  [holderQueue,challengerQueue].filter(Boolean).forEach(q=>{q.status='active';q.started_at=new Date().toISOString();q.updated_at=q.started_at});
  const m={id:tempId,table_id:tableId,holder_player_id:holder,challenger_player_id:challenger,holder_queue_id:holderQueue?.id||null,challenger_queue_id:challengerQueue?.id||null,status:'in_progress',match_mode:mode,started_at:new Date().toISOString(),__optimistic:true};
  data.matches=[...(data.matches||[]),m];
  st.holder_player_id=holder;st.current_match_id=tempId;st.activity_status='match_in_progress';st.last_activity_at=new Date().toISOString();
  return m;
}
function v178ConfirmStart(tempId,result){
  const m=(data?.matches||[]).find(x=>x.id===tempId);if(!m)return;
  const actualId=result?.match_id||tempId,st=v178TableState(m.table_id);
  m.id=actualId;m.__optimistic=false;
  if(result?.holder_player_id)m.holder_player_id=result.holder_player_id;
  if(result?.challenger_player_id)m.challenger_player_id=result.challenger_player_id;
  if(result?.match_mode)m.match_mode=result.match_mode;
  if(st&&st.current_match_id===tempId)st.current_match_id=actualId;
}
function v178EndPriority(tableId){
  const vals=(data?.queue||[]).filter(q=>q.table_id===tableId&&['queued','called'].includes(q.status)&&q.source!=='appeal').map(q=>Number(q.priority||0));
  return Math.max(99,...vals)+1;
}
function v178OptimisticFinish(matchId,winnerId,act,targetTableId){
  const m=(data?.matches||[]).find(x=>x.id===matchId);if(!m)throw new Error('Active match not found.');
  const loser=m.holder_player_id===winnerId?m.challenger_player_id:m.holder_player_id,now=new Date().toISOString(),st=v178TableState(m.table_id);
  m.status='completed';m.winner_player_id=winnerId;m.loser_player_id=loser;m.ended_at=now;

  (data.queue||[]).forEach(q=>{
    if(q.table_id===m.table_id&&q.status==='active'&&(q.player_id===m.holder_player_id||q.player_id===m.challenger_player_id)){
      q.status='completed';q.finished_at=now;q.updated_at=now;
    }
  });

  let optimisticQueue=null;
  if(act==='remain'||act==='change'){
    const tableId=act==='change'?targetTableId:m.table_id;
    optimisticQueue={id:'optimistic-queue-'+Date.now(),player_id:loser,table_id:tableId,source:'admin',status:'queued',payment_status:'cleared',priority:v178EndPriority(tableId),joined_at:now,updated_at:now,__optimistic:true};
    data.queue=[...(data.queue||[]),optimisticQueue];
  }else if(act==='appeal'){
    optimisticQueue={id:'optimistic-appeal-'+Date.now(),player_id:loser,table_id:m.table_id,source:'appeal',status:'awaiting_payment',payment_status:'pending',priority:0,joined_at:now,updated_at:now,__optimistic:true};
    data.queue=[...(data.queue||[]),optimisticQueue];
  }

  if(st){
    st.holder_player_id=winnerId;st.current_match_id=null;st.last_activity_at=now;
    if(m.match_mode==='holder_break'&&st.break_owner_player_id){
      st.break_initial_match_done=true;
      st.activity_status=st.holder_mode==='ready'?'holder_ready':'holder_break';
    }else{
      st.activity_status='waiting';
    }
  }
  return {m,loser,optimisticQueue};
}
function v178ConfirmFinish(local,result){
  if(local?.optimisticQueue&&result?.queue_entry_id){
    local.optimisticQueue.id=result.queue_entry_id;local.optimisticQueue.__optimistic=false;
    if(result?.queue_priority!=null)local.optimisticQueue.priority=result.queue_priority;
  }
}

startNext=async function(tableId){
  if(v178StartInFlight.has(tableId))return;
  const snap=v178Snapshot();let optimistic=null;
  try{
    v178StartInFlight.add(tableId);
    optimistic=v178PredictStart(tableId);
    renderApp(true);
    hapticCall(false);
    const j=await turn('start_next',{table_id:tableId});
    v178ConfirmStart(optimistic.id,j.result||{});
    toast('Match started');
    renderApp(true);
    // Deliberately no refresh(): existing v1.6.5 revision probe reconciles the server state.
  }catch(e){
    v178Restore(snap);toast(e.message);
  }finally{
    v178StartInFlight.delete(tableId);
  }
};

openFinishMatch=function(matchId){
  const m=(data.matches||[]).find(x=>x.id===matchId);if(!m)return;
  if(m.__optimistic)return toast('Match start is still being confirmed. Please wait a moment.');
  const a=player(m.holder_player_id),b=player(m.challenger_player_id),others=(data.all_table_summaries||[]).filter(t=>t.id!==m.table_id&&t.operational_status==='open');
  openModal(`<div class="modal-head"><div><div class="eyebrow">RECORD RESULT</div><h2>Winner & Loser Decision</h2></div><button class="icon-btn" onclick="closeModal()">×</button></div>
  <form id="finishForm" class="stack"><div class="field"><label>WINNER</label><div class="winner-grid"><label>${avatar(a,'md')}<input type="radio" name="winner" value="${a.id}" required><b>${esc(a.full_name)}</b></label><label>${avatar(b,'md')}<input type="radio" name="winner" value="${b.id}" required><b>${esc(b.full_name)}</b></label></div></div>
  <div class="field"><label>LOSER CHOICE</label><div class="action-grid"><label><input type="radio" name="action" value="appeal" required onchange="finishChoice()">↻ <b>Appeal</b><small>Immediate rematch after cashier clears payment.</small></label><label><input type="radio" name="action" value="remain" required onchange="finishChoice()">⌛ <b>Remain</b><small>Join the end of this table queue.</small></label><label><input type="radio" name="action" value="change" required onchange="finishChoice()">⇄ <b>Change Table</b><small>Choose another table.</small></label><label><input type="radio" name="action" value="leave" required onchange="finishChoice()">↗ <b>Leave</b><small>End this playing session.</small></label></div></div>
  <div id="changeTarget" class="field hidden"><label>NEW TABLE</label><select name="target_table_id">${others.map(t=>`<option value="${t.id}">${esc(t.table_name)} · ${t.queue_count} in line · ~${t.estimated_wait_minutes} min</option>`).join('')}</select></div>
  <button class="btn primary block">Save Result</button></form>`);

  $('#finishForm').addEventListener('submit',async e=>{
    e.preventDefault();if(v178FinishInFlight.has(matchId))return;
    const f=new FormData(e.currentTarget),act=String(f.get('action')||''),winner=String(f.get('winner')||''),target=act==='change'?String(f.get('target_table_id')||''):null;
    const snap=v178Snapshot();let local=null;
    try{
      v178FinishInFlight.add(matchId);
      local=v178OptimisticFinish(matchId,winner,act,target);
      closeModal();
      renderApp(true);
      toast(act==='appeal'?'Appeal created — awaiting cashier confirmation':'Result saved');
      const j=await turn('finish_match',{match_id:matchId,winner_player_id:winner,loser_action:act,target_table_id:target});
      v178ConfirmFinish(local,j.result||{});
      renderApp(true);
      // Deliberately no refresh(): normal revision-gated synchronization will reconcile shortly.
    }catch(x){
      v178Restore(snap);toast(x.message);
    }finally{
      v178FinishInFlight.delete(matchId);
    }
  });
};
