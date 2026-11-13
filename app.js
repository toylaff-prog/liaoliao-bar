(function(){
'use strict';
var stage=document.getElementById('stage');
function hideLoading(){var l=document.getElementById('loading');if(l){l.classList.add('done');setTimeout(function(){if(l.parentNode)l.parentNode.removeChild(l);},600);}}
if(typeof THREE==='undefined'||!THREE.OrbitControls){
  stage.innerHTML='<p style="padding:96px 24px;line-height:1.7">3D 元件載入失敗，請檢查網路後重新整理。</p>';hideLoading();return;
}
var renderer;
var isMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(('ontouchstart' in window)&&Math.min(screen.width,screen.height)<820);
try{ renderer=new THREE.WebGLRenderer({antialias:!isMobile,powerPreference:'high-performance'}); }
catch(e){ stage.innerHTML='<p style="padding:96px 24px;line-height:1.7">這個瀏覽器無法啟用 3D 繪圖（WebGL），請改用其他瀏覽器。</p>';hideLoading();return; }
var QS=new URLSearchParams(location.search);
var liteQ=QS.get('lite');
var liteOn=liteQ==='1'||(liteQ!=='0'&&(isMobile||(navigator.hardwareConcurrency||8)<=2));
var setLiteFn=null,autoLiteDone=false;
function pixelRatio(){return liteOn?1:Math.min(window.devicePixelRatio||1,isMobile?1.5:2);}
var NET={on:false,role:null,code:'',kind:'peer',mySeat:-1,cid:'',pw:'',reco:null,lastRx:0,banned:{},memo:{},sess:0,leaving:false,owner:[null,null,null,null,null,null,null],ownNames:[],peers:{},hostLink:null,hostTr:null,guestTr:null,myName:'',acc:0,lastF:'',fT:0};
renderer.setPixelRatio(pixelRatio());
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

var scene=new THREE.Scene();
var camera=new THREE.PerspectiveCamera(45,1,0.1,140);
var controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=0.08;
controls.maxPolarAngle=Math.PI*0.499;controls.minDistance=0.6;controls.maxDistance=26;
controls.autoRotateSpeed=1.2;

/* ================= helpers ================= */
var DS=THREE.DoubleSide;
var FONT='"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
function M(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:0.75,metalness:0},o||{}));}
function B(w,h,d){return new THREE.BoxGeometry(w,h,d);}
function C(rt,rb,h,s,open,ts,tl){return new THREE.CylinderGeometry(rt,rb,h,s||24,1,!!open,ts||0,tl===undefined?Math.PI*2:tl);}
function S(r,ws,hs){return new THREE.SphereGeometry(r,ws||16,hs||12);}
/* rounded-edge box */
function RB(w,h,d,r){
  r=Math.min(r,w/2-0.001,h/2-0.001,d/2-0.001);
  var sw=w-2*r,sh=h-2*r,s=new THREE.Shape();
  s.moveTo(-sw/2,-sh/2);s.lineTo(sw/2,-sh/2);s.lineTo(sw/2,sh/2);s.lineTo(-sw/2,sh/2);s.closePath();
  var g=new THREE.ExtrudeGeometry(s,{depth:Math.max(d-2*r,0.001),bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:4,curveSegments:1});
  g.translate(0,0,-(d-2*r)/2);return g;
}
function add(parent,geo,mat,x,y,z){
  var m=new THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);
  m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function ell(parent,mat,rx,ry,rz,x,y,z){var m=add(parent,S(1,20,14),mat,x,y,z);m.scale.set(rx,ry,rz);return m;}
function lookY(obj,tx,tz){obj.rotation.y=Math.atan2(tx-obj.position.x,tz-obj.position.z);}
function canvasTex(w,h,draw){
  var c=document.createElement('canvas');c.width=w;c.height=h;
  var g=c.getContext('2d');draw(g,w,h);
  var t=new THREE.CanvasTexture(c);t.anisotropy=4;return t;
}
function rr(g,x,y,w,h,r){
  g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);
  g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
}
function plane(parent,w,h,mat,x,y,z,ry){
  var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
  m.position.set(x,y,z);m.rotation.y=ry||0;m.receiveShadow=true;parent.add(m);return m;
}

var mats={
  white:M(0xf1ede6,{roughness:0.95}), whiteDS:M(0xf1ede6,{roughness:0.95,side:DS}),
  green:M(0x2e5a3e,{roughness:0.92}), black:M(0x1a1b1e,{roughness:0.45,metalness:0.35}),
  wood:M(0xb48e62,{roughness:0.6}), woodDark:M(0x6b4a33,{roughness:0.6}), woodLight:M(0xcfa87a,{roughness:0.7}),
  leather:M(0x1d1d21,{roughness:0.55}), leatherDS:M(0x1d1d21,{roughness:0.55,side:DS}),
  marble:M(0xeeeeec,{roughness:0.3}), cabinet:M(0xd9d3c8,{roughness:0.7}),
  steel:M(0xbfc4c8,{roughness:0.3,metalness:0.7}), yellow:M(0xf6d21a,{roughness:0.8}), orange:M(0xf0932b,{roughness:0.8}),
  pot:M(0x8a6a4f,{roughness:0.8}), leaf:M(0x4f8a4a,{roughness:0.9}), succ:M(0x7fa889,{roughness:0.9}),
  trough:M(0x2c3138,{roughness:0.6}), pipe:M(0xdfe3e3,{roughness:0.6})
};

/* textures */
var noiseTex=canvasTex(256,256,function(g,w,h){
  var d=g.createImageData(w,h);
  for(var i=0;i<d.data.length;i+=4){var v=128+(Math.random()-0.5)*120;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}
  g.putImageData(d,0,0);
});
noiseTex.wrapS=noiseTex.wrapT=THREE.RepeatWrapping;noiseTex.repeat.set(12,5);
var blobTex=canvasTex(128,128,function(g,w,h){
  var r=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);r.addColorStop(0,'rgba(0,0,0,.5)');r.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=r;g.fillRect(0,0,w,h);
});
var blobMat=new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false});

/* ================= dimensions / groups ================= */
var RX=4.5,RZ=3.5,RH=3.0;
var room=new THREE.Group();scene.add(room);
var props=new THREE.Group();scene.add(props);
function blob(x,z,r,sx,sz,parent){
  var m=new THREE.Mesh(new THREE.PlaneGeometry(r*2*(sx||1),r*2*(sz||1)),blobMat);
  m.raycast=function(){};
  m.rotation.x=-Math.PI/2;m.position.set(x,0.008,z);(parent||props).add(m);return m;
}
var movables=[],seats=[];
function reg(obj,r,label){
  obj.userData.movable=true;obj.userData.r=r;obj.userData.label=label;obj.userData.mi=movables.length;
  obj.userData.p0=obj.position.clone();obj.userData.r0=obj.rotation.y;movables.push(obj);return obj;
}
function seat(obj,lx,lz,top,yaw){
  var rec={obj:obj,local:new THREE.Vector3(lx,0,lz),top:top,yaw:yaw||0,taken:null,i:seats.length};seats.push(rec);return rec;
}

/* ================= lights ================= */
var hemi=new THREE.HemisphereLight(0xffffff,0xb9a68e,0.6);scene.add(hemi);
var sun=new THREE.DirectionalLight(0xfff3df,0.5);
sun.position.set(-2,10,-9);sun.target.position.set(0,0,0);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;
sun.shadow.camera.near=1;sun.shadow.camera.far=30;sun.shadow.bias=-0.0006;sun.shadow.radius=3;
scene.add(sun);scene.add(sun.target);
var ptLights=[];
[[-3.0,2.3,-2.6],[-1.0,2.3,-2.6],[1.0,2.3,-2.6],[-1.8,2.4,1.3],[2.4,2.4,1.6],[2.6,2.4,-1.0]].forEach(function(p){
  var l=new THREE.PointLight(0xffd9a0,0.2,7,1.5);l.position.set(p[0],p[1],p[2]);scene.add(l);ptLights.push(l);
});

/* ================= floor ================= */
var plank=canvasTex(512,512,function(g,w,h){
  var cols=['#8f765e','#866d56','#9a7f65','#8b7359','#947a60'];
  var rows=8,rh=h/rows;
  for(var r=0;r<rows;r++){
    var x=0,seed=(r*97)%53;
    while(x<w){
      var len=160+((seed*37+x)%180);
      g.fillStyle=cols[(r*3+Math.floor(x/160))%cols.length];
      g.fillRect(x,r*rh,Math.min(len,w-x),rh);
      for(var k=0;k<14;k++){g.fillStyle='rgba(50,32,20,.07)';g.fillRect(x+Math.random()*len,r*rh+Math.random()*rh,20+Math.random()*50,1);}
      g.fillStyle='rgba(60,40,25,.35)';g.fillRect(x,r*rh,1.5,rh);
      x+=len;seed+=7;
    }
    g.fillStyle='rgba(60,40,25,.3)';g.fillRect(0,r*rh,w,1.5);
  }
});
plank.wrapS=plank.wrapT=THREE.RepeatWrapping;plank.repeat.set(3,5.8);
var floor=new THREE.Mesh(new THREE.PlaneGeometry(RX*2,RZ*2),new THREE.MeshStandardMaterial({map:plank,roughness:0.7}));
floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;room.add(floor);
var slab=new THREE.Mesh(B(RX*2+0.3,0.18,RZ*2+0.3),new THREE.MeshStandardMaterial({color:0xcfc6b8,roughness:0.9}));
slab.position.y=-0.095;slab.receiveShadow=true;room.add(slab);

/* ================= walls ================= */
var wallMat=new THREE.MeshStandardMaterial({color:0xa6bdd2,roughness:0.95,bumpMap:noiseTex,bumpScale:0.1});
var wallDark=new THREE.MeshStandardMaterial({color:0x56728d,roughness:0.95,bumpMap:noiseTex,bumpScale:0.1});
var baseMat=M(0xe9e5dc,{roughness:0.8});
var wBack=new THREE.Group(),wFront=new THREE.Group(),wLeft=new THREE.Group(),wRight=new THREE.Group(),frontOut=new THREE.Group();
room.add(wBack,wFront,wLeft,wRight,frontOut);

/* ---- back wall: window band x -4.5..2.0, solid wall x 2.0..4.5 ---- */
var WX0=-4.5,WX1=2.0,WW=WX1-WX0,WC=(WX0+WX1)/2;
plane(wBack,WW,0.9,wallMat,WC,0.45,-RZ,0);
plane(wBack,WW,0.9,wallMat,WC,2.55,-RZ,0);
plane(wBack,RX-WX1,RH,wallMat,(WX1+RX)/2,RH/2,-RZ,0);
var glassMat=new THREE.MeshStandardMaterial({color:0xcfe6f5,roughness:0.1,transparent:true,opacity:0.26,depthWrite:false});
plane(wBack,WW,1.2,glassMat,WC,1.5,-RZ+0.01,0);
var cityTex=canvasTex(1024,160,function(g,w,h){
  var gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#d7e5ee');gr.addColorStop(1,'#c3d4c9');
  g.fillStyle=gr;g.fillRect(0,0,w,h);
  var x=0;
  while(x<w){
    var bw=70+Math.random()*90,bh=60+Math.random()*80;
    g.fillStyle='hsl('+(200+Math.random()*30)+',8%,'+(62+Math.random()*14)+'%)';g.fillRect(x,h-bh,bw,bh);
    g.fillStyle='rgba(255,255,255,.55)';
    for(var wy=h-bh+10;wy<h-10;wy+=22){for(var wx=x+8;wx<x+bw-14;wx+=20){g.fillRect(wx,wy,11,12);}}
    x+=bw+4;
  }
  for(var i=0;i<110;i++){
    g.fillStyle='rgba('+(45+Math.random()*40|0)+','+(105+Math.random()*60|0)+','+(55+Math.random()*30|0)+',.85)';
    g.beginPath();g.arc(Math.random()*w,h*0.5+Math.random()*h*0.55,12+Math.random()*26,0,7);g.fill();
  }
});
var backdropMat=new THREE.MeshBasicMaterial({map:cityTex});
plane(wBack,WW,1.2,backdropMat,WC,1.5,-RZ-0.35,0);
var grilleTex=canvasTex(512,512,function(g,w,h){
  g.clearRect(0,0,w,h);g.strokeStyle='rgba(238,238,238,.95)';g.lineWidth=3;
  for(var x=0;x<=w;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
  for(var y=0;y<=h;y+=64){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
});
grilleTex.wrapS=grilleTex.wrapT=THREE.RepeatWrapping;grilleTex.repeat.set(WW/0.8,1.2/0.8);
plane(wBack,WW,1.2,new THREE.MeshBasicMaterial({map:grilleTex,transparent:true,depthWrite:false,opacity:0.7}),WC,1.5,-RZ+0.02,0);
var frameMat=M(0xf0eee8,{roughness:0.6});
var mull=[];for(var mi=0;mi<=6;mi++){mull.push(WX0+mi*WW/6);}
mull.forEach(function(x){add(wBack,B(0.07,1.24,0.1),frameMat,x,1.5,-RZ+0.06);});
[0.91,1.5,2.09].forEach(function(y){add(wBack,B(WW,0.05,0.1),frameMat,WC,y,-RZ+0.06);});
for(var bi=0;bi<6;bi++){
  var bx=WX0+(bi+0.5)*WW/6;
  add(wBack,B(0.05,0.14,0.05),mats.steel,bx+0.38,1.42,-RZ+0.13);
}
add(wBack,B(WW+0.06,0.05,0.2),frameMat,WC,0.9,-RZ+0.1);
var blindMat=M(0x8d9094,{roughness:0.95});
[-3.4,-1.25,0.9].forEach(function(x){
  add(wBack,B(2.05,0.46,0.04),blindMat,x,1.86,-RZ+0.15);
  add(wBack,B(2.05,0.03,0.05),mats.steel,x,1.62,-RZ+0.15);
  add(wBack,B(2.1,0.08,0.08),mats.white,x,2.12,-RZ+0.14);
});
/* wall A/C above windows */
add(wBack,RB(1.15,0.3,0.24,0.05),mats.white,-3.9,2.62,-RZ+0.14);
add(wBack,B(1.0,0.02,0.02),M(0x9a9fa5),-3.9,2.52,-RZ+0.27);
/* pegboard + shelf beside the kitchenette */
var pegTex=canvasTex(256,420,function(g,w,h){
  g.fillStyle='#d9b88c';g.fillRect(0,0,w,h);g.fillStyle='rgba(70,45,25,.55)';
  for(var y=14;y<h;y+=22){for(var x=14;x<w;x+=22){g.beginPath();g.arc(x,y,3,0,7);g.fill();}}
});
add(wBack,RB(0.62,1.0,0.03,0.01),new THREE.MeshStandardMaterial({map:pegTex,roughness:0.8}),2.32,1.55,-RZ+0.03);
add(wBack,B(0.5,0.03,0.12),mats.woodDark,2.32,1.4,-RZ+0.1);
add(wBack,B(0.5,0.03,0.12),mats.woodDark,2.32,1.0,-RZ+0.1);
add(wBack,C(0.04,0.035,0.08,12),mats.white,2.2,1.45,-RZ+0.1);
add(wBack,C(0.04,0.035,0.08,12),mats.white,2.34,1.45,-RZ+0.1);
add(wBack,B(0.1,0.12,0.08),mats.cabinet,2.46,1.47,-RZ+0.1);
add(wBack,B(0.38,0.01,0.01),mats.black,2.32,1.7,-RZ+0.07);
var bbs=add(wBack,B(WW+0.4,0.1,0.02),baseMat,WC,0.05,-RZ+0.01);bbs.castShadow=false;

/* ---- inside of the entrance wall ---- */
plane(wFront,RX*2,RH,wallMat,0,RH/2,RZ,Math.PI);
add(wFront,B(1.1,2.15,0.05),M(0x3b2a20,{roughness:0.6}),-3.3,1.075,RZ-0.03);
add(wFront,B(0.96,2.07,0.05),M(0x6c5140,{roughness:0.55}),-3.3,1.04,RZ-0.065);
add(wFront,B(0.12,0.04,0.07),mats.black,-3.0,1.0,RZ-0.12);
add(wFront,B(0.1,0.28,0.03),mats.black,-3.0,1.35,RZ-0.1);
var posterTex=canvasTex(320,440,function(g,w,h){
  g.fillStyle='#fbfaf6';g.fillRect(0,0,w,h);g.fillStyle='#2b4a6b';g.fillRect(0,0,w,86);
  g.fillStyle='#fff';g.font='700 40px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('場地使用須知',w/2,44);
  g.fillStyle='#c9d3dd';for(var y=124;y<h-30;y+=34){g.fillRect(34,y,w-68,10);}
});
add(wFront,B(0.64,0.9,0.025),M(0x2a2a2a),-1.6,1.55,RZ-0.03);
plane(wFront,0.58,0.82,new THREE.MeshBasicMaterial({map:posterTex}),-1.6,1.55,RZ-0.045,Math.PI);
var clockTex=canvasTex(128,128,function(g,w,h){
  g.fillStyle='#fff';g.beginPath();g.arc(64,64,60,0,7);g.fill();g.strokeStyle='#222';g.lineWidth=5;g.stroke();
  g.lineWidth=5;g.beginPath();g.moveTo(64,64);g.lineTo(64,24);g.stroke();g.lineWidth=4;g.beginPath();g.moveTo(64,64);g.lineTo(92,76);g.stroke();
});
var clock=new THREE.Mesh(new THREE.CircleGeometry(0.17,32),new THREE.MeshBasicMaterial({map:clockTex}));
clock.position.set(-0.4,2.1,RZ-0.03);clock.rotation.y=Math.PI;wFront.add(clock);
add(wFront,B(RX*2,0.1,0.02),baseMat,0,0.05,RZ-0.01).castShadow=false;

/* ---- exterior (corridor side) of the entrance wall: shown only when the camera stands close outside ---- */
var beigeMat=new THREE.MeshStandardMaterial({color:0xc9c1b2,roughness:0.95,bumpMap:noiseTex,bumpScale:0.1});
plane(frontOut,RX*2,RH,beigeMat,0,RH/2,RZ+0.01,0);
var corridorTex=canvasTex(512,512,function(g,w,h){
  g.fillStyle='#d79b92';g.fillRect(0,0,w,h);
  for(var i=0;i<900;i++){
    var t=Math.random();g.fillStyle=t<0.4?'#3b3f40':(t<0.7?'#f2e7dc':'#8a8f8c');
    g.beginPath();g.arc(Math.random()*w,Math.random()*h,1.5+Math.random()*4,0,7);g.fill();
  }
});
corridorTex.wrapS=corridorTex.wrapT=THREE.RepeatWrapping;corridorTex.repeat.set(6,2);
var corridor=new THREE.Mesh(new THREE.PlaneGeometry(RX*2+0.3,3.2),new THREE.MeshStandardMaterial({map:corridorTex,roughness:0.55}));
corridor.rotation.x=-Math.PI/2;corridor.position.set(0,0.002,RZ+1.75);corridor.receiveShadow=true;frontOut.add(corridor);
var wavePts=[];for(var wx=-RX;wx<=RX+0.001;wx+=0.15){wavePts.push(new THREE.Vector3(wx,2.25+0.2*Math.sin(wx*0.8+0.5)+0.06*Math.sin(wx*2.4),RZ+0.04));}
var outLedMat=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffd9a0,emissiveIntensity:1.6});
frontOut.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wavePts),80,0.025,8,false),outLedMat));
var neonTex=canvasTex(1024,256,function(g,w,h){
  g.clearRect(0,0,w,h);g.font='700 150px '+FONT;g.textAlign='center';g.textBaseline='middle';
  g.shadowColor='#fff25a';g.shadowBlur=36;g.fillStyle='#fff25a';g.fillText('聊聊BAR',w/2,h/2+6);
  g.shadowBlur=0;g.fillStyle='#fffbb0';g.fillText('聊聊BAR',w/2,h/2+6);
});
plane(frontOut,2.8,0.7,new THREE.MeshBasicMaterial({map:neonTex,transparent:true,depthWrite:false}),-0.2,1.55,RZ+0.06,0);
var tagTex=canvasTex(512,256,function(g,w,h){
  g.clearRect(0,0,w,h);g.fillStyle='#1b1b1d';g.font='italic 600 44px '+FONT;g.textBaseline='top';
  g.fillText('Bring',8,8);g.fillText('A cup of coffee and',8,78);g.fillText('Refresh here.',8,148);
});
plane(frontOut,1.8,0.9,new THREE.MeshBasicMaterial({map:tagTex,transparent:true}),2.1,1.5,RZ+0.04,0);
/* round hanging light box */
var signTex=canvasTex(256,256,function(g,w,h){
  g.fillStyle='#f6f1e7';g.beginPath();g.arc(128,128,124,0,7);g.fill();
  g.fillStyle='#d9573f';g.font='700 54px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('聊聊',90,70);
  g.fillStyle='#2b4a6b';g.font='700 70px '+FONT;g.fillText('B A R',128,150);
  g.fillStyle='#6b4a33';g.beginPath();g.arc(88,206,22,0,7);g.fill();g.fillStyle='#f6f1e7';g.beginPath();g.arc(88,206,13,0,7);g.fill();
});
add(frontOut,C(0.45,0.45,0.2,40),mats.black,-2.0,2.45,RZ+0.34).rotation.x=Math.PI/2;
var signFace=new THREE.Mesh(new THREE.CircleGeometry(0.43,40),new THREE.MeshBasicMaterial({map:signTex}));
signFace.position.set(-2.0,2.45,RZ+0.445);frontOut.add(signFace);
add(frontOut,B(0.06,0.06,0.3),mats.black,-2.0,2.45,RZ+0.18);
/* door from the corridor + smart lock */
add(frontOut,B(1.1,2.15,0.06),M(0x3b2a20,{roughness:0.6}),-3.3,1.075,RZ+0.04);
add(frontOut,B(0.96,2.07,0.05),M(0x7a5a45,{roughness:0.5}),-3.3,1.04,RZ+0.075);
add(frontOut,B(0.07,0.26,0.03),mats.black,-3.02,1.0,RZ+0.11);
add(frontOut,B(0.12,0.04,0.05),mats.black,-3.0,0.98,RZ+0.13);
/* fluted wood panel + plaque */
var flute=canvasTex(128,256,function(g,w,h){
  for(var x=0;x<w;x+=8){g.fillStyle='#b98d6b';g.fillRect(x,0,6,h);g.fillStyle='#8f6a4e';g.fillRect(x+6,0,2,h);}
});
add(frontOut,B(0.66,2.3,0.05),new THREE.MeshStandardMaterial({map:flute,roughness:0.7}),-4.15,1.15,RZ+0.04);
var plaqueTex=canvasTex(256,420,function(g,w,h){
  g.fillStyle='#f8f8f6';g.fillRect(0,0,w,h);g.fillStyle='#a1523a';g.textAlign='center';g.font='italic 700 56px '+FONT;
  g.fillText('Coffee,',w/2,110);g.fillText('Tea',w/2-24,175);g.font='italic 700 34px '+FONT;g.fillText('or',w/2+50,172);
  g.font='italic 700 56px '+FONT;g.fillText('Me?',w/2,240);
  g.fillStyle='#555';g.font='italic 400 20px '+FONT;g.fillText('A Little Sip, A Little Chat.',w/2,300);
});
plane(frontOut,0.4,0.66,new THREE.MeshBasicMaterial({map:plaqueTex}),-4.15,1.35,RZ+0.075,0);
add(frontOut,B(0.66,0.03,0.07),outLedMat,-4.15,2.28,RZ+0.07);

frontOut.traverse(function(o){if(o.isMesh)o.receiveShadow=false;});
/* ---- right wall ---- */
plane(wRight,RZ*2,RH,wallMat,RX,RH/2,0,-Math.PI/2);
var tvTex=canvasTex(512,288,function(g,w,h){
  g.fillStyle='#f6f9fc';g.fillRect(0,0,w,h);
  g.fillStyle='#2f2f2f';g.textAlign='center';g.font='700 46px '+FONT;g.fillText('親師交流道',w/2,92);
  g.fillStyle='#fff';g.strokeStyle='#2f2f2f';g.lineWidth=4;g.font='700 70px '+FONT;
  g.strokeText('聊聊BAR',w/2,170);g.fillText('聊聊BAR',w/2,170);
  rr(g,w/2-100,200,200,50,10);g.fillStyle='#2e9a5c';g.fill();
  g.fillStyle='#fff';g.font='700 32px '+FONT;g.fillText('揭幕啟用',w/2,238);
});
add(wRight,B(0.05,1.24,2.14),M(0x111214,{roughness:0.4}),RX-0.04,1.8,-0.9);
plane(wRight,2.05,1.15,new THREE.MeshBasicMaterial({map:tvTex}),RX-0.07,1.8,-0.9,-Math.PI/2);
add(wRight,RB(1.25,0.3,0.26,0.05),mats.white,RX-0.15,2.65,1.7);
add(wRight,B(0.02,0.02,1.0),M(0x9a9fa5),RX-0.29,2.55,1.7);
[-2.2,0.5].forEach(function(z){
  add(wRight,RB(0.2,0.3,0.18,0.03),mats.black,RX-0.1,2.45,z);
  add(wRight,C(0.05,0.05,0.02,16),M(0x333437),RX-0.2,2.45,z).rotation.z=Math.PI/2;
});
add(wRight,RB(0.07,0.2,0.1,0.02),mats.black,RX-0.04,1.45,-2.85);
add(wRight,C(0.012,0.012,0.12,8),mats.black,RX-0.08,1.28,-2.85);
add(wRight,B(0.03,2.9,0.03),mats.pipe,RX-0.03,1.45,-3.35);
add(wRight,B(0.03,2.9,0.03),mats.pipe,RX-0.03,1.45,3.35);
add(wRight,B(RZ*2,0.1,0.02),baseMat,RX-0.01,0.05,0).rotation.y=Math.PI/2;

/* ---- left wall: dark wall + wavy light-blue panel with LED strip ---- */
plane(wLeft,RZ*2,RH,wallDark,-RX,RH/2,0,Math.PI/2);
function waveTop(z){return 1.55+0.4*Math.sin(z*0.85+0.4)+0.12*Math.sin(z*2.3);}
var ws=new THREE.Shape();ws.moveTo(-RZ,0);
for(var u=-RZ;u<=RZ+0.001;u+=0.1){ws.lineTo(u,waveTop(-u));}
ws.lineTo(RZ,0);ws.closePath();
var wavy=new THREE.Mesh(new THREE.ExtrudeGeometry(ws,{depth:0.12,bevelEnabled:false}),new THREE.MeshStandardMaterial({color:0xb2cae0,roughness:0.95,bumpMap:noiseTex,bumpScale:0.1}));
wavy.rotation.y=Math.PI/2;wavy.position.set(-RX,0,0);wavy.receiveShadow=true;wavy.castShadow=true;wLeft.add(wavy);
var ledPts=[];for(var z=-RZ;z<=RZ+0.001;z+=0.1){ledPts.push(new THREE.Vector3(-RX+0.14,waveTop(z)-0.02,z));}
var ledMat=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffe0b0,emissiveIntensity:1,roughness:0.5});
wLeft.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ledPts),120,0.028,8,false),ledMat));
/* electrical box + conduit, display shelf with glass dome */
add(wLeft,RB(0.3,0.36,0.1,0.02),mats.white,-RX+0.06,2.3,-0.9);
add(wLeft,B(0.02,0.02,0.2),mats.black,-RX+0.05,2.3,-0.9);
add(wLeft,C(0.02,0.02,0.7,8),mats.pipe,-RX+0.05,2.65,-0.9);
add(wLeft,B(0.2,0.03,0.4),mats.woodLight,-RX+0.14,1.3,3.0);
add(wLeft,C(0.07,0.08,0.05,18),mats.white,-RX+0.16,1.34,3.0);
var domeMat=new THREE.MeshStandardMaterial({color:0xdff1f7,transparent:true,opacity:0.35,roughness:0.05,side:DS,depthWrite:false});
add(wLeft,new THREE.SphereGeometry(0.1,20,12,0,Math.PI*2,0,Math.PI/2),domeMat,-RX+0.16,1.315,3.0);
add(wLeft,S(0.04,10,8),M(0xd9a7ad),-RX+0.16,1.38,3.0);
add(wLeft,B(0.02,2.9,0.03),mats.pipe,-RX+0.03,1.45,-3.35);
add(wLeft,B(RZ*2,0.1,0.02),baseMat,-RX+0.01,0.05,0).rotation.y=Math.PI/2;

/* wall caps (always visible) */
var capMat=new THREE.MeshStandardMaterial({color:0xe2dcd2,roughness:0.9});
[[RX*2+0.3,0.08,0.15,0,RH,-RZ-0.075],[RX*2+0.3,0.08,0.15,0,RH,RZ+0.075],
 [0.15,0.08,RZ*2,-RX-0.075,RH,0],[0.15,0.08,RZ*2,RX+0.075,RH,0]].forEach(function(c){
  var m=new THREE.Mesh(B(c[0],c[1],c[2]),capMat);m.position.set(c[3],c[4],c[5]);room.add(m);
});
[[-RX,-RZ],[RX,-RZ],[-RX,RZ],[RX,RZ]].forEach(function(p){
  var m=new THREE.Mesh(B(0.12,RH,0.12),capMat);m.position.set(p[0]+(p[0]<0?-0.06:0.06),RH/2,p[1]+(p[1]<0?-0.06:0.06));room.add(m);
});

/* ---- ceiling: plane, beams, cassette fan, duct ---- */
var ceilGroup=new THREE.Group();room.add(ceilGroup);
var ceilMat=new THREE.MeshStandardMaterial({color:0xe6ece9,roughness:0.95});
var ceilPlane=new THREE.Mesh(new THREE.PlaneGeometry(RX*2,RZ*2),ceilMat);
ceilPlane.rotation.x=Math.PI/2;ceilPlane.position.y=RH;ceilGroup.add(ceilPlane);
[[-1.9],[2.5]].forEach(function(b){add(ceilGroup,B(RX*2,0.28,0.3),M(0xdde4e1,{roughness:0.95}),0,RH-0.14,b[0]);});
add(ceilGroup,B(0.3,0.28,RZ*2),M(0xdde4e1,{roughness:0.95}),3.0,RH-0.14,0);
add(ceilGroup,RB(0.7,0.1,0.7,0.03),mats.white,-3.0,RH-0.05,2.0);
add(ceilGroup,C(0.24,0.24,0.02,28),M(0xcfd5d6),-3.0,RH-0.11,2.0);
for(var fi=0;fi<4;fi++){var bl=add(ceilGroup,B(0.2,0.01,0.06),M(0xe9eded),-3.0+Math.cos(fi*Math.PI/2)*0.12,RH-0.125,2.0+Math.sin(fi*Math.PI/2)*0.12);bl.rotation.y=-fi*Math.PI/2;}
add(ceilGroup,C(0.03,0.03,RX*2,10),mats.pipe,0,RH-0.06,-RZ+0.1).rotation.z=Math.PI/2;

/* ================= furniture builders ================= */
function stool(h,back){
  var g=new THREE.Group();
  add(g,RB(0.36,0.07,0.36,0.03),mats.leather,0,h,0);
  for(var i=0;i<4;i++){
    var a=i*Math.PI/2+Math.PI/4;
    var lg=add(g,C(0.011,0.011,h,8),mats.woodDark,Math.cos(a)*0.14,h/2,Math.sin(a)*0.14);
  }
  var ring=add(g,new THREE.TorusGeometry(0.15,0.01,6,20),mats.woodDark,0,h*0.38,0);ring.rotation.x=Math.PI/2;
  if(back){add(g,C(0.19,0.19,0.16,20,true,Math.PI-0.8,1.6),mats.leatherDS,0,h+0.12,0);}
  return g;
}
function chair(){
  var g=new THREE.Group();
  add(g,RB(0.46,0.09,0.44,0.035),mats.white,0,0.46,0);
  [[-0.2,-0.19],[0.2,-0.19],[-0.2,0.19],[0.2,0.19]].forEach(function(p){add(g,B(0.025,0.42,0.025),mats.black,p[0],0.21,p[1]);});
  add(g,C(0.27,0.27,0.4,22,true,Math.PI-1.15,2.3),mats.whiteDS,0,0.7,0.02);
  return g;
}
function armchair(){
  var g=new THREE.Group();
  add(g,C(0.42,0.4,0.4,28),mats.white,0,0.2,0);
  add(g,C(0.4,0.4,0.12,28),mats.white,0,0.46,0);
  add(g,C(0.45,0.45,0.55,28,true,Math.PI-1.3,2.6),mats.whiteDS,0,0.72,0);
  add(g,C(0.43,0.43,0.55,28,true,Math.PI-1.3,2.6),M(0xe7e2d8,{roughness:0.95,side:DS}),0,0.72,0);
  return g;
}
function coffeeTable(r,h){
  var g=new THREE.Group();
  add(g,C(r,r,0.04,36),mats.marble,0,h,0);
  var ring=add(g,new THREE.TorusGeometry(r-0.05,0.012,6,36),mats.black,0,h-0.05,0);ring.rotation.x=Math.PI/2;
  for(var i=0;i<3;i++){var a=i*Math.PI*2/3;add(g,C(0.012,0.012,h,8),mats.black,Math.cos(a)*(r-0.05),h/2,Math.sin(a)*(r-0.05));}
  return g;
}
function highTable(w,d){
  var g=new THREE.Group();
  add(g,RB(w,0.05,d,0.012),mats.wood,0,1.05,0);
  add(g,B(w-0.02,0.03,d-0.02),mats.black,0,1.015,0);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){add(g,B(0.05,1.03,0.05),mats.black,s[0]*(w/2-0.06),0.515,s[1]*(d/2-0.06));});
  add(g,B(w-0.12,0.03,0.03),mats.black,0,0.3,d/2-0.06);add(g,B(w-0.12,0.03,0.03),mats.black,0,0.3,-d/2+0.06);
  add(g,B(0.03,0.03,d-0.12),mats.black,w/2-0.06,0.3,0);add(g,B(0.03,0.03,d-0.12),mats.black,-w/2+0.06,0.3,0);
  return g;
}
function plush(kind){
  var g=new THREE.Group();
  if(kind==='pika'){
    ell(g,mats.yellow,0.12,0.13,0.1,0,0.13,0);ell(g,mats.yellow,0.1,0.09,0.09,0,0.31,0.01);
    [-1,1].forEach(function(s){
      var e=add(g,B(0.035,0.13,0.02),mats.yellow,s*0.065,0.45,0);e.rotation.z=-s*0.3;
      var t=add(g,B(0.037,0.05,0.022),mats.black,s*0.085,0.5,0);t.rotation.z=-s*0.3;
      ell(g,M(0xe0442e),0.02,0.02,0.01,s*0.07,0.285,0.088);
      ell(g,mats.black,0.012,0.014,0.008,s*0.04,0.335,0.092);
    });
    ell(g,mats.black,0.006,0.005,0.005,0,0.31,0.1);
    var t1=add(g,B(0.04,0.1,0.02),mats.yellow,0,0.12,-0.12);t1.rotation.x=-0.5;
    var t2=add(g,B(0.08,0.07,0.02),mats.yellow,0,0.2,-0.16);t2.rotation.x=-0.5;
  }else{
    ell(g,mats.yellow,0.13,0.12,0.11,0,0.12,0);ell(g,mats.yellow,0.11,0.1,0.1,0,0.29,0.01);
    ell(g,mats.orange,0.075,0.028,0.05,0,0.255,0.1);
    [-1,1].forEach(function(s){
      ell(g,mats.white,0.024,0.024,0.012,s*0.04,0.335,0.09);ell(g,mats.black,0.01,0.01,0.008,s*0.04,0.335,0.1);
    });
    for(var i=-1;i<=1;i++){add(g,C(0.002,0.002,0.07,4),mats.black,i*0.012,0.41,0.02).rotation.z=i*0.25;}
  }
  g.children.forEach(function(m){m.castShadow=false;});
  return g;
}
function curvedSofa(){
  var g=new THREE.Group(),A0=-Math.PI*0.4,A1=Math.PI*0.4;
  function arc(ro,ri,a0,a1,depth,mat,y,bev){
    var sh=new THREE.Shape();sh.absarc(0,0,ro,a0,a1,false);sh.absarc(0,0,ri,a1,a0,true);sh.closePath();
    var m=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:depth,bevelEnabled:true,bevelSize:bev||0.035,bevelThickness:bev||0.035,bevelSegments:4,curveSegments:40}),mat);
    m.rotation.x=-Math.PI/2;m.position.y=y;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
  }
  var white=M(0xf1ede6,{roughness:0.97}),green=M(0x2e5a3e,{roughness:0.95});
  arc(1.2,0.6,A0,A1,0.34,white,0.05,0.04);
  arc(1.45,1.2,A0,0.0,0.84,white,0.05,0.045);
  arc(1.45,1.2,0.0,A1,0.84,green,0.05,0.045);
  var span=A1-A0;
  for(var k=0;k<3;k++){
    var a0=A0+k*span/3+0.025,a1=A0+(k+1)*span/3-0.025;
    arc(1.2,0.62,a0,a1,0.12,white,0.42,0.045);
    arc(1.2,1.03,a0,a1,0.3,white,0.55,0.05);
  }
  var p1=plush('pika');p1.position.set(0.9*Math.cos(0.3),0.58,-0.9*Math.sin(0.3));p1.rotation.y=-Math.PI/2+0.3;g.add(p1);
  var p2=plush('duck');p2.position.set(0.9*Math.cos(-0.2),0.58,-0.9*Math.sin(-0.2));p2.rotation.y=-Math.PI/2-0.2;g.add(p2);
  [[0.5,0x2e5a3e],[-0.6,0xf1ede6]].forEach(function(c){
    var pc=add(g,RB(0.4,0.32,0.11,0.05),M(c[1],{roughness:0.95}),1.0*Math.cos(c[0]),0.78,-1.0*Math.sin(c[0]));
    pc.rotation.y=-Math.PI/2+c[0]-0.12;pc.rotation.x=-0.18;pc.castShadow=false;
  });
  return g;
}
function curveWall(parent,pts,h,th,mat,pleat){
  var n=pts.length-1;
  for(var i=0;i<n;i++){
    var x1=pts[i][0],z1=pts[i][1],x2=pts[i+1][0],z2=pts[i+1][1];
    var dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),hh=typeof h==='function'?h(i/n):h;
    var m=add(parent,B(len+0.01,hh,th),mat,(x1+x2)/2,hh/2,(z1+z2)/2);
    m.rotation.y=Math.atan2(-dz,dx);
    if(pleat&&i%2){m.position.x+=-dz/len*pleat;m.position.z+=dx/len*pleat;}
  }
}
function plant(parent,x,y,z,s){
  add(parent,C(0.05*s,0.04*s,0.08*s,12),mats.pot,x,y+0.04*s,z);
  for(var i=0;i<5;i++){var a=i*1.26;add(parent,S(0.032*s,8,6),mats.leaf,x+Math.cos(a)*0.03*s,y+0.1*s+(i%2)*0.025*s,z+Math.sin(a)*0.03*s);}
}
function cup(parent,x,y,z){
  add(parent,C(0.055,0.05,0.005,16),mats.white,x,y+0.0025,z);
  add(parent,C(0.032,0.026,0.06,14,false),mats.white,x,y+0.035,z);
}
function marquee(ch){
  var mk=document.createElement('canvas');mk.width=160;mk.height=200;
  var mg=mk.getContext('2d');mg.fillStyle='#000';mg.fillRect(0,0,160,200);
  mg.fillStyle='#fff';mg.font='700 180px '+FONT;mg.textAlign='center';mg.textBaseline='middle';mg.fillText(ch,80,104);
  var data=mg.getImageData(0,0,160,200).data;
  return canvasTex(160,200,function(g,w,h){
    g.clearRect(0,0,w,h);g.fillStyle='#f8f4e8';g.font='700 180px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(ch,80,104);
    g.fillStyle='#ffd23a';
    for(var y=12;y<h;y+=17){for(var x=12;x<w;x+=17){
      if(data[(y*w+x)*4]>150){g.beginPath();g.arc(x,y,4.2,0,7);g.fill();}
    }}
  });
}

/* ================= 沙發區 ================= */
var sofa=curvedSofa();sofa.position.set(-2.0,0,1.3);sofa.rotation.y=Math.PI;props.add(sofa);
blob(0.7,0,1.5,0.9,1.2,sofa);reg(sofa,1.6,'沙發');
var sofaSeats=[-0.62,0,0.62].map(function(an){
  return seat(sofa,0.9*Math.cos(an),-0.9*Math.sin(an),0.5,Math.atan2(-Math.cos(an),Math.sin(an)));
});
var ct1=coffeeTable(0.5,0.42);ct1.position.set(-1.75,0,1.3);props.add(ct1);blob(0,0,0.7,1,1,ct1);reg(ct1,0.55,'大茶几');
var ct2=coffeeTable(0.32,0.34);ct2.position.set(-1.45,0,0.55);props.add(ct2);blob(0,0,0.45,1,1,ct2);reg(ct2,0.36,'小茶几');
cup(ct1,0.13,0.44,-0.12);
add(ct1,C(0.05,0.05,0.04,16),M(0xe6738a,{roughness:0.5}),-0.15,0.46,-0.18);
add(ct1,C(0.035,0.03,0.04,14),M(0xf4c2c8,{roughness:0.5}),-0.15,0.5,-0.18);
plant(ct1,-0.05,0.44,0.15,1.2);
var arm=armchair();arm.position.set(-0.85,0,2.25);lookY(arm,-1.75,1.3);props.add(arm);blob(0,0,0.65,1,1,arm);reg(arm,0.5,'單人沙發');
var armSeat=seat(arm,0,0,0.52,0);
var cloud=add(props,S(0.3,24,16),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xcfe6ff,emissiveIntensity:0.7}),-0.6,2.35,0.9);
cloud.scale.set(1,0.28,0.55);cloud.castShadow=false;
add(props,C(0.004,0.004,0.65,4),mats.black,-0.6,2.68,0.9);
var accPts=[];for(var ai=0;ai<=70;ai++){var at=ai/70;accPts.push([-4.15+0.35*Math.sin(at*Math.PI*1.1),3.1-3.3*at]);}
var accordion=new THREE.Group();props.add(accordion);
curveWall(accordion,accPts,2.35,0.07,mats.white,0.03);
/* free-standing white panel with an oar-shaped foot */
var panel=new THREE.Group();props.add(panel);
var pPts=[];for(var pi=0;pi<=16;pi++){var pt=pi/16;pPts.push([0.7-0.2*Math.sin(pt*Math.PI*0.9),0.8+2.0*pt]);}
curveWall(panel,pPts,function(t){return 2.35-0.45*t;},0.1,mats.white,0);
add(panel,RB(0.12,2.45,0.12,0.03),mats.white,0.7,1.225,0.72);
add(panel,RB(0.34,0.55,0.08,0.035),mats.white,0.7,0.275,0.72);

/* ================= 晤談區 ================= */
var rt=new THREE.Group();rt.position.set(2.6,0,2.0);props.add(rt);
add(rt,C(0.56,0.56,0.04,36),M(0xe9e9e6,{roughness:0.25}),0,0.74,0);
add(rt,C(0.04,0.04,0.72,10),mats.black,0,0.36,0);
add(rt,C(0.3,0.3,0.025,24),mats.black,0,0.015,0);
var rtSeats=[];
for(var ri=0;ri<4;ri++){
  var ra=ri*Math.PI/2+Math.PI/4,ch=chair();
  ch.position.set(rt.position.x+Math.cos(ra)*0.85,0,rt.position.z+Math.sin(ra)*0.85);lookY(ch,rt.position.x,rt.position.z);props.add(ch);
  blob(0,0,0.42,1,1,ch);reg(ch,0.32,'椅子');rtSeats.push(seat(ch,0,0,0.5,0));
}
blob(0,0,0.7,1,1,rt);reg(rt,0.62,'圓桌');
cup(rt,-0.15,0.76,-0.1);cup(rt,0.2,0.76,0.1);
add(rt,B(0.11,0.07,0.07),mats.white,0.02,0.795,0.18);

/* ================= 吧台區 ================= */
var bar=highTable(1.8,0.7);bar.position.set(-1.3,0,-1.4);props.add(bar);blob(0,0,1.1,1,0.6,bar);reg(bar,1.0,'吧台高桌');
[[-1.7,-0.7],[-0.9,-0.7],[-1.7,-2.1],[-0.9,-2.1]].forEach(function(p){
  var s=stool(0.76,true);s.position.set(p[0],0,p[1]);lookY(s,-1.3,-1.4);props.add(s);blob(0,0,0.3,1,1,s);reg(s,0.25,'高腳椅');seat(s,0,0,0.795,0);
});
'DHJH'.split('').forEach(function(ch,i){
  var x=-0.65+i*0.43,y=1.075,tex=marquee(ch),zc=0;
  for(var L=3;L>=1;L--){
    var back=new THREE.Mesh(new THREE.PlaneGeometry(0.2,0.25),new THREE.MeshBasicMaterial({map:tex,color:0xc9c4b6,transparent:true,alphaTest:0.5}));
    back.position.set(x,y+0.13,zc-0.012*L);bar.add(back);
  }
  var f=new THREE.Mesh(new THREE.PlaneGeometry(0.2,0.25),new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:0.5}));
  f.position.set(x,y+0.13,zc);bar.add(f);
});

/* ================= 窗邊吧檯 ================= */
var CX0=-4.5,CX1=2.0,CL=CX1-CX0,CC=(CX0+CX1)/2;
add(props,RB(CL,0.04,0.46,0.01),mats.wood,CC,0.9,-3.25);
for(var bi2=0;bi2<6;bi2++){add(props,B(0.03,0.2,0.3),mats.black,-4.2+bi2*1.1,0.78,-3.38);}
[-3.7,-2.9,-0.3,0.5].forEach(function(x){
  var s=stool(0.62,true);s.position.set(x,0,-2.75);lookY(s,x,-3.3);props.add(s);blob(0,0,0.3,1,1,s);reg(s,0.25,'吧檯椅');seat(s,0,0,0.655,0);
});
plant(props,-4.1,0.92,-3.2,1.2);plant(props,-3.1,0.92,-3.25,1);
/* long trough with succulents */
add(props,RB(0.7,0.12,0.16,0.03),mats.trough,-1.55,0.98,-3.22);
for(var si=0;si<8;si++){add(props,S(0.04+(si%3)*0.008,10,8),mats.succ,-1.85+si*0.085,1.07,-3.22+((si%2)-0.5)*0.03);}
/* dried-flower bouquet in glass vase */
add(props,C(0.05,0.035,0.2,14),M(0xdfe6ea,{roughness:0.15,transparent:true,opacity:0.7}),-2.6,1.02,-3.25);
var fl=[0xe3a8ae,0xf1d9cf,0xd98e9b,0xf7ede6,0xc98f87];
for(var fi2=0;fi2<8;fi2++){var fa=fi2*0.8;add(props,S(0.04,8,6),M(fl[fi2%5],{roughness:0.95}),-2.6+Math.cos(fa)*0.05,1.2+(fi2%3)*0.03,-3.25+Math.sin(fa)*0.05).castShadow=false;}
/* candle lamp + small red card */
add(props,C(0.035,0.035,0.08,14),mats.white,-0.55,0.96,-3.28);
add(props,S(0.03,8,6),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffcf80,emissiveIntensity:1.2}),-0.55,1.03,-3.28);
add(props,B(0.1,0.14,0.01),M(0xd9473d),-1.0,0.99,-3.3).rotation.x=-0.25;
plant(props,0.1,0.92,-3.25,1.1);
var pendMat=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffcf80,emissiveIntensity:1.4});
[-3.2,-1.2,0.8].forEach(function(x){
  add(props,C(0.004,0.004,0.95,4),mats.black,x,2.52,-2.85);
  add(props,C(0.05,0.22,0.06,24),M(0xc9a27a,{roughness:0.6}),x,2.02,-2.85);
  add(props,S(0.05,10,8),pendMat,x,1.96,-2.85).castShadow=false;
});

/* ================= 共備區 ================= */
var longT=highTable(0.75,3.0);longT.position.set(2.5,0,-1.0);props.add(longT);blob(0,0,0.6,0.8,2.2,longT);reg(longT,1.5,'共備長桌');var longSeats=[];
[1.75,3.25].forEach(function(x){
  [-2.0,-1.4,-0.8,-0.2].forEach(function(z){
    var s=stool(0.76,true);s.position.set(x,0,z);lookY(s,2.5,z);props.add(s);blob(0,0,0.3,1,1,s);reg(s,0.25,'高腳椅');longSeats.push(seat(s,0,0,0.795,0));
  });
});
var longN0=longT.children.length;
cup(longT,0,1.075,-0.9);cup(longT,0,1.075,0.8);
add(longT,RB(0.12,0.11,0.12,0.02),mats.white,0,1.135,0);
add(longT,B(0.1,0.14,0.02),M(0xe9e4d6),-0.15,1.145,0.4).rotation.x=-0.2;
var longItems=longT.children.slice(longN0);

/* ================= kitchenette ================= */
var kit=new THREE.Group();props.add(kit);
var KX=3.5;
add(kit,RB(1.8,0.82,0.58,0.01),mats.cabinet,KX,0.41,-3.2);
[-0.6,0,0.6].forEach(function(dx){
  add(kit,RB(0.56,0.7,0.02,0.008),mats.woodLight,KX+dx,0.41,-2.9);
  add(kit,B(0.012,0.16,0.02),mats.black,KX+dx+0.2,0.62,-2.88);
});
add(kit,RB(1.86,0.04,0.64,0.01),mats.white,KX,0.84,-3.18);
add(kit,B(0.5,0.02,0.36),M(0x8e959b,{roughness:0.3,metalness:0.8}),KX-0.4,0.865,-3.2);
add(kit,C(0.012,0.012,0.2,8),mats.steel,KX-0.4,0.96,-3.4);
var spout=add(kit,new THREE.TorusGeometry(0.07,0.01,6,14,Math.PI/1.1),mats.steel,KX-0.4,1.06,-3.33);spout.rotation.y=Math.PI/2;spout.rotation.z=0;
add(kit,RB(0.32,0.44,0.38,0.025),mats.black,KX+0.5,1.07,-3.25);
add(kit,B(0.22,0.14,0.02),M(0x3c3d41),KX+0.5,1.13,-3.05);
add(kit,B(0.2,0.01,0.12),M(0x55585d),KX+0.5,0.89,-3.0);
cup(kit,KX+0.5,0.9,-3.0);
add(kit,RB(1.8,0.6,0.32,0.01),mats.cabinet,KX,2.0,-3.34);
[-0.6,0,0.6].forEach(function(dx){add(kit,RB(0.56,0.52,0.02,0.008),mats.woodLight,KX+dx,2.0,-3.17);});
blob(KX,-3.0,1.0,1.1,0.55);

/* ================= track lights ================= */
var rail=new THREE.Group();props.add(rail);
var tx0=-1.2,tx1=3.0,tz0=-0.6,tz1=1.4,ty=2.82;
[[(tx0+tx1)/2,tz0,tx1-tx0,0.04],[(tx0+tx1)/2,tz1,tx1-tx0,0.04],[tx0,(tz0+tz1)/2,0.04,tz1-tz0],[tx1,(tz0+tz1)/2,0.04,tz1-tz0]].forEach(function(r){
  add(rail,B(r[2],0.04,r[3]),mats.black,r[0],ty,r[1]);
});
[[tx0,tz0],[tx1,tz0],[tx0,tz1],[tx1,tz1]].forEach(function(p){add(rail,C(0.004,0.004,RH-ty,4),mats.black,p[0],(RH+ty)/2,p[1]);});
var spotBulb=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xfff0cc,emissiveIntensity:1.6});
[[0.2,tz0],[1.6,tz0],[tx0,0.4],[tx1,0.4],[0.2,tz1],[1.6,tz1]].forEach(function(p){
  add(rail,C(0.035,0.05,0.12,12),mats.black,p[0],ty-0.1,p[1]);
  add(rail,C(0.03,0.03,0.01,12),spotBulb,p[0],ty-0.165,p[1]).castShadow=false;
});

/* ================= zone overlay ================= */
var zoneGroup=new THREE.Group();scene.add(zoneGroup);var labels=[];
function zone(cx,cz,w,d,color,title,sub){
  var m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:0.3,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set(cx,0.012,cz);zoneGroup.add(m);
  var edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w,d)),new THREE.LineBasicMaterial({color:color}));
  edge.rotation.x=-Math.PI/2;edge.position.set(cx,0.014,cz);zoneGroup.add(edge);
  var tex=canvasTex(512,190,function(g,W,H){
    rr(g,6,6,W-12,H-12,26);g.fillStyle='rgba(255,255,255,.94)';g.fill();
    g.lineWidth=6;g.strokeStyle='#'+('000000'+color.toString(16)).slice(-6);g.stroke();
    g.fillStyle='#1f2a36';g.textAlign='center';g.textBaseline='middle';
    g.font='700 66px '+FONT;g.fillText(title,W/2,76);
    g.fillStyle='#56667a';g.font='500 38px '+FONT;g.fillText(sub,W/2,138);
  });
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));
  sp.position.set(cx,1.6,cz);sp.renderOrder=20;zoneGroup.add(sp);labels.push(sp);
}
zone(-2.3,1.4,3.5,3.0,0xe07b39,'沙發區','沙發交流・限 1 組');
zone(2.6,2.0,2.7,2.7,0x1f9d8a,'晤談區','圓桌晤談・限 1 組');
zone(-1.3,-1.4,3.0,2.7,0xd9a41e,'吧台區','吧檯聊聊・限 4 人');
zone(2.6,-1.0,2.2,3.5,0x4c7fc0,'共備區','長桌討論・限 1 組');

/* ================= day / night ================= */
var modes={
  day:{bg:0xdfe8f0,hemi:0.62,sun:0.5,pt:0.18,led:0.9,glassOp:0.26,glassCol:0xcfe6f5,out:0xffffff},
  night:{bg:0x0b111a,hemi:0.2,sun:0,pt:1.15,led:2.4,glassOp:0.5,glassCol:0x1c2a3a,out:0x26323c}
};
function applyMode(name){
  var m=modes[name];
  scene.background=new THREE.Color(m.bg);
  hemi.intensity=m.hemi;sun.intensity=m.sun;sun.castShadow=m.sun>0&&!liteOn;
  ptLights.forEach(function(l){l.intensity=m.pt;});
  ledMat.emissiveIntensity=m.led;outLedMat.emissiveIntensity=m.led*1.3;
  glassMat.opacity=m.glassOp;glassMat.color.setHex(m.glassCol);backdropMat.color.setHex(m.out);
}
applyMode('day');

/* ================= views + UI ================= */
var views=[
  {n:'全景',p:[9.5,8.2,9.2],t:[0,0.6,0]},
  {n:'俯視',p:[0,12.5,0.8],t:[0,0,0]},
  {n:'入口外觀',p:[-1.0,1.7,9.8],t:[-1.0,1.5,3.5]},
  {n:'入口視角',p:[-3.4,1.65,3.1],t:[0.6,1.0,-1.4]},
  {n:'合照視角',p:[-1.0,1.5,3.35],t:[-1.0,1.05,-0.1]},
  {n:'桌面視角',p:[1.3,3.6,-1.0],t:[2.5,1.0,-1.0]},
  {n:'投籃視角',p:[-0.2,3.8,2.0],t:[0.4,0.3,-0.25]},
  {n:'沙發區',p:[0.1,1.6,3.0],t:[-2.6,0.7,1.0]},
  {n:'晤談區',p:[3.9,2.6,-0.7],t:[2.5,0.55,2.1]},
  {n:'窗邊吧檯',p:[3.6,1.7,2.2],t:[-1.5,1.0,-2.4]},
  {n:'廚房區',p:[0.6,1.7,0.6],t:[3.4,1.0,-3.1]},
  {n:'回望入口',p:[2.8,1.8,-2.6],t:[-2.2,1.5,3.4]}
];
var tween=null,viewBtns=[],ceilOn=true;
function goTo(i,instant){
  var v=views[i];
  viewBtns.forEach(function(b,j){b.setAttribute('aria-pressed',j===i?'true':'false');});
  var toP=new THREE.Vector3().fromArray(v.p),toT=new THREE.Vector3().fromArray(v.t);
  if(instant){camera.position.copy(toP);controls.target.copy(toT);controls.update();return;}
  tween={t:0,fp:camera.position.clone(),ft:controls.target.clone(),tp:toP,tt:toT};
}
var vbox=document.getElementById('views');
views.forEach(function(v,i){
  var b=document.createElement('button');b.type='button';b.className='chip';b.textContent=v.n;b.setAttribute('aria-pressed','false');
  b.addEventListener('click',function(){goTo(i,false);});vbox.appendChild(b);viewBtns.push(b);
});
var tbox=document.getElementById('toggles');
[
  {l:'區域標示',on:true,f:function(v){zoneGroup.visible=v;}},
  {l:'天花板',on:true,f:function(v){ceilOn=v;}},
  {l:'夜間燈光',on:false,f:function(v){applyMode(v?'night':'day');}},
  {l:'自動旋轉',on:false,f:function(v){controls.autoRotate=v;}}
].forEach(function(o){
  var b=document.createElement('button');b.type='button';b.className='chip';b.textContent=o.l;b.setAttribute('aria-pressed',o.on?'true':'false');
  o.f(o.on);
  b.addEventListener('click',function(){var on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on?'true':'false');o.f(on);});
  tbox.appendChild(b);
});

/* ================= people (avatars) ================= */
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
var SKIN=0xeac19b;
function patCanvas(sp){
  var c=document.createElement('canvas');c.width=c.height=128;var g=c.getContext('2d'),t=sp.type;
  if(t==='stripes'){
    g.fillStyle=sp.c2;g.fillRect(0,0,128,128);g.fillStyle=sp.c1;g.fillRect(0,0,128,sp.b0);
  }else if(t==='window'){
    g.fillStyle=sp.c1;g.fillRect(0,0,128,128);g.fillStyle=sp.c2;
    g.fillRect(0,0,128,4);g.fillRect(0,64,128,3);g.fillRect(0,0,4,128);g.fillRect(64,0,3,128);
  }else if(t==='plaid2'){
    g.fillStyle=sp.c1;g.fillRect(0,0,128,128);g.fillStyle=sp.c2;g.globalAlpha=0.7;
    g.fillRect(0,30,128,3);g.fillRect(0,94,128,3);g.fillRect(30,0,3,128);g.fillRect(94,0,3,128);g.globalAlpha=1;
  }else{
    g.fillStyle=sp.c1;g.fillRect(0,0,128,128);g.fillStyle=sp.c2;g.globalAlpha=t==='flannel'?0.5:0.55;
    g.fillRect(0,0,64,128);g.fillRect(0,0,128,64);g.globalAlpha=1;
    if(t==='flannel'){g.fillStyle='rgba(255,255,255,.55)';g.fillRect(100,0,3,128);g.fillRect(0,100,128,3);}
  }
  return c;
}
function patTex(cv,rx,ry){
  var t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=4;return t;
}
var HAIRS=['short','fringe','bob','bobSide','ponytail','long'];
var HAIRN={short:'短髮',fringe:'齊瀏海',bob:'鮑伯頭',bobSide:'側分鮑伯',ponytail:'馬尾',long:'長髮'};
function buildHair(a){
  var head=a.head;
  if(a.hairG){head.remove(a.hairG);}
  var hg=new THREE.Group();head.add(hg);a.hairG=hg;
  var hm=M(a.hairColor,{roughness:0.9}),st=a.hairStyle;
  function cap(len,rotx){
    var m=add(hg,new THREE.SphereGeometry(0.119,26,16,0,Math.PI*2,0,Math.PI*len),hm,0,0.008,-0.004);
    m.rotation.x=rotx;m.castShadow=false;return m;
  }
  function E(rx,ry,rz,x,y,z){var m=ell(hg,hm,rx,ry,rz,x,y,z);m.castShadow=false;return m;}
  if(st==='short'){
    cap(0.5,-0.5);E(0.03,0.05,0.04,-0.1,-0.005,0.012);E(0.03,0.05,0.04,0.1,-0.005,0.012);
    E(0.075,0.028,0.04,0.032,0.092,0.05);
  }else if(st==='fringe'){
    cap(0.5,-0.5);E(0.03,0.05,0.04,-0.1,-0.005,0.012);E(0.03,0.05,0.04,0.1,-0.005,0.012);
    E(0.104,0.03,0.04,0,0.088,0.05);
  }else if(st==='bob'){
    cap(0.5,-0.5);E(0.12,0.105,0.1,0,-0.035,-0.035);
    E(0.033,0.085,0.076,-0.101,-0.045,0);E(0.033,0.085,0.076,0.101,-0.045,0);
    E(0.097,0.032,0.04,0,0.088,0.05);
  }else if(st==='bobSide'){
    cap(0.5,-0.5);E(0.12,0.108,0.1,0,-0.04,-0.035);
    E(0.035,0.092,0.08,-0.102,-0.05,0);E(0.035,0.092,0.08,0.102,-0.05,0);
    E(0.085,0.028,0.04,0.03,0.09,0.05);
  }else if(st==='ponytail'){
    cap(0.5,-0.5);E(0.04,0.045,0.04,0,0.035,-0.128);
    var tl=add(hg,C(0.022,0.012,0.2,8),hm,0,-0.07,-0.148);tl.rotation.x=0.18;tl.castShadow=false;
    E(0.06,0.026,0.04,0.045,0.09,0.05);
  }else if(st==='long'){
    cap(0.5,-0.5);E(0.125,0.17,0.085,0,-0.1,-0.05);
    E(0.032,0.17,0.05,-0.104,-0.17,0.012);E(0.032,0.17,0.05,0.104,-0.17,0.012);
    E(0.06,0.026,0.04,-0.04,0.09,0.05);E(0.06,0.026,0.04,0.04,0.09,0.05);
  }
}
function makeFace(head,cfg,sk){
  var white=M(0xffffff,{roughness:0.3}),iris=M(0x2a1a14,{roughness:0.3}),brow=M(cfg.hair.color,{roughness:0.9});
  [-1,1].forEach(function(s){
    var ex=s*0.041;
    ell(head,white,0.021,0.019,0.011,ex,0.012,0.092).castShadow=false;
    ell(head,iris,0.0115,0.0125,0.008,ex+s*0.001,0.011,0.1).castShadow=false;
    ell(head,white,0.0035,0.0035,0.003,ex+0.004,0.017,0.1075).castShadow=false;
    var br=add(head,B(0.036,0.007,0.008),brow,ex,0.05,0.09);br.rotation.z=-s*0.12;br.castShadow=false;
  });
  ell(head,sk,0.012,0.016,0.014,0,-0.012,0.098).castShadow=false;
  var mo=add(head,new THREE.TorusGeometry(cfg.wide?0.034:0.028,0.0045,6,16,Math.PI*(cfg.wide?0.97:0.9)),M(0x9b4a42),0,-0.03,0.089);
  mo.rotation.z=-Math.PI*(cfg.wide?0.985:0.95);mo.castShadow=false;
  if(cfg.blush){
    var bm=new THREE.MeshBasicMaterial({color:0xf08a8a,transparent:true,opacity:0.35,depthWrite:false});
    [-1,1].forEach(function(s){var m=ell(head,bm,0.02,0.012,0.004,s*0.063,-0.018,0.08);m.castShadow=false;m.raycast=function(){};});
  }
}
function buildAvatar(cfg,idx){
  var root=new THREE.Group(),sk=M(cfg.skin||SKIN,{roughness:0.8}),sp=cfg.shirt,bd=cfg.build||1;
  var sm=cfg.slim||0,lf=1-0.17*sm,dzf=1-0.14*sm;
  function lm(m){m.scale.x*=lf;m.scale.z*=lf;return m;}
  var cv=patCanvas(sp);
  var tm=new THREE.MeshStandardMaterial({map:patTex(cv,sp.tx,sp.ty),roughness:0.9});
  var am=new THREE.MeshStandardMaterial({map:patTex(cv,sp.ax,sp.ay),roughness:0.9});
  var sleeve=cfg.sleeveColor?M(cfg.sleeveColor,{roughness:0.9}):am;
  var pm=M(cfg.pants.color,{roughness:0.85}),shoe=M(0x2b2b2e,{roughness:0.6});
  var hips=new THREE.Group();hips.position.y=0.92;root.add(hips);
  var th=[],kn=[],sh=[],el=[];
  [1,-1].forEach(function(s,i){
    var t=new THREE.Group();t.position.set(s*0.095*bd,0,0);hips.add(t);
    var k=new THREE.Group();k.position.set(0,-0.45,0);t.add(k);
    lm(add(t,C(0.078,0.062,0.45,14),cfg.pants.short?sk:pm,0,-0.225,0));
    if(cfg.pants.short){lm(add(t,C(0.084,0.076,0.3,14),pm,0,-0.15,0));}
    lm(add(k,C(0.062,0.05,0.43,14),cfg.pants.short?sk:pm,0,-0.215,0));
    add(k,RB(0.1,0.08,0.24,0.03),shoe,0,-0.43,0.05);
    th.push(t);kn.push(k);
  });
  var pel=add(hips,C(0.16,0.166,0.14,20),pm,0,0,0);pel.scale.set(bd,1,0.66*dzf);
  var torso=new THREE.Group();hips.add(torso);
  var tb=add(torso,C(0.18,0.155,0.58,22),tm,0,0.29,0);tb.scale.set(bd,1,0.62*dzf);
  add(torso,C(0.045,0.05,0.09,10),sk,0,0.62,0);
  if(cfg.collar){add(torso,C(0.062,0.068,0.035,18),cfg.collar==='white'?M(0xf6f4ee,{roughness:0.9}):am,0,0.598,0);}
  if(cfg.vneck){
    var vs=new THREE.Shape();vs.moveTo(-0.055,0);vs.lineTo(0.055,0);vs.lineTo(0,-0.11);vs.closePath();
    var vm=new THREE.Mesh(new THREE.ShapeGeometry(vs),new THREE.MeshStandardMaterial({color:cfg.skin||SKIN,roughness:0.8,side:DS}));
    vm.position.set(0,0.585,0.117);torso.add(vm);
  }
  var head=new THREE.Group();head.position.set(0,0.74,0);head.scale.setScalar(1.1);torso.add(head);
  var fw=cfg.face||1;
  ell(head,sk,0.1*fw,0.112,0.103,0,0,0);
  [-1,1].forEach(function(s){ell(head,sk,0.014,0.025,0.018,s*0.1*fw,0,0);});
  makeFace(head,cfg,sk);
  var gl=new THREE.Group();head.add(gl);
  var gm=M(0x1c1c1f,{roughness:0.4});
  [-1,1].forEach(function(s){
    add(gl,new THREE.TorusGeometry(0.031,0.0055,8,20),gm,s*0.042,0.012,0.1).castShadow=false;
    add(gl,B(0.006,0.006,0.1),gm,s*0.076,0.015,0.05).castShadow=false;
  });
  add(gl,B(0.02,0.006,0.006),gm,0,0.018,0.104).castShadow=false;
  gl.visible=!!cfg.glasses;
  [1,-1].forEach(function(s,i){
    var o=new THREE.Group();o.position.set(s*0.205*bd,0.52,0);torso.add(o);
    lm(add(o,S(0.058,12,10),sleeve,0,0,0));
    lm(add(o,C(0.043,0.038,0.28,12),sk,0,-0.14,0));
    if(cfg.sleeves==='short'){lm(add(o,C(0.053,0.05,0.14,12),sleeve,0,-0.08,0));}
    else{lm(add(o,C(0.049,0.045,0.28,12),sleeve,0,-0.14,0));}
    var e=new THREE.Group();e.position.set(0,-0.28,0);o.add(e);
    lm(add(e,C(0.038,0.033,0.26,12),sk,0,-0.13,0));
    if(cfg.sleeves==='long'){lm(add(e,C(0.044,0.04,0.2,12),sleeve,0,-0.1,0));}
    lm(add(e,S(0.045,12,10),sk,0,-0.275,0));
    sh.push(o);el.push(e);
  });
  var ex=cfg.extras||[];
  if(ex.indexOf('lanyard')>=0){
    add(torso,B(0.014,0.5,0.01),M(0x1a1a1a),0,0.34,0.115).castShadow=false;
    add(torso,B(0.06,0.09,0.006),M(0xf4f4f0),0,0.1,0.118).castShadow=false;
  }
  if(ex.indexOf('watchL')>=0){add(el[0],C(0.043,0.043,0.03,12),M(0x1c1c1f,{roughness:0.3}),0,-0.22,0);}
  if(ex.indexOf('jade')>=0){
    var jd=add(el[1],new THREE.TorusGeometry(0.043,0.008,8,16),M(0x66c28f,{roughness:0.25}),0,-0.2,0);jd.rotation.x=Math.PI/2;
  }
  if(ex.indexOf('belt')>=0){var bl=add(hips,C(0.172,0.172,0.035,20),M(0x6a4328,{roughness:0.6}),0,0.07,0);bl.scale.set(bd,1,0.66);}
  var s=cfg.h/1.78;root.scale.setScalar(s);
  var a={idx:idx,color:cfg.color,scale:s,root:root,hips:hips,torso:torso,head:head,th:th,kn:kn,sh:sh,el:el,
    arm:'rest',seat:null,cur:null,temp:null,name:'',glassG:gl,hairG:null,hairStyle:cfg.hair.style,hairColor:cfg.hair.color};
  buildHair(a);
  root.userData.avatar=a;
  blob(0,0,0.3,1,1,root);
  scene.add(root);
  return a;
}
var AV=[
  {color:'#2f4aa0',h:1.76,build:1.08,face:1.08,skin:0xe9bf9a,collar:'shirt',shirt:{type:'window',c1:'#1c2a63',c2:'#e8ecf5',tx:10,ty:5,ax:2.5,ay:2.5},sleeves:'long',pants:{color:0x4a4b4f},hair:{style:'short',color:0x1b1b1d},glasses:true,extras:['lanyard']},
  {color:'#8a63b8',lively:true,h:1.60,build:0.92,face:0.92,skin:0xefc7a5,collar:'shirt',wide:true,blush:true,shirt:{type:'plaid2',c1:'#1d2540',c2:'#8a8a6a',tx:12,ty:6,ax:3,ay:3},sleeves:'long',pants:{color:0x7aa6d0},hair:{style:'ponytail',color:0x1d1a1a},extras:[]},
  {color:'#2a79c8',h:1.57,build:0.8,slim:1,face:0.94,skin:0xecc39d,vneck:true,wide:true,blush:true,shirt:{type:'stripes',c1:'#1d2b5a',c2:'#f4f2ee',b0:56,tx:1,ty:4.8,ax:1,ay:2.3},sleeves:'short',sleeveColor:0x1d2b5a,pants:{color:0x2f5f9e},hair:{style:'bobSide',color:0x2a1d18},extras:['jade']},
  {color:'#3a3a40',h:1.66,build:1.0,face:1.0,skin:0xe8bc97,shirt:{type:'stripes',c1:'#161618',c2:'#f3f3f1',b0:84,tx:1,ty:4.4,ax:1,ay:2.2},sleeves:'short',pants:{color:0x1c2230},hair:{style:'fringe',color:0x141414},glasses:true,extras:['watchL']},
  {color:'#6f9a52',h:1.60,build:0.78,slim:1,face:0.86,skin:0xf0cfae,collar:'shirt',blush:true,shirt:{type:'gingham',c1:'#b9bec6',c2:'#ffffff',tx:15,ty:8,ax:4,ay:4},sleeves:'long',pants:{color:0xa9c4de},hair:{style:'long',color:0x241a16},extras:[]},
  {color:'#d08a2a',h:1.58,build:0.94,face:0.95,skin:0xdba982,collar:'shirt',wide:true,blush:true,shirt:{type:'flannel',c1:'#222226',c2:'#d6d7d9',tx:7.5,ty:4,ax:2,ay:2},sleeves:'rolled',pants:{color:0x7ea2c8,short:true},hair:{style:'bob',color:0x3a2a22},extras:['belt','watchL']},
  {color:'#b4384f',h:1.77,build:1.1,face:1.04,skin:0xcf9c70,collar:'white',shirt:{type:'check',c1:'#f0e6e6',c2:'#9b3042',tx:15,ty:8,ax:4,ay:4},sleeves:'rolled',pants:{color:0x1a1a1c,short:true},hair:{style:'short',color:0x1a1614},extras:[]}
];
var names=[];
try{names=JSON.parse(localStorage.getItem('llbar-names')||'[]')||[];}catch(e){names=[];}
function redrawLabel(a){
  var g=a.labelCanvas.getContext('2d'),txt=(a.name||('玩家 '+(a.idx+1)))+(a.tag?' '+a.tag:'')+(NET.on&&NET.mySeat===a.idx?'（你）':'');
  g.clearRect(0,0,256,96);rr(g,4,4,248,88,26);g.fillStyle='rgba(255,255,255,.95)';g.fill();
  g.lineWidth=7;g.strokeStyle=a.color;g.stroke();
  var fs=40;g.font='700 '+fs+'px '+FONT;
  while(g.measureText(txt).width>216&&fs>18){fs-=2;g.font='700 '+fs+'px '+FONT;}
  g.fillStyle='#1f2a36';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,128,50);
  a.labelTex.needsUpdate=true;
}
var avatars=AV.map(function(cfg,i){
  var a=buildAvatar(cfg,i);
  a.labelCanvas=document.createElement('canvas');a.labelCanvas.width=256;a.labelCanvas.height=96;
  a.labelTex=new THREE.CanvasTexture(a.labelCanvas);
  a.label=new THREE.Sprite(new THREE.SpriteMaterial({map:a.labelTex,depthTest:false,transparent:true}));
  a.label.renderOrder=30;a.label.raycast=function(){};scene.add(a.label);
  a.lively=!!cfg.lively;a.name=names[i]||'';redrawLabel(a);return a;
});

/* ---- card fan + dice on the round table ---- */
var cardMat=M(0xfbfaf6,{roughness:0.6}),cardBack=M(0xc9573f,{roughness:0.6});
for(var ci=0;ci<4;ci++){
  var cd=add(rt,B(0.055,0.002,0.085),ci%2?cardBack:cardMat,-0.12+ci*0.02,0.765+ci*0.0022,0.12);
  cd.rotation.y=(ci-1.5)*0.28;cd.castShadow=false;
}
function pipTex(n){
  return canvasTex(64,64,function(g,w,h){
    g.fillStyle='#fbfaf6';g.fillRect(0,0,w,h);g.fillStyle=n===1?'#d23b3b':'#1c1c1e';
    var P={1:[[.5,.5]],2:[[.28,.28],[.72,.72]],3:[[.25,.25],[.5,.5],[.75,.75]],4:[[.28,.28],[.72,.28],[.28,.72],[.72,.72]],
      5:[[.26,.26],[.74,.26],[.5,.5],[.26,.74],[.74,.74]],6:[[.28,.22],[.72,.22],[.28,.5],[.72,.5],[.28,.78],[.72,.78]]}[n];
    P.forEach(function(p){g.beginPath();g.arc(p[0]*w,p[1]*h,n===1?9:6,0,7);g.fill();});
  });
}
var dice=new THREE.Mesh(B(0.07,0.07,0.07),[3,4,1,6,2,5].map(function(n){return new THREE.MeshStandardMaterial({map:pipTex(n),roughness:0.4});}));
dice.position.set(0.2,0.795,-0.2);dice.castShadow=true;rt.add(dice);
var DICE_Y=0.795,dieAnims=[],diceBusy=false;
var DICE_E={1:[0,0,0],6:[Math.PI,0,0],3:[0,0,Math.PI/2],4:[0,0,-Math.PI/2],2:[-Math.PI/2,0,0],5:[Math.PI/2,0,0]};
function diceTarget(n){
  var e=DICE_E[n];
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(0,Math.random()*6.28,0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0],e[1],e[2])));
}
function throwDie(mesh,baseY,n,cb){dieAnims.push({mesh:mesh,baseY:baseY,n:n,t:0,q0:null,qT:null,cb:cb});}
function rollDice(){
  if(NET.role==='guest'){netToHost({t:'dice'});return;}
  hostRollDice();
}
function tickDice(dt){
  for(var i=dieAnims.length-1;i>=0;i--){
    var d=dieAnims[i],m=d.mesh;d.t+=dt/1.4;var tt=Math.min(1,d.t);
    m.position.y=d.baseY+Math.sin(Math.PI*Math.min(1,tt*1.3))*0.14*(1-tt*0.2);
    if(tt<0.7){m.rotation.x+=dt*16*(1-tt);m.rotation.y+=dt*13*(1-tt);m.rotation.z+=dt*9*(1-tt);}
    else{if(!d.q0){d.q0=m.quaternion.clone();d.qT=diceTarget(d.n);}m.quaternion.copy(d.q0).slerp(d.qT,(tt-0.7)/0.3);}
    if(tt>=1){m.quaternion.copy(d.qT);m.position.y=d.baseY;dieAnims.splice(i,1);if(d.cb)d.cb();}
  }
}

/* ---- toast ---- */
var toastEl=document.getElementById('toast'),toastTimer=null;
function toast(msg,ms){
  toastEl.textContent=msg;toastEl.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(function(){toastEl.classList.remove('show');},ms||2600);
}

/* ---- seating / layout ---- */
function unseat(a){if(a.seat){a.seat.taken=null;a.seat=null;}}
function sitAt(a,r){unseat(a);if(r.taken)unseat(r.taken);r.taken=a;a.seat=r;}
function sitNearest(a){
  var best=null,bd=1.8;
  seats.forEach(function(r){
    if(r.taken&&r.taken!==a)return;
    r.obj.updateMatrixWorld(true);
    var p=r.obj.localToWorld(r.local.clone()),d=Math.hypot(p.x-a.root.position.x,p.z-a.root.position.z);
    if(d<bd){bd=d;best=r;}
  });
  if(!best){toast('附近沒有空位。先把人物拖到椅子旁，再按「坐下」。',3200);return false;}
  sitAt(a,best);return true;
}
function faceTo(x,z,tx,tz){return Math.atan2(tx-x,tz-z);}
function standAt(a,x,z,face,arm){unseat(a);a.root.position.set(x,0,z);a.root.rotation.y=face;a.arm=arm||'rest';}
function resetFurniture(){movables.forEach(function(m){m.position.copy(m.userData.p0);m.rotation.y=m.userData.r0;});}
function viewByName(n){for(var i=0;i<views.length;i++){if(views[i].n===n)return i;}return 0;}
function arrange(name){
  if(name==='photo'){
    avatars.forEach(function(a,i){standAt(a,-1.0+(i-3)*0.56,-0.1-(i%2)*0.06,0,i===1?'jump':'crossed');});
  }else if(name==='game'){
    [0,2,3,4].forEach(function(ai,k){sitAt(avatars[ai],rtSeats[k]);avatars[ai].arm='play';});
    standAt(avatars[1],1.4,1.3,faceTo(1.4,1.3,2.6,2.0),'jump');
    standAt(avatars[5],1.3,2.7,faceTo(1.3,2.7,2.6,2.0),'wave');
    standAt(avatars[6],3.95,3.0,faceTo(3.95,3.0,2.6,2.0),'cheer');
  }else if(name==='sofa'){
    sitAt(avatars[0],sofaSeats[0]);avatars[0].arm='rest';
    sitAt(avatars[2],sofaSeats[1]);avatars[2].arm='wave';
    sitAt(avatars[3],sofaSeats[2]);avatars[3].arm='rest';
    sitAt(avatars[4],armSeat);avatars[4].arm='rest';
    standAt(avatars[1],-0.6,0.9,faceTo(-0.6,0.9,-1.75,1.3),'jump');
    standAt(avatars[5],-0.5,1.6,faceTo(-0.5,1.6,-1.75,1.3),'wave');
    standAt(avatars[6],-1.45,-0.25,faceTo(-1.45,-0.25,-1.75,1.3),'rest');
  }
}
function layout(name,instant){
  endGame(true);
  resetFurniture();avatars.forEach(unseat);avatars.forEach(function(a){a.tag='';});
  arrange(name);
  avatars.forEach(function(a){redrawLabel(a);});
  if(!instant){var vn={photo:'合照視角',game:'晤談區',sofa:'沙發區'}[name];goTo(viewByName(vn),false);netSend({t:'view',n:vn});}
  syncSeated();renderPanel();
}
function syncSeated(){
  avatars.forEach(function(a){
    if(!a.seat)return;
    var r=a.seat;r.obj.updateMatrixWorld(true);
    var p=r.obj.localToWorld(r.local.clone());
    a.root.position.set(p.x,0,p.z);a.root.rotation.y=r.obj.rotation.y+r.yaw;
  });
}

/* ---- pose engine ---- */
function targetsFor(a,now){
  var arm=(a.temp&&now<a.temp.until)?a.temp.arm:a.arm,sit=!!a.seat,T={};
  if(arm==='jump'&&sit)arm='cheer';
  T.hip=sit?(a.seat.top+0.075)/a.scale:0.92;
  T.th=sit?-1.5:0;T.kn=sit?(a.seat.top>0.6?2.0:1.55):0;
  var sx=[0.05,0.05],so=[0.1,0.1],eb=[-0.1,-0.1],ei=[0,0];
  if(arm==='crossed'){sx=[-0.55,-0.72];so=[0,0];eb=[0,0];ei=[1.4,1.3];}
  else if(arm==='wave'){sx=[0,0.05];so=[2.75,0.1];eb=[0,-0.1];ei=[0,0];}
  else if(arm==='cheer'){sx=[0,0];so=[2.9,2.9];eb=[0,0];ei=[0,0];}
  else if(arm==='play'){sx=[-0.85,-0.85];so=[0,0];eb=[-1.35,-1.35];ei=[0.45,0.45];}
  else if(arm==='jump'){sx=[0,0];so=[2.5,2.5];eb=[0,0];ei=[0,0];}
  else if(arm==='pump'){sx=[0.05,-1.2];so=[0.1,0.1];eb=[-0.1,-1.3];ei=[0,0];}
  else if(arm==='show'){sx=[0.05,-1.55];so=[0.1,0.1];eb=[-0.1,-0.5];ei=[0,0];}
  else if(arm==='throw'){sx=[0.05,-2.4];so=[0.1,0.1];eb=[-0.1,-0.4];ei=[0,0];}
  else if(sit){sx=[-0.35,-0.35];eb=[-0.9,-0.9];ei=[0.3,0.3];}
  for(var i=0;i<2;i++){T['sx'+i]=sx[i];T['so'+i]=so[i];T['eb'+i]=eb[i];T['ei'+i]=ei[i];}
  T.arm=arm;return T;
}
var tmpV=new THREE.Vector3();
function tickPeople(dt,now){
  var t=now/1000,k=Math.min(1,dt*10);
  avatars.forEach(function(a,idx){
    if(a.seat){
      var r=a.seat;r.obj.updateMatrixWorld(true);
      var p=r.obj.localToWorld(r.local.clone());
      a.root.position.x=p.x;a.root.position.z=p.z;a.root.rotation.y=r.obj.rotation.y+r.yaw;
    }else if(NET.role==='guest'&&a.net&&!(a.localUntil>now)){
      var kg=Math.min(1,dt*10);
      a.root.position.x+=(a.net.x-a.root.position.x)*kg;a.root.position.z+=(a.net.z-a.root.position.z)*kg;
      var dy=((a.net.yaw-a.root.rotation.y+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;a.root.rotation.y+=dy*kg;
    }
    var T=targetsFor(a,now);
    if(!a.cur){a.cur={};for(var key in T){if(key!=='arm')a.cur[key]=T[key];}}
    for(var kk in T){if(kk!=='arm')a.cur[kk]+=(T[kk]-a.cur[kk])*k;}
    var c=a.cur;
    a.hips.position.y=c.hip;
    a.th[0].rotation.x=a.th[1].rotation.x=c.th;a.kn[0].rotation.x=a.kn[1].rotation.x=c.kn;
    for(var i=0;i<2;i++){
      var s=i?-1:1;
      a.sh[i].rotation.set(c['sx'+i],0,s*c['so'+i]);
      a.el[i].rotation.set(c['eb'+i],0,-s*c['ei'+i]);
    }
    var ar=T.arm;
    if(ar==='wave'){a.el[0].rotation.z+=-0.5*Math.sin(t*9+idx);}
    if(ar==='pump'){a.sh[1].rotation.x=-1.0+0.55*Math.sin(t*13+idx);}
    if(ar==='cheer'){
      a.sh[0].rotation.z+=0.12*Math.sin(t*8+idx);a.sh[1].rotation.z-=0.12*Math.sin(t*8+idx);
      a.root.position.y=a.seat?0:Math.abs(Math.sin(t*6+idx))*0.07;
    }else if(ar==='jump'){
      var hj=Math.abs(Math.sin(t*5.4+idx*1.7));
      a.root.position.y=hj*0.26;
      a.th[0].rotation.x=a.th[1].rotation.x=-0.12-0.8*hj;
      a.kn[0].rotation.x=a.kn[1].rotation.x=0.25+1.05*hj;
      a.hips.position.y=c.hip-0.05*(1-hj);
      a.sh[0].rotation.z+=0.4*Math.sin(t*10.8);a.sh[1].rotation.z-=0.4*Math.sin(t*10.8);
      a.sh[0].rotation.x+=0.15*Math.sin(t*5.4);a.sh[1].rotation.x-=0.15*Math.sin(t*5.4);
    }else if(a.lively&&ar==='rest'&&!a.seat){
      var hb=Math.abs(Math.sin(t*4.2+idx));
      a.root.position.y=hb*0.05;
      a.sh[0].rotation.x=0.05+0.45*Math.sin(t*4.2);a.sh[1].rotation.x=0.05-0.45*Math.sin(t*4.2);
    }else{a.root.position.y=0;}
    a.head.rotation.x=ar==='play'?0.12+0.05*Math.sin(t*2+idx):0;
    a.head.rotation.z=ar==='jump'?0.15*Math.sin(t*5.4+idx):(a.lively&&ar==='rest'&&!a.seat?0.08*Math.sin(t*2.1):0);
    a.head.getWorldPosition(tmpV);
    a.label.position.set(tmpV.x,tmpV.y+0.32,tmpV.z);
    var d=camera.position.distanceTo(a.label.position),ks=clamp(d/5,0.45,1.6);
    a.label.scale.set(0.62*ks,0.23*ks,1);
    a.label.visible=a.root.visible&&!frontOut.visible;
    if(a.bub){a.bub.visible=a.bubOn&&a.root.visible&&!frontOut.visible;a.bub.position.set(tmpV.x,tmpV.y+0.66*ks,tmpV.z);a.bub.scale.set(0.5*ks,0.5*ks,1);}
  });
  /* selection ring */
  var rs=(game&&game.hi>=0)?{kind:'avatar',a:avatars[game.hi]}:sel;
  if(rs&&peopleOn!==false){
    var o=rs.kind==='avatar'?rs.a.root:rs.o;
    var rr0=rs.kind==='avatar'?0.4:Math.max(0.4,o.userData.r+0.1);
    ring.visible=rs.kind==='furn'||rs.a.root.visible;
    ring.position.set(o.position.x,0.02,o.position.z);ring.scale.setScalar(rr0/0.4);
    ring.material.opacity=0.55+0.35*Math.sin(t*5);
  }else ring.visible=false;
  tickNet(dt,now);
  tickDice(dt);
  tickGame(dt,now);
}

/* ---- selection + panel ---- */
var sel=null,mode='view',peopleOn=true;
var ring=new THREE.Mesh(new THREE.RingGeometry(0.36,0.42,48),new THREE.MeshBasicMaterial({color:0xffb300,transparent:true,opacity:0.9,side:DS,depthWrite:false}));
ring.rotation.x=-Math.PI/2;ring.visible=false;ring.raycast=function(){};scene.add(ring);
var panel=document.getElementById('panel');
function mkChip(text,fn,cls){
  var b=document.createElement('button');b.type='button';b.className='chip '+(cls||'sm');b.textContent=text;
  b.addEventListener('click',fn);return b;
}
function labelOf(a){return a.name||('玩家 '+(a.idx+1));}
function selectAvatar(a){sel={kind:'avatar',a:a};renderPanel();}
function selectFurn(o){sel={kind:'furn',o:o};renderPanel();}
function clearSel(){sel=null;renderPanel();}
function renderPanel(){
  panel.innerHTML='';
  var tag=document.createElement('span');tag.className='tag';tag.textContent='人物';panel.appendChild(tag);
  avatars.forEach(function(a){
    var b=mkChip(String(a.idx+1),function(){selectAvatar(a);toast('已選「'+labelOf(a)+'」',1400);},'sm num');
    b.style.borderBottomColor=a.color;b.setAttribute('aria-label',labelOf(a));
    b.setAttribute('aria-pressed',sel&&sel.kind==='avatar'&&sel.a===a?'true':'false');
    panel.appendChild(b);
  });
  if(sel&&sel.kind==='avatar'){
    var a=sel.a,inp=document.createElement('input');
    inp.type='text';inp.maxLength=10;inp.value=a.name;inp.placeholder='輸入名字';inp.setAttribute('aria-label','人物名字');
    inp.addEventListener('input',function(){setName(a,inp.value.slice(0,10));});
    panel.appendChild(inp);
    [['站立',function(){poseOp(a,'stand');}],
     ['坐下',function(){poseOp(a,'sit');}],
     ['揮手',function(){poseOp(a,'arm','wave');}],
     ['歡呼',function(){poseOp(a,'arm','cheer');}],
     ['跳躍',function(){poseOp(a,'arm','jump');}],
     ['抱胸',function(){poseOp(a,'arm','crossed');}],
     ['玩牌',function(){poseOp(a,'arm','play');}],
     ['換髮型',function(){poseOp(a,'hair');}],
     ['眼鏡',function(){poseOp(a,'glass');}],
     ['◀ 轉向',function(){poseOp(a,'turn',-1);}],
     ['轉向 ▶',function(){poseOp(a,'turn',1);}]
    ].forEach(function(x){panel.appendChild(mkChip(x[0],x[1]));});
  }else if(sel&&sel.kind==='furn'){
    var o=sel.o,t2=document.createElement('span');t2.className='tag';t2.textContent='家具：'+(o.userData.label||'');panel.appendChild(t2);
    panel.appendChild(mkChip('◀ 旋轉',function(){furnOp(o,'rot',-1);}));
    panel.appendChild(mkChip('旋轉 ▶',function(){furnOp(o,'rot',1);}));
    panel.appendChild(mkChip('還原位置',function(){furnOp(o,'reset',0);}));
  }else{
    var hint=document.createElement('span');hint.className='tag';hint.textContent='點人物或家具可選取';panel.appendChild(hint);
  }
}

/* ---- picking + dragging ---- */
var raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2(),floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function setRay(ev){
  var r=renderer.domElement.getBoundingClientRect();
  ndc.set(((ev.clientX-r.left)/r.width)*2-1,-((ev.clientY-r.top)/r.height)*2+1);raycaster.setFromCamera(ndc,camera);
}
function pickObj(ev){
  setRay(ev);
  var targets=[];
  if(peopleOn)avatars.forEach(function(a){targets.push(a.root);});
  movables.forEach(function(m){targets.push(m);});
  var hits=raycaster.intersectObjects(targets,true);
  for(var i=0;i<hits.length;i++){
    var o=hits[i].object;
    if(o===dice)return {kind:'dice'};
    while(o){
      if(o.userData&&o.userData.avatar)return {kind:'avatar',a:o.userData.avatar};
      if(o.userData&&o.userData.movable)return {kind:'furn',o:o};
      o=o.parent;
    }
  }
  return null;
}
var press=null,drag=null;
stage.addEventListener('pointerdown',function(ev){
  if(ev.target!==renderer.domElement)return;
  if(ev.pointerType==='mouse'&&ev.button!==0)return;
  var hit=pickObj(ev);
  if(game&&game.def.pick){var gh=game.def.pick(ev);if(gh)hit=gh;}
  press={x:ev.clientX,y:ev.clientY,hit:hit,moved:false,id:ev.pointerId};
  if(hit&&hit.kind!=='dice'&&hit.kind!=='game'&&mode==='edit'&&!game){
    if(NET.role==='guest'&&hit.kind==='avatar'&&hit.a.idx!==NET.mySeat){toast(NET.mySeat>=0?'只能移動自己的人物':'你目前是旁觀，先到「多人房間」選一個人物',1800);return;}
    var obj=hit.kind==='avatar'?hit.a.root:hit.o,pt=new THREE.Vector3();
    setRay(ev);
    if(raycaster.ray.intersectPlane(floorPlane,pt)){
      drag={hit:hit,obj:obj,off:new THREE.Vector3(obj.position.x-pt.x,0,obj.position.z-pt.z)};
      controls.enabled=false;
    }
  }
},true);
window.addEventListener('pointermove',function(ev){
  if(!press||ev.pointerId!==press.id)return;
  if(!press.moved&&Math.hypot(ev.clientX-press.x,ev.clientY-press.y)>6)press.moved=true;
  if(drag&&press.moved){
    setRay(ev);var pt=new THREE.Vector3();
    if(raycaster.ray.intersectPlane(floorPlane,pt)){
      var nx=clamp(pt.x+drag.off.x,-4.1,4.1),nz=clamp(pt.z+drag.off.z,-3.0,3.2);
      drag.obj.position.x=nx;drag.obj.position.z=nz;
      if(NET.role==='guest'){
        var nw=performance.now(),isA=drag.hit.kind==='avatar';
        if(isA){drag.hit.a.localUntil=nw+700;drag.hit.a.seat=null;}else drag.obj.userData.localUntil=nw+700;
        if(nw-(drag.sent||0)>80){drag.sent=nw;netToHost({t:'mv',k:isA?'a':'f',i:isA?drag.hit.a.idx:drag.obj.userData.mi,x:nx,z:nz});}
      }else if(drag.hit.kind==='avatar'&&drag.hit.a.seat)unseat(drag.hit.a);
    }
  }
});
function endPress(ev,cancel){
  if(!press||ev.pointerId!==press.id)return;
  var p=press;press=null;
  if(drag){
    if(NET.role==='guest'){var dd=drag,isA2=dd.hit.kind==='avatar';netToHost({t:'mv',k:isA2?'a':'f',i:isA2?dd.hit.a.idx:dd.obj.userData.mi,x:dd.obj.position.x,z:dd.obj.position.z});}
    drag=null;controls.enabled=true;
  }
  if(cancel||p.moved)return;
  if(p.hit){
    if(p.hit.kind==='game')gameTap('card',p.hit.obj.i);
    else if(p.hit.kind==='dice')rollDice();
    else if(p.hit.kind==='avatar'){
      if(game&&game.id==='odd'&&game.phase==='guess')gameTap('avatar',p.hit.a.idx);else selectAvatar(p.hit.a);
    }else selectFurn(p.hit.o);
  }else{clearSel();}
}
window.addEventListener('pointerup',function(ev){endPress(ev,false);});
window.addEventListener('pointercancel',function(ev){endPress(ev,true);});

/* ---- scene chips + mode chips ---- */
var sbox=document.getElementById('scenes');
[
  ['桌遊局',function(){layout('game');toast('桌遊局開始！點桌上的骰子或按「擲骰子」',3200);}],
  ['團體合照',function(){layout('photo');}],
  ['沙發聊天',function(){layout('sofa');}],
  ['遊戲選單',function(){openMenu();}],
  ['還原擺設',function(){resetFurniture();toast('家具已還原到原位',1800);}],
  ['擲骰子',function(){rollDice();}],
  ['抽一位',function(){if(NET.role==='guest'){netToHost({t:'pick'});}else pickRandomHost();}]
].forEach(function(x){var b=mkChip(x[0],x[1],'');b.className='chip';sbox.appendChild(b);});
var tbox2=document.getElementById('toggles');
var modeBtns=[];
[['視角模式','view'],['擺設模式','edit']].forEach(function(x,i){
  var b=mkChip(x[0],function(){
    mode=x[1];modeBtns.forEach(function(m,j){m.setAttribute('aria-pressed',j===i?'true':'false');});
    renderer.domElement.style.cursor=mode==='edit'?'grab':'';
    toast(mode==='edit'?'擺設模式：拖曳人物或家具移動；點選後可轉向、坐下':'視角模式：拖曳旋轉畫面',2600);
  },'');
  b.className='chip';b.setAttribute('aria-pressed',i===0?'true':'false');modeBtns.push(b);
  tbox2.insertBefore(b,tbox2.children[i]);
});
(function(){
  var b=mkChip('顯示人物',function(){
    peopleOn=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',peopleOn?'true':'false');
    avatars.forEach(function(a){a.root.visible=peopleOn;});
    if(!peopleOn&&sel&&sel.kind==='avatar')clearSel();
  },'');
  b.className='chip';b.setAttribute('aria-pressed','true');tbox2.appendChild(b);
})();

/* ================= multiplayer room ================= */
var CODE_CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode(){var s='';for(var i=0;i<4;i++)s+=CODE_CH.charAt(Math.floor(Math.random()*CODE_CH.length));return s;}
function r2(v){return Math.round(v*100)/100;}
function amHost(){return !NET.on||NET.role==='host';}
function humanSeat(i){return NET.role==='host'?!!NET.owner[i]:!!(NET.ownNames&&NET.ownNames[i]);}
function isBot(seat){return NET.on&&!humanSeat(seat);}
function myTurn(seat){if(!NET.on)return true;if(NET.mySeat===seat)return true;return NET.role==='host'&&!NET.owner[seat];}
function mayAct(seat,who,fromHost){if(!NET.on)return true;if(who===seat)return true;return !!(fromHost&&!NET.owner[seat]);}
function peerOpts(){
  var o={},h=QS.get('peerhost')||(window.LLBAR_PEER&&window.LLBAR_PEER.host);
  if(h){
    var P=window.LLBAR_PEER||{};
    o.host=h;o.port=+(QS.get('peerport')||P.port||443);o.path=QS.get('peerpath')||P.path||'/';
    o.secure=QS.get('peersecure')!==null?QS.get('peersecure')==='1':(P.secure!==undefined?P.secure:true);
  }
  var ice=window.LLBAR_ICE;
  if(ice&&ice.length){
    o.config={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:['turn:eu-0.turn.peerjs.com:3478','turn:us-0.turn.peerjs.com:3478'],username:'peerjs',credential:'peerjsp'}].concat(ice),sdpSemantics:'unified-plan'};
  }
  return o;
}
function peerErr(e){
  var t=e&&e.type;
  if(t==='peer-unavailable')return '找不到這個房間代碼（打錯了，或房主已經離開）';
  if(t==='network'||t==='socket-error'||t==='socket-closed')return '連不上連線服務，請檢查網路後再試';
  if(t==='server-error')return '連線服務暫時無法使用，請稍後再試';
  if(t==='webrtc')return '無法建立連線，可能被學校或公司網路擋住。請改用手機行動網路，或請房主換一個網路';
  if(t==='browser-incompatible')return '這個瀏覽器不支援連線功能，請改用 Chrome、Safari 或 Edge';
  return '連線服務錯誤（'+(t||e)+'）';
}
function wrapConn(conn){
  var link={id:conn.peer,send:function(m){try{conn.send(m);}catch(e){}},close:function(){try{conn.close();}catch(e){}},onmsg:null,onclose:null};
  conn.on('data',function(d){if(link.onmsg)link.onmsg(d);});
  conn.on('close',function(){if(link.onclose)link.onclose();});
  return link;
}
var PeerTransport={
  host:function(code,cb){
    if(typeof Peer==='undefined'){setTimeout(function(){cb.onerror('找不到連線元件（PeerJS）');},0);return {close:function(){}};}
    var peer=new Peer('llbar-'+code,peerOpts()),hopened=false;
    peer.on('open',function(){if(hopened)return;hopened=true;cb.onopen();});
    peer.on('connection',function(conn){cb.onconn(wrapConn(conn));});
    peer.on('error',function(e){if(hopened)return;cb.onerror(e&&e.type==='unavailable-id'?'unavailable':peerErr(e));});
    peer.on('disconnected',function(){setTimeout(function(){try{if(!peer.destroyed&&peer.disconnected)peer.reconnect();}catch(e){}},1500);});
    return {close:function(){try{peer.destroy();}catch(e){}}};
  },
  join:function(code,cb){
    if(typeof Peer==='undefined'){setTimeout(function(){cb.onerror('找不到連線元件（PeerJS）');},0);return {close:function(){}};}
    var peer=new Peer(peerOpts()),opened=false,failed=false,to=null;
    function fail(m){if(opened||failed)return;failed=true;clearTimeout(to);try{peer.destroy();}catch(e){}cb.onerror(m);}
    peer.on('open',function(){
      var conn=peer.connect('llbar-'+code,{reliable:true,serialization:'json'});
      to=setTimeout(function(){fail('連不上房間（逾時）。可能是代碼打錯、房主已離開，或網路擋住了連線；請改用手機行動網路再試。');},cb.timeoutMs||15000);
      conn.on('open',function(){if(failed)return;opened=true;clearTimeout(to);cb.onopen(wrapConn(conn));});
      conn.on('error',function(){fail('連線錯誤，請再試一次');});
      conn.on('iceStateChanged',function(s){if(s==='failed')fail(peerErr({type:'webrtc'}));});
    });
    peer.on('error',function(e){if(opened)return;fail(peerErr(e));});
    return {close:function(){try{peer.destroy();}catch(e){}}};
  }
};
var BCTransport={
  host:function(code,cb){
    var ch=new BroadcastChannel('llbar-'+code),links={};
    ch.onmessage=function(ev){
      var m=ev.data;if(!m||m.to!=='host')return;
      if(m.k==='hello'){
        var id=m.from,link={id:id,send:function(x){ch.postMessage({to:id,from:'host',k:'msg',d:JSON.parse(JSON.stringify(x))});},close:function(){},onmsg:null,onclose:null};
        links[id]=link;ch.postMessage({to:id,from:'host',k:'ack'});cb.onconn(link);
      }else if(m.k==='msg'&&links[m.from]&&links[m.from].onmsg){links[m.from].onmsg(m.d);}
      else if(m.k==='bye'&&links[m.from]){var l=links[m.from];delete links[m.from];if(l.onclose)l.onclose();}
    };
    setTimeout(function(){cb.onopen();},0);
    return {close:function(){try{ch.postMessage({to:'*',from:'host',k:'hostbye'});ch.close();}catch(e){}}};
  },
  join:function(code,cb){
    var ch=new BroadcastChannel('llbar-'+code),id='g'+Math.random().toString(36).slice(2,9),acked=false,to=null;
    var link={id:id,send:function(x){ch.postMessage({to:'host',from:id,k:'msg',d:JSON.parse(JSON.stringify(x))});},
      close:function(){try{ch.postMessage({to:'host',from:id,k:'bye'});ch.close();}catch(e){}},onmsg:null,onclose:null};
    ch.onmessage=function(ev){
      var m=ev.data;if(!m||(m.to!==id&&m.to!=='*'))return;
      if(m.k==='ack'&&!acked){acked=true;clearTimeout(to);cb.onopen(link);}
      else if(m.k==='msg'&&link.onmsg)link.onmsg(m.d);
      else if(m.k==='hostbye'&&link.onclose)link.onclose();
    };
    ch.postMessage({to:'host',from:id,k:'hello'});
    to=setTimeout(function(){if(!acked){cb.onerror('找不到這個房間（同一台裝置的分頁）');try{ch.close();}catch(e){}}},3000);
    return {close:function(){link.close();}};
  }
};
function netSend(m){
  if(NET.role!=='host')return;
  Object.keys(NET.peers).forEach(function(id){NET.peers[id].link.send(m);});
}
function netToHost(m){if(NET.role==='guest'&&NET.hostLink)NET.hostLink.send(m);}
function ownNames(){return NET.owner.map(function(o){return o?o.name:null;});}
function refreshLabels(){avatars.forEach(function(a){redrawLabel(a);});renderPanel();}
function gameUiRefresh(){if(game&&game.def.ui)game.def.ui(game);}
function afterOwnChange(){
  NET.ownNames=ownNames();
  Object.keys(NET.peers).forEach(function(id){var r=NET.peers[id];r.link.send({t:'own',o:NET.ownNames,you:r.seat});});
  roomUI();refreshLabels();gameUiRefresh();
}
function firstFreeSeat(){for(var i=0;i<7;i++){if(!NET.owner[i])return i;}return -1;}
function claimSeat(rec,seat){
  if(seat<0||seat>6||NET.owner[seat])return;
  if(rec.seat>=0)NET.owner[rec.seat]=null;
  NET.owner[seat]={id:rec.link.id,name:rec.name};rec.seat=seat;if(rec.cid)NET.memo[rec.cid]=seat;afterOwnChange();
}
function releaseSeat(rec){if(rec.seat>=0)NET.owner[rec.seat]=null;rec.seat=-1;if(rec.cid)delete NET.memo[rec.cid];afterOwnChange();}
function hostClaim(seat){
  if(NET.owner[seat])return;
  if(NET.mySeat>=0)NET.owner[NET.mySeat]=null;
  NET.owner[seat]={id:'host',name:NET.myName};NET.mySeat=seat;afterOwnChange();
}
function hostRelease(){if(NET.mySeat>=0)NET.owner[NET.mySeat]=null;NET.mySeat=-1;afterOwnChange();}
function seatClaimUI(seat){
  if(NET.role==='host')hostClaim(seat);else netToHost({t:'claim',seat:seat});
}
function seatReleaseUI(){if(NET.role==='host')hostRelease();else netToHost({t:'rel'});}

function buildSnap(full){
  var now=performance.now();
  var a=avatars.map(function(av){
    var arm=(av.temp&&now<av.temp.until)?av.temp.arm:av.arm,p=av.root.position;
    return [r2(p.x),r2(p.z),r2(av.root.rotation.y),arm,av.seat?av.seat.i:-1,av.tag||'',HAIRS.indexOf(av.hairStyle),av.glassG.visible?1:0,
      (av.bubOn&&av.bubE)?av.bubE:'',(av.bubOn&&av.bubW)?av.bubW:'',av.name||''];
  });
  var snap={t:'snap',a:a};
  var f=movables.map(function(m){return [r2(m.position.x),r2(m.position.z),r2(m.rotation.y)];});
  var fs=JSON.stringify(f);
  if(full||fs!==NET.lastF||NET.fT>20){snap.f=f;NET.lastF=fs;NET.fT=0;}else NET.fT++;
  return snap;
}
function applySnap(m,instant){
  var now=performance.now();
  m.a.forEach(function(r,i){
    var a=avatars[i];if(!a)return;
    var local=a.localUntil>now;
    a.net={x:r[0],z:r[1],yaw:r[2]};
    if(!local){
      a.arm=r[3];a.temp=null;a.seat=r[4]>=0?seats[r[4]]:null;
      if(instant&&!a.seat){a.root.position.x=r[0];a.root.position.z=r[1];a.root.rotation.y=r[2];}
    }else{a.arm=r[3];}
    if((a.tag||'')!==r[5]){a.tag=r[5];redrawLabel(a);}
    var hs=HAIRS[r[6]];if(hs&&hs!==a.hairStyle){a.hairStyle=hs;buildHair(a);}
    a.glassG.visible=!!r[7];
    if(r[8]){if(a.bubE!==r[8]||a.bubW!==r[9]){showBubble(a,r[8],r[9]);}a.bubOn=true;}else{a.bubOn=false;}
    if((a.name||'')!==r[10]){a.name=r[10];redrawLabel(a);}
  });
  if(m.f){m.f.forEach(function(r,i){
    var o=movables[i];if(!o)return;
    o.userData.net={x:r[0],z:r[1],ry:r[2]};
    if(instant){o.position.x=r[0];o.position.z=r[1];o.rotation.y=r[2];}
  });}
}
function tickNet(dt,now){
  if(!NET.on)return;
  if(NET.role==='host'){
    NET.acc+=dt;
    if(NET.acc>=0.1){NET.acc=0;if(Object.keys(NET.peers).length)netSend(buildSnap(false));}
  }else if(NET.role==='guest'){
    if(!NET.reco&&NET.lastRx&&!document.hidden&&now-NET.lastRx>15000){guestLost();}
    var k=Math.min(1,dt*10);
    movables.forEach(function(o){
      var n=o.userData.net;if(!n||(o.userData.localUntil||0)>now)return;
      o.position.x+=(n.x-o.position.x)*k;o.position.z+=(n.z-o.position.z)*k;
      var d=((n.ry-o.rotation.y+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;o.rotation.y+=d*k;
    });
  }
}
function gameBundle(){return game?{id:game.id,s:gser(game)}:null;}
function onGuestConn(link){
  var rec={link:link,seat:-1,name:'訪客'};NET.peers[link.id]=rec;
  link.onmsg=function(m){hostMsg(rec,m);};
  link.onclose=function(){
    if(rec.denied)return;
    delete NET.peers[link.id];
    if(rec.seat>=0&&NET.owner[rec.seat]&&NET.owner[rec.seat].id===link.id)NET.owner[rec.seat]=null;
    afterOwnChange();toast(rec.name+' 離開了',1800);
  };
}
function hostMsg(rec,m){
  if(!m||!m.t||rec.denied)return;
  switch(m.t){
    case 'hello':
      var cid=String(m.cid||rec.link.id).slice(0,24);
      if(NET.banned[cid]){denyRec(rec,'kicked');return;}
      if(NET.pw&&String(m.pw||'')!==NET.pw){denyRec(rec,'pw');return;}
      Object.keys(NET.peers).forEach(function(id){var o=NET.peers[id];if(o!==rec&&o.cid===cid)dropRec(o,0);});
      if(Object.keys(NET.peers).length>20){denyRec(rec,'full');return;}
      rec.cid=cid;
      rec.name=String(m.name||'訪客').slice(0,8);
      var s=NET.memo[cid];if(!(s>=0&&!NET.owner[s]))s=firstFreeSeat();
      if(s>=0){NET.owner[s]={id:rec.link.id,name:rec.name};rec.seat=s;NET.memo[cid]=s;}
      NET.ownNames=ownNames();
      rec.link.send({t:'welcome',seat:rec.seat,own:NET.ownNames,game:gameBundle(),snap:buildSnap(true)});
      afterOwnChange();toast(rec.name+' 加入了'+(rec.seat>=0?'（玩家 '+(rec.seat+1)+'）':'（旁觀）'),2200);break;
    case 'claim':claimSeat(rec,m.seat);break;
    case 'rel':releaseSeat(rec);break;
    case 'act':doAct(String(m.act||''),rec.seat,false);break;
    case 'tap':doTap(m.kind,m.i,rec.seat,false);break;
    case 'mv':doMove(m,rec.seat);break;
    case 'pose':if(rec.seat>=0&&rec.seat===m.seat)applyPose(m.seat,m.op,m.arg);break;
    case 'nm':if(rec.seat>=0&&rec.seat===m.seat)setNameHost(m.seat,m.name);break;
    case 'fu':furnOpHost(m.i,m.op,m.d);break;
    case 'dice':hostRollDice();break;
    case 'pick':pickRandomHost();break;
  }
}
function guestOnMsg(m){
  if(!m||!m.t)return;
  NET.lastRx=performance.now();
  switch(m.t){
    case 'welcome':
      NET.mySeat=m.seat;NET.ownNames=m.own;applySnap(m.snap,true);
      if(m.game){startGame(m.game.id,true);applyGame(m.game.s);}else if(game){endGame(true,true);}
      roomUI();refreshLabels();toast('已加入房間 '+NET.code+(m.seat>=0?'，你是玩家 '+(m.seat+1):'（旁觀）'),2600);break;
    case 'own':NET.mySeat=m.you;NET.ownNames=m.o;roomUI();refreshLabels();gameUiRefresh();break;
    case 'snap':applySnap(m,false);break;
    case 'gstart':startGame(m.id,true);break;
    case 'gs':applyGame(m.s);break;
    case 'gend':endGame(true,true);break;
    case 'toast':toast(m.m,m.ms);break;
    case 'die':remoteDie(m);break;
    case 'ball':remoteBall(m);break;
    case 'card':showCard(m.tag,m.text,m.color);break;
    case 'view':goTo(viewByName(m.n),false);break;
    case 'bye':toast('房主關閉了房間',3000);roomNote='房主關閉了房間';leaveRoom(true);break;
    case 'hb':break;
    case 'denied':roomNote=m.why==='pw'?'房間密碼不對':m.why==='kicked'?'你已被房主移出這個房間':m.why==='full'?'房間人數已滿':'無法加入房間';roomOpen=true;leaveRoom(true);break;
    case 'kick':roomNote='你已被房主移出房間';roomOpen=true;toast('你已被房主移出房間',3000);leaveRoom(true);break;
  }
}
function remoteDie(m){
  if(m.w==='rt'){throwDie(dice,DICE_Y,m.n);}
  else if(game&&game.id==='snake'&&game.die){throwDie(game.die,game.dieY,m.n);}
}
function getCid(){
  var c='';try{c=sessionStorage.getItem('llbar-cid')||'';}catch(e){}
  if(!c){c='c'+Math.random().toString(36).slice(2,10);try{sessionStorage.setItem('llbar-cid',c);}catch(e){}}
  return c;
}
var wakeLock=null;
function keepAwake(){
  try{if(navigator.wakeLock&&NET.on&&!document.hidden&&!wakeLock){navigator.wakeLock.request('screen').then(function(l){wakeLock=l;l.addEventListener('release',function(){wakeLock=null;});}).catch(function(){});}}catch(e){}
}
document.addEventListener('visibilitychange',function(){if(!document.hidden)keepAwake();});
function denyRec(rec,why){rec.denied=true;delete NET.peers[rec.link.id];rec.link.send({t:'denied',why:why});setTimeout(function(){rec.link.close();},400);}
function dropRec(rec,delay){
  rec.denied=true;delete NET.peers[rec.link.id];
  if(rec.seat>=0&&NET.owner[rec.seat]&&NET.owner[rec.seat].id===rec.link.id)NET.owner[rec.seat]=null;
  setTimeout(function(){try{rec.link.onmsg=null;rec.link.close();}catch(e){}},delay);
}
function kickPeer(id){
  var r=NET.peers[id];if(!r)return;
  if(r.cid)NET.banned[r.cid]=1;
  r.link.send({t:'kick'});dropRec(r,400);afterOwnChange();toast('已移出 '+r.name,1800);
}
function guestLost(){
  if(NET.role!=='guest'||NET.reco||NET.leaving)return;
  NET.reco={n:0};var sess=NET.sess;
  var old=NET.hostLink;NET.hostLink=null;
  if(old){old.onclose=null;old.onmsg=null;try{old.close();}catch(e){}}
  var tr=NET.kind==='bc'?BCTransport:PeerTransport;
  toast('與房主的連線中斷了，重新連線中…',3000);
  (function again(){
    if(!NET.reco||NET.sess!==sess)return;
    NET.reco.n++;
    if(NET.reco.n>8){NET.reco=null;roomNote='無法重新連線，房間可能已經結束。';roomOpen=true;toast('房間已結束',3500);leaveRoom(true);return;}
    roomNote='與房主的連線中斷了，重新連線中…（'+NET.reco.n+'/8）';roomUI();
    try{if(NET.guestTr)NET.guestTr.close();}catch(e){}
    NET.guestTr=tr.join(NET.code,{
      timeoutMs:8000,
      onopen:function(link){
        if(!NET.reco||NET.sess!==sess){try{link.close();}catch(e){}return;}
        NET.reco=null;NET.hostLink=link;NET.lastRx=performance.now();
        link.onmsg=guestOnMsg;link.onclose=guestLost;
        link.send({t:'hello',name:NET.myName,cid:NET.cid,pw:NET.pw});
        roomNote='';roomUI();toast('已重新連線',1800);
      },
      onerror:function(){if(NET.reco&&NET.sess===sess)setTimeout(again,3000);}
    });
  })();
}
function createRoom(kind,name,pw){
  leaveRoom(true);NET.myName=(name||'房主').slice(0,8);NET.kind=kind;NET.pw=String(pw||'');NET.banned={};NET.memo={};
  var tries=0;
  (function attempt(){
    var code=genCode();tries++;
    var tr=kind==='bc'?BCTransport:PeerTransport;
    NET.hostTr=tr.host(code,{
      onopen:function(){
        NET.on=true;NET.role='host';NET.code=code;NET.peers={};
        NET.owner=[{id:'host',name:NET.myName},null,null,null,null,null,null];NET.mySeat=0;NET.ownNames=ownNames();
        roomNote='';roomUI();refreshLabels();gameUiRefresh();toast('房間 '+code+' 已建立',2400);
      },
      onconn:onGuestConn,
      onerror:function(e){
        if(e==='unavailable'&&tries<6){try{NET.hostTr.close();}catch(x){}attempt();return;}
        roomNote='建立房間失敗：'+e;NET.on=false;NET.role=null;roomUI();
      }
    });
  })();
}
function joinRoom(code,kind,name,pw){
  leaveRoom(true);code=String(code||'').toUpperCase().trim();
  if(code.length<4){roomNote='請輸入 4 位房間代碼';roomUI();return;}
  roomNote='連線中…';roomUI();NET.kind=kind;NET.pw=String(pw||'');NET.cid=getCid();
  var tr=kind==='bc'?BCTransport:PeerTransport;
  NET.guestTr=tr.join(code,{
    onopen:function(link){
      NET.on=true;NET.role='guest';NET.code=code;NET.hostLink=link;NET.myName=(name||'訪客').slice(0,8);NET.lastRx=performance.now();
      endGame(true,true);
      link.onmsg=guestOnMsg;
      link.onclose=guestLost;
      link.send({t:'hello',name:NET.myName,cid:NET.cid,pw:NET.pw});roomNote='';roomUI();
    },
    onerror:function(e){roomNote=e;NET.on=false;NET.role=null;roomUI();}
  });
}
function leaveRoom(silent){
  var was=NET.role;NET.sess++;NET.leaving=true;
  if(was==='host')netSend({t:'bye'});
  var peers=NET.peers;
  try{if(NET.hostLink)NET.hostLink.close();}catch(e){}
  try{if(NET.hostTr)NET.hostTr.close();}catch(e){}
  try{if(NET.guestTr)NET.guestTr.close();}catch(e){}
  Object.keys(peers).forEach(function(id){try{peers[id].link.close();}catch(e){}});
  NET.reco=null;NET.leaving=false;NET.on=false;NET.role=null;NET.code='';NET.mySeat=-1;NET.owner=[null,null,null,null,null,null,null];NET.ownNames=[];
  NET.peers={};NET.hostLink=null;NET.hostTr=null;NET.guestTr=null;
  movables.forEach(function(o){o.userData.net=null;});avatars.forEach(function(a){a.net=null;});
  if(was==='guest'){endGame(true,true);layout('photo',true);}
  roomUI();refreshLabels();
  if(!silent)toast('已離開房間',1600);
}

/* ---- room dialog ---- */
var roomEl=document.getElementById('room'),roomOpen=false,roomNote='',roomName='',roomKind=QS.get('tr')==='bc'?'bc':'peer',roomCode=(QS.get('room')||'').toUpperCase(),roomPw='',joinPw=QS.get('pw')||'';
var roomChip=null;
function inviteLink(){
  var u=location.origin+location.pathname+'?room='+NET.code;
  if(NET.kind==='bc')u+='&tr=bc';
  var ph=QS.get('peerhost');if(ph)u+='&peerhost='+ph+'&peerport='+(QS.get('peerport')||'')+'&peerpath='+encodeURIComponent(QS.get('peerpath')||'/')+'&peersecure='+(QS.get('peersecure')||'1');
  return u;
}
function hostOnlyChips(){
  var lock=NET.role==='guest';
  [].forEach.call(sbox.children,function(c){
    var t=c.textContent;
    if(t==='桌遊局'||t==='團體合照'||t==='沙發聊天'||t==='遊戲選單'||t==='還原擺設'){c.disabled=lock;c.title=lock?'只有房主可以操作':'';}
  });
}
function roomUI(){
  keepAwake();
  if(roomChip){roomChip.textContent=NET.on?('房間 '+NET.code):'多人房間';roomChip.setAttribute('aria-pressed',NET.on?'true':'false');}
  hostOnlyChips();
  if(!roomOpen){roomEl.hidden=true;return;}
  roomEl.hidden=false;roomEl.innerHTML='';
  function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;roomEl.appendChild(e);return e;}
  function row(){var r=el('div','row');return r;}
  function chipIn(r,text,fn,cls){var b=mkChip(text,fn,cls||'sm');r.appendChild(b);return b;}
  el('h2','','多人房間');
  if(!NET.on){
    el('p','','房主建立房間後，把 4 位代碼或邀請連結傳給大家。每個人用自己的手機或電腦開同一個網頁加入，就能在同一個空間一起玩。');
    var r0=row();var ni=document.createElement('input');ni.type='text';ni.maxLength=8;ni.placeholder='你的暱稱（請勿填真實姓名）';ni.value=roomName;ni.setAttribute('aria-label','暱稱');
    ni.addEventListener('input',function(){roomName=ni.value;});r0.appendChild(ni);el('p','','暱稱會顯示給房間裡所有人，請不要填真實姓名或個人資料。');
    var r1=row();
    [['peer','網路連線'],['bc','同一台裝置的分頁（測試）']].forEach(function(k){
      var b=chipIn(r1,k[1],function(){roomKind=k[0];roomUI();});b.setAttribute('aria-pressed',roomKind===k[0]?'true':'false');
    });
    var rp=row();var pi=document.createElement('input');pi.type='password';pi.maxLength=12;pi.placeholder='房間密碼（選填）';pi.value=roomPw;pi.autocomplete='off';pi.setAttribute('aria-label','房間密碼（選填）');
    pi.addEventListener('input',function(){roomPw=pi.value;});rp.appendChild(pi);
    var r2b=row();chipIn(r2b,'建立房間',function(){roomNote='建立中…';roomUI();createRoom(roomKind,roomName||'房主',roomPw);},'sm pri');
    el('p','','已經有代碼？在下面輸入加入：');
    var r3=row();var ci=document.createElement('input');ci.type='text';ci.maxLength=4;ci.placeholder='房間代碼';ci.value=roomCode;ci.style.width='7em';ci.setAttribute('aria-label','房間代碼');
    ci.addEventListener('input',function(){roomCode=ci.value.toUpperCase();});r3.appendChild(ci);
    var jp=document.createElement('input');jp.type='password';jp.maxLength=12;jp.placeholder='密碼（有設才填）';jp.value=joinPw;jp.autocomplete='off';jp.style.width='9em';jp.setAttribute('aria-label','房間密碼');
    jp.addEventListener('input',function(){joinPw=jp.value;});r3.appendChild(jp);
    chipIn(r3,'加入房間',function(){joinRoom(roomCode,roomKind,roomName||'訪客',joinPw);},'sm pri');
    if(roomNote)el('p','',roomNote);
    var r4=row();chipIn(r4,'關閉',function(){roomOpen=false;roomUI();});
    return;
  }
  el('p','',NET.role==='host'?'你是房主，把代碼或連結傳給大家：':'已連線到房間，房主：'+((NET.ownNames&&NET.ownNames[0])||'房主'));
  el('div','code',NET.code);
  if(NET.role==='host'){
    var rl=row();var li=document.createElement('input');li.type='text';li.readOnly=true;li.value=inviteLink();li.style.width='100%';li.setAttribute('aria-label','邀請連結');rl.appendChild(li);
    var rc=row();chipIn(rc,'複製邀請連結',function(){
      li.select();
      try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(li.value);}else{document.execCommand('copy');}toast('已複製邀請連結',1500);}catch(e){toast('請長按連結手動複製',2000);}
    },'sm pri');
    if(window.qrcode){try{var qr=qrcode(0,'M');qr.addData(inviteLink());qr.make();var im=document.createElement('img');im.src=qr.createDataURL(4,3);im.alt='邀請連結的 QR code';im.className='qr';roomEl.appendChild(im);}catch(e){}}
    if(NET.pw)el('p','','已設定房間密碼。密碼不在連結和 QR code 裡，請另外告訴大家。');
  }
  el('p','','選一個人物當你自己（沒人選的人物，遊戲時由電腦代打）：');
  var g=el('div','seats');
  for(var i=0;i<7;i++){
    (function(i){
      var o=NET.ownNames&&NET.ownNames[i],mine=NET.mySeat===i;
      var b=mkChip((i+1)+' '+(o?o:'電腦'),function(){seatClaimUI(i);},'sm seatb');
      b.style.borderBottomColor=AV[i].color;b.setAttribute('aria-pressed',mine?'true':'false');
      if(o&&!mine)b.disabled=true;
      g.appendChild(b);
    })(i);
  }
  var rr2=row();chipIn(rr2,'改成旁觀',function(){seatReleaseUI();});
  el('p','','房主負責選遊戲和場景；輪到你的人物時，才能操作遊戲按鈕。人物的位置、姿勢和家具擺設，大家都看得到。');
  if(NET.role==='host'){
    var gids=Object.keys(NET.peers);
    if(gids.length){
      el('p','','房間裡的訪客（房主可以移出）：');
      gids.forEach(function(id){
        var r=NET.peers[id],rw=row(),sp=document.createElement('span');
        sp.textContent=r.name+(r.seat>=0?'（玩家 '+(r.seat+1)+'）':'（旁觀）');sp.style.flex='1';rw.appendChild(sp);
        chipIn(rw,'移出',function(){if(confirm('把「'+r.name+'」移出房間？'))kickPeer(id);});
      });
    }
  }
  var rr3=row();chipIn(rr3,'離開房間',function(){leaveRoom(false);});chipIn(rr3,'關閉視窗',function(){roomOpen=false;roomUI();});
  if(roomNote)el('p','',roomNote);
}
function setNameHost(seat,name){
  var a=avatars[seat];if(!a)return;a.name=String(name||'').slice(0,10);names[seat]=a.name;redrawLabel(a);
  try{localStorage.setItem('llbar-names',JSON.stringify(names));}catch(e){}
}
function setName(a,name){
  if(NET.role==='guest'){if(NET.mySeat===a.idx)netToHost({t:'nm',seat:a.idx,name:name});return;}
  setNameHost(a.idx,name);
}
function applyPose(idx,op,arg){
  var a=avatars[idx];if(!a)return;
  if(game&&(op==='stand'||op==='sit'||op==='arm'||op==='turn')){toast('遊戲進行中，請先結束遊戲',1800);return;}
  if(op==='stand'){unseat(a);a.arm='rest';}
  else if(op==='sit'){sitNearest(a);}
  else if(op==='arm'){a.arm=arg;}
  else if(op==='turn'){if(a.seat){toast('坐著時，請選椅子再轉向',2200);}else a.root.rotation.y+=arg*Math.PI/4;}
  else if(op==='hair'){var i=(HAIRS.indexOf(a.hairStyle)+1)%HAIRS.length;a.hairStyle=HAIRS[i];buildHair(a);toast('髮型：'+HAIRN[HAIRS[i]],1500);}
  else if(op==='glass'){a.glassG.visible=!a.glassG.visible;}
}
function poseOp(a,op,arg){
  if(NET.role==='guest'){
    if(NET.mySeat!==a.idx){toast(NET.mySeat>=0?'只能操作自己的人物（玩家 '+(NET.mySeat+1)+'）':'你目前是旁觀，先到「多人房間」選一個人物',2200);return;}
    netToHost({t:'pose',seat:a.idx,op:op,arg:arg});return;
  }
  applyPose(a.idx,op,arg);
}
function furnOpHost(i,op,d){
  var o=movables[i];if(!o||game)return;
  if(op==='rot')o.rotation.y+=d*Math.PI/8;else if(op==='reset'){o.position.copy(o.userData.p0);o.rotation.y=o.userData.r0;}
}
function furnOp(o,op,d){
  if(NET.role==='guest'){netToHost({t:'fu',i:o.userData.mi,op:op,d:d});return;}
  furnOpHost(o.userData.mi,op,d);
}
function doMove(m,who){
  if(game)return;
  var x=clamp(+m.x,-4.1,4.1),z=clamp(+m.z,-3.0,3.2);
  if(m.k==='a'){var a=avatars[m.i];if(!a||(who!==m.i&&who!==-99))return;if(a.seat)unseat(a);a.root.position.x=x;a.root.position.z=z;}
  else if(m.k==='f'){var o=movables[m.i];if(!o)return;o.position.x=x;o.position.z=z;}
}

/* ================= mini games ================= */
var game=null,tweens=[],gTimers=[],G={status:null,mk:null,sc:[],primary:null},zoneWas=true;
var gamePanel=document.getElementById('game'),gcard=document.getElementById('gcard');
var GAMEDEFS={},GAMELIST=['snake','toss','rps','memory','odd','card'];
var RPS=[['✊','石頭'],['✌️','剪刀'],['✋','布']];
function nm(i){return labelOf(avatars[i]);}
function whoTag(i){return NET.on&&NET.mySeat===i?'（你）':(isBot(i)?'（電腦）':'');}
function shuffle(arr){for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=arr[i];arr[i]=arr[j];arr[j]=t;}return arr;}
function tw(dur,upd,done){tweens.push({t:0,dur:dur,upd:upd,done:done});}
function tickTweens(dt){
  for(var i=tweens.length-1;i>=0;i--){
    var w=tweens[i];if(!w)continue;
    w.t+=dt;var k=Math.min(1,w.t/w.dur);w.upd(k);
    if(k>=1){var ix=tweens.indexOf(w);if(ix>=0)tweens.splice(ix,1);if(w.done)w.done();}
  }
}
function later(ms,fn){
  var id=setTimeout(function(){var k=gTimers.indexOf(id);if(k>=0)gTimers.splice(k,1);fn();},ms);
  gTimers.push(id);return id;
}
function gtoast(m,ms){toast(m,ms);netSend({t:'toast',m:m,ms:ms});}
function tickGame(dt,now){
  tickTweens(dt);
  if(!game)return;
  if(game.def.vtick)game.def.vtick(game,dt,now);
  if(game.def.view)game.def.view(game,dt,now);
  if(!game.remote&&game.def.tick)game.def.tick(game,dt,now);
}
function hilite(a){if(game)game.hi=a?a.idx:-1;}
function clearBubbles(){avatars.forEach(function(a){a.bubOn=false;a.bubE='';a.bubW='';if(a.bub)a.bub.visible=false;});}
function showBubble(a,emoji,word){
  if(!a.bub){
    a.bubC=document.createElement('canvas');a.bubC.width=256;a.bubC.height=256;
    a.bubTex=new THREE.CanvasTexture(a.bubC);
    a.bub=new THREE.Sprite(new THREE.SpriteMaterial({map:a.bubTex,depthTest:false,transparent:true}));
    a.bub.renderOrder=31;a.bub.raycast=function(){};scene.add(a.bub);
  }
  var g2=a.bubC.getContext('2d');g2.clearRect(0,0,256,256);
  rr(g2,12,24,232,170,36);g2.fillStyle='rgba(255,255,255,.97)';g2.fill();g2.lineWidth=8;g2.strokeStyle=a.color;g2.stroke();
  g2.fillStyle='#1f2a36';g2.textAlign='center';g2.textBaseline='middle';
  g2.font='700 84px '+FONT;g2.fillText(emoji,128,94);
  g2.font='700 36px '+FONT;g2.fillText(word,128,164);
  a.bubTex.needsUpdate=true;a.bubOn=true;a.bubE=emoji;a.bubW=word;
}
function seatAllAtLong(){avatars.forEach(function(a,i){sitAt(a,longSeats[i]);a.arm='play';});syncSeated();}
function rowAll(arm){avatars.forEach(function(a,i){standAt(a,-1.0+(i-3)*0.6,-0.1,0,arm||'rest');});}
function finishRank(g,scores,unit){
  var mx=Math.max.apply(null,scores),w=[];
  scores.forEach(function(v,i){if(v===mx)w.push(i);});
  g.over=true;g.hi=-1;
  avatars.forEach(function(a,i){a.arm=w.indexOf(i)>=0?'jump':'rest';});
  var who=w.map(function(i){return nm(i);}).join('、');
  g.endMsg='結束！冠軍：'+who+'（'+mx+' '+unit+'）';
  gtoast(g.endMsg,5200);gsync();
}

/* ---- panel UI (buttons carry action ids so guests can route them to the host) ---- */
function runAct(act){
  if(act==='toss.throw'&&game&&game.mv!=null)act+=':'+game.mv.toFixed(3);
  if(NET.role==='guest'){netToHost({t:'act',act:act});return;}
  doAct(act,NET.on?NET.mySeat:-1,true);
}
function gbtn(b){
  var c=mkChip(b.t,function(){runAct(b.act);},'sm'+(b.pri?' pri':''));
  if(b.dis)c.disabled=true;return c;
}
function guiBuild(title,status,btns,opts){
  opts=opts||{};
  gamePanel.innerHTML='';gamePanel.hidden=false;
  var t=document.createElement('span');t.className='gt';t.textContent=title;gamePanel.appendChild(t);
  var st=document.createElement('span');st.className='st';st.textContent=status||'';gamePanel.appendChild(st);
  G.status=st;G.mk=null;G.sc=[];G.primary=opts.primary||null;
  if(opts.meter){
    var m=document.createElement('div');m.className='meter';m.innerHTML='<div class="zone"></div><div class="mk"></div>';
    gamePanel.appendChild(m);G.mk=m.querySelector('.mk');
  }
  btns.forEach(function(b){gamePanel.appendChild(gbtn(b));});
  if(opts.scores){
    avatars.forEach(function(a){
      var e=document.createElement('span');e.className='score';
      var i=document.createElement('i');i.style.background=a.color;e.appendChild(i);
      var tn=document.createTextNode((a.idx+1)+':0');e.appendChild(tn);gamePanel.appendChild(e);G.sc.push(tn);
    });
  }
}
function guiScores(arr){for(var i=0;i<G.sc.length;i++){G.sc[i].nodeValue=(i+1)+':'+((arr&&arr[i])||0);}}
window.addEventListener('keydown',function(ev){
  if(ev.code!=='Space'||!game||!G.primary)return;
  var tg=ev.target&&ev.target.tagName;
  if(tg==='INPUT'||tg==='TEXTAREA'||tg==='BUTTON')return;
  ev.preventDefault();runAct(G.primary);
});
function showCard(tag,text,col){
  gcard.hidden=false;gcard.innerHTML='';
  var ct=document.createElement('div');ct.className='ct';ct.textContent=tag;
  var tx=document.createElement('div');tx.className='tx';tx.textContent=text;
  var bt=mkChip('收起',function(){gcard.hidden=true;},'sm');bt.style.marginTop='12px';
  gcard.appendChild(ct);gcard.appendChild(tx);gcard.appendChild(bt);gcard.style.borderColor=col||'';
}
function menuBtns(){return amHost()?[{t:'重玩',act:'restart'},{t:'選單',act:'menu'},{t:'結束',act:'end'}]:[];}

/* ---- sync of game state ---- */
function gser(g){var s=g.def.ser(g);s.hi=g.hi;s.over=g.over;s.endMsg=g.endMsg||'';return s;}
function gsync(){
  if(!game||game.remote)return;
  game.def.ui(game);
  if(NET.role==='host')netSend({t:'gs',s:gser(game)});
}
function applyGame(s){
  if(!game||!s)return;
  game.hi=s.hi;game.over=s.over;game.endMsg=s.endMsg;game.def.des(game,s);game.def.ui(game);
}

/* ---- actions + taps (run on the host; guests send them as intents) ---- */
function doAct(act,who,fromHost){
  var i=act.indexOf(':'),k=i<0?act:act.slice(0,i),arg=i<0?'':act.slice(i+1);
  var hostOnly={menu:1,start:1,restart:1,end:1,'snake.auto':1};
  if(hostOnly[k]&&!fromHost)return;
  if(k==='menu'){openMenu();}
  else if(k==='start'){if(GAMEDEFS[arg])startGame(arg,false);}
  else if(k==='restart'){restartGame();}
  else if(k==='end'){endGame();}
  else if(!game){return;}
  else if(k==='snake.roll'){if(game.id==='snake'&&mayAct(game.cur,who,fromHost))snakeRoll();}
  else if(k==='snake.auto'){if(game.id==='snake'){game.auto=!game.auto;gsync();}}
  else if(k==='toss.throw'){if(game.id==='toss'&&mayAct(game.cur,who,fromHost))tossThrow(parseFloat(arg));}
  else if(k==='rps.pick'){if(game.id==='rps')rpsPick(who,+arg);}
  else if(k==='card.draw'){if(game.id==='card')drawCard(arg);}
}
function doTap(kind,i,who,fromHost){
  if(!game)return;
  if(game.id==='memory'&&kind==='card')memTap(i,who,fromHost);
  else if(game.id==='odd'&&kind==='avatar')oddTap(i,who);
}
function gameTap(kind,i){
  if(NET.role==='guest'){netToHost({t:'tap',kind:kind,i:i});return;}
  doTap(kind,i,NET.on?NET.mySeat:-1,true);
}

/* ---- start / stop / menu ---- */
function startGame(id,remote){
  endGame(true,true);
  if(!remote){
    resetFurniture();
    avatars.forEach(function(a){unseat(a);a.arm='rest';a.tag='';a.temp=null;a.bubOn=false;});
  }
  clearSel();
  zoneWas=zoneGroup.visible;zoneGroup.visible=false;
  game={id:id,def:GAMEDEFS[id],over:false,hi:-1,remote:!!remote,endMsg:''};
  mode='view';modeBtns.forEach(function(m,j){m.setAttribute('aria-pressed',j===0?'true':'false');});
  renderer.domElement.style.cursor='';
  GAMEDEFS[id].start(game);
  avatars.forEach(function(a){redrawLabel(a);});
  if(!remote){syncSeated();netSend({t:'gstart',id:id});gsync();}
}
function endGame(silent,fromNet){
  gTimers.forEach(function(id){clearTimeout(id);});gTimers=[];tweens=[];
  if(game){
    var wasHost=!game.remote;
    try{if(game.def.stop)game.def.stop(game);}catch(e){}
    avatars.forEach(function(a){if(wasHost){a.tag='';a.temp=null;}a.bubOn=false;a.bubE='';a.bubW='';if(a.bub)a.bub.visible=false;redrawLabel(a);});
    game=null;zoneGroup.visible=zoneWas;
    if(!silent)toast('遊戲結束',1400);
    if(wasHost&&!fromNet)netSend({t:'gend'});
  }
  gamePanel.hidden=true;gcard.hidden=true;G.primary=null;
}
function restartGame(){var id=game&&game.id;if(id)startGame(id,false);}
function openMenu(){
  endGame(true);
  var btns=GAMELIST.map(function(k){return {t:GAMEDEFS[k].name,act:'start:'+k};});
  btns.push({t:'關閉',act:'end'});
  guiBuild('遊戲選單','選一個玩法：',btns);
}

/* ---- 1. 蛇梯棋 ---- */
function tileTex(n,kind,target){
  return canvasTex(128,128,function(g,w,h){
    var bg={up:'#cfe9d4',down:'#f3d1d1',extra:'#fff0b0',rest:'#e3d5f0',goal:'#ffd966'}[kind]||(n%2?'#f4efe6':'#e4edf6');
    g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=4;g.strokeRect(2,2,w-4,h-4);
    g.fillStyle='#1f2a36';g.textAlign='center';g.textBaseline='middle';
    g.font='700 46px '+FONT;g.fillText(String(n),w/2,42);
    var tx=kind==='up'?'↑ '+target:kind==='down'?'↓ '+target:kind==='extra'?'再擲':kind==='rest'?'休息':kind==='goal'?'終點':'';
    g.font='700 30px '+FONT;g.fillStyle=kind==='up'?'#1b7a3e':kind==='down'?'#b03030':'#6a4a9a';g.fillText(tx,w/2,94);
  });
}
function snakePawnPos(g,i,k){
  var y=1.075;
  if(k<=0)return new THREE.Vector3(((i%4)-1.5)*0.13,y,g.tiles[0].z-0.2-Math.floor(i/4)*0.1);
  var t=g.tiles[k-1];return new THREE.Vector3(t.x+((i%3)-1)*0.045,y,t.z+(Math.floor(i/3)-1)*0.045);
}
function snakeText(g){
  if(g.over)return g.endMsg||'遊戲結束';
  return '輪到 '+nm(g.cur)+whoTag(g.cur)+(myTurn(g.cur)?'，按「擲骰子」':'');
}
function snakeRoll(){
  var g=game;if(!g||g.id!=='snake'||g.busy||g.over)return;
  g.busy=true;
  var n=1+Math.floor(Math.random()*6),i=g.cur;
  avatars[i].temp={arm:'cheer',until:performance.now()+1000};
  gsync();netSend({t:'die',w:'snake',n:n});
  throwDie(g.die,g.dieY,n,function(){
    if(game!==g)return;
    gtoast(nm(i)+' 擲出 '+n+' 點',1400);snakeStep(g,i,n);
  });
}
function snakeStep(g,i,left){
  if(game!==g)return;
  if(left<=0||g.pos[i]>=g.N){later(250,function(){snakeLand(g,i);});return;}
  g.pos[i]++;gsync();
  later(300,function(){snakeStep(g,i,left-1);});
}
function snakeLand(g,i){
  if(game!==g)return;
  var k=g.pos[i],j=g.ladders[k]||g.slides[k];
  if(j){
    gtoast(g.ladders[k]?'梯子！爬到 '+j:'溜滑梯！滑到 '+j,1500);
    later(400,function(){if(game!==g)return;g.pos[i]=j;gsync();later(900,function(){snakeAfter(g,i);});});
    return;
  }
  snakeAfter(g,i);
}
function snakeAfter(g,i){
  if(game!==g)return;
  var k=g.pos[i];
  if(k>=g.N){
    g.over=true;g.hi=i;g.winner=i;
    avatars.forEach(function(a,x){a.arm=x===i?'jump':'cheer';});
    g.endMsg=nm(i)+' 抵達終點，獲勝！';gtoast(g.endMsg,5000);gsync();return;
  }
  if(k===g.extraTile){gtoast('星星格！再擲一次',1400);g.busy=false;g.hi=g.cur;gsync();return;}
  if(k===g.restTile){gtoast('咖啡時間：下一回合休息',1500);g.skip[i]=1;}
  var guard=0;
  do{
    g.cur=(g.cur+1)%7;guard++;
    if(g.skip[g.cur]){g.skip[g.cur]=0;gtoast(nm(g.cur)+' 休息一回合',1200);continue;}
    break;
  }while(guard<10);
  g.busy=false;g.hi=g.cur;gsync();
}
GAMEDEFS.snake={name:'蛇梯棋',
  start:function(g){
    longItems.forEach(function(m){m.visible=false;});
    var N=18,TS=0.22;g.N=N;
    g.ladders={3:9,8:13,11:16};g.slides={7:4,14:6,17:12};g.extraTile=10;g.restTile=15;
    g.board=new THREE.Group();longT.add(g.board);g.tiles=[];
    for(var n=1;n<=N;n++){
      var r=Math.floor((n-1)/3),c=(n-1)%3;if(r%2)c=2-c;
      var x=(c-1)*TS,z=(r-2.5)*TS;
      var kind=n===N?'goal':g.ladders[n]?'up':g.slides[n]?'down':n===g.extraTile?'extra':n===g.restTile?'rest':'';
      var tm=add(g.board,B(TS*0.94,0.012,TS*0.94),new THREE.MeshStandardMaterial({map:tileTex(n,kind,g.ladders[n]||g.slides[n]),roughness:0.6}),x,1.081,z);
      tm.rotation.y=-Math.PI/2;tm.castShadow=false;g.tiles.push({x:x,z:z});
    }
    var stTex=canvasTex(256,72,function(c2,w,h){
      c2.fillStyle='rgba(255,255,255,.92)';rr(c2,2,2,w-4,h-4,14);c2.fill();
      c2.fillStyle='#1f2a36';c2.font='700 38px '+FONT;c2.textAlign='center';c2.textBaseline='middle';c2.fillText('出發 ▶',w/2,h/2+2);
    });
    var stG=new THREE.Group();stG.rotation.y=-Math.PI/2;stG.position.set(0,1.0765,g.tiles[0].z-0.5);g.board.add(stG);
    var stP=new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.11),new THREE.MeshBasicMaterial({map:stTex,transparent:true}));
    stP.rotation.x=-Math.PI/2;stG.add(stP);
    g.pawns=[];g.pos=[0,0,0,0,0,0,0];g.skip=[0,0,0,0,0,0,0];
    avatars.forEach(function(a,i){
      var pw=new THREE.Group(),col=parseInt(a.color.slice(1),16);
      add(pw,C(0.004,0.03,0.07,14),M(col,{roughness:0.5}),0,0.035,0);
      add(pw,S(0.028,14,10),M(col,{roughness:0.5}),0,0.09,0);
      g.board.add(pw);g.pawns.push(pw);pw.position.copy(snakePawnPos(g,i,0));
    });
    g.die=new THREE.Mesh(B(0.07,0.07,0.07),dice.material);g.dieY=1.11;
    g.die.position.set(0,g.dieY,1.15);g.die.castShadow=true;g.board.add(g.die);
    g.cur=0;g.busy=false;g.auto=false;g.autoT=0;g.winner=-1;
    if(!g.remote){seatAllAtLong();g.hi=0;}
    goTo(viewByName('桌面視角'),false);
  },
  ser:function(g){return {cur:g.cur,pos:g.pos,skip:g.skip,busy:g.busy,auto:g.auto,winner:g.winner};},
  des:function(g,s){g.cur=s.cur;g.pos=s.pos;g.skip=s.skip;g.busy=s.busy;g.auto=s.auto;g.winner=s.winner;},
  ui:function(g){
    var btns=[{t:'擲骰子',act:'snake.roll',pri:true,dis:g.busy||g.over||!myTurn(g.cur)}];
    if(amHost()){btns.push({t:'自動：'+(g.auto?'開':'關'),act:'snake.auto'});}
    btns=btns.concat(menuBtns());
    guiBuild('蛇梯棋',snakeText(g),btns,{scores:true,primary:'snake.roll'});guiScores(g.pos);
  },
  view:function(g,dt){
    if(!g.pawns)return;
    var k=1-Math.exp(-dt*12);
    g.pawns.forEach(function(pw,i){
      var t=snakePawnPos(g,i,g.pos[i]),dx=t.x-pw.position.x,dz=t.z-pw.position.z,d=Math.hypot(dx,dz);
      pw.position.x+=dx*k;pw.position.z+=dz*k;pw.position.y=1.075+Math.min(0.09,d*0.8);
    });
  },
  tick:function(g,dt){
    if(g.over||g.busy)return;
    if(g.auto||isBot(g.cur)){g.autoT+=dt;if(g.autoT>1.1){g.autoT=0;snakeRoll();}}else g.autoT=0;
  },
  stop:function(g){
    if(g.board)longT.remove(g.board);
    longItems.forEach(function(m){m.visible=true;});
  }
};

/* ---- 2. 紙球投籃 ---- */
function tossText(g){
  if(g.over)return g.endMsg||'遊戲結束';
  return '第 '+(Math.floor(g.thrown/7)+1)+'/2 輪・'+nm(g.cur)+whoTag(g.cur)+(myTurn(g.cur)?'：看準綠區按「投！」':'');
}
function launchBall(g,from,to,isIn,done){
  var ball=new THREE.Mesh(new THREE.IcosahedronGeometry(0.045,0),M(0xf7f4ec,{roughness:0.9}));
  ball.castShadow=true;scene.add(ball);g.balls.push(ball);
  tw(0.8,function(k){
    ball.position.set(from.x+(to.x-from.x)*k,from.y+(to.y-from.y)*k+2.8*k*(1-k),from.z+(to.z-from.z)*k);ball.rotation.x+=0.3;
  },function(){
    if(isIn){scene.remove(ball);}else{later(1200,function(){scene.remove(ball);});}
    if(done)done();
  });
}
function remoteBall(m){
  var g=game;if(!g||g.id!=='toss')return;
  launchBall(g,new THREE.Vector3(m.f[0],m.f[1],m.f[2]),new THREE.Vector3(m.to[0],m.to[1],m.to[2]),m.in,null);
}
function tossNext(g){
  if(game!==g)return;
  g.thrown++;
  if(g.thrown>=g.total){finishRank(g,g.scores,'球');return;}
  g.cur=(g.cur+1)%7;g.canThrow=true;g.hi=g.cur;gsync();
}
function tossThrow(v){
  var g=game;if(!g||g.id!=='toss'||!g.canThrow||g.over)return;
  if(isNaN(v))v=g.mv;
  g.canThrow=false;
  var err=v-0.5,ae=Math.abs(err),a=avatars[g.cur],who=g.cur;
  a.temp={arm:'throw',until:performance.now()+900};
  gsync();
  later(260,function(){
    if(game!==g)return;
    var from=new THREE.Vector3();a.head.getWorldPosition(from);from.y+=0.05;
    var cx=g.center.x,cz=g.center.z,dx=cx-from.x,dz=cz-from.z,dl=Math.hypot(dx,dz)||1,ux=dx/dl,uz=dz/dl;
    var isIn=ae<0.09,to;
    if(isIn){to=new THREE.Vector3(cx,0.3,cz);}
    else{
      var dist=err<0?Math.max(0.2,dl-(0.25+ae*1.6)):dl+0.25+ae*1.6,side=(Math.random()-0.5)*0.3;
      to=new THREE.Vector3(from.x+ux*dist-uz*side,0.05,from.z+uz*dist+ux*side);
    }
    netSend({t:'ball',f:[r2(from.x),r2(from.y),r2(from.z)],to:[r2(to.x),r2(to.y),r2(to.z)],in:isIn});
    launchBall(g,from,to,isIn,function(){
      if(game!==g)return;
      if(isIn){
        g.scores[who]++;gtoast('進！ +1',1300);
        avatars.forEach(function(o){o.temp={arm:'cheer',until:performance.now()+1100};});
      }else{gtoast(err<0?'力道不夠':'力道太大',1300);}
      gsync();later(1400,function(){tossNext(g);});
    });
  });
}
GAMEDEFS.toss={name:'紙球投籃',
  start:function(g){
    g.center={x:0.4,z:-0.25};
    var bin=new THREE.Group();scene.add(bin);g.bin=bin;
    add(bin,C(0.19,0.14,0.46,28,true),M(0x2f6f4f,{roughness:0.7,side:DS}),0,0.23,0);
    add(bin,C(0.14,0.14,0.02,28),M(0x1f4f38),0,0.012,0);
    var rim=add(bin,new THREE.TorusGeometry(0.19,0.012,8,28),M(0xe9e4d6),0,0.46,0);rim.rotation.x=Math.PI/2;
    bin.position.set(g.center.x,0,g.center.z);
    g.scores=[0,0,0,0,0,0,0];g.total=14;g.thrown=0;g.cur=0;g.canThrow=true;g.balls=[];g.mv=0.5;g.botT=0;
    if(!g.remote){
      avatars.forEach(function(a,i){
        var an=i/7*Math.PI*2,x=g.center.x+0.95*Math.cos(an),z=g.center.z+0.95*Math.sin(an);
        standAt(a,x,z,faceTo(x,z,g.center.x,g.center.z),'rest');
      });
      g.hi=0;
    }
    goTo(viewByName('投籃視角'),false);
  },
  ser:function(g){return {cur:g.cur,thrown:g.thrown,total:g.total,scores:g.scores,canThrow:g.canThrow};},
  des:function(g,s){g.cur=s.cur;g.thrown=s.thrown;g.total=s.total;g.scores=s.scores;g.canThrow=s.canThrow;},
  ui:function(g){
    guiBuild('紙球投籃',tossText(g),[{t:'投！',act:'toss.throw',pri:true,dis:!g.canThrow||g.over||!myTurn(g.cur)}].concat(menuBtns()),{scores:true,meter:true,primary:'toss.throw'});
    guiScores(g.scores);
  },
  vtick:function(g,dt,now){
    g.mv=Math.abs(((now/1000)*0.85)%2-1);
    if(G.mk)G.mk.style.left=(g.mv*100)+'%';
  },
  tick:function(g,dt){
    if(g.over||!g.canThrow){g.botT=0;return;}
    if(isBot(g.cur)){g.botT+=dt;if(g.botT>1.3){g.botT=0;tossThrow(0.5+(Math.random()+Math.random()+Math.random()-1.5)*0.35);}}else g.botT=0;
  },
  stop:function(g){
    if(g.bin)scene.remove(g.bin);
    g.balls.forEach(function(b){scene.remove(b);});
  }
};

/* ---- 3. 猜拳擂台 ---- */
function rpsMe(g){return NET.on?NET.mySeat:g.me;}
function rpsHumans(g){return g.alive.filter(function(i){return NET.on?humanSeat(i):(i===g.me);});}
function rpsBegin(g){
  if(game!==g)return;
  g.round=(g.round||0)+1;var rd=g.round;
  g.phase='pick';g.picks={};g.flags=[0,0,0,0,0,0,0];clearBubbles();
  g.alive.forEach(function(i){avatars[i].arm='rest';});
  var hum=rpsHumans(g);
  g.alive.forEach(function(i){if(hum.indexOf(i)<0)g.picks[i]=Math.floor(Math.random()*3);});
  if(!hum.length){rpsPlay(g);return;}
  gsync();
  later(12000,function(){
    if(game!==g||g.round!==rd||g.phase!=='pick')return;
    hum.forEach(function(i){if(g.picks[i]===undefined)g.picks[i]=Math.floor(Math.random()*3);});
    rpsPlay(g);
  });
}
function rpsPick(who,k){
  var g=game;if(!g||g.id!=='rps'||g.phase!=='pick')return;
  var seat=NET.on?who:g.me;
  if(g.alive.indexOf(seat)<0||g.picks[seat]!==undefined||!(k>=0&&k<3))return;
  g.picks[seat]=k;g.flags[seat]=1;
  var hum=rpsHumans(g);
  if(hum.every(function(i){return g.picks[i]!==undefined;})){rpsPlay(g);}else gsync();
}
function rpsPlay(g){
  if(game!==g)return;
  g.phase='reveal';gsync();
  g.alive.forEach(function(i){avatars[i].arm='pump';});
  gtoast('剪刀…',520);later(560,function(){gtoast('石頭…',520);});later(1120,function(){gtoast('布！',700);});
  later(1750,function(){
    if(game!==g)return;
    var hands=g.picks;
    g.alive.forEach(function(i){var a=avatars[i];showBubble(a,RPS[hands[i]][0],RPS[hands[i]][1]);a.arm='show';});
    var kinds={};g.alive.forEach(function(i){kinds[hands[i]]=1;});
    var ks=Object.keys(kinds).map(Number);
    if(ks.length!==2){
      gtoast('平手！再來一次',1700);
      later(1900,function(){if(game!==g)return;rpsBegin(g);});
      return;
    }
    var win=((ks[0]+1)%3===ks[1])?ks[0]:ks[1];
    var winners=g.alive.filter(function(i){return hands[i]===win;}),losers=g.alive.filter(function(i){return hands[i]!==win;});
    later(1100,function(){
      if(game!==g)return;
      losers.forEach(function(i){var a=avatars[i];a.tag='淘汰';a.arm='rest';redrawLabel(a);});
      winners.forEach(function(i){avatars[i].arm='cheer';});
      g.alive=winners;gtoast(RPS[win][1]+'贏！'+losers.length+' 人淘汰',1800);gsync();
      later(1900,function(){
        if(game!==g)return;
        clearBubbles();
        if(g.alive.length===1){
          g.over=true;var w=avatars[g.alive[0]];w.arm='jump';w.tag='冠軍';redrawLabel(w);
          g.endMsg='冠軍：'+nm(g.alive[0]);gtoast(g.endMsg+'！',4500);gsync();return;
        }
        rpsBegin(g);
      });
    });
  });
}
GAMEDEFS.rps={name:'猜拳擂台',
  start:function(g){
    g.alive=[0,1,2,3,4,5,6];g.phase='pick';g.flags=[0,0,0,0,0,0,0];g.picks={};g.me=0;g.round=0;
    if(!g.remote){
      rowAll('rest');g.me=(!NET.on&&sel&&sel.kind==='avatar')?sel.a.idx:0;
      later(500,function(){rpsBegin(g);});
    }
    goTo(viewByName('合照視角'),false);
  },
  ser:function(g){return {alive:g.alive,phase:g.phase,flags:g.flags,me:g.me};},
  des:function(g,s){g.alive=s.alive;g.phase=s.phase;g.flags=s.flags;g.me=s.me;},
  ui:function(g){
    var me=rpsMe(g),alive=g.alive.indexOf(me)>=0,btns=[],st,prim=null;
    if(g.over)st=g.endMsg||'遊戲結束';
    else if(g.phase==='pick'){
      if(alive&&!g.flags[me]){
        st='請出拳！剩 '+g.alive.length+' 人';
        RPS.forEach(function(h,k){btns.push({t:h[1]+h[0],act:'rps.pick:'+k,pri:k===0});});
        prim='rps.pick:'+Math.floor(Math.random()*3);
      }else if(alive){st='已出拳，等待其他人…';}
      else st=(me>=0?'你已淘汰，觀戰中':'觀戰中')+'・剩 '+g.alive.length+' 人';
    }else st='開拳中…';
    guiBuild('猜拳擂台',st,btns.concat(menuBtns()),{primary:prim});
  },
  stop:function(g){clearBubbles();}
};

/* ---- 4. 翻牌配對 ---- */
function symTex(id){
  var cols=['#d9473d','#2f6fd0','#2f9e5a','#e08a1e','#8a4fc0','#d94f8a'];
  return canvasTex(128,176,function(g,w,h){
    g.fillStyle='#fbf8f0';g.fillRect(0,0,w,h);g.strokeStyle='#cfc7b4';g.lineWidth=5;g.strokeRect(3,3,w-6,h-6);
    g.fillStyle=cols[id];g.beginPath();var cx=w/2,cy=h/2;
    if(id===0){g.arc(cx,cy,40,0,7);}
    else if(id===1){g.rect(cx-38,cy-38,76,76);}
    else if(id===2){g.moveTo(cx,cy-44);g.lineTo(cx+44,cy+34);g.lineTo(cx-44,cy+34);g.closePath();}
    else if(id===3){g.moveTo(cx,cy-46);g.lineTo(cx+36,cy);g.lineTo(cx,cy+46);g.lineTo(cx-36,cy);g.closePath();}
    else if(id===4){for(var k=0;k<10;k++){var rad=k%2?18:44,an=-Math.PI/2+k*Math.PI/5;g[k?'lineTo':'moveTo'](cx+rad*Math.cos(an),cy+rad*Math.sin(an));}g.closePath();}
    else{g.moveTo(cx,cy+40);g.bezierCurveTo(cx-60,cy-5,cx-30,cy-50,cx,cy-18);g.bezierCurveTo(cx+30,cy-50,cx+60,cy-5,cx,cy+40);g.closePath();}
    g.fill();
  });
}
function backTex(){
  return canvasTex(128,176,function(g,w,h){
    g.fillStyle='#6b4a33';g.fillRect(0,0,w,h);g.strokeStyle='#e8d6bd';g.lineWidth=5;g.strokeRect(8,8,w-16,h-16);
    g.fillStyle='#e8d6bd';g.font='700 56px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('聊',w/2,h/2-6);
    g.font='700 22px '+FONT;g.fillText('BAR',w/2,h/2+38);
  });
}
function flipCard(c,up){
  tw(0.35,function(k){c.holder.rotation.x=up?Math.PI*k:Math.PI*(1-k);c.holder.position.y=1.082+0.07*Math.sin(Math.PI*k);});
}
function setCardFace(c,id){
  if(c.faceId===id)return;
  c.faceId=id;c.fm.map=id>=0?symTex(id):null;c.fm.needsUpdate=true;
}
function memText(g){
  if(g.over)return g.endMsg||'遊戲結束';
  return nm(g.cur)+whoTag(g.cur)+(myTurn(g.cur)?'：翻兩張牌':'翻牌中');
}
function memFlip(g,idx){
  var c=g.cards[idx];
  if(!c||g.busy||g.over||c.up||c.done)return;
  c.up=true;g.open.push(c);gsync();
  if(g.open.length<2)return;
  g.busy=true;var a=g.open[0],b=g.open[1];
  later(650,function(){
    if(game!==g)return;
    if(a.id===b.id){
      a.done=b.done=true;g.scores[g.cur]++;g.pairs++;
      gtoast('配對成功！',1200);avatars[g.cur].temp={arm:'cheer',until:performance.now()+1200};
      g.open=[];g.busy=false;gsync();
      if(g.pairs>=6)finishRank(g,g.scores,'對');
    }else{
      gtoast('不一樣，換下一位',1200);
      a.up=false;b.up=false;gsync();
      later(600,function(){if(game!==g)return;g.open=[];g.cur=(g.cur+1)%7;g.busy=false;g.hi=g.cur;gsync();});
    }
  });
}
function memTap(i,who,fromHost){
  var g=game;if(!g||g.id!=='memory'||!mayAct(g.cur,who,fromHost))return;
  memFlip(g,i);
}
GAMEDEFS.memory={name:'翻牌配對',
  start:function(g){
    longItems.forEach(function(m){m.visible=false;});
    var ids=g.remote?[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]:shuffle([0,1,2,3,4,5,0,1,2,3,4,5]);
    g.grp=new THREE.Group();longT.add(g.grp);g.cards=[];
    var side=M(0xe9e2d2,{roughness:0.7}),bm=new THREE.MeshStandardMaterial({map:backTex(),roughness:0.6});
    for(var i=0;i<12;i++){
      var r=Math.floor(i/3),c=i%3,holder=new THREE.Group();
      holder.position.set((c-1)*0.23,1.082,(r-1.5)*0.36);g.grp.add(holder);
      var fm=new THREE.MeshStandardMaterial({map:null,roughness:0.6,color:0xfbf8f0});
      var m=new THREE.Mesh(B(0.17,0.012,0.24),[side,side,bm,fm,side,side]);
      m.castShadow=true;m.receiveShadow=true;holder.add(m);
      var card={i:i,holder:holder,mesh:m,fm:fm,id:ids[i],up:false,done:false,vis:false,faceId:-2};
      setCardFace(card,ids[i]);g.cards.push(card);
    }
    g.open=[];g.scores=[0,0,0,0,0,0,0];g.cur=0;g.busy=false;g.pairs=0;g.botT=0;
    if(!g.remote){seatAllAtLong();g.hi=0;}
    goTo(viewByName('桌面視角'),false);
  },
  ser:function(g){
    return {cur:g.cur,scores:g.scores,pairs:g.pairs,busy:g.busy,
      cards:g.cards.map(function(c){return [(c.up||c.done)?c.id:-1,c.up?1:0,c.done?1:0];})};
  },
  des:function(g,s){
    g.cur=s.cur;g.scores=s.scores;g.pairs=s.pairs;g.busy=s.busy;
    s.cards.forEach(function(r,i){var c=g.cards[i];if(!c)return;if(r[0]>=0){c.id=r[0];setCardFace(c,r[0]);}c.up=!!r[1];c.done=!!r[2];});
  },
  ui:function(g){guiBuild('翻牌配對',memText(g),menuBtns(),{scores:true});guiScores(g.scores);},
  view:function(g){
    g.cards.forEach(function(c){var want=c.up||c.done;if(want!==c.vis){c.vis=want;flipCard(c,want);}});
  },
  tick:function(g,dt){
    if(g.over||g.busy){g.botT=0;return;}
    if(isBot(g.cur)){
      g.botT+=dt;
      if(g.botT>1.0){
        g.botT=0;
        var free=g.cards.filter(function(c){return !c.up&&!c.done;});
        if(free.length)memFlip(g,free[Math.floor(Math.random()*free.length)].i);
      }
    }else g.botT=0;
  },
  pick:function(ev){
    var g=game;if(!g||!g.cards)return null;
    setRay(ev);
    var h=raycaster.intersectObjects(g.cards.map(function(c){return c.mesh;}),false);
    if(!h.length)return null;
    for(var i=0;i<g.cards.length;i++){if(g.cards[i].mesh===h[0].object)return {kind:'game',obj:g.cards[i]};}
    return null;
  },
  stop:function(g){
    if(g.grp)longT.remove(g.grp);
    longItems.forEach(function(m){m.visible=true;});
  }
};

/* ---- 5. 誰做錯了 ---- */
function oddText(g){
  if(g.over)return g.endMsg||'遊戲結束';
  return '第 '+g.round+'/'+g.total+' 題・'+(g.cmd?'大家「'+g.cmd+'」，':'')+'找出做錯的人';
}
function oddNext(g){
  if(game!==g)return;
  if(g.round>=g.total){
    g.phase='over';g.hi=-1;clearBubbles();
    avatars.forEach(function(a){a.arm='cheer';});
    var mx=Math.max.apply(null,g.scores),w=[];g.scores.forEach(function(v,i){if(v===mx)w.push(i);});
    g.endMsg=NET.on?'結束！最高分：'+w.map(function(i){return nm(i);}).join('、')+'（'+mx+' 分）':'結束！得分 '+g.scores[0]+' / '+(g.total*3);
    g.over=true;gtoast(g.endMsg,5000);gsync();return;
  }
  g.round++;g.phase='wait';g.hi=-1;clearBubbles();
  var CM=[['cheer','歡呼'],['wave','揮手'],['crossed','抱胸'],['jump','跳躍'],['play','玩牌']];
  var cmd=CM[Math.floor(Math.random()*CM.length)];
  var alts=CM.filter(function(x){return x[0]!==cmd[0];}),alt=alts[Math.floor(Math.random()*alts.length)];
  g.odd=Math.floor(Math.random()*7);g.cmd=cmd[1];
  avatars.forEach(function(a){a.arm='rest';});
  gtoast('指令：大家「'+cmd[1]+'」！',1500);gsync();
  later(1100,function(){
    if(game!==g)return;
    avatars.forEach(function(a,i){a.arm=(i===g.odd)?alt[0]:cmd[0];});
    g.phase='guess';g.t0=performance.now();gsync();
    var rd=g.round;
    later(7000,function(){
      if(game!==g||g.round!==rd||g.phase!=='guess')return;
      g.phase='reveal';g.hi=g.odd;gtoast('時間到，是 '+nm(g.odd),1800);gsync();
      later(2000,function(){oddNext(g);});
    });
  });
}
function oddTap(idx,who){
  var g=game;if(!g||g.id!=='odd'||g.phase!=='guess')return;
  var seat=NET.on?who:0;
  if(seat<0||seat>6)return;
  var a=avatars[idx];if(!a)return;
  if(idx===g.odd){
    var el=(performance.now()-g.t0)/1000,pts=el<2?3:el<4?2:1;
    g.scores[seat]+=pts;g.phase='between';showBubble(a,'✔','+'+pts);g.hi=idx;
    gtoast((NET.on?nm(seat)+' ':'')+'答對了！+'+pts+' 分',1500);gsync();
    var rd=g.round;later(1700,function(){if(game===g)oddNext(g);});
  }else{
    g.scores[seat]=Math.max(0,g.scores[seat]-1);showBubble(a,'✘','-1');
    later(900,function(){a.bubOn=false;a.bubE='';a.bubW='';if(a.bub)a.bub.visible=false;});
    gtoast((NET.on?nm(seat)+'：':'')+'不是他！-1 分',1100);gsync();
  }
}
GAMEDEFS.odd={name:'誰做錯了',
  start:function(g){
    g.round=0;g.total=8;g.phase='wait';g.scores=[0,0,0,0,0,0,0];g.cmd='';g.odd=-1;
    if(!g.remote){rowAll('rest');later(600,function(){oddNext(g);});}
    goTo(viewByName('合照視角'),false);
  },
  ser:function(g){return {round:g.round,total:g.total,phase:g.phase,scores:g.scores,cmd:g.cmd};},
  des:function(g,s){g.round=s.round;g.total=s.total;g.phase=s.phase;g.scores=s.scores;g.cmd=s.cmd;},
  ui:function(g){guiBuild('誰做錯了',oddText(g),menuBtns(),{scores:true});guiScores(g.scores);},
  stop:function(g){clearBubbles();}
};

/* ---- 6. 真心話大冒險 ---- */
var TRUTHS=['今天最讓你開心的一件小事是什麼？','最近一次在工作上被感動，是什麼時候？','如果下班後有一小時完全自由，你最想做什麼？','說出一個你很欣賞在座某位夥伴的優點。','你求學時最難忘的一位老師是誰？為什麼？','你最常用來幫自己充電的方式是什麼？','哪一個小確幸是你每天都會期待的？','如果可以跟任何人喝杯咖啡聊聊，你想找誰？'];
var DARES=[['用最誇張的方式歡呼三秒！','cheer'],['對大家揮手說：「今天也辛苦了！」','wave'],['抱胸裝酷三秒，讓大家猜你在模仿誰。','crossed'],['原地跳三下，邊跳邊說一句鼓勵自己的話。','jump'],['用一句話稱讚坐在你旁邊的人。',null],['選一位夥伴，一起擺一個合照姿勢。','crossed'],['用三個詞形容你現在的心情。',null],['對自己說一句最想聽到的話。',null]];
var THANKS=['想一件這週別人幫過你的小事，說聲謝謝。','謝謝一位夥伴曾給你的一個善意舉動。','對自己說：「這週你辛苦了。」','想一個讓你覺得被理解的瞬間，分享給大家。','說出一件你想感謝學生帶給你的事。','謝謝今天在場的某一個人，並說出原因。'];
function drawCard(key){
  var g=game;if(!g||g.id!=='card')return;
  var list=g.deck[key];
  if(!list.length){g.deck[key]=shuffle((key==='t'?TRUTHS:key==='d'?DARES:THANKS).slice());list=g.deck[key];}
  var item=list.pop(),who;
  do{who=Math.floor(Math.random()*7);}while(who===g.last);
  g.last=who;
  var a=avatars[who],text=Array.isArray(item)?item[0]:item,act=Array.isArray(item)?item[1]:null;
  g.hi=who;g.who=who;
  var tag=nm(who)+'・'+(key==='t'?'真心話':key==='d'?'大冒險':'感謝卡');
  showCard(tag,text,a.color);netSend({t:'card',tag:tag,text:text,color:a.color});
  if(act){a.temp={arm:act,until:performance.now()+3600};}
  gsync();
}
GAMEDEFS.card={name:'真心話大冒險',
  start:function(g){
    g.deck={t:shuffle(TRUTHS.slice()),d:shuffle(DARES.slice()),k:shuffle(THANKS.slice())};g.last=-1;g.who=-1;
    if(!g.remote){arrange('game');}
    goTo(viewByName('晤談區'),false);
  },
  ser:function(g){return {who:g.who};},
  des:function(g,s){g.who=s.who;},
  ui:function(g){
    var st=g.who>=0?'輪到 '+nm(g.who)+whoTag(g.who):'抽一張卡，隨機點一位玩家';
    guiBuild('真心話大冒險',st,[{t:'真心話',act:'card.draw:t',pri:true},{t:'大冒險',act:'card.draw:d'},{t:'感謝卡',act:'card.draw:k'}].concat(menuBtns().slice(1)));
  },
  stop:function(g){gcard.hidden=true;}
};

/* ---- shared dice / random pick (any player may press) ---- */
function hostRollDice(){
  if(diceBusy)return;diceBusy=true;
  var n=1+Math.floor(Math.random()*6);
  netSend({t:'die',w:'rt',n:n});
  throwDie(dice,DICE_Y,n,function(){diceBusy=false;gtoast('擲出 '+n+' 點',3000);});
}
function pickRandomHost(){
  var a=avatars[Math.floor(Math.random()*avatars.length)];
  a.temp={arm:'cheer',until:performance.now()+2800};
  if(!NET.on)selectAvatar(a);
  gtoast('輪到「'+labelOf(a)+'」！',3000);
}
window.__llbar={NET:NET,avatars:avatars,movables:movables,seats:seats,gameTap:gameTap,runAct:runAct,get game(){return game;}};


(function(){
  roomChip=mkChip('多人房間',function(){roomOpen=!roomOpen;roomUI();},'');
  roomChip.className='chip';roomChip.setAttribute('aria-pressed','false');tbox2.appendChild(roomChip);
  var lb=mkChip('省電畫質',function(){setLiteFn(lb.getAttribute('aria-pressed')!=='true');},'');
  setLiteFn=function(on){liteOn=on;lb.setAttribute('aria-pressed',on?'true':'false');renderer.setPixelRatio(pixelRatio());resize();sun.castShadow=sun.intensity>0&&!liteOn;};
  lb.className='chip';lb.setAttribute('aria-pressed',liteOn?'true':'false');tbox2.appendChild(lb);
})();

layout('photo',true);
renderPanel();
toast('按「多人房間」可以邀請大家一起玩；「遊戲選單」有 6 種玩法',4800);
if(QS.get('room')){roomOpen=true;roomUI();setTimeout(function(){joinRoom(roomCode,roomKind,'訪客',joinPw);},500);}


/* ================= resize + loop ================= */
function resize(){
  var w=stage.clientWidth||window.innerWidth,h=stage.clientHeight||window.innerHeight;
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<0.8?62:45;camera.updateProjectionMatrix();
}
if(window.ResizeObserver){new ResizeObserver(resize).observe(stage);}
window.addEventListener('resize',resize);resize();
goTo(0,true);

setInterval(function(){if(NET.role==='host'&&Object.keys(NET.peers).length)netSend({t:'hb'});},3000);
window.addEventListener('pagehide',function(){if(NET.role==='host')netSend({t:'bye'});});
var last=performance.now(),firstFrame=true,fpsN=0,fpsT=0,fpsWarm=0;
function frame(now){
  var raw=(now-last)/1000,dt=Math.min(raw,0.05);last=now;
  if(firstFrame){firstFrame=false;hideLoading();}
  else if(!document.hidden&&raw<0.5&&!liteOn&&!autoLiteDone&&setLiteFn){
    fpsWarm++;
    if(fpsWarm>60){fpsN++;fpsT+=raw;if(fpsN>=90){var fps=fpsN/fpsT;fpsN=0;fpsT=0;if(fps<24){autoLiteDone=true;setLiteFn(true);toast('畫面有點卡，已自動切換成省電畫質',3200);}}}
  }
  if(tween){
    tween.t=Math.min(1,tween.t+dt/0.9);
    var e=tween.t<0.5?4*tween.t*tween.t*tween.t:1-Math.pow(-2*tween.t+2,3)/2;
    camera.position.lerpVectors(tween.fp,tween.tp,e);controls.target.lerpVectors(tween.ft,tween.tt,e);
    if(tween.t>=1)tween=null;
  }
  var p=camera.position;
  wBack.visible=p.z>-RZ;wFront.visible=p.z<RZ;wLeft.visible=p.x>-RX;wRight.visible=p.x<RX;
  ceilGroup.visible=ceilOn&&p.y<RH-0.1;rail.visible=p.y<RH-0.1;
  frontOut.visible=p.z>RZ&&p.y<4.2&&Math.hypot(p.x,p.z-RZ)<10;
  labels.forEach(function(sp){sp.visible=!frontOut.visible;var d=camera.position.distanceTo(sp.position);var k=Math.max(0.22,Math.min(1,d/13));sp.scale.set(1.8*k,0.67*k,1);});
  tickPeople(dt,now);
  controls.update();
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
