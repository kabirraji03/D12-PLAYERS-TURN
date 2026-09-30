// D12 PLAYERS TURN v1.6.3 credit retention hotfix
const v163PlayerShellWithCredits=renderPlayerShell;
renderPlayerShell=function(){const out=v163PlayerShellWithCredits();const host=$('.player-shell');if(host&&!host.querySelector('.app-credit'))host.insertAdjacentHTML('beforeend',v15Credits('player-credit'));return out};
const v163IdentityWithCredits=renderIdentityDashboard;
renderIdentityDashboard=function(j){const out=v163IdentityWithCredits(j);const host=$('.player-shell');if(host&&!host.querySelector('.app-credit'))host.insertAdjacentHTML('beforeend',v15Credits('player-credit'));return out};
