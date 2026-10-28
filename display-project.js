/* Original SmartEase pixel/program document. No device protocol or Bluetooth access. */
(function(root){
 "use strict";
 const FORMAT="smartease-display-project", MAX_PIXELS=65536;
 const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
 const clone=x=>JSON.parse(JSON.stringify(x));
 function validate(raw){
  if(!raw||raw.format!==FORMAT||raw.version!==1||!integer(raw.width,8,128)||!integer(raw.height,8,64))
   throw Error("Choose a SmartEase display project, 8–128 columns and 8–64 rows.");
  if(!Array.isArray(raw.programs)||!integer(raw.programs.length,1,16))throw Error("A project needs 1–16 programs.");
  let total=0;
  const programs=raw.programs.map(p=>{
   if(!p||typeof p.name!=="string"||!integer(p.hold,1,60)||!integer(p.repeat,1,20)||
    !Array.isArray(p.frames)||!integer(p.frames.length,1,32))throw Error("Invalid program settings.");
   const frames=p.frames.map(f=>{
    if(!f||!integer(f.duration,50,10000)||!Array.isArray(f.pixels)||f.pixels.length!==raw.width*raw.height||
     !f.pixels.every(c=>integer(c,0,0xffffff)))throw Error("Invalid pixel frame or duration.");
    total+=f.pixels.length;
    if(total>MAX_PIXELS)throw Error("Project is full (65,536 pixels across all frames). Export this project and start another.");
    return {duration:f.duration,pixels:[...f.pixels]};
   });
   return {name:p.name.slice(0,40),hold:p.hold,repeat:p.repeat,frames};
  });
  return {format:FORMAT,version:1,width:raw.width,height:raw.height,programs};
 }
 const frame=(w,h)=>({duration:200,pixels:Array(w*h).fill(0)});
 function create(width=48,height=12){return validate({format:FORMAT,version:1,width,height,
  programs:[{name:"My display",hold:3,repeat:1,frames:[frame(width,height)]}]});}
 function resize(project,width,height){
  const next=clone(project);next.width=width;next.height=height;
  if(!integer(width,8,128)||!integer(height,8,64))throw Error("Use 8–128 columns and 8–64 rows.");
  for(const p of next.programs)for(const f of p.frames){
   const pixels=Array(width*height).fill(0);
   for(let y=0;y<Math.min(height,project.height);y++)for(let x=0;x<Math.min(width,project.width);x++)
    pixels[y*width+x]=f.pixels[y*project.width+x];
   f.pixels=pixels;
  }
  return validate(next);
 }
 function transform(project,p,f,operation){
  const w=project.width,h=project.height,src=project.programs[p].frames[f].pixels;
  if(!["left","right","up","down","mirror","flip"].includes(operation))throw Error("Unknown transform.");
  return src.map((_,i)=>{
   let x=i%w,y=Math.floor(i/w);
   if(operation==="mirror")x=w-1-x;
   if(operation==="flip")y=h-1-y;
   if(operation==="left")x++;
   if(operation==="right")x--;
   if(operation==="up")y++;
   if(operation==="down")y--;
   return x<0||x>=w||y<0||y>=h?0:src[y*w+x];
  });
 }
 function imagePixels(rgba,width,height){
  if(rgba.length!==width*height*4)throw Error("Invalid image dimensions.");
  return Array.from({length:width*height},(_,i)=>{
   const a=rgba[i*4+3]/255;
   return (Math.round(rgba[i*4]*a)<<16)|(Math.round(rgba[i*4+1]*a)<<8)|Math.round(rgba[i*4+2]*a);
  });
 }
 function template(width,height,kind,color){
  if(!["gaze","blink","sleep"].includes(kind)||!integer(color,0,0xffffff))throw Error("Choose an eyes template and color.");
  const pixels=Array(width*height).fill(0);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const side=x<width/2?0:1, local=(x%(width/2))/(width/2),v=y/height;
   const edge=side?local:1-local;
   const lit=kind==="blink"?v>0.48&&v<0.62&&local>0.15&&local<0.85:
    kind==="sleep"?Math.abs(v-(0.45+0.18*Math.sin(local*Math.PI)))<0.08&&local>0.12&&local<0.88:
    local>0.12&&local<0.88&&v>0.2+edge*0.32&&v<0.78-edge*0.12;
   if(lit)pixels[y*width+x]=color;
  }
  return pixels;
 }
 function sequence(project){
  const valid=validate(project),steps=[];
  valid.programs.forEach((p,program)=>{
   for(let r=0;r<p.repeat;r++)p.frames.forEach((f,index)=>steps.push({program,frame:index,
    duration:p.frames.length===1?p.hold*1000:f.duration}));
  });
  return steps;
 }
 root.SmartEaseDisplay={validate,create,resize,transform,imagePixels,template,sequence,clone,frame};
 if(typeof module!=="undefined")module.exports=root.SmartEaseDisplay;
})(globalThis);
