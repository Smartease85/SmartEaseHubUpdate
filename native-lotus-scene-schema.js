/* Optional browser-local scene scope metadata. Unknown/orphan entries are retained. */
'use strict';
function of21ValidateSceneScopes(library){
 const map=library.sceneScopes;if(map===undefined)return;const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),key=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!['__proto__','constructor','prototype'].includes(v);
 if(!object(map)||map.version!==1||!object(map.records)||Object.keys(map.records).length>128)throw Error('Invalid local scene scopes.');
 for(const [id,scope]of Object.entries(map.records)){if(!key(id))throw Error('Invalid scene scope ID.');if(object(scope)&&scope.type==='device'&&(typeof scope.id!=='string'||!scope.id.length||scope.id.length>256||['__proto__','constructor','prototype'].includes(scope.id)))throw Error('Invalid device scene scope.');}
 const seen=new Set();for(const scene of library.scenes){if(scene.id===undefined)continue;if(!key(scene.id)||seen.has(scene.id))throw Error('Duplicate or invalid scoped scene record ID.');seen.add(scene.id);}
}
