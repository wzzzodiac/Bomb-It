export type LabelPlayer={id:string;name:string;slot:number;self:boolean;alive:boolean;x:number;y:number};
type Rect={x:number;y:number;w:number;h:number};
const overlaps=(a:Rect,b:Rect)=>a.x<b.x+b.w+2&&a.x+a.w+2>b.x&&a.y<b.y+b.h+2&&a.y+a.h+2>b.y;
/** Screen-space text: stable size/contrast, no per-frame text texture uploads. */
export class PlayerLabels{
 private root:HTMLDivElement;
 private labels=new Map<string,HTMLSpanElement>();
 constructor(private game:HTMLElement){this.root=document.createElement('div');this.root.className='player-labels';game.append(this.root);}
 update(players:LabelPlayer[],width:number,height:number,hazards:Array<{x:number;y:number}>):void{
  const sx=this.game.clientWidth/width,sy=this.game.clientHeight/height;
  const blocked:Rect[]=[...players.filter(p=>p.alive).map(p=>({x:(p.x-14)*sx,y:(p.y-14)*sy,w:28*sx,h:28*sy})),...hazards.map(p=>({x:p.x*40*sx,y:p.y*40*sy,w:40*sx,h:40*sy}))];
  for(const p of players){let label=this.labels.get(p.id);if(!label){label=document.createElement('span');label.className='player-label'+(p.self?' self':'');label.textContent=p.self?p.name:`P${p.slot}`;label.title=p.name;this.root.append(label);this.labels.set(p.id,label);}
   label.hidden=!p.alive;if(!p.alive)continue;
   const w=label.offsetWidth,h=label.offsetHeight,x=p.x*sx,y=p.y*sy,candidates:Rect[]=[];
   for(const dy of [-h-17*sy,17*sy,-h-35*sy])for(const dx of [-w/2,-w-18*sx,18*sx]){const r={x:Math.max(1,Math.min(x+dx,this.game.clientWidth-w-1)),y:Math.max(1,Math.min(y+dy,this.game.clientHeight-h-1)),w,h};if(!blocked.some(b=>overlaps(r,b)))candidates.push(r);}
   candidates.sort((a,b)=>Math.abs(a.x+w/2-x)+Math.abs(a.y+h/2-y)-Math.abs(b.x+w/2-x)-Math.abs(b.y+h/2-y));
   // Dense hazard clusters prioritise the map; full nicknames remain in the roster.
   label.style.visibility=candidates.length?'visible':'hidden';if(candidates[0]){const r=candidates[0];label.style.transform=`translate(${r.x}px,${r.y}px)`;blocked.push(r);}
  }
  for(const[id,label]of this.labels)if(!players.some(p=>p.id===id)){label.remove();this.labels.delete(id);}
 }
 destroy():void{this.root.remove();this.labels.clear();}
}
