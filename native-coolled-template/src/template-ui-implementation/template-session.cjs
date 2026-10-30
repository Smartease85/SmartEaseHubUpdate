'use strict';
const M=require('../template-implementation/template-model.cjs');
function create({programs,identity,uuid}){if(!programs||typeof programs.snapshot!=='function'||typeof programs.save!=='function'||typeof identity!=='function'||typeof uuid!=='function')throw Error('Explicit parent library/identity/UUID adapters required');let record=null,draft=null,base=null,revision=0,epoch=0,stamp=null,active=false;
 const valid=()=>active&&stamp===identity();
 function enter(type,id){epoch++;active=false;const s=programs.snapshot();base=s.revision;const found=id?s.records.find(r=>r.id===id):null;record=found?M.copy(found):null;if(id&&!record)throw Error('Template record removed');if(record){if(record.kind!=='template')throw Error('Not a template record');draft=M.validate(record.template);}else draft={templateType:type,programType:3,showCount:1,combinePrograms:[]};M.validate(draft);stamp=identity();active=true;revision=0;return snapshot();}
 function snapshot(){return{active:valid(),record:M.copy(record),draft:M.copy(draft),revision,epoch,dirty:!record?!!draft?.combinePrograms.length:JSON.stringify(draft)!==JSON.stringify(record.template)};}
 function guard(){const e=epoch,r=revision,s=stamp;return()=>active&&e===epoch&&r===revision&&s===identity();}
 function mutate(fn){if(!valid())throw Error('Stale template session');const n=M.copy(draft);fn(n);M.validate(n);draft=n;revision++;return snapshot();}
 function setText(c){return mutate(n=>{M.text(c,n.templateType);const row=c.locationIndex;const i=n.combinePrograms.findIndex(x=>M.kind(x)==='text'&&(n.templateType!==2||x.locationIndex===row));if(i<0)n.combinePrograms.push(M.copy(c));else n.combinePrograms[i]=M.copy(c);});}
 function setPattern(c){return mutate(n=>{M.pattern(c,{placement:M.region(n.templateType,'pattern')});n.combinePrograms=n.combinePrograms.filter(x=>!['graffiti','animation'].includes(M.kind(x)));n.combinePrograms.push(M.copy(c));});}
 async function save(){if(!valid())throw Error('Stale template session');const current=guard(),p=M.forSave(draft,{editing:!!record}),next=record?M.copy(record):{id:uuid(),kind:'template',repeat:1};next.template=p;if(p.title!==undefined)next.title=p.title;const result=await programs.save(next,base,current);if(!current())throw Error('Template save completed after navigation; do not revive editor');record=M.copy(result||next);draft=M.copy(record.template);base=programs.snapshot().revision;revision++;return M.copy(record);}
 function send(){if(!valid())throw Error('Stale template session');return{program:M.forSend(draft),isCurrent:guard()};}
 function cancel(){epoch++;active=false;}
 function invalidate(){epoch++;}
 return{enter,snapshot,guard,setText,setPattern,save,send,cancel,invalidate,valid};
}
module.exports={create};
