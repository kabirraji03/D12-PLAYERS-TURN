// D12 PLAYERS TURN v1.3.1 mobile-nav deferred refresh hotfix
// Never lose a realtime UI update while the user is actively swiping the horizontal tabs.
const v13RenderAppHotfix=renderApp;
let v13DeferredRenderTimer=null;
renderApp=function(preserveFocus=false){
  if(preserveFocus&&Date.now()<v13NavBusyUntil){
    clearTimeout(v13DeferredRenderTimer);
    v13DeferredRenderTimer=setTimeout(()=>{
      v13DeferredRenderTimer=null;
      renderApp(true);
    },Math.max(80,v13NavBusyUntil-Date.now()+80));
    return;
  }
  return v13RenderAppHotfix(preserveFocus);
};
