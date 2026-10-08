/** One finite sequence shared by hover, native click, touch and keyboard. */
export function bindLogo(button:HTMLButtonElement):void {
  let busy=false;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const play=()=>{
    if(busy)return;busy=true;button.dataset.running='true';
    const animations=[...button.querySelectorAll<HTMLElement>('.logo-bot')].map((robot,i)=>robot.animate(reduced.matches
      ?[{opacity:1},{opacity:.8},{opacity:1}]
      :[{transform:'translateY(0) rotate(0)'},{transform:`translateY(-${14+i*3}px) rotate(${i%2?-9:9}deg)`},{transform:'translateY(0) rotate(0)'}],
      {duration:reduced.matches?150:620,delay:reduced.matches?0:i*80,easing:'ease-in-out'}));
    void Promise.all(animations.map(a=>a.finished.catch(()=>undefined))).then(()=>{busy=false;delete button.dataset.running;});
  };
  button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')play();});
  // Native buttons supply one click for mouse/touch/Enter/Space.
  button.addEventListener('click',play);
}
