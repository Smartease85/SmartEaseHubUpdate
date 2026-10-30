'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('Material core browser dependencies are linked once in dependency order and cached',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const scripts=['native-coolled-animation-gif-decoder.js','native-coolled-material-codec.js','native-coolled-material-import.js','native-coolled-material-program.js','native-coolled-store.js','material-package.js','native-material-catalog-store.js','native-material-catalog-service.js','native-coolled-material-wire.js','ux-program-send-plan.js','native-coolled-material-gallery.js','native-coolled.js'];
 let last=-1;
 for(const script of scripts){const tag=`<script src="${script}"></script>`,at=html.indexOf(tag);assert.ok(at>last,script+' dependency order');assert.equal(html.split(tag).length-1,1);assert.ok(sw.includes('"./'+script+'"'));assert.ok(fs.existsSync(path.join(root,script)));last=at;}
});
test('Material core modules contain no catalog URLs or automatic network/device APIs',()=>{
 for(const file of ['native-coolled-material-codec.js','native-coolled-material-import.js','native-coolled-material-program.js','native-coolled-store.js','material-package.js','native-material-catalog-store.js','native-material-catalog-service.js','native-coolled-material-wire.js']){
  const source=fs.readFileSync(path.join(root,file),'utf8');assert.doesNotMatch(source,/www\.coolledx\.com|www\.elklamp\.com|navigator\.bluetooth|fetch\s*\(/,file);
 }
});
