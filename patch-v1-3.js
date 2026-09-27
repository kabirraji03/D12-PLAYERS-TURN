// D12 PLAYERS TURN v1.3 match-centering, table-move approval, stable UI and membership QR bridge
const V13_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-turn-v13';
const v13=(a,p={},auth=true)=>api(V13_API,a,p,auth);
let v13LastSignature='',v13AnimateOverview=false,v13NavBusyUntil=0,v13VerifiedMember=null;

function mergeV13(base,ext){return {...base,table_move_requests:ext?.table_move_requests||[]}}
function v13Signature(d){
  return JSON.stringify({
    q:(d.queue||[]).map(x=>[x.id,x.table_id,x.status,x.payment_status,x.priority,x.updated_at]),
    m:(d.matches||[]).map(x=>[x.id,x.table_id,x.holder_player_id,x.challenger_player_id,x.status,x.started_at]),
    s:(d.table_states||[]).map(x=>[x.table_id,x.operational_status,x.activity_status,x.holder_player_id,x.current_match_id,x.holder_mode,x.break_owner_player_id,x.holder_ready_at]),
    p:(d.payments||[]).filter(x=>x.kind==='appeal').map(x=>[x.id,x.status,x.table_id,x.player_id]),
    r:(d.registry||[]).map(x=>[x.id,x.full_name,x.phone,x.player_code,x.updated_at,!!x.photo_data]),
    shift:d.active_shift?.id||null,
    tm:(d.table_move_requests||[]).map(x=>[x.id,x.queue_entry_id,x.from_table_id,x.to_table_id,x.status,x.resolved_at])
  });
}

enterApp=async function(){
  const [base,ext12,ext13]=await Promise.all([turn('bootstrap'),v12('bootstrap').catch(()=>({})),v13('bootstrap').catch(()=>({}))]);
  data=mergeV13(mergeV12(base,ext12),ext13);role=data.role;localStorage.setItem('d12turn_role',role);view='overview';
  v13LastSignature=v13Signature(data);v13AnimateOverview=true;renderApp();clearInterval(poller);poller=setInterval(()=>refresh(true),2200);
};
refresh=async function(silent=true){
  if(!token)return;
  try{
    const [base,ext12,ext13]=await Promise.all([turn('bootstrap'),v12('bootstrap').catch(()=>({})),v13('bootstrap').catch(()=>({}))]);
    const next=mergeV13(mergeV12(base,ext12),ext13),sig=v13Signature(next),changed=sig!==v13LastSignature;
    data=next;role=next.role;
    if(changed){v13LastSignature=sig;v13AnimateOverview=view==='overview';renderApp(true)}
    if(!silent)toast(changed?'Live board updated':'Live board is already current');
  }catch(e){if(!silent)toast(e.message)}
};

const v12RenderAppV13=renderApp;
renderApp=function(preserveFocus=false){
  const oldNav=$('.nav'),saved=oldNav?.scrollLeft??Number(sessionStorage.getItem('d12turn_nav_scroll')||0);
  if(preserveFocus&&Date.now()<v13NavBusyUntil)return;
  v12RenderAppV13(preserveFocus);
  requestAnimationFrame(()=>{
    const n=$('.nav');if(!n)return;
    n.scrollLeft=saved;
    const busy=()=>{v13NavBusyUntil=Date.now()+1200};
    n.addEventListener('pointerdown',busy,{passive:true});n.addEventListener('touchstart',busy,{passive:true});
    n.addEventListener('scroll',()=>{v13NavBusyUntil=Date.now()+500;sessionStorage.setItem('d12turn_nav_scroll',String(n.scrollLeft))},{passive:true});
  });
};

initCharts=function(){
  if(typeof Chart==='undefined'||view!=='overview')return;
  const sums=data.all_table_summaries||[],duration=v13AnimateOverview?480:0;
  const common={responsive:true,plugins:{legend:{labels:{boxWidth:12}}},animation:{duration}};
  const q=$('#queueChart'),s=$('#sourceChart'),w=$('#waitChart');
  if(q)charts.push(new Chart(q,{type:'bar',data:{labels:sums.map(x=>x.table_name),datasets:[{label:'Players',data:sums.map(x=>x.queue_count)}]},options:{...common,maintainAspectRatio:false,plugins:{legend:{display:false}},animation:{duration}}}));
  const memberN=(data.queue||[]).filter(x=>x.source==='membership').length,dailyN=(data.queue||[]).filter(x=>x.source==='daily').length,appealN=(data.queue||[]).filter(x=>x.source==='appeal').length;
  if(s)charts.push(new Chart(s,{type:'doughnut',data:{labels:['Members','Daily','Appeals'],datasets:[{data:[memberN,dailyN,appealN]}]},options:{...common,maintainAspectRatio:true,aspectRatio:1,cutout:'62%',layout:{padding:8},animation:{duration}}}));
  if(w)charts.push(new Chart(w,{type:'bar',data:{labels:sums.map(x=>x.table_name),datasets:[{label:'Minutes',data:sums.map(x=>x.estimated_wait_minutes)}]},options:{...common,indexAxis:'y',maintainAspectRatio:false,plugins:{legend:{display:false}},animation:{duration}}}));
  v13AnimateOverview=false;
};

const v12OverviewViewV13=overviewView;
overviewView=function(){
  const pending=(data.table_move_requests||[]).filter(x=>x.status==='pending').length;
  return `${role==='admin'&&pending?`<div class="notice v13-move-notice"><b>${pending} TABLE MOVE APPROVAL${pending===1?'':'S'} PENDING</b> · Open Active Players to approve or decline.</div>`:''}${v12OverviewViewV13()}`;
};

const v12ActivePlayersViewV13=activePlayersView;
activePlayersView=function(){
  const base=v12ActivePlayersViewV13();
  if(role!=='admin')return base;
  const req=(data.table_move_requests||[]).filter(x=>x.status==='pending');
  const panel=`<section class="card glass v13-approvals"><div class="row split"><div><div class="eyebrow">ADMIN APPROVAL</div><h2>Table Move Requests</h2></div><span class="pill ${req.length?'pending':'good'}">${req.length} PENDING</span></div>${req.length?req.map(r=>`<article class="table-move-request">${avatar(r.player||{full_name:'Player'},'md')}<div class="grow"><b>${esc(r.player?.full_name||'Player')}</b><small>${esc(r.player?.player_code||'')} · ${esc(r.from_table_name)} → ${esc(r.to_table_name)}</small>${r.reason?`<p>${esc(r.reason)}</p>`:''}</div><button class="btn good" onclick="resolveTableMove('${r.id}',true)">Approve</button><button class="btn danger" onclick="resolveTableMove('${r.id}',false)">Decline</button></article>`).join(''):'<div class="empty">No table move requests awaiting approval.</div>'}</section>`;
  return panel+base;
};

queueRow=function(q,i,tableId){
  const p=player(q.player_id),pendingVertical=(data.move_requests||[]).some(r=>r.status==='pending'&&(r.requester_queue_id===q.id||r.target_queue_id===q.id)),pendingTable=(data.table_move_requests||[]).some(r=>r.status==='pending'&&r.queue_entry_id===q.id);
  return `<div class="queue-row ${pendingVertical||pendingTable?'pending-move':''}"><div class="queue-num">${i+1}</div>${avatar(p,'sm')}<div class="grow"><b>${esc(p.full_name)}</b><small>${payBadge(q)} ${pendingVertical?'<span class="pill pending">ORDER MOVE PENDING</span>':''}${pendingTable?'<span class="pill pending">TABLE MOVE PENDING</span>':''}</small></div><div class="queue-actions"><button class="icon-action" title="Upload photo" onclick="pickPlayerPhoto('${p.id}')">📷</button><button class="icon-action" title="Move up" onclick="requestMove('${q.id}','up')">↑</button><button class="icon-action" title="Move down" onclick="requestMove('${q.id}','down')">↓</button><button class="btn small move-table-btn" ${pendingTable?'disabled':''} onclick="openTableMoveRequest('${q.id}','${tableId}')">⇄ Table</button><button class="btn small call-btn" onclick="callPlayer('${q.id}')">🔔 Call</button></div></div>`;
};
function openTableMoveRequest(queueId,currentTable){
  const q=(data.queue||[]).find(x=>x.id===queueId),p=q?player(q.player_id):null,targets=(data.all_table_summaries||[]).filter(t=>t.id!==currentTable&&t.operational_status==='open');
  if(!q||!p)return toast('Waiting player not found');if(!targets.length)return toast('No other open table is available');
  openModal(`<div class="modal-head"><div><div class="eyebrow">ADMIN-APPROVED TABLE MOVE</div><h2>Request Table Change</h2></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="selected-player-preview">${avatar(p,'md')}<div><b>${esc(p.full_name)}</b><small>${esc(p.player_code||'')} · ${esc(maps().t[currentTable]?.table_name||'Current table')}</small></div></div><form id="tableMoveForm" class="stack"><div class="field"><label>TARGET TABLE</label><select name="target_table_id">${targets.map(t=>`<option value="${t.id}">${esc(t.table_name)} · ${t.queue_count} in line · ~${t.estimated_wait_minutes} min</option>`).join('')}</select></div><div class="field"><label>NOTE / REASON</label><input name="reason" placeholder="Optional"></div><div class="notice">The player will remain on the current table until Admin approves this request.</div><button class="btn primary block">Send to Admin for Approval</button></form>`);
  $('#tableMoveForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await v13('request_table_move',{queue_id:queueId,target_table_id:f.get('target_table_id'),reason:f.get('reason')});closeModal();toast('Table move request sent to Admin');await refresh(false)}catch(x){toast(x.message)}});
}
async function resolveTableMove(id,approve){try{const j=await v13('resolve_table_move',{request_id:id,approve});toast(j.message||(approve?'Table move approved':'Table move declined'));await refresh(false)}catch(x){toast(x.message)}}

function membershipTokenFromRaw(raw){
  let v=String(raw||'').trim();if(!v)return '';
  v=v.replace(/^D12M:/i,'');
  try{const u=new URL(v);const token=u.searchParams.get('card')||u.searchParams.get('card_token')||u.searchParams.get('token');if(token)return token.trim()}catch{}
  const m=v.match(/[?&](?:card|card_token|token)=([^&]+)/i);if(m)return decodeURIComponent(m[1]);
  return v;
}
scannerValue=function(raw){return membershipTokenFromRaw(raw)};
function membershipPreviewHtml(m){
  const active=['ACTIVE','EXPIRING SOON'].includes(m.membership_status),photo=m.photo_data?`<img class="member-verify-photo" src="${m.photo_data}" alt="">`:`<div class="member-verify-photo placeholder">${esc((m.full_name||'?').slice(0,1))}</div>`;
  return `<div class="member-verify-card ${active?'verified':'not-active'}">${photo}<div class="grow"><div class="eyebrow">MEMBER ID · ${esc(m.member_code||'')}</div><h3>${esc(m.full_name||'Member')}</h3><div class="member-verify-meta"><span>${esc(m.current_plan_name||'No active plan')}</span><span>${esc(m.membership_status||'INACTIVE')}</span><span>Expires ${esc(m.expiry_date||'—')}</span>${m.days_remaining!=null?`<span>${m.days_remaining} days remaining</span>`:''}</div></div><span class="verify-light ${active?'on':'off'}"></span></div>`;
}
async function verifyMembershipToken(raw){
  const token=membershipTokenFromRaw(raw),host=$('#membershipPreview');if(!token){v13VerifiedMember=null;if(host)host.innerHTML='<div class="empty">Scan or enter a membership card.</div>';return null}
  try{
    const j=await member('card_status',{card_token:token},false),m=j.member;v13VerifiedMember={token,member:m};
    if($('#cardToken'))$('#cardToken').value=token;
    if(host)host.innerHTML=membershipPreviewHtml(m);
    const active=['ACTIVE','EXPIRING SOON'].includes(m.membership_status);
    toast(active?`${m.full_name} verified · ${m.member_code}`:`${m.full_name} membership is ${m.membership_status}`);
    return v13VerifiedMember;
  }catch(e){v13VerifiedMember=null;if(host)host.innerHTML=`<div class="notice danger-note">${esc(e.message)}</div>`;toast(e.message);return null}
}
function wireMembershipV13(){
  const old=$('#memberQueueForm');if(!old)return;
  if(!old.querySelector('#membershipPreview')){
    const preview=document.createElement('div');preview.id='membershipPreview';preview.className='membership-preview';preview.innerHTML='<div class="empty">Scan the D12 Membership QR or enter the card token to verify the member.</div>';
    const tableField=[...old.querySelectorAll('.field')].find(x=>x.querySelector('select[name="table_id"]'));
    if(tableField)old.insertBefore(preview,tableField);else old.appendChild(preview);
    const verify=document.createElement('button');verify.type='button';verify.id='verifyMembershipBtn';verify.className='btn primary';verify.textContent='✓ Verify Membership';
    preview.before(verify);
  }
  const fresh=old.cloneNode(true);old.replaceWith(fresh);
  const tokenInput=fresh.querySelector('#cardToken');
  tokenInput?.addEventListener('input',()=>{const now=membershipTokenFromRaw(tokenInput.value);if(v13VerifiedMember?.token!==now){v13VerifiedMember=null;const h=fresh.querySelector('#membershipPreview');if(h)h.innerHTML='<div class="empty">Tap Verify Membership after entering the card.</div>'}});
  fresh.querySelector('#verifyMembershipBtn')?.addEventListener('click',()=>verifyMembershipToken(tokenInput?.value||''));
  fresh.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(fresh),token=membershipTokenFromRaw(f.get('card_token'));try{let verified=v13VerifiedMember;if(!verified||verified.token!==token)verified=await verifyMembershipToken(token);if(!verified)throw new Error('Verify the membership card first.');if(!['ACTIVE','EXPIRING SOON'].includes(verified.member.membership_status))throw new Error('Membership is not active. Use daily payment or renew the subscription.');const j=await turn('enqueue_member',{card_token:token,table_id:f.get('table_id')});toast(`${verified.member.full_name} · ${verified.member.member_code} checked in`);v13VerifiedMember=null;showTicket(j.ticket);await refresh(true)}catch(x){toast(x.message)}});
}

const v12BindFormsV13=bindForms;
bindForms=function(){v12BindFormsV13();wireMembershipV13()};
const v12HandleScannedV13=handleScannedValue;
handleScannedValue=async function(raw,target){
  if(target!=='membership')return v12HandleScannedV13(raw,target);
  try{await stopScanner()}catch{};closeModal();
  const token=membershipTokenFromRaw(raw),el=$('#cardToken');if(el){el.value=token;el.focus()}
  await verifyMembershipToken(token);
};
pasteScannerValue=async function(target='membership'){
  try{const txt=await navigator.clipboard.readText();if(!txt)throw new Error('Clipboard is empty');await handleScannedValue(txt,target)}catch(e){const v=prompt('Paste the scanned QR / barcode value:','');if(v)await handleScannedValue(v,target)}
};
