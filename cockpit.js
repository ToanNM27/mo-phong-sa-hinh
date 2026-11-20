'use strict';

function createCockpit(panel, point, corners) {
  const views = [...panel.querySelectorAll('canvas')].map(canvas => canvas.getContext('2d'));
  const settings = [...panel.querySelectorAll('input[type=range]')];
  panel.querySelector('[data-reset-mirrors]').onclick = () => {
    settings.forEach(input => { input.value = input.defaultValue; });
  };

  function scene(lesson) {
    const ground = [];
    const [left, right, top, bottom] = lesson.road;
    function plane(vertices, color) {
      ground.push({vertices, color});
    }
    function stripe(x, y, x1, y1, width, color) {
      const length = Math.hypot(x1-x, y1-y);
      const dx = (y-y1)*width/length/2, dy = (x1-x)*width/length/2;
      plane([[x+dx,y+dy],[x1+dx,y1+dy],[x1-dx,y1-dy],[x-dx,y-dy]],color);
    }
    function curb(x, y, x1, y1) {
      const count = Math.ceil(Math.hypot(x1-x,y1-y)/18);
      for(let i=0;i<count;i++){
        stripe(x+(x1-x)*i/count,y+(y1-y)*i/count,
          x+(x1-x)*(i+1)/count,y+(y1-y)*(i+1)/count,6,i%2?'#f1eee0':'#d84d40');
      }
    }
    function roadPolygon(vertices) {
      plane(vertices,'#666b64');
      vertices.forEach(([x,y],i)=>curb(x,y,...vertices[(i+1)%vertices.length]));
    }
    if(lesson.pocket){
      const [lo,hi,mouth]=lesson.pocket;
      roadPolygon([[left,top],[right,top],[right,mouth],[hi,mouth],
        [hi,bottom],[lo,bottom],[lo,mouth],[left,mouth]]);
      stripe(left,265,right,265,2,'#f1eee0');
      stripe((lo+hi)/2,mouth,(lo+hi)/2,bottom-12,2,'#edc872');
    }else if(lesson.lane){
      const half=lesson.halfWidth;
      for(let i=1;i<lesson.lane.length;i++){
        const [x,y]=lesson.lane[i-1], [x1,y1]=lesson.lane[i];
        plane([[x,y-half],[x1,y1-half],[x1,y1+half],[x,y+half]],'#666b64');
      }
      for(let i=1;i<lesson.lane.length;i++){
        const [x,y]=lesson.lane[i-1], [x1,y1]=lesson.lane[i];
        for(const offset of [-half,half])stripe(x,y+offset,x1,y1+offset,4,'#ff9a5d');
      }
      stripe(lesson.finish,328-half,lesson.finish,328+half,4,'#d6f77b');
    }else{
      roadPolygon([[left,top],[right,top],[right,bottom],[left,bottom]]);
      for(let y=top+5;y<bottom-25;y+=42)stripe(430,y,430,y+25,2,'#e4e8dc');
      for(const y of [221,432])stripe(559,y,654,y,3,'#f1eee0');
    }
    if(lesson.goal){
      const [x,y,a,w,l]=lesson.goal;
      const edges=corners({x,y,a},w,l);
      edges.forEach(([px,py],i)=>stripe(px,py,...edges[(i+1)%4],2.5,'#edce73'));
    }
    return ground;
  }

  function render(ctx, camera, ground, objects, reflection) {
    const {width:w,height:h}=ctx.canvas;
    const focal=w*(reflection?.52:.63);
    const horizon=h*(.34-Math.tan(camera.pitch)*1.3);
    const cosine=Math.cos(camera.a), sine=Math.sin(camera.a), near=7;
    ctx.fillStyle='#b7d7d4';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#527b58';
    ctx.fillRect(0,Math.max(0,horizon),w,h);
    function polygon(vertices,color) {
      const local=vertices.map(([x,y,z=0])=>{
        const dx=x-camera.x, dy=y-camera.y;
        return [dx*cosine+dy*sine,dx*sine-dy*cosine,z];
      });
      const visible=[];
      for(let i=0;i<local.length;i++){
        const p=local[i], q=local[(i+1)%local.length];
        if(p[1]>=near)visible.push(p);
        if((p[1]>=near)!==(q[1]>=near)){
          const t=(near-p[1])/(q[1]-p[1]);
          visible.push([p[0]+(q[0]-p[0])*t,near,p[2]+(q[2]-p[2])*t]);
        }
      }
      if(visible.length<3)return;
      ctx.beginPath();
      visible.forEach(([x,d,z],i)=>{
        const X=w/2+(reflection?-1:1)*x*focal/d, Y=horizon+(camera.z-z)*focal/d;
        if(i)ctx.lineTo(X,Y);else ctx.moveTo(X,Y);
      });
      ctx.closePath();
      ctx.fillStyle=color;
      ctx.fill();
    }
    for(const {vertices,color} of ground)polygon(vertices,color);
    const faces=[];
    for(const {pose,color,bodyWidth,bodyLength} of objects){
      const base=corners(pose,bodyWidth,bodyLength);
      const roof=base.map(([x,y])=>[x,y,32]);
      base.forEach((p,i)=>{
        const j=(i+1)%4;
        const outward=[base[j][1]-p[1],p[0]-base[j][0]];
        if((camera.x-p[0])*outward[0]+(camera.y-p[1])*outward[1]>0)
          faces.push({vertices:[p,base[j],roof[j],roof[i]],color});
      });
      faces.push({vertices:roof,color:'#30494e'});
    }
    const depth=face=>face.vertices.reduce((sum,[x,y])=>
      sum+(x-camera.x)*sine-(y-camera.y)*cosine,0)/face.vertices.length;
    faces.sort((a,b)=>depth(b)-depth(a));
    for(const {vertices,color} of faces)polygon(vertices,color);
    if(!reflection){
      ctx.fillStyle='#273637';
      ctx.beginPath();
      ctx.moveTo(0,h*.85); ctx.quadraticCurveTo(w*.49,h*.72,w,h*.85);
      ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#172323';
      ctx.fillRect(0,0,w,h*.055);
      ctx.strokeStyle='#243333';
      ctx.lineWidth=w*.033;
      ctx.beginPath();
      ctx.moveTo(w*.015,0);ctx.lineTo(w*.085,h*.89);
      ctx.moveTo(w*.985,0);ctx.lineTo(w*.915,h*.89);
      ctx.stroke();
    }
  }

  let lastLesson, ground;
  return function drawCockpit(car, lesson) {
    if(lesson!==lastLesson){ground=scene(lesson);lastLesson=lesson;}
    const parked=lesson.parked.map(([x,y,a],i)=>({
      pose:{x,y,a},color:i?'#b4775d':'#798d9b',bodyWidth:52,bodyLength:106
    }));
    const [x,y]=point(car,-9,-18);
    render(views[0],{x,y,a:car.a,z:34,pitch:.03},ground,parked,false);
    const withFlank=[...parked,{pose:car,color:'#62b647',bodyWidth:48,bodyLength:107}];
    for(const [i,side] of [-1,1].entries()){
      const [mx,my]=point(car,side*32,-27);
      const yaw=Number(settings[i*2].value)*Math.PI/180;
      const pitch=Number(settings[i*2+1].value)*Math.PI/180;
      render(views[i+1],{x:mx,y:my,a:car.a+Math.PI-side*yaw,z:29,pitch},ground,withFlank,true);
    }
  };
}

if(typeof module!=='undefined')module.exports=createCockpit;
