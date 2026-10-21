// D12 PLAYERS TURN v1.7.10 — force large bold loser-choice icons
// Visual-only enhancement layered over v1.7.9 and the working v1.7.8 match logic.

const v1710OpenFinishBase=openFinishMatch;
openFinishMatch=function(matchId){
  const out=v1710OpenFinishBase(matchId);
  const labels=$$('#finishForm .v179-loser-choice-grid>label');
  const icons={appeal:'↻',remain:'⌛',change:'⇄',leave:'↗'};
  labels.forEach(label=>{
    const input=label.querySelector('input[name="action"]');
    const choice=input?.value;
    if(!choice)return;
    label.dataset.choice=choice;
    // Remove the old raw symbol text node so only the new large icon is visible.
    [...label.childNodes].forEach(node=>{
      if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim())node.remove();
    });
    if(!label.querySelector('.v1710-loss-icon')){
      const icon=document.createElement('span');
      icon.className='v1710-loss-icon';
      icon.setAttribute('aria-hidden','true');
      icon.textContent=icons[choice]||'•';
      label.prepend(icon);
    }
  });
  return out;
};
