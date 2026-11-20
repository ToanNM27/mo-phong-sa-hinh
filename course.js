'use strict';

function createFullCourse({point,corners,line,rect,label}) {
  const width=3192, height=2312, halfRoad=75;
  const toRadians=Math.PI/180, east=Math.PI/2, north=0, west=-east, south=Math.PI;
  // Positions are traced in the coordinate space of the supplied training-yard diagram.
  const X=x=>(x-50)*4, Y=y=>(y-72)*4;
  const xy=(x,y)=>[X(x),Y(y)];
  const box=(x,y,x1,y1)=>[X(x),Y(y),X(x1),Y(y1)];
  const at=(x,y,a)=>({x:X(x),y:Y(y),a});
  const gate=(x,y,r=100)=>[...xy(x,y),r];
  const blueprint=[
    [151,608],[780,608],[798,588],[798,505],[636,505],[636,552],
    [442,552],[442,202],[452,179],[520,179],[525,202],[509,244],
    [526,275],[568,275],[590,295],[583,320],[555,333],[111,333],
    [111,139],[420,139],[420,351],[798,351],[798,118],[94,118],
    [94,368],[407,368],[414,387],[414,455],[145,455]
  ];
  const route=blueprint.map(([x,y])=>xy(x,y));
  const ground=[], segments=[], centerLine=[];
  const bays=[
    {goal:[...xy(212,281),south,86,146],surface:box(196,241,230,340)},
    {goal:[...xy(223,391),east,80,156],surface:box(191,361,258,404)}
  ];
  const baySurfaces=[
    box(133,304,260,357),box(155,348,291,398),box(416,309,470,419),
    box(481,167,543,302),box(563,272,609,343),
    box(52,580,396,621),box(69,502,373,580),box(351,521,394,582),
    box(170,142,208,217),box(189,180,242,217),box(282,177,326,309),
    ...bays.map(bay=>bay.surface)
  ];
  const launch=at(218,608,east);
  const pedestrian=at(343,608,east);
  const hill=at(479,608,east);
  const intersection=at(442,394,north);
  const railway=at(798,252,north);
  const finish=at(176,455,west);
  const shift={y:Y(118),entry:X(727),accelerate:X(657),slow:X(239)};
  const trackLine=at(729,498,west);
  const track={entry:X(759),exit:X(669),y:Y(505)};
  const launchReady=launch.x-42, launchSignalOff=launch.x+65;
  const hillExit=hill.x+182;
  const alignmentGates=[gate(637,527,115),gate(555,552,115),gate(442,476,125)];
  const slalomGates=[gate(442,210,110),gate(520,199,114),gate(521,259,110),
    gate(583,293,115),gate(548,333,115)];
  const stages=[
    {name:'Xuất phát', ...launch, tip:'Cài dây an toàn, bật xi-nhan trái rồi xuất phát. Tắt xi-nhan sau vạch khoảng 5 m.'},
    {name:'Nhường người đi bộ', ...pedestrian, tip:'Dừng sát trước vạch, cách tối đa 0,5 m theo tỷ lệ mô phỏng.'},
    {name:'Dừng và khởi hành ngang dốc', ...hill, limit:30, tip:'Dừng sát vạch. Giữ phanh, dùng số 1 để khởi hành và tránh tụt dốc quá 0,5 m.'},
    {name:'Vệt bánh và góc vuông', ...trackLine, limit:120, tip:'Đưa hai bánh phải vào vệt trắng rồi đi qua các góc vuông theo thứ tự.'},
    {name:'Ngã tư có đèn', ...intersection, limit:20, tip:'Dừng trước vạch khi đèn đỏ. Khi đèn xanh, đi thẳng qua ngã tư về phía đường chữ S.'},
    {name:'Đường vòng chữ S',...at(520,230),limit:120,tip:'Đi theo đường cong và tránh chạm vạch biên.'},
    {name:'Ghép dọc',...at(212,281),limit:120,tip:'Lùi vào chuồng dọc, đưa cả xe vào ô và dừng khi thân xe song song với vạch.'},
    {name:'Dừng trước đường sắt',...railway,tip:'Dừng sát trước vạch trong 0,5 m và giữ động cơ hoạt động.'},
    {name:'Thay đổi số',x:shift.accelerate,y:shift.y,limit:120,tip:'Chạy số 1 ở đầu đoạn, lên số 2 và đạt 20 km/h. Về số 1, giảm còn tối đa 16 km/h trước cuối đoạn.'},
    {name:'Ghép ngang',...at(223,391),limit:120,tip:'Lùi vào ô ngang, dừng hẳn khi toàn bộ xe nằm trong ô và song song với vạch.'},
    {name:'Kết thúc',...finish,tip:'Bật xi-nhan phải và giữ động cơ hoạt động khi qua vạch kết thúc.'}
  ];
  const signs=[
    {...at(218,636),text:'START',type:'info'},
    {...at(318,637),text:'STOP',type:'stop'},
    {...at(343,636),text:'ĐI BỘ',type:'warn'},
    {...at(479,637),text:'DỐC',type:'warn'},
    {...at(738,467),text:'VỆT BÁNH',type:'warn'},
    {...at(466,394),text:'ĐÈN',type:'signal'},
    {...at(548,215),text:'CHỮ S',type:'warn'},
    {...at(179,293),text:'P',type:'info'},
    {...at(834,253),text:'STOP',type:'stop'},
    {...at(833,222),text:'ĐƯỜNG SẮT',type:'warn'},
    {x:shift.accelerate,y:Y(84),text:'20',type:'speed'},
    {x:shift.slow,y:Y(84),text:'16',type:'speed'},
    {...at(191,423),text:'P',type:'info'},
    {...at(176,482),text:'ĐÍCH',type:'info'}
  ];
  function light(now){
    const cycle=(now-epoch)%12000;
    return cycle<5000?'red':cycle<10500?'green':'yellow';
  }
  function polygon(vertices,color){ground.push({vertices,color});}
  function area(x,y,right,bottom,color){polygon([[x,y],[right,y],[right,bottom],[x,bottom]],color);}
  function stripe([x,y],[x1,y1],w,color){
    const length=Math.hypot(x1-x,y1-y);
    if(!length)return;
    const dx=(y-y1)*w/length/2, dy=(x1-x)*w/length/2;
    polygon([[x+dx,y+dy],[x1+dx,y1+dy],[x1-dx,y1-dy],[x-dx,y-dy]],color);
  }
  function addSegment(a,b){
    const dx=b[0]-a[0],dy=b[1]-a[1];
    const length2=dx*dx+dy*dy;
    if(length2)segments.push({a,b,dx,dy,length2,left:Math.min(a[0],b[0])-halfRoad,
      right:Math.max(a[0],b[0])+halfRoad,top:Math.min(a[1],b[1])-halfRoad,bottom:Math.max(a[1],b[1])+halfRoad});
  }
  function roundedPath(route){
    const path=[route[0]];
    for(let i=1;i<route.length-1;i++){
      const a=route[i-1],b=route[i],c=route[i+1];
      const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),cb=Math.hypot(c[0]-b[0],c[1]-b[1]);
      const trim=Math.min(118,ab*.43,cb*.43);
      const start=b.map((v,j)=>v+(a[j]-v)*trim/ab),end=b.map((v,j)=>v+(c[j]-v)*trim/cb);
      path.push(start);
      for(let step=1;step<=9;step++){
        const t=step/9,u=1-t;
        path.push(b.map((v,j)=>u*u*start[j]+2*u*t*v+t*t*end[j]));
      }
    }
    path.push(route.at(-1));
    return path;
  }
  const connectorSegments=[
    [xy(416,351),xy(486,351)],[xy(93,367),xy(93,567)],
    [xy(460,527),xy(626,527)],[xy(628,495),xy(628,527)],
    [xy(485,503),xy(532,503)],[xy(532,420),xy(532,503)],
    [xy(532,420),xy(781,420)],[xy(798,418),xy(798,515)]
  ];
  centerLine.push(...roundedPath(route));
  const upperLoop=roundedPath([[605,351],[706,351],[711,309],[668,246],
    [627,239],[605,214],[641,145],[665,121]].map(([x,y])=>xy(x,y)));
  for(const path of [centerLine,upperLoop]){
    for(let i=1;i<path.length;i++)addSegment(path[i-1],path[i]);
  }
  for(const [a,b] of connectorSegments)addSegment(a,b);
  // Overlap adjoining strips slightly so the perspective view has no seams at bends.
  for(const {a,b,dx,dy,length2} of segments){
    const len=Math.sqrt(length2),nx=-dy/len*halfRoad,ny=dx/len*halfRoad;
    const ex=dx/len*9,ey=dy/len*9;
    polygon([[a[0]-ex+nx,a[1]-ey+ny],[b[0]+ex+nx,b[1]+ey+ny],
      [b[0]+ex-nx,b[1]+ey-ny],[a[0]-ex-nx,a[1]-ey-ny]],'#646a65');
  }
  for(const surface of baySurfaces)area(...surface,'#646a65');
  area(...box(457,592,532,624),'#77796f');
  for(let x=458;x<532;x+=6)stripe(xy(x,592),xy(x,624),1,'#8f9284');
  function crossbar(bar,offset,color,w=4){
    stripe(point(bar,-62,offset),point(bar,62,offset),w,color);
  }
  for(const bar of [pedestrian,hill,railway,intersection,finish])crossbar(bar,0,'#f8f3d9',6);
  crossbar({...launch,a:east},0,'#f8f3d9',5);
  for(let u=-60;u<60;u+=16)stripe(point(pedestrian,u,-12),point(pedestrian,u,-60),7,'#e5dfce');
  for(const offset of [-35,-55])crossbar(railway,offset,'#4d4437',6);
  for(let u=-59;u<61;u+=12)stripe(point(railway,u,-29),point(railway,u,-63),3,'#9d9277');
  for(const offset of [14,38])stripe([track.entry,track.y-offset],[track.exit,track.y-offset],3,'#f2e9c9');
  stripe([shift.entry,shift.y],[shift.slow,shift.y],2.5,'#f6d478');
  for(const x of [shift.entry,shift.accelerate,shift.slow])crossbar({x,y:shift.y,a:west},0,'#edf0cf',3);
  for(let u=-60;u<=60;u+=15)
    stripe(point(intersection,u,-12),point(intersection,u,-49),7,'#e5dfce');
  for(const {goal:[x,y,a,w,l]} of bays){
    const box=corners({x,y,a},w,l);
    box.forEach((p,i)=>stripe(p,box[(i+1)%4],4,'#f4cb65'));
  }
  const vergeEdges=[];
  function edge(a,b,nx,ny){
    const count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/30);
    for(let i=0;i<count;i++){
      const mid=(i+.5)/count;
      const x=a[0]+(b[0]-a[0])*mid,y=a[1]+(b[1]-a[1])*mid;
      if(onRoad(x+nx*5,y+ny*5))continue;
      vergeEdges.push([a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count,
        a[0]+(b[0]-a[0])*(i+1)/count,a[1]+(b[1]-a[1])*(i+1)/count]);
    }
  }
  for(const {a,b,dx,dy,length2} of segments){
    const length=Math.sqrt(length2);
    for(const side of [-1,1]){
      const nx=-dy/length*side,ny=dx/length*side,r=halfRoad-1;
      edge([a[0]+nx*r,a[1]+ny*r],[b[0]+nx*r,b[1]+ny*r],nx,ny);
    }
  }
  for(const [x,y,x1,y1] of baySurfaces){
    edge([x,y],[x1,y],0,-1);edge([x1,y],[x1,y1],1,0);
    edge([x1,y1],[x,y1],0,1);edge([x,y1],[x,y],-1,0);
  }
  const wheels=[[-26,-36],[-26,36],[26,-36],[26,36]];
  const parkingAngle=Math.sin(4*toRadians);
  let index, since, epoch, gear, belt, engine, signal, sub, stopped, reversing, peakX, alert, alertUntil;
  function reset(now){
    index=0; since=epoch=now; gear=1; belt=false; engine=true; signal=''; sub=0;
    stopped=false; reversing=false; peakX=0; alert=''; alertUntil=0;
  }
  function controls(){
    return {gear,belt,signal,engine};
  }
  function toggle(control){
    if(control==='belt')belt=!belt;
    if(control==='gear')gear=gear===1?2:1;
    if(control==='engine')engine=!engine;
    if(control==='left'||control==='right')signal=signal===control?'':control;
  }
  function onRoad(x,y){
    if(baySurfaces.some(([x0,y0,x1,y1])=>x>=x0&&x<=x1&&y>=y0&&y<=y1))return true;
    return segments.some(s=>{
      if(x<s.left||x>s.right||y<s.top||y>s.bottom)return false;
      const t=Math.max(0,Math.min(1,((x-s.a[0])*s.dx+(y-s.a[1])*s.dy)/s.length2));
      return (x-s.a[0]-t*s.dx)**2+(y-s.a[1]-t*s.dy)**2<=halfRoad**2;
    });
  }
  function obstacle(pose){
    for(const x of [-28,0,28])for(const y of [-55.5,-28,0,28,55.5]){
      if(!onRoad(...point(pose,x,y)))return 'Chạm mép đường sa hình.';
    }
    return '';
  }
  function inRegion(car,x,y,r=72){return Math.hypot(car.x-x,car.y-y)<r;}
  function frontGap(car,bar){
    const dx=Math.sin(bar.a),dy=-Math.cos(bar.a);
    return -Math.max(...corners(car).map(([x,y])=>(x-bar.x)*dx+(y-bar.y)*dy));
  }
  function nearLine(car,bar,distance=125){
    const lateral=(car.x-bar.x)*Math.cos(bar.a)+(car.y-bar.y)*Math.sin(bar.a);
    const along=(car.x-bar.x)*Math.sin(bar.a)-(car.y-bar.y)*Math.cos(bar.a);
    return Math.abs(lateral)<66 && Math.abs(along)<distance;
  }
  function parked(car,[x,y,a,w,l]){
    const c=Math.cos(a),s=Math.sin(a);
    return Math.abs(Math.sin(car.a-a))<=parkingAngle&&corners(car).every(([px,py])=>{
      const dx=px-x,dy=py-y;
      return Math.abs(dx*c+dy*s)<w/2-2&&Math.abs(-dx*s+dy*c)<l/2-2;
    });
  }
  function forwardSpeed(){return gear===1?46:70;}
  function idleSpeed(car){
    return index===2&&stopped&&car.x>hill.x-66&&car.x<hillExit-30&&Math.abs(car.y-hill.y)<65
      ?-20*Math.sin(car.a):0;
  }
  function update(car,speed,now,moving=0){
    const stage=stages[index];
    if(!stage)return true;
    const warning=message=>{alert=message;alertUntil=now+1700;};
    function done(){
      index++;since=now;sub=0;stopped=reversing=false;peakX=0;alert='';alertUntil=0;
      return index===stages.length;
    }
    function ordered(points){
      const target=points[sub];
      if(target&&inRegion(car,...target))sub++;
      return sub===points.length;
    }
    if(stage.limit&&now-since>stage.limit*1000)
      warning('Quá '+stage.limit+' giây ở bài này. Bạn vẫn có thể hoàn thành để tập tiếp.');
    if(!engine&&moving)warning('Động cơ đang tắt. Bật máy trước khi đi tiếp.');
    if(index===0){
      if(car.x>launchReady-15&&(!belt||signal!=='left')&&sub===0)
        warning(!belt?'Cài dây an toàn trước khi xuất phát. Lùi về điểm đầu để thử lại.':'Bật xi-nhan trái trước khi xuất phát.');
      if(car.x<=launchReady&&belt&&engine&&signal==='left')sub=1;
      if(sub===1){
        if(signal!=='left'&&car.x<launchSignalOff){sub=0;warning('Tắt xi-nhan quá sớm. Hãy thử lại từ điểm đầu.');}
        else if(car.x>=launchSignalOff&&signal==='left')sub=2;
      }
      if(sub===2&&car.x>=launchSignalOff&&signal==='')return done();
      if(sub===2&&car.x>launchSignalOff+65)warning('Đã qua vạch xuất phát. Tắt xi-nhan trái.');
    }else if(index===1||index===2||index===7){
      if(nearLine(car,stage)){
        const gap=frontGap(car,stage);
        if(!stopped&&Math.abs(speed)<.01&&gap>=0&&gap<=12){
          if(index===7&&!engine)warning('Giữ động cơ hoạt động khi dừng trước đường sắt.');
          else{stopped=true;peakX=car.x;}
        }
        else if(!stopped&&gap<0)warning('Qua vạch khi chưa dừng. Lùi lại và dừng trong 0,5 m trước vạch.');
        else if(!stopped&&!speed&&gap<45)warning('Chưa sát vạch. Tiến chậm đến trong khoảng 0,5 m.');
      }
      if(stopped&&index===2){
        peakX=Math.max(peakX,car.x);
        if(peakX-car.x>12){stopped=false;warning('Xe tụt dốc quá 0,5 m. Giữ phanh và dừng lại đúng vạch.');}
        else if(engine&&gear!==1&&moving>0&&car.x<hillExit-30){
          engine=false;
          warning('Xe chết máy trên dốc. Giữ phanh, về số 1 rồi bật máy lại.');
        }else if(engine&&car.x>hillExit)return done();
      }else if(stopped)return done();
    }else if(index===3){
      if(sub<2&&car.x<=track.entry+6&&car.x>=track.exit-6){
        const right=wheels.slice(2).map(([x,y])=>point(car,x,y));
        const inside=Math.sin(car.a)<-.96&&right.every(([,y])=>y>track.y-32&&y<track.y-20);
        if(!inside){
          sub=0;
          warning('Đưa hai bánh phải vào giữa vệt trắng. Quay lại đầu vệt nếu đã đè vạch.');
        }else if(sub===0&&car.x>track.entry-66)sub=1;
        else if(sub===1&&car.x<track.exit+58)sub=2;
      }
      if(sub>=2&&ordered([[0,0,1],[0,0,1],...alignmentGates]))return done();
    }else if(index===4){
      const state=light(now);
      if(nearLine(car,stage)){
        const gap=frontGap(car,stage);
        if(gap>=0)sub=0;
        else if(state==='green'&&sub===0)sub=1;
        else if(sub===0){sub=-1;warning(state==='red'?'Đèn đỏ. Dừng trước vạch rồi chờ đèn xanh.':'Đèn vàng. Dừng trước vạch nếu còn an toàn.');}
      }
      if(sub===1&&car.y<Y(330)&&Math.abs(car.x-intersection.x)<70)return done();
    }else if(index===5){
      if(ordered(slalomGates))return done();
    }else if(index===6||index===9){
      const bay=bays[index===6?0:1].goal;
      if(speed<0&&inRegion(car,bay[0],bay[1],165))reversing=true;
      if(!speed&&parked(car,bay)){
        if(reversing)return done();
        warning('Hãy lùi xe vào ô để hoàn thành bài.');
      }
    }else if(index===8){
      if(inRegion(car,shift.entry,shift.y,70)&&gear===1&&speed>0)sub=Math.max(sub,1);
      if(sub===1&&inRegion(car,shift.accelerate,shift.y,140)&&car.x<shift.entry&&gear===2&&speed>=20/.35)sub=2;
      if(inRegion(car,shift.slow,shift.y,90)&&car.x<=shift.slow){
        if(sub===2&&gear===1&&speed>=0&&speed<=16/.35)return done();
        warning(sub<2?'Chưa đạt 20 km/h ở số 2. Quay lại đầu đoạn và thử lại.':'Về số 1 và giảm tốc xuống tối đa 16 km/h.');
      }
    }else if(index===10&&nearLine(car,finish)&&frontGap(car,finish)<0){
      if(signal==='right'&&engine&&speed>0)return done();
      warning(engine?'Bật xi-nhan phải trước khi qua vạch kết thúc.':'Giữ động cơ hoạt động khi qua vạch kết thúc.');
    }
    return false;
  }
  function status(now){
    const stage=stages[index];
    if(!stage)return {title:'Hoàn thành 11/11 bài',message:'Đã qua vạch kết thúc.',warning:false};
    const seconds=stage.limit&&Math.max(0,stage.limit-Math.floor((now-since)/1000));
    const lightText={red:'Đèn đỏ',yellow:'Đèn vàng',green:'Đèn xanh'};
    const suffix=index===4?' · '+lightText[light(now)]:'';
    return {title:(index+1)+'/11 · '+stage.name+(stage.limit?' · '+seconds+' giây':'')+suffix,
      message:now<alertUntil?alert:stage.tip,warning:now<alertUntil};
  }
  function draw(ctx,now){
    rect(0,0,width,height,0,'#355a42');
    for(const {vertices,color} of ground){
      ctx.beginPath();
      vertices.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.closePath();ctx.fillStyle=color;ctx.fill();
    }
    for(const segment of vergeEdges)line(...segment,'#dbc958',3.5);
    ctx.save();
    ctx.setLineDash([15,16]);
    ctx.beginPath();
    centerLine.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.strokeStyle='#b0bab0';ctx.lineWidth=2;ctx.stroke();
    ctx.restore();
    const arrows=[[260,607,east],[640,607,east],[701,506,west],[441,445,north],
      [441,295,north],[347,333,west],[800,272,north],[573,118,west],
      [93,205,south],[173,368,east],[315,455,west]];
    for(const [px,py,a] of arrows){
      const [x,y]=xy(px,py);
      const pose={x,y,a};
      const tip=point(pose,0,-15);
      line(...point(pose,0,14),...tip,'#e3e9da',3);
      for(const side of [-1,1])line(...point(pose,side*8,-4),...tip,'#e3e9da',3);
    }
    for(const [i,stage] of stages.entries()){
      const active=i===index;
      const [x,y]=stage.a===undefined?[stage.x,stage.y]:point(stage,-93,0);
      if(active){
        ctx.beginPath();ctx.arc(stage.x,stage.y,32,0,2*Math.PI);
        ctx.lineWidth=3;ctx.strokeStyle='#d6f77b';ctx.stroke();
      }
      rect(x-21,y-21,42,42,9,active?'#d6f77b':i<index?'#527646':'#1d3030');
      label(String(i+1),x,y+10,active?'#1d3030':'#eef4e8',27);
    }
    for(const sign of signs){
      if(sign.type==='stop'||sign.type==='speed'){
        ctx.beginPath();
        if(sign.type==='speed')ctx.arc(sign.x,sign.y,17,0,Math.PI*2);
        else for(let i=0;i<8;i++){
          const a=(i+.5)*Math.PI/4,x=sign.x+21*Math.cos(a),y=sign.y+21*Math.sin(a);
          if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
        }
        ctx.closePath();
        ctx.fillStyle=sign.type==='stop'?'#b2372e':'#f9f6eb';ctx.fill();
        ctx.strokeStyle=sign.type==='stop'?'#fff7e1':'#cf4540';ctx.lineWidth=3;ctx.stroke();
        label(sign.text,sign.x,sign.y+5,sign.type==='stop'?'#fff':'#1a2223',sign.type==='stop'?13:19);
        continue;
      }
      if(sign.type==='warn'){
        ctx.beginPath();ctx.moveTo(sign.x,sign.y-32);ctx.lineTo(sign.x-16,sign.y-6);
        ctx.lineTo(sign.x+16,sign.y-6);ctx.closePath();
        ctx.fillStyle='#f2cb5e';ctx.fill();ctx.strokeStyle='#c74137';ctx.lineWidth=3;ctx.stroke();
        label('!',sign.x,sign.y-10,'#3b2620',16);
      }
      const color={info:'#215989',stop:'#922f27',warn:'#a36426',speed:'#922f27',
        signal:{red:'#c83830',yellow:'#d79522',green:'#397f42'}[light(now)]}[sign.type];
      const half=Math.max(18,sign.text.length*6.4);
      rect(sign.x-half,sign.y-13,2*half,26,5,color);
      label(sign.text,sign.x,sign.y+6,'#fff',16);
    }
  }
  return {width,height,ground,signs,light,reset,controls,toggle,obstacle,forwardSpeed,idleSpeed,update,status,draw,
    start:[...xy(193,608),east],road:[0,width,0,height],
    parked:[[...xy(241,554),south],[...xy(256,554),south],[...xy(271,554),south]]};
}

if(typeof module!=='undefined')module.exports=createFullCourse;
