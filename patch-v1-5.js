// D12 PLAYERS TURN v1.5 credits, active-match lighting and responsive navigation polish
const V15_CREDIT_TEXT='@2026 D12 cue club. All rights reserved, Player Turn Manager. App designed by CUE STROKES by FERAS';
function v15Credits(extra=''){
  return `<footer class="app-credit glass ${extra}"><img class="credit-cuestrokes-logo" src="./cue-strokes-by-feras-v1-5.svg" alt="CUE STROKES by FERAS"><div class="credit-copy">${esc(V15_CREDIT_TEXT)}</div></footer>`;
}

// Keep the working v1.4 staff shell, adding a consistent product/design credit at the bottom.
shell=function(body){
  return `<div class="shell">${topbar()}${nav()}<main class="content">${body}</main>${v15Credits('staff-credit')}</div>`;
};

// Credits on all login modes (Admin, Cashier, Rackmaster and Player).
const v14RenderLoginV15=renderLogin;
renderLogin=function(tab='admin',playerMode='identity'){
  const out=v14RenderLoginV15(tab,playerMode);
  requestAnimationFrame(()=>{
    const card=$('.login-card');
    if(card&&!card.querySelector('.app-credit'))card.insertAdjacentHTML('beforeend',v15Credits('login-credit'));
  });
  return out;
};

// Credits on the live personal player-turn page.
const v14RenderPlayerShellV15=renderPlayerShell;
renderPlayerShell=function(){
  const out=v14RenderPlayerShellV15();
  const host=$('.player-shell');
  if(host&&!host.querySelector('.app-credit'))host.insertAdjacentHTML('beforeend',v15Credits('player-credit'));
  return out;
};

// Credits on the ID/WhatsApp player dashboard when the player has no active turn.
const v14IdentityDashboardV15=renderIdentityDashboard;
renderIdentityDashboard=function(j){
  const out=v14IdentityDashboardV15(j);
  const host=$('.player-shell');
  if(host&&!host.querySelector('.app-credit'))host.insertAdjacentHTML('beforeend',v15Credits('player-credit'));
  return out;
};

// Version 1.5 visual-state helpers. Match presence itself remains sourced from the
// existing realtime v1.3/v1.4 match protocol, so no new parallel match logic is introduced.
function v15RefreshRackStates(){
  $$('.rack-card').forEach(card=>{
    const live=!!card.querySelector('.match-box');
    card.classList.toggle('table-live',live);
    card.classList.toggle('table-idle',!live);
  });
}
const v14RenderAppV15=renderApp;
renderApp=function(preserveFocus=false){
  const out=v14RenderAppV15(preserveFocus);
  requestAnimationFrame(v15RefreshRackStates);
  return out;
};
