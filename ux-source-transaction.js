(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./ux-source-codec.js'));else root.SmartEaseUXSourceTransaction=factory(root.SmartEaseUXSourceCodec);})(globalThis,function(C){
/* Offline deterministic transfer model: actions are data, never writes/timers. */
'use strict';

const eq=(a,b)=>a&&b&&a.deviceId===b.deviceId&&a.generation===b.generation&&a.transferId===b.transferId;
function createTransaction(plan,context,{attemptsPerPacket=3,restarts=3,maxActions=4096,onDiagnostic=()=>{}}={}){
 if(!context||typeof context.deviceId!=='string'||!context.deviceId||!Number.isSafeInteger(context.generation)||context.generation<0||typeof context.transferId!=='string'||!context.transferId)throw Error('Explicit identity/generation/transfer required');
 if(!plan||plan.format!=='smartease-ux-source-offline'||plan.version!==2||plan.uploadEnabled!==false||!Array.isArray(plan.packets)||!plan.packets.length||plan.packets.length>2048)throw Error('Offline plan required');
 const begin=plan.begin.slice(),packets=plan.packets.map(x=>x.slice());const header=C.decodeFrame(begin);if(header.length!==12||header[0]!==2||header[10]<1||header[10]>99||header[9]>=header[10])throw Error('Invalid begin header');
 const u32=(a,i)=>a[i]*2**24+a[i+1]*65536+a[i+2]*256+a[i+3],u16=(a,i)=>a[i]*256+a[i+1];
 const compressed=[];let total=null;for(let i=0;i<packets.length;i++){const p=C.decodeFrame(packets[i]);if(p.length<12||p[0]!==3||p[1]!==0||u16(p,6)!==i||u16(p,8)!==p.length-11||p.slice(1,-1).reduce((a,b)=>a^b,0)!==p.at(-1))throw Error('Invalid data packet');const n=u32(p,2);if(total!==null&&n!==total)throw Error('Inconsistent compressed length');total=n;compressed.push(...p.slice(10,-1));}if(total!==compressed.length)throw Error('Incomplete compressed program');const raw=C.decompress(compressed,u32(header,5));if(C.crc32Words(raw)!==u32(header,1))throw Error('Program CRC mismatch');
 for(const [v,max]of [[attemptsPerPacket,3],[restarts,3],[maxActions,65536]])if(!Number.isInteger(v)||v<1||v>max)throw Error('Invalid finite retry budget');
 context=Object.freeze({...context});let state='idle',index=0,attempt=0,restart=0,actions=0,error=null,dispatched=false;const parser=C.streamParser({maxFrame:64});
 function fail(reason){state='failed';error=reason;parser.reset();return {type:'failed',reason};}
 function action(){dispatched=false;if(++actions>maxActions)return fail('Global action budget exhausted');attempt++;return {type:'frame',token:actions,phase:state,index:state==='data'?index:null,attempt,bytes:(state==='begin'?begin:packets[index]).slice(),context:{...context},uploadEnabled:false};}
 function valid(ctx){return eq(context,ctx);}
 return {
  start(ctx){if(!valid(ctx))return {type:'ignored',reason:'Stale context'};if(state!=='idle')throw Error('Transfer already started');state='begin';return action();},
  markDispatched(token,ctx){if(!valid(ctx)||token!==actions||!['begin','data'].includes(state))return false;dispatched=true;return true;},
  writeFailed(token,ctx){if(!valid(ctx)||token!==actions||!['begin','data'].includes(state))return {type:'ignored',reason:'Stale write failure'};return fail('Fragment write failed');},
  receive(input,ctx){if(!valid(ctx))return [{type:'ignored',reason:'Stale context'}];if(!['begin','data'].includes(state))return [{type:'ignored',reason:'Inactive transfer'}];if(!dispatched)return [{type:'ignored',reason:'Frame not dispatched'}];let payloads;try{payloads=parser.push(input);}catch(e){try{onDiagnostic({phase:state,opcode:null,length:input?.length??null,index:null,status:null,disposition:'malformed',cached:null});}catch{}return [fail(e.message)];}const result=[];
   // At most one acceptance in a callback. Further frames cannot acknowledge an
   // action that the caller has not yet had the opportunity to dispatch.
   let accepted=false;const ackPhase=state;
   function record(p,result){try{onDiagnostic({phase:ackPhase,opcode:p[0]??null,length:p.length,index:p.length===5&&p[0]===3?p[2]*256+p[3]:null,status:p.length===2?p[1]:p.length===5?p[4]:null,disposition:result.type,cached:result.type==='complete'?result.cached:null});}catch{}resultListPush(result);}
   const resultListPush=x=>result.push(x);
   for(const p of payloads){if(accepted){record(p,{type:'ignored',reason:'Unsolicited coalesced ACK'});continue;}
    if(state==='begin'){
     if(p.length!==2||![2,26].includes(p[0])){record(p,{type:'ignored',reason:'Unexpected begin ACK'});continue;}
     if(p[1]===1){state='complete';parser.reset();record(p,{type:'complete',cached:true,retentionVerified:false});accepted=true;}
     else if(p[1]===0){state='data';index=0;attempt=0;record(p,action());accepted=true;}
     else {record(p,fail('Begin status '+p[1]));accepted=true;}
    }else if(state==='data'){
     if(p.length!==5||p[0]!==3){record(p,{type:'ignored',reason:'Unexpected data ACK'});continue;}
     const acknowledged=p[2]*256+p[3];if(acknowledged!==index){record(p,{type:'ignored',reason:'Unexpected packet index'});continue;}
     if(p[4]!==0){record(p,fail('Data status '+p[4]));accepted=true;continue;}
     accepted=true;attempt=0;if(index===packets.length-1){state='complete';parser.reset();record(p,{type:'complete',cached:false,retentionVerified:false});}else{index++;record(p,action());}
    }
   }if(accepted)parser.reset();return result;
  },
  timeout(token,ctx){if(!valid(ctx))return {type:'ignored',reason:'Stale context'};if(token!==actions)return {type:'ignored',reason:'Stale timeout token'};if(!['begin','data'].includes(state))return {type:'ignored',reason:'Inactive transfer'};if(!dispatched)return {type:'ignored',reason:'Frame not dispatched'};parser.reset();if(attempt<attemptsPerPacket)return action();if(restart>=restarts)return fail('Retry budget exhausted');restart++;index=0;attempt=0;state='begin';return action();},
  cancel(){if(state!=='complete'&&state!=='failed')state='cancelled';parser.reset();return {type:'cancelled'};},
  get snapshot(){return {state,index,attempt,restart,actions,error,context:{...context},timeoutMs:5000,dispatched,uploadEnabled:false};}
 };
}
return {createTransaction};

});
