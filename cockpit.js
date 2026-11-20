'use strict';

function createCockpit(panel, point, corners) {
  const views = [...panel.querySelectorAll('canvas')].map(canvas => canvas.getContext('2d'));
  const settings = [...panel.querySelectorAll('input[type=range]')];
  panel.querySelector('[data-reset-mirrors]').onclick = () => {
    settings.forEach(input => { input.value = input.defaultValue; });
  };

  function scene(lesson) {
    if(lesson.course)return lesson.course.ground;
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

  function render(ctx, camera, ground, objects, signs=[], signal) {
    const {width:w,height:h}=ctx.canvas;
    const isMirror=camera.mirror;
    const focal=w*(camera.convex ? .54 : isMirror ? .6 : .63);
    const centerY=h*(isMirror ? .5 : .35);
    const pitchCos=Math.cos(camera.pitch), pitchSin=Math.sin(camera.pitch);
    const horizon=centerY-Math.tan(camera.pitch)*focal;
    const cosine=Math.cos(camera.a), sine=Math.sin(camera.a), near=7;
    ctx.fillStyle='#b7d7d4';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#527b58';
    ctx.fillRect(0,Math.max(0,horizon),w,h);
    function polygon(vertices,color) {
      const local=vertices.map(([x,y,z=0])=>{
        const dx=x-camera.x, dy=y-camera.y;
        const forward=dx*sine-dy*cosine, down=camera.z-z;
        const right=dx*cosine+dy*sine;
        // A reflected camera reverses its horizontal axis once, at projection.
        return [isMirror?-right:right,
          forward*pitchCos+down*pitchSin,down*pitchCos-forward*pitchSin];
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
      const projected=visible.map(([x,d,down])=>[x*focal/d,down*focal/d]);
      function trace(x,y,move){
        // Radial compression simulates the wider field of a convex mirror.
        const radius=camera.convex ? .48*Math.hypot(x,y)/(w/2):0;
        const scale=radius>0?Math.atan(radius)/radius:1;
        if(move)ctx.moveTo(w/2+x*scale,centerY+y*scale);
        else ctx.lineTo(w/2+x*scale,centerY+y*scale);
      }
      projected.forEach(([x,y],i)=>{
        trace(x,y,i===0);
        if(!camera.convex)return;
        const [nextX,nextY]=projected[(i+1)%projected.length];
        const steps=Math.min(12,Math.ceil(Math.hypot(nextX-x,nextY-y)/18));
        for(let step=1;step<steps;step++){
          const t=step/steps;
          trace(x+(nextX-x)*t,y+(nextY-y)*t,false);
        }
      });
      ctx.closePath();
      ctx.fillStyle=color;
      ctx.fill();
    }
    for(const {vertices,color} of ground)polygon(vertices,color);
    const faces=[];
    for(const {pose,color,bodyWidth,bodyLength,height=32,roofColor='#30494e',own=false} of objects){
      const base=corners(pose,bodyWidth,bodyLength);
      const roof=base.map(([x,y])=>[x,y,height]);
      base.forEach((p,i)=>{
        const j=(i+1)%4;
        const outward=[base[j][1]-p[1],p[0]-base[j][0]];
        if((camera.x-p[0])*outward[0]+(camera.y-p[1])*outward[1]>0){
          const side=own&&i%2===1 ? (i===1?1:-1) : 0;
          const handles=side?[-8,24].map(y=>[
            [...point(pose,side*bodyWidth/2,y-4),22],
            [...point(pose,side*bodyWidth/2,y+4),22],
            [...point(pose,side*bodyWidth/2,y+4),24],
            [...point(pose,side*bodyWidth/2,y-4),24]
          ]):[];
          faces.push({vertices:[p,base[j],roof[j],roof[i]],color,handles});
        }
      });
      faces.push({vertices:roof,color:roofColor});
    }
    const depth=face=>face.vertices.reduce((sum,[x,y,z=0])=>
      sum+((x-camera.x)*sine-(y-camera.y)*cosine)*pitchCos+(camera.z-z)*pitchSin,0)/face.vertices.length;
    faces.sort((a,b)=>depth(b)-depth(a));
    for(const {vertices,color,handles=[]} of faces){
      polygon(vertices,color);
      for(const handle of handles)polygon(handle,'#d5edcb');
    }
    for(const sign of signs){
      const dx=sign.x-camera.x, dy=sign.y-camera.y;
      const forward=dx*sine-dy*cosine;
      const down=camera.z-48;
      const depth=forward*pitchCos+down*pitchSin;
      if(depth<18)continue;
      const lateral=(dx*cosine+dy*sine)*(isMirror?-1:1);
      const sx=lateral*focal/depth;
      const sy=(down*pitchCos-forward*pitchSin)*focal/depth;
      const radial=camera.convex ? .48*Math.hypot(sx,sy)/(w/2):0;
      const soften=radial>0?Math.atan(radial)/radial:1;
      const x=w/2+sx*soften,y=centerY+sy*soften;
      if(x<-50||x>w+50||y<-50||y>h+50)continue;
      const size=Math.min(70,Math.max(7,20*focal/depth*soften));
      const signWidth=Math.max(size,sign.text.length*size*.32);
      ctx.fillStyle='#515a55';
      ctx.fillRect(x-size*.045,y,size*.09,size*2);
      ctx.fillStyle={info:'#215989',stop:'#922f27',warn:'#a36426',speed:'#922f27',
        signal:{red:'#c83830',yellow:'#d79522',green:'#397f42'}[signal]}[sign.type];
      ctx.fillRect(x-signWidth/2,y-size/2,signWidth,size);
      if(size<11)continue;
      ctx.save();
      ctx.translate(x,y);
      if(isMirror)ctx.scale(-1,1);
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+size*.47+'px system-ui';
      ctx.fillStyle='#fff';ctx.fillText(sign.text,0,0);
      ctx.restore();
    }
    if(!isMirror){
      ctx.fillStyle='#253435';
      ctx.beginPath();
      ctx.moveTo(0,h*.85);
      ctx.quadraticCurveTo(w*.5,h*.72,w,h*.85);
      ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#172323';
      ctx.fillRect(0,0,w,h*.055);
      ctx.fillStyle='#243333';
      for(const side of [0,1]){
        const edge=side*w, inward=side?-1:1;
        ctx.beginPath();
        ctx.moveTo(edge,0);
        ctx.lineTo(edge+inward*w*.031,0);
        ctx.lineTo(edge+inward*w*.089,h*.83);
        ctx.lineTo(edge+inward*w*.058,h*.83);
        ctx.closePath();ctx.fill();
      }
    }
  }

  let lastLesson, ground;
  return function drawCockpit(car, lesson, now=performance.now()) {
    if(lesson!==lastLesson){ground=scene(lesson);lastLesson=lesson;}
    const parked=lesson.parked.map(([x,y,a],i)=>({
      pose:{x,y,a},color:i?'#b4775d':'#798d9b',bodyWidth:52,bodyLength:106
    }));
    const signs=lesson.course?.signs;
    const signal=lesson.course?.light(now);
    const [x,y]=point(car,-9,-18);
    render(views[0],{x,y,a:car.a,z:34,pitch:.03},ground,parked,signs,signal);
    const withFlank=[...parked,{pose:car,color:'#62b647',bodyWidth:48,bodyLength:107,roofColor:'#427f38',own:true}];
    for(const [i,side] of [-1,1].entries()){
      const [mx,my]=point(car,side*32,-27);
      const yaw=Number(settings[i*2].value)*Math.PI/180;
      const pitch=Number(settings[i*2+1].value)*Math.PI/180;
      const [tx,ty]=point(car,side*25,36);
      const tire={pose:{x:tx,y:ty,a:car.a},color:'#182022',roofColor:'#303a39',
        bodyWidth:10,bodyLength:19,height:13};
      render(views[i+1],{x:mx,y:my,a:car.a+Math.PI-side*yaw,z:29,pitch,mirror:true,convex:side===1},
        ground,[...withFlank,tire],signs,signal);
    }
  };
}

if(typeof module!=='undefined')module.exports=createCockpit;
