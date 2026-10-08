// Original baked comic light. Four phases × sixteen adjacency masks, 64px per tile.
export function bakeBlast(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
 for(let mask=0;mask<16;mask++)for(let phase=0;phase<4;phase++){
  const n=mask*4+phase;c.save();c.translate(n%8*64,Math.floor(n/8)*64);c.beginPath();c.rect(0,0,64,64);c.clip();
  // Persistent inset danger bed; never fades before the damaging interval ends.
  c.fillStyle='#b8305870';c.fillRect(1,1,62,62);c.strokeStyle='#ff819b';c.lineWidth=2;c.strokeRect(2,2,60,60);
  const gradient=c.createRadialGradient(32,30,3,32,32,31);gradient.addColorStop(0,'#fff9dc');gradient.addColorStop(.3,'#ffe98b');gradient.addColorStop(.6,'#ffb644');gradient.addColorStop(.86,'#ff6481');gradient.addColorStop(1,'#923759');
  c.fillStyle=gradient;c.strokeStyle='#512845';c.lineWidth=2;
  for(const [bit,x,y,w,h]of[[1,20,0,24,33],[2,31,20,33,24],[4,20,31,24,33],[8,0,20,33,24]])if(mask&bit){c.fillRect(x,y,w,h);c.strokeRect(x,y,w,h);}
  c.beginPath();for(let k=0;k<16;k++){const a=k*Math.PI/8,outer=25+(phase%2)*2,r=k%2?17:outer;const x=32+Math.cos(a)*r,y=32+Math.sin(a)*r;if(k===0)c.moveTo(x,y);else c.lineTo(x,y);}c.closePath();c.fill();c.stroke();
  c.strokeStyle='#fff6c7';c.lineWidth=3;c.beginPath();c.moveTo(19,25);c.quadraticCurveTo(28,12,38,20);c.stroke();
  c.fillStyle='#fff9dc';c.beginPath();c.ellipse(32,32,8+phase%2,9,0,0,Math.PI*2);c.fill();c.restore();
 }return canvas;
}
