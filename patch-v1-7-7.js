// D12 PLAYERS TURN v1.7.7 — deterministic holder-break sequence + Liquid Glass setting

// Rackmaster holder-break preview now mirrors the server sequence exactly.
function v177BreakQueue(tableId){
  return waiting(tableId).filter(x=>x.payment_status!=='pending');
}
breakPair=function(tableId){
  const st=state(tableId),m=currentMatch(tableId);
  if(!['break','ready'].includes(st.holder_mode)||m)return '';

  const breakOwner=st.break_owner_player_id?player(st.break_owner_player_id):null;
  const temporaryHolder=st.holder_player_id?player(st.holder_player_id):null;
  const q=v177BreakQueue(tableId).filter(x=>x.player_id!==st.holder_player_id);

  if(st.holder_mode==='ready'){
    if(temporaryHolder&&breakOwner){
      return `<div class="break-pair v177-break-pair ready">
        <span>TABLE HOLDER RETURN · NEXT MATCH</span>
        <b>${esc(temporaryHolder.full_name)}</b><strong>VS</strong><b>${esc(breakOwner.full_name)}</b>
        <small>Current winner stays · original table holder returns immediately.</small>
      </div>`;
    }
    if(breakOwner){
      return `<div class="break-pair v177-break-pair ready"><span>TABLE HOLDER READY</span><b>${esc(breakOwner.full_name)}</b><small>The original holder returns before normal queue progression.</small></div>`;
    }
    return '';
  }

  if(!st.break_initial_match_done){
    if(q.length<2)return '<div class="break-pair warnbox v177-break-pair"><span>OPENING HOLDER-BREAK MATCH</span><small>Waiting for two cleared players.</small></div>';
    return `<div class="break-pair v177-break-pair opening">
      <span>OPENING HOLDER-BREAK MATCH · ONCE ONLY</span>
      <b>${esc(player(q[0].player_id).full_name)}</b><strong>VS</strong><b>${esc(player(q[1].player_id).full_name)}</b>
      <small>After this match, the winner stays and faces only the next player in queue.</small>
    </div>`;
  }

  if(temporaryHolder){
    const next=q[0];
    if(!next)return `<div class="break-pair warnbox v177-break-pair"><span>HOLDER BREAK CONTINUES</span><b>${esc(temporaryHolder.full_name)}</b><small>Current winner is waiting for the next challenger.</small></div>`;
    return `<div class="break-pair v177-break-pair continuation">
      <span>HOLDER BREAK · NEXT MATCH</span>
      <b>${esc(temporaryHolder.full_name)}</b><strong>VS</strong><b>${esc(player(next.player_id).full_name)}</b>
      <small>Winner stays · one challenger only.</small>
    </div>`;
  }

  return '<div class="break-pair warnbox v177-break-pair"><span>HOLDER BREAK RECOVERY</span><small>Recovering the latest break-match winner before the next match.</small></div>';
};

// Global Liquid Glass setting. It uses the existing settings/public_config reads only.
function v177LiquidGlassEnabled(){
  if(typeof data!=='undefined'&&data?.settings&&Object.prototype.hasOwnProperty.call(data.settings,'liquid_glass_enabled'))return data.settings.liquid_glass_enabled!==false;
  if(typeof config!=='undefined'&&config&&Object.prototype.hasOwnProperty.call(config,'liquid_glass_enabled'))return config.liquid_glass_enabled!==false;
  return true;
}
function v177ApplyLiquidGlass(){
  document.documentElement.dataset.liquidGlass=v177LiquidGlassEnabled()?'on':'off';
}
async function setLiquidGlass177(enabled){
  const previous=v177LiquidGlassEnabled();
  if(typeof data!=='undefined'&&data?.settings)data.settings.liquid_glass_enabled=!!enabled;
  if(typeof config!=='undefined'&&config)config.liquid_glass_enabled=!!enabled;
  v177ApplyLiquidGlass();
  try{
    await turn('save_settings',{liquid_glass_enabled:!!enabled});
    toast(`Liquid Glass ${enabled?'enabled':'disabled'}`);
  }catch(e){
    if(typeof data!=='undefined'&&data?.settings)data.settings.liquid_glass_enabled=previous;
    if(typeof config!=='undefined'&&config)config.liquid_glass_enabled=previous;
    v177ApplyLiquidGlass();
    const cb=$('#v177LiquidGlassToggle');if(cb)cb.checked=previous;
    toast(e.message);
  }
}
function v177LiquidGlassSettingsCard(){
  const on=v177LiquidGlassEnabled();
  return `<section class="card glass v177-glass-settings">
    <div><div class="eyebrow">APPEARANCE</div><h2>Liquid Glass Effect</h2><p>Turn the translucent blur, reflections and glass depth on or off across D12 Players Turn.</p></div>
    <label class="v177-glass-toggle">
      <input id="v177LiquidGlassToggle" type="checkbox" ${on?'checked':''} onchange="setLiquidGlass177(this.checked)">
      <span></span><b>${on?'ON':'OFF'}</b>
    </label>
  </section>`;
}
const v177SettingsBase=settingsView;
settingsView=function(){
  const html=v177SettingsBase();
  return role==='admin'?`${html}${v177LiquidGlassSettingsCard()}`:html;
};

// Apply the setting everywhere the app is rendered without adding any network request.
const v177RenderAppBase=renderApp;
renderApp=function(preserveFocus=false){
  v177ApplyLiquidGlass();
  return v177RenderAppBase(preserveFocus);
};
const v177RenderLoginBase=renderLogin;
renderLogin=function(...args){
  v177ApplyLiquidGlass();
  return v177RenderLoginBase(...args);
};
const v177RenderPlayerShellBase=renderPlayerShell;
renderPlayerShell=function(...args){
  v177ApplyLiquidGlass();
  return v177RenderPlayerShellBase(...args);
};
const v177RenderIdentityBase=renderIdentityDashboard;
renderIdentityDashboard=function(...args){
  v177ApplyLiquidGlass();
  return v177RenderIdentityBase(...args);
};
v177ApplyLiquidGlass();
