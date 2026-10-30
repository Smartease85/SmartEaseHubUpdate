/* Independent ordinary OF21 Phone MIC DSP, source evidence ../AudioToRGB.java,
 * BaseMicFragment.java, Recorder.java. No media/device access in this module.
 * Parseval energy replaces the native floating FFT: mathematically equivalent,
 * NOT a bit-exact guarantee near FloatFFT rounding boundaries.
 * Browser adaptation: causal linear resampling, Float32 -> PCM16 via truncation
 * of sample*32768 with signed16 saturation; nonfinite inputs become silence.
 * No anti-alias filtering/native AudioRecord conversion equivalence is claimed.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SmartEaseNativeRhythmDSP=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const SAMPLE_RATE=22050,WINDOW_SIZE=2205,DISCARD_WINDOWS=2,SEGMENT_SIZE=105;
 const COLORS=Object.freeze(['#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF','#FFFFFF']);
 function sensitivity(value){if(!Number.isInteger(value)||value<0||value>100)throw Error('Sensitivity must be a whole percent from0 to100.');return value;}
 function rate(value){if(!Number.isInteger(value)||value<8000||value>192000)throw Error('Input sample rate must be an integer8000–192000Hz.');return value;}
 function roundEven(value){const floor=Math.floor(value),part=value-floor;return part<.5?floor:part>.5?floor+1:floor%2===0?floor:floor+1;}
 function pcm16(value){if(!Number.isFinite(value))return 0;return Math.max(-32768,Math.min(32767,Math.trunc(value*32768)));}
 function createColorCycle(initialIndex=0){if(!Number.isInteger(initialIndex)||initialIndex<0||initialIndex>=COLORS.length)throw Error('Invalid seven-color index.');let index=initialIndex;return Object.freeze({next(){index=(index+1)%COLORS.length;return COLORS[index];},reset(){index=initialIndex;},get index(){return index;}});}
 function analyzePCM(pcm,level=50){
  sensitivity(level);if(!pcm||pcm.length!==WINDOW_SIZE)throw Error('Phone MIC needs exactly2205PCM16 samples.');
  let peak=0,total=0;const sums=new Array(21).fill(0),threshold=(100-level)/100*32767*.2;
  for(let i=0;i<WINDOW_SIZE;i++){const value=pcm[i];if(!Number.isInteger(value)||value< -32768||value>32767)throw Error('Invalid PCM16 sample.');const square=value*value;peak=Math.max(peak,Math.abs(value));total+=square;sums[Math.floor(i/SEGMENT_SIZE)]+=square;}
  const bins=sums.map(sum=>Math.min(14,Math.max(0,Math.floor((1024*sum/SEGMENT_SIZE/1073676289)*14)))),bands=[];
  for(let i=0;i<21;i+=3)bands.push(Math.min(14,roundEven(((bins[i]+bins[i+1]+bins[i+2])/42)*14)));
  const sensitivityGate=peak>=threshold,fftGate=bands.some(v=>v>0);
  return {active:sensitivityGate&&fftGate,sensitivityGate,fftGate,threshold,bins,bands,peak:peak/32768,rms:Math.sqrt(total/WINDOW_SIZE)/32768};
 }
 function createResampler(inputRate){
  rate(inputRate);let inputIndex=-1,outputCount=0,previous=0;
  function reset(){inputIndex=-1;outputCount=0;previous=0;}
  function process(samples,onSample){if(!samples||!Number.isInteger(samples.length)||samples.length<0||typeof onSample!=='function')throw Error('Expected PCM sample array and output callback.');for(let n=0;n<samples.length;n++){const raw=samples[n],current=Number.isFinite(raw)?Math.max(-1,Math.min(1,raw)):0;inputIndex++;
    // Integer counters anchor the phase across input block boundaries. No flush
    // invents a future sample: fractional outputs wait for the right endpoint.
    while(outputCount*inputRate<=inputIndex*SAMPLE_RATE){const position=outputCount*inputRate;const fraction=inputIndex===0?1:(position-(inputIndex-1)*SAMPLE_RATE)/SAMPLE_RATE;const value=inputIndex===0?current:previous+(current-previous)*fraction;outputCount++;onSample(value);}
    previous=current;
   }}
  return Object.freeze({process,push(samples){const out=[];process(samples,x=>out.push(x));return out;},reset,get state(){return {inputRate,inputSamples:inputIndex+1,outputSamples:outputCount};}});
 }
 function createStream(inputRate,options={}){
  let level=sensitivity(options.sensitivity===undefined?50:options.sensitivity),window=new Int16Array(WINDOW_SIZE),used=0,windows=0;const resampler=createResampler(inputRate),cycle=options.colorCycle||createColorCycle();if(typeof cycle.next!=='function')throw Error('Color cycle must provide next().');
  function reset(){resampler.reset();window.fill(0);used=0;windows=0;/* shared color sequence intentionally not reset */}
  return Object.freeze({push(samples){const results=[];resampler.process(samples,value=>{window[used++]=pcm16(value);if(used===WINDOW_SIZE){used=0;windows++;if(windows>DISCARD_WINDOWS){const result=analyzePCM(window,level),next=cycle.next();if(!COLORS.includes(next))throw Error('Invalid seven-color cycle output.');results.push({...result,color:result.active?next:'#000000',windowIndex:windows});}}});return results;},setSensitivity(value){level=sensitivity(value);},reset,get state(){return {...resampler.state,sensitivity:level,completedWindows:windows,bufferedSamples:used,discardedWindows:Math.min(windows,DISCARD_WINDOWS)};}});
 }
 return Object.freeze({SAMPLE_RATE,WINDOW_SIZE,DISCARD_WINDOWS,COLORS,pcm16,roundEven,analyzePCM,createColorCycle,createResampler,createStream});
});
