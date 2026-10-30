/* Original CoolLEDUX binary-font Text preview port. No canvas fonts, device I/O or persistence. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SmartEaseNativeUXTextRenderer=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ranges=[[1536,1791],[1872,1919],[2208,2303],[64336,65023],[65136,65279],[60928,61183],[1424,1535],[2304,2431],[3584,3711],[192,255],[258,432],[7840,7929]];
function backend(text,language='en',fontType=0,size=16){const code=String(text).charCodeAt(0),lang=String(language).toLowerCase();return size!==8&&((lang==='zh-cn'&&fontType===0)||lang==='vi'||ranges.some(([a,b])=>code>=a&&code<=b))?'android':'binary';}
function fontName(size,bold){if(size===12)return bold?'UNICODE12_BOLD':'UNICODE12';if(size===14||size===16)return '32_'+size+'_'+(bold?'large':'small');throw new RangeError('Only original 12/14/16 fonts are available');}
function tokenize(text,language='en',defaults={}){
 if(typeof text!=='string')throw new TypeError('Text must be a string');
 const out=[];for(let i=0;i<text.length;){const m=/^(?:emoji_fc_\d{2}_\d{3}|emoji_fc_\d{3})/i.exec(text.slice(i));let value;
 if(m){value=m[0];i+=value.length;}else{value=text.charAt(i);i++;}
 const t={...defaults,isText:!m,text:value,color:defaults.color===undefined?-65536:defaults.color};if(!m)t.deviceType=5;else{const parts=value.slice(9).split('_').map(Number);t.imageName=value;for(const size of [12,14,16,20,24,32])t['imageName'+size]='emoji_fc_'+size+'x'+size+'_'+parts.join('_')+(parts.length===2?'_data':'');}out.push(t);
 }return out;
}
const blank=(w,h)=>({width:w,height:h,pixels:Array(w*h).fill(0),mask:Array(w*h).fill(false)});
function crop(b,left,width,top=0,height=b.height){const o=blank(width,height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const k=(y+top)*b.width+x+left;if(x+left>=0&&x+left<b.width&&y+top>=0&&y+top<b.height){o.pixels[y*width+x]=b.pixels[k];o.mask[y*width+x]=b.mask[k];}}return o;}
function trim(b,emptyWidth){let a=0,z=b.width-1;const yes=x=>{for(let y=0;y<b.height;y++)if(b.mask[y*b.width+x])return true;return false;};while(a<b.width&&!yes(a))a++;if(a===b.width)return blank(emptyWidth,b.height);while(!yes(z))z--;return crop(b,a,z-a+1);}
function pad(b,left,right,top=0,bottom=0){const o=blank(b.width+left+right,b.height+top+bottom);for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++){const k=y*b.width+x,j=(y+top)*o.width+x+left;o.pixels[j]=b.pixels[k];o.mask[j]=b.mask[k];}return o;}
function rotate(b,degree){let o=b;for(let n=0;n<degree/90;n++){const next=blank(o.height,o.width);for(let y=0;y<o.height;y++)for(let x=0;x<o.width;x++){const k=y*o.width+x,j=x*next.width+o.height-1-y;next.pixels[j]=o.pixels[k];next.mask[j]=o.mask[k];}o=next;}return o;}
function centerSquare(b){let d=16-b.width;b=pad(b,Math.floor(d/2),Math.ceil(d/2));b=trim(rotate(b,90),8);d=16-b.width;b=pad(b,Math.floor(d/2),Math.ceil(d/2));return trim(rotate(b,270),8);}
function glyph(bytes,size,code,ink){const stride=Math.ceil(size/8),offset=code*size*stride;if(!(bytes instanceof Uint8Array)||bytes.length<offset+size*stride)throw new Error('Original font table is incomplete');let b=blank(size,size);for(let x=0;x<size;x++)for(let y=0;y<size;y++){const k=y*size+x;b.mask[k]=!!(bytes[offset+x*stride+(y>>3)]&(128>>(y%8)));b.pixels[k]=b.mask[k]?ink:0;}const p=(16-size)/2;return pad(b,p,p,p,p);}
function join(blocks){const width=blocks.reduce((n,b)=>n+b.width,0),o=blank(width,16);let x0=0;for(const b of blocks){for(let y=0;y<16;y++)for(let x=0;x<b.width;x++){o.pixels[y*width+x0+x]=b.pixels[y*b.width+x];o.mask[y*width+x0+x]=b.mask[y*b.width+x];}x0+=b.width;}return o;}
function centeredPage(b,column){b={...b,mask:b.pixels.map(c=>c!==0)};b=trim(b,column);const d=column-b.width;return pad(b,Math.ceil(d/2),Math.floor(d/2));}
function failed(reason,index){return{supported:false,reason,tokenIndex:index,width:0,height:16,pixels:[],frames:[]};}
async function render(input={},loaders={}){
 const {tokens=[],languageCode='en',textFontType=0,showHeight=16,textSpacing=1,column=96,mode=2}=input;
 if(!Array.isArray(tokens)||tokens.length>150)return failed('Text requires at most 150 parsed tokens');
 if(![14,16].includes(showHeight)||!Number.isInteger(column)||column<16||column>96||!Number.isInteger(textSpacing)||textSpacing<1||textSpacing>8||!Number.isInteger(mode)||mode<1||mode>13)return failed('Unsupported text preview dimensions or options');
 const blocks=[],fonts=new Map();let total=0,firstFont=null;
 for(let i=0;i<tokens.length;i++){
  const t=tokens[i];if(!t||typeof t.text!=='string'||typeof t.isText!=='boolean')return failed('Invalid text token',i);
  const size=t.textSize===undefined?16:t.textSize,bold=t.isBold===undefined?(t.isTextBold===undefined?true:t.isTextBold):t.isBold,degree=t.rotate===undefined?(t.textRotate===undefined?0:t.textRotate):t.rotate;
  if(![12,14,16].includes(size)||typeof bold!=='boolean'||![0,90,180,270].includes(degree))return failed('Unsupported font or rotation',i);
  if(!Number.isInteger(t.color===undefined?-65536:t.color)||(t.color!==undefined&&(t.color< -2147483648||t.color>4294967295)))return failed('Invalid token color',i);
  let b;
  try{
   if(t.isText!==false){
    if(backend(t.text,languageCode,textFontType,size)==='android')return failed('This text requires the original Android shaping/rasterizer; the saved text is preserved',i);
    if(t.text.length!==1||t.text.charCodeAt(0)<32||t.text.charCodeAt(0)>126)return failed('Exact tokenizer/font coverage for this Unicode text is not yet verified; the saved text is preserved',i);
    const name=fontName(size,bold);if(firstFont&&firstFont!==name)return failed('Mixed token font tables are not supported by the original preview session',i);firstFont=name;
    if(!fonts.has(name)){if(typeof loaders.loadFont!=='function')return failed('Original binary font loader unavailable',i);fonts.set(name,await loaders.loadFont(name));}
    b=glyph(fonts.get(name),size,t.text.charCodeAt(0),(t.color===undefined?-65536:t.color)&0xffffff);
    b=trim(rotate(b,degree),size/2);if(degree===90||degree===270)b=trim(centerSquare(b),size/2);
   }else{
    const name=t['imageName'+size];if(!name||typeof loaders.loadEmoji!=='function')return failed('Original emoji resource unavailable',i);
    const image=await loaders.loadEmoji(name,size);if(!image||image.width!==size||image.height!==size||!Array.isArray(image.pixels)||image.pixels.length!==size*size||!image.pixels.every(Number.isInteger))return failed('Original emoji pixel resource is invalid',i);
    b={width:size,height:size,pixels:image.pixels.map(c=>c&0xffffff),mask:image.pixels.map(c=>(c&0xffffff)!==0)};const p=(16-size)/2;b=pad(b,p,p,p,p);b=trim(rotate(b,degree),16);
   }
  }catch(error){return failed(error.message||'Original resource unavailable',i);}
  let gap=0;if(mode!==2&&mode!==3){const remainder=total%column;if(remainder)gap=column-remainder<b.width+textSpacing?column-remainder:textSpacing;}else if(i)gap=textSpacing;
  if(gap){blocks.push(blank(gap,16));total+=gap;}blocks.push(b);total+=b.width;
 }
 const strip=join(blocks),frames=[];for(let x=0;x<strip.width;x+=column)frames.push(centeredPage(crop(strip,x,column),column));if(!frames.length)frames.push(blank(column,16));
 const previewMode=mode<=5?mode:1;
 const result={supported:true,width:strip.width,height:16,showHeight,pixels:strip.pixels,mask:strip.mask,frames,previewMode,notice:mode>=6?'The original preview uses static fallback for this mode.':null,frameAutoIntermediate:showHeight===14,cadenceMs:previewMode===2||previewMode===3?55:previewMode===4||previewMode===5?255:1455};
 result.frameAt=function(step=0){step=Math.max(0,Math.floor(Number(step)||0));if(previewMode===1)return frames[step%frames.length];if(previewMode===2||previewMode===3){const padded=pad(strip,column,column),period=padded.width-column;const x=previewMode===2?step%period:period-step%period;return crop(padded,x,column);}const ordered=previewMode===5?frames.slice().reverse():frames;const rows=[];for(const frame of ordered){rows.push(...Array(column*16).fill(0),...frame.pixels);}rows.push(...Array(column*16).fill(0));const period=rows.length/column-16,y=previewMode===4?step%period:period-step%period;return{width:column,height:16,pixels:rows.slice(y*column,(y+16)*column)};};
 return result;
}
return{render,tokenize,backend,fontName,glyph};
});
