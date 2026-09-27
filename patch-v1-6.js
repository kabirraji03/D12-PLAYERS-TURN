// D12 PLAYERS TURN v1.6 — symmetrical live match layout and reference-style credits

// Rebuild the credit block to match the uploaded D12/Cue Strokes reference style.
v15Credits=function(extra=''){
  return `<footer class="app-credit v16-credit glass ${extra}">
    <div class="v16-credit-left">
      <strong>© 2026 D12 CUE CLUB</strong>
      <span>PLAYER TURN MANAGER</span>
      <span>ALL RIGHTS RESERVED</span>
    </div>
    <div class="v16-credit-right">
      <span class="v16-designed-by">APP DESIGNED BY</span>
      <div class="v16-credit-logo-frame"><img class="credit-cuestrokes-logo" src="./cue-strokes-by-feras-v1-5.svg" alt="CUE STROKES by FERAS"></div>
    </div>
  </footer>`;
};

// Ensure already-rendered credit blocks also pick up the v1.6 structure if a cached shell
// appears before this patch executes.
function v16RefreshCredits(){
  $$('.app-credit').forEach(old=>{
    const classes=[...old.classList].filter(c=>c!=='app-credit'&&c!=='v16-credit'&&c!=='glass').join(' ');
    const holder=document.createElement('div');
    holder.innerHTML=v15Credits(classes);
    old.replaceWith(holder.firstElementChild);
  });
}

requestAnimationFrame(v16RefreshCredits);
