// D12 PLAYERS TURN v1.4 registry controls, QR/WhatsApp tools and isolated player portal
const V14_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-turn-v14';
const v14=(a,p={},auth=true)=>api(V14_API,a,p,auth);

// Keep player-ticket persistence tab-local. Older versions used localStorage, which could make
// a Player Portal link take over the staff portal on the next refresh because both share one domain.
try{localStorage.removeItem('d12turn_player_ticket')}catch{}
if(!window.__d12TurnTicketStorageGuard){
  const originalStorageSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(key==='d12turn_player_ticket'&&this===window.localStorage){
      try{originalStorageSetItem.call(window.sessionStorage,key,value)}catch{}
      try{
        const u=new URL(location.href);
        if(value&&!u.searchParams.get('ticket')){u.searchParams.set('ticket',value);history.replaceState(null,'',u.pathname+u.search+u.hash)}
      }catch{}
      return;
    }
    return originalStorageSetItem.call(this,key,value);
  };
  window.__d12TurnTicketStorageGuard=true;
}

function mergeV14(base,ext){
  if(Array.isArray(ext?.registry)){
    const registry=ext.registry;
    const byId=Object.fromEntries(registry.map(p=>[p.id,p]));
    if(Array.isArray(base.players))base.players=base.players.map(p=>byId[p.id]?{...p,...byId[p.id]}:p);
    return {...base,registry};
  }
  return base;
}

enterApp=async function(){
  const [base,ext12,ext13,ext14]=await Promise.all([
    turn('bootstrap'),v12('bootstrap').catch(()=>({})),v13('bootstrap').catch(()=>({})),v14('bootstrap').catch(()=>({}))
  ]);
  data=mergeV14(mergeV13(mergeV12(base,ext12),ext13),ext14);role=data.role;localStorage.setItem('d12turn_role',role);view='overview';
  v13LastSignature=v13Signature(data);v13AnimateOverview=true;renderApp();clearInterval(poller);poller=setInterval(()=>refresh(true),2200);
};
refresh=async function(silent=true){
  if(!token)return;
  try{
    const [base,ext12,ext13,ext14]=await Promise.all([
      turn('bootstrap'),v12('bootstrap').catch(()=>({})),v13('bootstrap').catch(()=>({})),v14('bootstrap').catch(()=>({}))
    ]);
    const next=mergeV14(mergeV13(mergeV12(base,ext12),ext13),ext14),sig=v13Signature(next),changed=sig!==v13LastSignature;
    data=next;role=next.role;
    if(changed){v13LastSignature=sig;v13AnimateOverview=view==='overview';renderApp(true)}
    if(!silent)toast(changed?'Live board updated':'Live board is already current');
  }catch(e){if(!silent)toast(e.message)}
};

function v14PhoneDigits(v){
  let d=String(v||'').replace(/\D/g,'');
  if(d.startsWith('0')&&d.length===11)d='234'+d.slice(1);
  return d;
}
function v14PlayerMessage(p,activeUrl=''){
  const qr=`D12PLAYER:${p.qr_token||''}`;
  return `D12 Cue Club Player Details\nName: ${p.full_name||''}\nPlayer ID: ${p.player_code||''}\nPlayer QR Code: ${qr}${activeUrl?`\nLive Players Turn: ${activeUrl}`:''}`;
}
function sendPlayerWhatsApp(id){
  const p=(data.registry||[]).find(x=>x.id===id);if(!p)return toast('Player not found');
  const d=v14PhoneDigits(p.phone);if(!d)return toast('Add the player WhatsApp / phone number first.');
  const q=(data.queue||[]).find(x=>x.player_id===id&&['awaiting_payment','queued','called','active'].includes(x.status));
  const live=q?.public_token?`${CANONICAL}?ticket=${encodeURIComponent(q.public_token)}`:'';
  const url=`https://wa.me/${encodeURIComponent(d)}?text=${encodeURIComponent(v14PlayerMessage(p,live))}`;
  window.open(url,'_blank','noopener,noreferrer');
}
function copyPlayerQr(id){const p=(data.registry||[]).find(x=>x.id===id);if(!p)return toast('Player not found');copyText(`D12PLAYER:${p.qr_token}`)}
function copyPlayerTurnLink(id){
  const q=(data.queue||[]).find(x=>x.player_id===id&&['awaiting_payment','queued','called','active'].includes(x.status));
  if(!q?.public_token)return toast('This player has no active turn ticket yet.');copyText(`${CANONICAL}?ticket=${encodeURIComponent(q.public_token)}`)
}
function openPlayerPortalIsolated(id){
  const q=(data.queue||[]).find(x=>x.player_id===id&&['awaiting_payment','queued','called','active'].includes(x.status));
  if(!q?.public_token)return toast('This player has no active turn ticket yet.');
  window.open(`${CANONICAL}?ticket=${encodeURIComponent(q.public_token)}`,'_blank','noopener,noreferrer');
}

showSelectedPlayer=function(){
  const id=$('#registeredPlayer')?.value,p=(data.registry||[]).find(x=>x.id===id),box=$('#selectedPlayerPreview');if(!box)return;
  if(!p){box.innerHTML='<span>Select a player from the registry.</span>';return}
  const q=(data.queue||[]).find(x=>x.player_id===p.id&&['awaiting_payment','queued','called','active'].includes(x.status)),table=q?maps().t[q.table_id]:null;
  const qr=`D12PLAYER:${p.qr_token||''}`,turnUrl=q?.public_token?`${CANONICAL}?ticket=${encodeURIComponent(q.public_token)}`:'';
  box.innerHTML=`<div class="fast-player-details">${avatar(p,'lg')}<div class="grow"><div class="row wrap"><b>${esc(p.full_name)}</b><span class="pill">${esc(p.player_code||'ID pending')}</span>${q?`<span class="pill good">${esc((q.status||'queued').toUpperCase())}</span>`:''}</div><small>${esc(p.phone||'No WhatsApp / phone number')}</small>${q?`<div class="fast-player-status">🎱 ${esc(table?.table_name||'Table')} · ${esc((q.source||'turn').toUpperCase())}</div>`:'<div class="fast-player-status muted">Not currently in a playing queue.</div>'}</div><div id="fastPlayerQr" class="fast-player-qr"></div></div><div class="fast-code"><span>PLAYER QR / TICKET CODE</span><code>${esc(qr)}</code></div>${turnUrl?`<div class="fast-code"><span>CURRENT TURN LINK</span><code>${esc(turnUrl)}</code></div>`:''}<div class="row wrap fast-player-actions"><button type="button" class="btn small" onclick="copyPlayerQr('${p.id}')">⧉ Copy QR Code</button><button type="button" class="btn small" onclick="sendPlayerWhatsApp('${p.id}')" ${p.phone?'':'disabled'}>◉ Send via WhatsApp</button>${turnUrl?`<button type="button" class="btn small" onclick="copyPlayerTurnLink('${p.id}')">Copy Turn Link</button><button type="button" class="btn small" onclick="openPlayerPortalIsolated('${p.id}')">Open Player Portal</button>`:''}</div>`;
  setTimeout(()=>{const el=$('#fastPlayerQr');if(el&&window.QRCode)new QRCode(el,{text:qr,width:112,height:112,correctLevel:QRCode.CorrectLevel.M})},40);
};

async function deleteSelectedFastPlayer(){
  const id=$('#registeredPlayer')?.value,p=(data.registry||[]).find(x=>x.id===id);if(!p)return toast('Select a player to delete.');
  const linked=p.member_id?'\n\nTheir D12 Membership record will NOT be deleted. Only the Players Turn registry profile will be removed.':'';
  if(!confirm(`Delete ${p.full_name} (${p.player_code}) from the Players Turn registry?${linked}`))return;
  try{
    const j=await v14('delete_player',{player_id:id});
    toast(`${j.deleted.full_name} removed from Player Registry`);await refresh(false);
  }catch(e){toast(e.message)}
}

const v13CashierViewV14=cashierView;
cashierView=function(){
  let html=v13CashierViewV14();
  html=html.replace('<div class="eyebrow">REGISTERED PLAYER</div><h2>Fast Check-in</h2>','<div class="eyebrow">REGISTERED PLAYER</div><div class="row split fast-checkin-head"><h2>Fast Check-in</h2><button type="button" class="btn small danger" onclick="deleteSelectedFastPlayer()">🗑 Delete Player</button></div>');
  return html;
};

showTicket=function(ticket){
  const url=`${CANONICAL}?ticket=${encodeURIComponent(ticket)}`;
  openModal(`<div class="modal-head"><div><div class="eyebrow">PLAYER ALERT TICKET</div><h2>Queue Confirmed</h2></div><button class="icon-btn" onclick="closeModal()">×</button></div><div id="qr" class="qrbox"></div><div class="mono">${esc(url)}</div><div class="row wrap"><button class="btn primary" onclick="copyText('${url.replaceAll("'","\\'")}')">Copy Link</button><button class="btn" onclick="window.open('${url}','_blank','noopener,noreferrer')">Open Player View</button></div><p class="muted portal-isolation-note">Player View opens in an isolated tab and no longer changes the staff portal on refresh.</p>`);
  setTimeout(()=>{const q=$('#qr');if(q&&window.QRCode)new QRCode(q,{text:url,width:190,height:190})},100);
};
