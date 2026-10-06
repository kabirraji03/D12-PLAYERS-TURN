// D12 PLAYERS TURN v1.7.1 — mobile/tablet Cashier Player ID Request
function v171CashierTabs(){
  return '<nav class="v171-cashier-tabs glass"><button class="active" type="button">₦ Cashier</button><button type="button" onclick="openPlayerIdRequest171()">▦ Player ID Request</button></nav>';
}
const v171CashierLauncherBase=v170CashierLauncher;
v170CashierLauncher=function(){return v171CashierTabs()+v171CashierLauncherBase()};

function v171Registry(){
  const rows=[...(data?.registry||[]),...(data?.players||[])],m=new Map();
  rows.forEach(p=>{if(p?.id&&!m.has(p.id))m.set(p.id,p)});
  return [...m.values()].sort((a,b)=>String(a.full_name||'').localeCompare(String(b.full_name||'')));
}
function v171LiveQueueForPlayer(playerId){
  const rows=[...(data?.queue||[]),...(data?.queue_v12||[])],m=new Map();
  rows.forEach(q=>{if(q?.id&&!m.has(q.id))m.set(q.id,q)});
  return [...m.values()].filter(q=>q.player_id===playerId&&['awaiting_payment','queued','called','active'].includes(q.status)).sort((a,b)=>new Date(b.joined_at||0)-new Date(a.joined_at||0))[0]||null;
}
function v171NormalizeWhatsApp(phone){
  let n=String(phone||'').replace(/\D/g,'');
  if(n.startsWith('0')&&n.length===11)n='234'+n.slice(1);
  if(n.startsWith('2340'))n='234'+n.slice(4);
  return n;
}
function v171PlayerIdSearchRows(q=''){
  const term=String(q||'').trim().toLowerCase(),rows=v171Registry().filter(p=>!term||(`${p.full_name||''} ${p.player_code||''} ${p.phone||''}`).toLowerCase().includes(term)).slice(0,80);
  return rows.length?rows.map(p=>`<button class="v171-player-row" onclick="showPlayerId171('${p.id}')">${avatar(p,'sm')}<span><b>${esc(p.full_name||'Player')}</b><small>${esc(p.player_code||'ID pending')} · ${esc(p.phone||'No WhatsApp number')}</small></span><i>›</i></button>`).join(''):'<div class="empty">No registered player matches that search.</div>';
}
function openPlayerIdRequest171(){
  openModal(`<div class="modal-head"><div><div class="eyebrow">CASHIER · PLAYER ID REQUEST</div><h2>Registered Players</h2><p class="muted">Select a player to display their D12 Player ID, QR code and current turn link.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="field"><label>SEARCH PLAYER</label><input id="v171PlayerSearch" placeholder="Name, Player ID or WhatsApp number" oninput="filterPlayerId171(this.value)" autofocus></div><div id="v171PlayerList" class="v171-player-list">${v171PlayerIdSearchRows('')}</div>`);
}
function filterPlayerId171(q){const h=$('#v171PlayerList');if(h)h.innerHTML=v171PlayerIdSearchRows(q)}
function v171PlayerQrValue(p){return p.qr_token?'D12PLAYER:'+p.qr_token:(p.player_code?'D12PLAYERID:'+p.player_code:'')}
function v171TurnInfo(p){
  const q=v171LiveQueueForPlayer(p.id),url=q?.public_token?`${CANONICAL}?ticket=${encodeURIComponent(q.public_token)}`:'';
  const tableId=q?.table_id||'',table=(data?.all_table_summaries||data?.cue_tables_v12||data?.tables||[]).find(t=>t.id===tableId);
  return {q,url,tableName:table?.table_name||'No active table',status:q?.status||'NO ACTIVE TURN'};
}
function showPlayerId171(id){
  const p=v171Registry().find(x=>x.id===id);if(!p)return toast('Player record not found.');
  const turn=v171TurnInfo(p),qr=v171PlayerQrValue(p),phone=p.phone||'',wa=v171NormalizeWhatsApp(phone);
  openModal(`<div class="modal-head"><div><div class="eyebrow">D12 PLAYER ID REQUEST</div><h2>${esc(p.full_name||'Player')}</h2><p class="muted">Review the details before sending them to the registered WhatsApp number.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div>
  <section class="v171-id-card glass">
    <div class="v171-id-head">${avatar(p,'lg')}<div class="grow"><div class="row wrap"><h2>${esc(p.full_name||'Player')}</h2><span class="pill">${esc(p.player_code||'ID pending')}</span><span class="pill ${turn.q?.status==='called'?'pending':turn.q?'good':''}">${esc(String(turn.status).replaceAll('_',' ').toUpperCase())}</span></div><b class="v171-phone">${esc(phone||'No registered WhatsApp number')}</b><small>◉ ${esc(turn.tableName)}${turn.q?.source?' · '+esc(String(turn.q.source).toUpperCase()):''}</small></div><div id="v171PlayerQr" class="v171-qr"></div></div>
    <div class="v171-code-block"><small>PLAYER QR / ID CODE</small><code>${esc(qr||p.player_code||'Unavailable')}</code></div>
    <div class="v171-code-block"><small>CURRENT TURN LINK</small><code>${esc(turn.url||'No active playing turn is currently linked to this player.')}</code></div>
    <div class="v171-id-actions"><button class="btn" onclick="copyText('${String(qr||p.player_code||'').replaceAll("'","\\'")}')">⧉ Copy QR Code</button><button class="btn primary" ${wa?'':'disabled'} onclick="sendPlayerIdWhatsApp171('${p.id}')">◉ Send via WhatsApp</button>${turn.url?`<button class="btn" onclick="copyText('${turn.url.replaceAll("'","\\'")}')">Copy Turn Link</button><button class="btn" onclick="window.open('${turn.url.replaceAll("'","\\'")}','_blank')">Open Player Portal</button>`:''}</div>
    ${wa?'':'<div class="notice danger-note">This player has no registered WhatsApp number. Add a phone number in Player Registry before using Send via WhatsApp.</div>'}
  </section>
  <button class="btn block" onclick="openPlayerIdRequest171()">‹ Back To Player List</button>`);
  setTimeout(()=>{const host=$('#v171PlayerQr');if(host&&window.QRCode&&qr)new QRCode(host,{text:qr,width:118,height:118})},70);
}
function sendPlayerIdWhatsApp171(id){
  const p=v171Registry().find(x=>x.id===id);if(!p)return toast('Player record not found.');
  const wa=v171NormalizeWhatsApp(p.phone),turn=v171TurnInfo(p),qr=v171PlayerQrValue(p);if(!wa)return toast('No registered WhatsApp number for this player.');
  const lines=[`D12 CUE CLUB · PLAYER ID`,`Player: ${p.full_name||'Player'}`,`Player ID: ${p.player_code||'Unavailable'}`,`Player QR / Ticket Code: ${qr||'Unavailable'}`];
  if(turn.q)lines.push(`Turn Status: ${String(turn.status).replaceAll('_',' ').toUpperCase()}`,`Table: ${turn.tableName}`);
  if(turn.url)lines.push(`Current Turn Link: ${turn.url}`);
  else lines.push('Current Turn Link: No active playing turn is presently linked.');
  lines.push('D12 Cue Club · Players Turn');
  const url='https://wa.me/'+wa+'?text='+encodeURIComponent(lines.join('\n'));
  window.open(url,'_blank','noopener');
}
