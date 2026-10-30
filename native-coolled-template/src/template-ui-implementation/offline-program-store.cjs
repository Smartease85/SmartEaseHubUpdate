'use strict';
// Standalone QA adapter only. Main integration MUST inject existing Native library authority.
const M=require('../template-implementation/template-model.cjs'),KEY='smartease.template.offline.qa.v1';
function create(storage){function snapshot(){const revision=storage.getItem(KEY),v=revision===null?{records:[]}:JSON.parse(revision);if(!Array.isArray(v.records))throw Error('Invalid offline library');for(const r of v.records){if(r.kind!=='template'||typeof r.id!=='string')throw Error('Invalid offline record');M.validate(r.template);}return{revision,records:M.copy(v.records),library:M.copy(v)};}
 function save(record,revision,valid){const s=snapshot();if(s.revision!==revision||!valid())throw Error('Stale parent library');const r=M.copy(record);M.forSave(r.template,{editing:true});const i=s.records.findIndex(x=>x.id===r.id);if(i<0)s.records.unshift(r);else s.records[i]=r;if(!valid()||storage.getItem(KEY)!==revision)throw Error('Stale parent library');storage.setItem(KEY,JSON.stringify({...s.library,records:s.records}));return r;}
 return{snapshot,save};}
module.exports={create,KEY};
