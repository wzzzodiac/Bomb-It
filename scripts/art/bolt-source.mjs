/* Original proposal art. Canvas2D is an authoring/baking tool, not a proposed game renderer. */
export const concepts = [
 {id:'foundry',name:'Foundry Crew',subtitle:'Pequeños cuerpos. Grandes averías.',ink:'#eff0df',bg:'#151e26',panel:'#24343e',accent:'#ffb857',floor:['#435059','#3d4a54'],wall:'#9eaeb3',crate:'#aa7049',flame:'#ff7440',colors:['#f6bd53','#63d4d2','#e77885','#a6b4ff','#acd082','#ece5ca'],models:['RIG','WELD','RIVET','SCOUT','HAUL','SHIFT']},
 {id:'garden',name:'Circuit Garden',subtitle:'El jardín tiene nuevos vecinos.',ink:'#143c39',bg:'#f2f0df',panel:'#e4ecd9',accent:'#227a6b',floor:['#b7cfb3','#c2d6bc'],wall:'#f1e9cc',crate:'#e5a776',flame:'#ed753c',colors:['#3caca4','#e48294','#8fa7df','#e5b348','#af95c8','#90bb53'],models:['BUD','MOSS','DEW','SUN','PETAL','SEED']},
 {id:'arcade',name:'Bolt Club',subtitle:'¡NO ES UN SIMULACRO!',ink:'#fff1cf',bg:'#261c46',panel:'#42336a',accent:'#ffbc45',floor:['#6e5792','#634d87'],wall:'#c6bae6',crate:'#fa9b53',flame:'#ff5c74',colors:['#5fe2c4','#ff819b','#72bfff','#ffce58','#dbaaef','#f7f1d4'],models:['ZIP','POP','BOP','WHAM','JOLT','BOOM']}
];
export const frames=[];
for(let i=0;i<6;i++)for(const direction of ['down','right','up','left'])for(let phase=0;phase<2;phase++)frames.push(`bot-${i}-${direction}-${phase}`);
for(let i=0;i<6;i++)frames.push(`react-${i}`);
frames.push('floor0','floor1','wall','crate','bomb','fire0','fire1','up-bomb','up-fire');
export const FRAME=96,ATLAS=768;
export function bake(concept){
 const c=document.createElement('canvas');c.width=ATLAS;c.height=ATLAS;const ctx=c.getContext('2d');
 const box=(x,y,w,h,color,r=2,stroke)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=concept.id==='arcade'?1.7:1;ctx.stroke();}};
 const disc=(x,y,r,color)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
 const line=(points,color,width=1)=>{ctx.beginPath();ctx.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();};
 const poly=(points,color)=>{ctx.beginPath();ctx.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);ctx.closePath();ctx.fillStyle=color;ctx.fill();};
 const shadow=(x,y,w,h)=>{ctx.save();ctx.fillStyle=concept.id==='garden'?'#143c392a':'#07132165';ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,Math.PI*2);ctx.fill();ctx.restore();};
 function robot(index,direction,phase,reaction=false){
  const paint=concept.colors[index],dark=concept.id==='garden'?'#254b43':'#182535',light='#fff8dc';const side=direction==='left'||direction==='right',back=direction==='up';
  shadow(21,35,13,3);const step=phase?1.5:0;
  if(concept.id==='foundry'){
   // Head, torso, articulated arms, hip and two booted legs; silhouette stays inside the tile.
   box(12,25,6,9-step,'#303f4c',2);box(23,25,6,9+step,'#303f4c',2);
   box(10,31-step,9,5,paint,1,dark);box(22,31+step,9,5,paint,1,dark);
   box(11,15,20,12,paint,3,dark);box(14,16,14,4,'#ffffff38',1);box(15,22,12,4,dark,1);
   box(6,15+step,5,10,paint,2,dark);box(31,15-step,5,10,paint,2,dark);disc(8.5,25+step,2,'#c4ccca');disc(33.5,25-step,2,'#c4ccca');
   box(side?12:10,3,side?17:22,14,paint,3,dark);poly([11,3,29,3,26,1,14,1],'#ffffff55');
   if(index===0)box(12,1,18,3,'#fae1a0',1);
   if(index===1){box(7,6,3,8,paint,1);box(32,6,3,8,paint,1);}
   if(index===2){line([15,3,13,0],paint,2);line([26,3,28,0],paint,2);}
   if(index===3){box(15,0,11,3,'#dde3fa',1);}
   if(index===4)box(10,2,22,4,'#d4eaa2',1);
   if(index===5)disc(20,2,2,'#f2764c');
   if(back){box(14,6,13,8,'#586976',2);line([17,8,24,8,24,11,17,11],dark,1);}
   else {box(side?(direction==='right'?22:10):12,7,side?8:18,7,dark,2);line(side?[direction==='right'?25:13,9,direction==='right'?27:15,9]:[15,10,18,10,24,10,27,10],light,2);}
   box(18,18,6,3,light,1);if(side)box(direction==='right'?29:9,18,3,4,'#ffffff70',1);
  }else if(concept.id==='garden'){
   box(10,27,8,8,dark,4);box(23,27,8,8,dark,4);box(11,29-step,6,3,paint,2);box(24,29+step,6,3,paint,2);
   box(9,13,24,19,'#f5efdb',8,dark);box(12,21,18,9,paint,4);disc(8,23-step,3,paint);disc(34,23+step,3,paint);
   disc(21,12,11,paint);box(side?(direction==='right'?21:10):12,10,side?9:18,9,dark,4);
   if(!back){disc(side?(direction==='right'?25:14):16,14,2,light);if(!side)disc(26,14,2,light);}else box(16,10,10,7,'#ffffff50',3);
   const leaves=index+1;for(let n=0;n<leaves%3+1;n++){ctx.save();ctx.translate(21,4);ctx.rotate((n-1)*.8);ctx.fillStyle=index===1?'#ec91a4':'#6c9a54';ctx.beginPath();ctx.ellipse(0,-3,2.4,5,0,0,Math.PI*2);ctx.fill();ctx.restore();}
   disc(21,25,3,'#ffefd3');line([20,23,22,26],paint,1);if(index===3)box(10,3,23,4,'#f7d86e',2);
  }else{
   line([15,25,13,28-step,16,31-step,13,34-step],dark,2);line([26,25,28,28+step,25,31+step,28,34+step],dark,2);
   box(9,32-step,10,4,paint,2,dark);box(23,32+step,10,4,paint,2,dark);
   box(10,17,22,12,paint,5,dark);line([11,20,5,23-step,7,28-step],dark,3);line([31,20,36,23+step,34,28+step],dark,3);
   box(8,3,26,18,paint,index===4?9:4,dark);box(side?(direction==='right'?23:9):11,7,side?9:20,10,dark,4);
   box(12,4,16,2,'#ffffff45',1);
   if(!back){disc(side?(direction==='right'?26:13):16,11,2.5,light);if(!side)disc(26,11,2.5,light);line(side?(direction==='right'?[25,16,28,15]:[12,16,15,15]):[17,16,20,18,24,16],light,1.4);
    if(!side&&index===1){line([13,8,17,7],light,1);line([25,7,29,8],light,1);}
    if(!side&&index===2){box(12,8,18,5,dark,1);line([14,10,18,10],light,1.7);line([24,10,28,10],light,1.7);}
    if(!side&&index===3){box(11,7,20,12,dark,4);disc(21,11,4.5,light);disc(22,11,2,dark);line([19,17,24,16],light,1);}
    if(!side&&index===5){line([13,7,19,7],light,1);line([23,7,29,7],light,1);box(18,15,7,3,light,1);line([21,15,21,18],dark,.7);}
   }else line([15,8,26,8,26,15,15,15],paint,2);
   if(index===0)line([21,3,24,0,28,2],paint,3);
   if(index===1){poly([9,5,6,0,17,4],paint);poly([29,4,36,0,34,8],paint);}
   if(index===2)box(5,5,31,4,'#fff0c7',2,dark);
   if(index===3){disc(24,3,4,paint);box(14,3,16,3,paint,2);}
   if(index===4){disc(9,4,4,paint);disc(33,4,4,paint);}
   if(index===5){box(4,7,5,11,paint,2,dark);box(33,7,5,11,paint,2,dark);box(12,2,17,4,'#fff0c7',1,dark);}
   box(18,23,6,3,light,1);if(reaction&&!back){line([13,10,17,8,19,10],light,1.7);line([23,10,27,8,29,10],light,1.7);box(18,15,6,4,light,2);}
  }
  ctx.fillStyle=concept.id==='garden'?dark:light;ctx.font='bold 4px sans-serif';ctx.textAlign='center';ctx.fillText(String(index+1),21,26);
 }
 frames.forEach((name,n)=>{ctx.save();ctx.translate(n%8*FRAME,Math.floor(n/8)*FRAME);ctx.beginPath();ctx.rect(0,0,FRAME,FRAME);ctx.clip();ctx.scale(FRAME/40,FRAME/40);
  if(name.startsWith('bot')){const [,i,d,p]=name.split('-');ctx.translate(1,4);ctx.scale(.9,.9);robot(+i,d,+p);}
  else if(name.startsWith('react')){ctx.translate(1,4);ctx.scale(.9,.9);robot(+name.split('-')[1],'down',0,true);}
  else if(name.startsWith('floor')){box(0,0,40,40,concept.floor[+name.at(-1)],0);line([0,39,39,39,39,0],concept.id==='garden'?'#96b999':'#18253655',.6);if(concept.id==='foundry'){line([4,5,10,5], '#73818a',.6);disc(4,35,.7,'#879497');}if(concept.id==='garden'){line([8,31,9,27,10,30], '#84aa83',.6);line([30,7,32,5,33,7], '#9cba90',.7);}if(concept.id==='arcade')box(4,4,3,3,'#9c83b230',0);}
  else if(name==='wall'){
   box(0,0,40,40,concept.floor[0],0);shadow(23,34,16,4);
   if(concept.id==='foundry'){poly([3,5,36,5,38,10,38,35,5,35,3,29],'#526876');box(2,2,33,27,concept.wall,2,'#213644');box(5,4,26,4,'#d6dcce',1);box(7,12,23,12,'#82949b',1);line([10,16,27,16,27,19,10,19],'#536c7b',1);for(const x of [6,31])for(const y of [8,25])disc(x,y,1,'#3f5663');box(13,24,11,3,'#f8c767',1);}
   if(concept.id==='garden'){box(3,5,34,32,'#97a78a',7);box(2,2,34,29,concept.wall,7,'#859980');box(7,6,24,4,'#fff8df',3);box(9,24,20,3,'#bbc6a1',2);disc(9,12,2,'#c0cda6');line([30,7,33,10,29,14], '#7fa58a',2);}
   if(concept.id==='arcade'){box(4,5,34,32,'#383051',4,'#1c1930');box(1,1,34,30,concept.wall,4,'#201d33');box(5,5,26,5,'#efe8ff',2);line([9,16,12,15,16,19,22,13,28,17],'#9283ae',2);}
  }else if(name==='crate'){
   box(0,0,40,40,concept.floor[1],0);shadow(23,34,16,4);
   if(concept.id==='foundry'){poly([4,5,35,5,38,9,38,35,7,35,4,29],'#704c35');box(2,2,32,28,concept.crate,2,'#4c3f36');box(5,4,26,5,'#dfb078',1);line([7,13,28,27,28,13,7,27],'#daaa76',3);box(3,11,30,3,'#545e65',0);box(3,26,30,3,'#545e65',0);}
   if(concept.id==='garden'){box(4,6,32,29,'#aa7556',4);box(2,2,33,29,concept.crate,4,'#735541');box(6,6,25,6,'#ffe0a8',2);box(6,16,25,11,'#be855d',1);for(const x of [10,18,26])disc(x,20,3,'#d2bb63');line([15,15,17,12,19,15], '#609564',2);}
   if(concept.id==='arcade'){box(4,5,34,33,'#b95144',3,'#271e38');box(1,1,34,30,concept.crate,3,'#271e38');box(4,4,28,5,'#ffd994',1);line([7,14,29,25,29,14,7,25], '#c76040',4);}
  }else if(name==='bomb'){
   shadow(21,34,13,3);disc(20,23,12,concept.id==='garden'?'#557471':'#f6c164');disc(19,21,11,concept.id==='garden'?'#284947':'#26323f');disc(16,17,4,'#ffffff30');box(16,8,7,5,concept.accent,1);line([20,9,25,5,30,7],'#ffe4a3',2);disc(31,7,3,concept.flame);disc(31,7,1,'#fff7bf');box(16,22,7,6,concept.flame,2);line([19,23,19,25], '#fff6d5',1);
   if(concept.id==='garden')line([17,10,12,5,10,9], '#7ac199',2);if(concept.id==='arcade')line([30,1,29,3,35,5,34,9], '#fff2d5',1.5);
  }else if(name.startsWith('fire')){
   const p=+name.at(-1);box(1,13,38,14,concept.flame,concept.id==='arcade'?1:4);box(13,1,14,38,concept.flame,concept.id==='arcade'?1:4);box(3,16-p,34,8+p*2,'#ffc55b',2);box(16-p,3,8+p*2,34,'#ffc55b',2);disc(20,20,8,'#fff2b9');
  }else{const bomb=name==='up-bomb';shadow(21,34,12,3);box(5,5,30,29,concept.id==='arcade'?'#251c41':'#466167',5);box(4,3,30,27,bomb?'#bca7e2':'#ffe09b',5,'#fff5d7');if(bomb){disc(15,16,6,'#334354');line([15,10,18,7], '#334354',1.8);}else poly([18,7,11,18,17,17,15,25,24,13,18,14], '#865938');line([26,19,26,25], '#334354',2);line([23,22,29,22], '#334354',2);}
  ctx.restore();});return c;
}
export function sprite(ctx,atlas,name,x,y,size){const n=frames.indexOf(name);ctx.drawImage(atlas,n%8*FRAME,Math.floor(n/8)*FRAME,FRAME,FRAME,x,y,size,size);}
