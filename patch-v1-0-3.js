// D12 PLAYERS TURN v1.0.3 canonical player-ticket URL patch
const D12_TURN_CANONICAL_BASE='https://playersturn.d12cueclub.com/';

showTicket=function(ticket){
  const url=`${D12_TURN_CANONICAL_BASE}?ticket=${encodeURIComponent(ticket)}`;
  openModal(`<div class="modal-head"><div><div class="eyebrow">Player alert ticket</div><h2>Queue Confirmed</h2><p class="muted">Have the player scan this once. Their phone will show queue position and receive turn alerts while the page/PWA is open.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div id="qr" class="qrbox"></div><div class="mono">${esc(url)}</div><div class="row" style="margin-top:12px"><button class="btn primary" onclick="copyText('${url.replaceAll("'","\\'")}')">Copy Link</button><button class="btn" onclick="window.open('${url}','_blank')">Open Player View</button></div>`);
  setTimeout(()=>{
    const q=$('#qr');
    if(q&&window.QRCode)new QRCode(q,{text:url,width:180,height:180});
  },100);
};

triggerPlayerAlert=async function(n,d){
  const urgent=['turn','recall'].includes(n.kind);
  navigator.vibrate?.(urgent?[300,120,300,120,500]:[180,80,180]);
  if(alertEnabled){
    beep(urgent?1050:820,urgent?.3:.18);
    if('Notification'in window&&Notification.permission==='granted'){
      try{
        const reg=await navigator.serviceWorker.ready;
        await reg.showNotification('D12 Players Turn',{
          body:n.message,
          tag:'d12-turn-'+n.id,
          renotify:true,
          icon:D12_TURN_CANONICAL_BASE+'d12-app-icon.svg',
          badge:D12_TURN_CANONICAL_BASE+'d12-app-icon.svg',
          data:{url:`${D12_TURN_CANONICAL_BASE}?ticket=${encodeURIComponent(ticketParam||'')}`}
        });
      }catch{}
    }
  }
  toast(n.message);
};
