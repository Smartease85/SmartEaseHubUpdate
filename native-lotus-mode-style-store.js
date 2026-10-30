/* Browser-local per-granted-device Mode Style preference. No BLE operations.
 * Source BleExtKt.currentModeLayoutType/updateCurrentModeType persists native
 * local device/group metadata; browser does not invent native group bindings.
 */
'use strict';
(()=>{
 let seenIdentity=null,unassigned=0;
 const adapter=()=>cartDevices[2],id=()=>adapter().identity?.id||'',stamp=()=>JSON.stringify([id(),adapter().ownerLink.generation,adapter().ownerEpoch]);
 function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';return JSON.stringify(value);}
 function get(){const identity=id();if(identity!==seenIdentity){seenIdentity=identity;unassigned=0;}if(!identity)return unassigned;const values=of21Local.modeStyles?.devices;return values&&Object.hasOwn(values,identity)?values[identity]:0;}
 function set(value,guard){
  if(!Number.isInteger(value)||value<0||value>2)throw Error('Choose Default, GIF or Text.');
  if(typeof guard!=='function'||!guard())throw Error('Mode Style session is no longer current. Reopen it.');
  get();const identity=id(),selection=stamp();
  const valid=()=>selection===stamp()&&guard();
  if(!identity){if(!valid())throw Error('Device changed; reopen Mode Style.');unassigned=value;window.dispatchEvent(new Event('smartease-mode-style'));return false;}
  if(of21LocalLoadError)throw Error('Unreadable local data was preserved. Export and reload before saving Mode Style.');
  let stored;try{const raw=localStorage.getItem(of21LocalKey);stored=raw===null?{version:1,scenes:[],requested:{}}:JSON.parse(raw);}catch{throw Error('Local data changed or is unreadable; reload before saving Mode Style.');}
  if(canonical(stored)!==canonical(of21Local))throw Error('Local data changed externally; reload before saving Mode Style.');
  const previous=of21Local.modeStyles,next={...(previous||{version:1,devices:{}}),devices:{...previous?.devices,[identity]:value}};
  of21ValidateModeStyles(next);
  const candidate={...of21Local,modeStyles:next},serialized=JSON.stringify(candidate);
  if(serialized.length>131072)throw Error('Local history is too large.');
  if(!valid())throw Error('Device changed; reopen Mode Style.');
  // localStorage is synchronous. Do not mutate in-memory data until it succeeds.
  localStorage.setItem(of21LocalKey,serialized);
  of21Local.modeStyles=next;
  window.dispatchEvent(new Event('smartease-mode-style'));
  return true;
 }
 window.SmartEaseNativeModeStyleStore={get,set};
})();
