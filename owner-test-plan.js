(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./ux-source-codec.js'),require('./ux-source-program.js'));else root.SmartEaseUXOwnerTestPlan=factory(root.SmartEaseUXSourceCodec,root.SmartEaseUXSourceProgram);})(globalThis,function(C,P){
'use strict';

function createOwnerOrientationTest(){
 const pixels=Array(96*16).fill(0);
 // Four different low-intensity corner marks, asymmetric width for orientation.
 for(let x=0;x<4;x++)pixels[x]=0x400000;
 for(let y=0;y<3;y++)pixels[y*96+95]=0x004000;
 for(let x=0;x<2;x++)pixels[15*96+x]=0x000040;
 pixels[15*96+95]=0x404000;
 const raw=P.program([P.graffiti({x:0,y:0,width:96,height:16,layer:1,mode:1,speed:240,stayTime:3,pixels})]);
 return Object.freeze({kind:'owner-static-orientation-v1',description:'Static dim corner marks: red top-left horizontal4; green top-right vertical3; blue bottom-left horizontal2; yellow bottom-right1. No flashing or audio.',overwriteWarning:'One program at index0/count1 may replace the active controller program list. Restore must be available in the original app; this is not a controller backup.',pixels:Object.freeze(pixels),plan:C.planRawProgram(raw,{index:0,count:1,showCount:1,packageSize:1004})});
}
return {createOwnerOrientationTest};

});
