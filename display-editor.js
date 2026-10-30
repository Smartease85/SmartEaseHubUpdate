/* Device-independent authoring: project files never imply a compatible BLE upload. */
"use strict";
const displayModel=SmartEaseDisplay, displayKey="smartease-display-project-v1";
// Numeric specification verified by the parent from the owner's device screen.
// This is an explicit preset, never a migration of existing saved documents.
const displayOwnerSize=Object.freeze({width:96,height:16,orientationVerified:false});
let displayProject=displayModel.create(),displayProgram=0,displayFrame=0,displayTimer=null,displayPlaying=false;
let displayUndo=[],displayRedo=[],displayDrawing=false;
try{const saved=localStorage.getItem(displayKey);if(saved)displayProject=displayModel.validate(JSON.parse(saved));}catch{}
const displayHost=document.createElement("section");
displayHost.className="display-studio";displayHost.id="displayStudio";
displayHost.innerHTML=`
 <div class="card-top"><div><div class="overline">Devil Eyes studio</div><h3>Make it yours, pixel by pixel.</h3></div><span class="pill">Local editor</span></div>
 <p class="small-note">Create pictures, text and frame animations here. Projects stay in this browser and in Settings backups. Panel size is a draft setting until confirmed in CoolLED1248. GIF import is excluded; use individual pictures as frames.</p>
 <div class="display-settings">
  <label>Size preset <select class="input" id="displaySizePreset"><option value="manual">Manual size</option><option value="owner-ux">Owned CoolLEDUX: 96 columns, 16 rows</option></select></label>
  <label>Columns <input class="input" id="displayWidth" type="number" min="8" max="128"></label>
  <label>Rows <input class="input" id="displayHeight" type="number" min="8" max="64"></label>
  <button class="secondary" id="displayResize" type="button">Apply panel size</button>
 </div>
 <p class="small-note" id="displaySizeNote">Owner-device preset: 96 columns by 16 rows. Selecting it fills the fields only; Apply panel size changes the canvas. Orientation remains unverified.</p>
 <div class="display-layout"><div>
  <div class="display-canvas-wrap"><canvas id="displayCanvas" width="768" height="192" aria-label="Editable pixel picture; choose a pixel below for keyboard editing"></canvas></div>
  <p class="small-note" id="displayPreviewLabel">Editing frame 1</p>
  <div class="display-settings">
   <label>Paint <input id="displayPaint" type="color" value="#49e3d2"></label>
   <label><input id="displayErase" type="checkbox"> Eraser</label>
   <label>Column <input class="input" type="number" min="1" value="1" id="displayX"></label>
   <label>Row <input class="input" type="number" min="1" value="1" id="displayY"></label>
   <button class="secondary" id="displayPixel" type="button">Paint pixel</button>
  </div>
  <div class="row-actions"><button class="secondary" id="displayUndo" type="button">Undo</button><button class="secondary" id="displayRedo" type="button">Redo</button><button class="secondary" id="displayFill" type="button">Fill</button><button class="secondary" id="displayClear" type="button">Clear frame</button></div>
  <div class="row-actions" id="displayTransforms">${["mirror","flip","left","right","up","down"].map(x=>`<button class="text-btn" data-transform="${x}" type="button">${x}</button>`).join("")}</div>
  <details><summary>Text, pictures and original eye templates</summary>
   <label class="field-label" for="displayText">Text (rendered with your browser's font)</label><input class="input" id="displayText" maxlength="80" placeholder="SmartEase">
   <label class="field-label" for="displayTextSize">Text height</label><input class="input" id="displayTextSize" type="number" min="5" max="64" value="10">
   <div class="row-actions"><button class="secondary" id="displayTextStill" type="button">Place text</button><button class="secondary" id="displayTextScroll" type="button">Make scrolling frames</button></div>
   <label class="field-label" for="displayImage">Fit a picture to this frame (PNG, JPEG or WebP, up to 5 MB)</label><input class="input" id="displayImage" type="file" accept="image/png,image/jpeg,image/webp">
   <div class="row-actions" id="displayTemplates">${["gaze","blink","sleep"].map(x=>`<button class="secondary" data-template="${x}" type="button">${x}</button>`).join("")}</div>
  </details>
 </div><div class="display-timeline">
  <label class="field-label" for="displayPrograms">Program playlist</label><select class="input" id="displayPrograms"></select>
  <label class="field-label" for="displayName">Program name</label><input class="input" id="displayName" maxlength="40">
  <div class="display-settings"><label>Still hold (s) <input class="input" id="displayHold" type="number" min="1" max="60"></label><label>Repeats <input class="input" id="displayRepeat" type="number" min="1" max="20"></label></div>
  <div class="row-actions"><button class="secondary" id="displayAddProgram" type="button">Add program</button><button class="text-btn" id="displayDeleteProgram" type="button">Delete program</button><button class="text-btn" id="displayProgramUp" type="button">Move up</button><button class="text-btn" id="displayProgramDown" type="button">Move down</button></div>
  <label class="field-label" for="displayFrames">Frames</label><select class="input" id="displayFrames"></select>
  <label class="field-label" for="displayDuration">Frame time (ms)</label><input class="input" id="displayDuration" type="number" min="50" max="10000" step="50">
  <div class="row-actions"><button class="secondary" id="displayAddFrame" type="button">Blank frame</button><button class="secondary" id="displayCopyFrame" type="button">Duplicate</button><button class="text-btn" id="displayDeleteFrame" type="button">Delete frame</button><button class="text-btn" id="displayFrameUp" type="button">Earlier</button><button class="text-btn" id="displayFrameDown" type="button">Later</button></div>
  <div class="row-actions"><button class="primary" id="displayPlay" type="button">Preview playlist</button><button class="secondary" id="displayStop" type="button">Stop preview</button></div>
  <p class="small-note">Playback here is a local preview. No animation is streamed to the display.</p>
 </div></div>
 <div class="row-actions"><button class="secondary" id="displayExport" type="button">Export project</button><button class="secondary" id="displayImportButton" type="button">Import project</button><input id="displayImport" type="file" accept="application/json,.json" hidden><button class="primary" id="displayUpload" type="button" disabled>Upload unavailable: identify protocol first</button></div>
 <p class="inline-status" id="displayStatus" role="status">Ready to create. Nothing in this editor sends Bluetooth commands.</p>`;
document.getElementById("nativeControllerLibrary").append(displayHost);
const du=id=>document.getElementById("display"+id);
const displayCurrent=()=>displayProject.programs[displayProgram].frames[displayFrame];
const displaySay=message=>du("Status").textContent=message;
function displayStop(){clearTimeout(displayTimer);displayTimer=null;displayPlaying=false;du("Stop").disabled=true;du("Play").disabled=false;}
function displayCommit(change){
 window.SmartEaseStudio?.draftChanged();
 displayImportGeneration++;
 displayStop();const old=displayModel.clone(displayProject),p=displayProgram,f=displayFrame;
 try{
  change();displayProject=displayModel.validate(displayProject);
  displayUndo.push({project:old,program:p,frame:f});displayUndo=displayUndo.slice(-12);displayRedo=[];
  displaySave();displayRender();
 }catch(error){displayProject=old;displayProgram=p;displayFrame=f;displayRender();displaySay(error.message);}
}
function displaySave(){if(window.SmartEaseStudio?.ownsDisplay){scheduleSceneDraft();displaySay("Display project updated in this scene draft. Save changes to keep the complete build. The standalone project is unchanged.");return;}try{localStorage.setItem(displayKey,JSON.stringify(displayProject));displaySay("Project saved in this browser. Export a copy to keep it elsewhere.");}catch{displaySay("Browser storage is full. Export your project now; current edits are only in memory.");}}
function displayHistory(from,to){
 if(!from.length)return;window.SmartEaseStudio?.draftChanged();displayImportGeneration++;displayStop();to.push({project:displayModel.clone(displayProject),program:displayProgram,frame:displayFrame});
 const state=from.pop();displayProject=state.project;displayProgram=state.program;displayFrame=state.frame;displaySave();displayRender();
}
function displayDraw(p=displayProgram,f=displayFrame){
 const canvas=du("Canvas"),w=displayProject.width,h=displayProject.height;
 canvas.width=w*12;canvas.height=h*12;canvas.style.aspectRatio=w+" / "+h;
 // jsdom has no graphics context; browser behavior is also resilient to disabled canvas.
 let ctx;try{ctx=canvas.getContext("2d");}catch{}if(!ctx)return;
 ctx.fillStyle="#030907";ctx.fillRect(0,0,canvas.width,canvas.height);
 displayProject.programs[p].frames[f].pixels.forEach((color,i)=>{ctx.fillStyle="#"+color.toString(16).padStart(6,"0");ctx.fillRect((i%w)*12+1,Math.floor(i/w)*12+1,10,10);});
}
function displayRender(){
 const program=displayProject.programs[displayProgram];
 du("Width").value=displayProject.width;du("Height").value=displayProject.height;
 du("SizePreset").value=displayProject.width===displayOwnerSize.width&&displayProject.height===displayOwnerSize.height?"owner-ux":"manual";
 du("X").max=displayProject.width;du("Y").max=displayProject.height;
 for(const [id,list,selected,label] of [["Programs",displayProject.programs,displayProgram,(p,i)=>(i+1)+". "+p.name],["Frames",program.frames,displayFrame,(f,i)=>"Frame "+(i+1)+" · "+f.duration+" ms"]]){
  du(id).replaceChildren();list.forEach((item,i)=>{const option=document.createElement("option");option.value=i;option.textContent=label(item,i);du(id).append(option);});du(id).value=selected;
 }
 du("Name").value=program.name;du("Hold").value=program.hold;du("Repeat").value=program.repeat;du("Duration").value=displayCurrent().duration;
 du("DeleteProgram").disabled=displayProject.programs.length===1;du("DeleteFrame").disabled=program.frames.length===1;
 du("AddProgram").disabled=displayProject.programs.length>=16;du("AddFrame").disabled=du("CopyFrame").disabled=program.frames.length>=32;
 du("Undo").disabled=!displayUndo.length;du("Redo").disabled=!displayRedo.length;
 du("PreviewLabel").textContent="Editing program "+(displayProgram+1)+", frame "+(displayFrame+1)+" · "+displayProject.width+" × "+displayProject.height+" draft pixels";
 displayDraw();
}
function displayPaintPixel(x,y){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=displayProject.width||y>=displayProject.height)return;
 displayCurrent().pixels[y*displayProject.width+x]=du("Erase").checked?0:parseInt(du("Paint").value.slice(1),16);displayDraw();
}
function displayRaster(canvas){return displayModel.imagePixels(canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);}
function displayText(scroll){
 const text=du("Text").value.trim(),size=Number(du("TextSize").value),w=displayProject.width,h=displayProject.height;
 if(!text||!Number.isInteger(size)||size<5||size>64){displaySay("Enter text and a height from 5 to 64 pixels.");return;}
 const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d");if(!ctx){displaySay("Text rendering needs browser canvas support.");return;}
 ctx.font=size+"px sans-serif";ctx.textBaseline="middle";const length=Math.ceil(ctx.measureText(text).width);
 const count=scroll?Math.min(32,Math.floor(65536/(w*h)),Math.max(2,w+length)):1;
 const frames=Array.from({length:count},(_,i)=>{
  ctx.clearRect(0,0,w,h);ctx.fillStyle=du("Paint").value;
  ctx.fillText(text,scroll?Math.round(w-i*(w+length)/(count-1)):Math.round((w-length)/2),h/2);
  return {duration:200,pixels:displayRaster(c)};
 });
 displayCommit(()=>{if(scroll){displayProject.programs[displayProgram].frames=frames;displayFrame=0;}else displayCurrent().pixels=frames[0].pixels;});
}
du("Pixel").onclick=()=>displayCommit(()=>displayPaintPixel(Number(du("X").value)-1,Number(du("Y").value)-1));
du("Canvas").onpointerdown=e=>{
 if(e.button!==0)return;e.preventDefault();window.SmartEaseStudio?.draftChanged();displayImportGeneration++;displayStop();displayDrawing=true;
 displayUndo.push({project:displayModel.clone(displayProject),program:displayProgram,frame:displayFrame});displayUndo=displayUndo.slice(-12);displayRedo=[];
 du("Canvas").setPointerCapture?.(e.pointerId);displayPointer(e);
};
function displayPointer(e){if(!displayDrawing)return;const r=du("Canvas").getBoundingClientRect();displayPaintPixel(Math.floor((e.clientX-r.left)/r.width*displayProject.width),Math.floor((e.clientY-r.top)/r.height*displayProject.height));}
du("Canvas").onpointermove=displayPointer;
function displayFinishStroke(){if(!displayDrawing)return;displayDrawing=false;displaySave();displayRender();}
du("Canvas").onpointerup=du("Canvas").onpointercancel=displayFinishStroke;
du("Undo").onclick=()=>displayHistory(displayUndo,displayRedo);du("Redo").onclick=()=>displayHistory(displayRedo,displayUndo);
du("Fill").onclick=()=>displayCommit(()=>displayCurrent().pixels.fill(parseInt(du("Paint").value.slice(1),16)));
du("Clear").onclick=()=>displayCommit(()=>displayCurrent().pixels.fill(0));
du("Transforms").onclick=e=>{const op=e.target.dataset.transform;if(op)displayCommit(()=>displayCurrent().pixels=displayModel.transform(displayProject,displayProgram,displayFrame,op));};
du("Templates").onclick=e=>{const kind=e.target.dataset.template;if(kind)displayCommit(()=>displayCurrent().pixels=displayModel.template(displayProject.width,displayProject.height,kind,parseInt(du("Paint").value.slice(1),16)));};
du("SizePreset").onchange=()=>{
 if(du("SizePreset").value!=="owner-ux")return;
 du("Width").value=displayOwnerSize.width;du("Height").value=displayOwnerSize.height;
 displaySay("96-column by 16-row owner preset selected. Canvas unchanged until Apply panel size. Verify orientation on the display.");
};
for(const id of ["Width","Height"])du(id).addEventListener("input",()=>{du("SizePreset").value="manual";});
du("Resize").onclick=()=>displayCommit(()=>displayProject=displayModel.resize(displayProject,Number(du("Width").value),Number(du("Height").value)));
for(const [id,key] of [["Name","name"],["Hold","hold"],["Repeat","repeat"]])du(id).onchange=()=>displayCommit(()=>displayProject.programs[displayProgram][key]=id==="Name"?du(id).value:Number(du(id).value));
du("Duration").onchange=()=>displayCommit(()=>displayCurrent().duration=Number(du("Duration").value));
du("Programs").onchange=()=>{displayStop();displayProgram=Number(du("Programs").value);displayFrame=0;displayRender();};
du("Frames").onchange=()=>{displayStop();displayFrame=Number(du("Frames").value);displayRender();};
du("AddProgram").onclick=()=>displayCommit(()=>{displayProject.programs.push({name:"Program "+(displayProject.programs.length+1),hold:3,repeat:1,frames:[displayModel.frame(displayProject.width,displayProject.height)]});displayProgram=displayProject.programs.length-1;displayFrame=0;});
du("DeleteProgram").onclick=()=>{if(displayProject.programs.length>1)displayCommit(()=>{displayProject.programs.splice(displayProgram,1);displayProgram=Math.max(0,displayProgram-1);displayFrame=0;});};
function displayAddFrame(copy){displayCommit(()=>{const frames=displayProject.programs[displayProgram].frames;frames.splice(displayFrame+1,0,copy?displayModel.clone(displayCurrent()):displayModel.frame(displayProject.width,displayProject.height));displayFrame++;});}
du("AddFrame").onclick=()=>displayAddFrame(false);du("CopyFrame").onclick=()=>displayAddFrame(true);
du("DeleteFrame").onclick=()=>{if(displayProject.programs[displayProgram].frames.length>1)displayCommit(()=>{displayProject.programs[displayProgram].frames.splice(displayFrame,1);displayFrame=Math.max(0,displayFrame-1);});};
for(const [id,delta,isProgram] of [["ProgramUp",-1,true],["ProgramDown",1,true],["FrameUp",-1,false],["FrameDown",1,false]])du(id).onclick=()=>{
 const list=isProgram?displayProject.programs:displayProject.programs[displayProgram].frames,index=isProgram?displayProgram:displayFrame;
 if(index+delta<0||index+delta>=list.length)return;
 displayCommit(()=>{[list[index],list[index+delta]]=[list[index+delta],list[index]];if(isProgram)displayProgram+=delta;else displayFrame+=delta;});
};
du("TextStill").onclick=()=>displayText(false);du("TextScroll").onclick=()=>displayText(true);
let displayImportGeneration=0;
du("Image").onchange=async()=>{
 const file=du("Image").files[0];if(!file)return;
 window.SmartEaseStudio?.draftChanged?.();
 if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5_000_000){displaySay("Choose a PNG, JPEG or WebP smaller than 5 MB. GIF import is not supported.");du("Image").value="";return;}
 const generation=++displayImportGeneration,program=displayProgram,frame=displayFrame,project=displayProject;
 const url=URL.createObjectURL(file),image=new Image();
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error("Could not decode that picture."));image.src=url;});
  if(generation!==displayImportGeneration||project!==displayProject||program!==displayProgram||frame!==displayFrame){displaySay("Picture import cancelled because the project changed. Choose it again.");return;}
  const c=document.createElement("canvas");c.width=project.width;c.height=project.height;const ctx=c.getContext("2d");
  const scale=Math.min(c.width/image.naturalWidth,c.height/image.naturalHeight),w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
  ctx.imageSmoothingEnabled=false;ctx.drawImage(image,Math.floor((c.width-w)/2),Math.floor((c.height-h)/2),w,h);
  const pixels=displayRaster(c);displayCommit(()=>displayCurrent().pixels=pixels);
 }catch(error){displaySay(error.message);}finally{URL.revokeObjectURL(url);du("Image").value="";}
};
du("Play").onclick=()=>{
 displayStop();if(document.visibilityState==="hidden")return;
 const steps=displayModel.sequence(displayProject);let cursor=0;displayPlaying=true;du("Stop").disabled=false;du("Play").disabled=true;
 function step(){if(!displayPlaying)return;const item=steps[cursor++%steps.length];displayDraw(item.program,item.frame);du("PreviewLabel").textContent="Preview · "+displayProject.programs[item.program].name+" · frame "+(item.frame+1);displayTimer=setTimeout(step,item.duration);}step();
};
du("Stop").onclick=()=>{displayStop();displayRender();};
du("Export").onclick=()=>{
 const blob=new Blob([JSON.stringify(displayModel.validate(displayProject))],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="smartease-display-project.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
du("ImportButton").onclick=()=>du("Import").click();
du("Import").onchange=async()=>{
 const file=du("Import").files[0];if(!file)return;window.SmartEaseStudio?.draftChanged();
 const generation=++displayImportGeneration;
 try{
  if(file.size>2_000_000)throw Error("Project files must be smaller than 2 MB.");
  const text=await file.text();
  // A later import, edit, undo or redo supersedes this request. Stale imports
  // must neither replace the document nor add an entry to its undo history.
  if(generation!==displayImportGeneration)return;
  const next=displayModel.validate(JSON.parse(text));
  displayCommit(()=>{displayProject=next;displayProgram=displayFrame=0;});
 }catch(error){if(generation===displayImportGeneration)displaySay(error.message);}
 finally{if(du("Import").files[0]===file)du("Import").value="";}
};
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){displayFinishStroke();displayStop();}});
window.addEventListener("pagehide",displayStop);
window.addEventListener("hashchange",()=>{displayStop();displayRender();});
const displayNavigation=new MutationObserver(()=>{if(displayHost.closest("[data-page]").hidden){displayFinishStroke();displayStop();}});
displayNavigation.observe(displayHost.closest("[data-page]"),{attributes:true,attributeFilter:["hidden"]});
displayRender();displayStop();
