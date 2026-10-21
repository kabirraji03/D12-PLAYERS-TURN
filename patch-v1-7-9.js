// D12 PLAYERS TURN v1.7.9 — Record Result loser-choice visual restoration
// Presentation-only wrapper around the working v1.7.8 openFinishMatch.
// No queue logic, optimistic update logic, polling, refresh cadence or server-sync behavior is changed.

const v179OpenFinishBase=openFinishMatch;
openFinishMatch=function(matchId){
  const out=v179OpenFinishBase(matchId);
  const grid=$('#finishForm .action-grid');
  if(grid){
    grid.classList.add('v179-loser-choice-grid');
    grid.querySelectorAll('label').forEach(label=>{
      const input=label.querySelector('input[name="action"]');
      if(input?.value)label.dataset.choice=input.value;
    });
  }
  return out;
};
