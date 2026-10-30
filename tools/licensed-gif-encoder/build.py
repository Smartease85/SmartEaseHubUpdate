"""Deterministic source rebase. No APK or prior encoder source is read."""
from pathlib import Path
import re, json, hashlib
root=Path(__file__).resolve().parent
u=root/'upstream'
for entry in json.loads((u/'source-manifest.json').read_text()):
 assert hashlib.sha256((u/entry['local']).read_bytes()).hexdigest() == entry['sha256'], entry['local']
nq=(u/'gif.js-NeuQuant.js').read_text()
def change(old,new):
 global nq
 assert old in nq, old
 nq=nq.replace(old,new)
change('return ~~v;', 'return Math.trunc(v);')
change('var lo = Math.abs(i - radius);', 'var lo = Math.max(i - radius, -1); // Java NeuQuant lower bound')
# Java integer division occurs before subtraction, including negative differences.
nq=re.sub(r'(network\[i\]\[[012]\] -= )(.+ / initalpha);',r'\1toInt(\2);',nq)
nq=re.sub(r'(p\[[012]\] -= )(.+ / alpharadbias);',r'\1toInt(\2);',nq)
for idx in ['i','j']:
 change(f'toInt(alpha * (((rad * rad - {idx} * {idx}) * radbias) / (rad * rad)))',f'alpha * toInt(((rad * rad - {idx} * {idx}) * radbias) / (rad * rad))')
change('alpha -= alpha / alphadec;', 'alpha -= toInt(alpha / alphadec);')
change('radius -= radius / radiusdec;', 'radius -= toInt(radius / radiusdec);')
change('module.exports = NeuQuant;', 'return NeuQuant;')
nq='const LicensedNeuQuant = (() => {\n'+nq+'\n})();\n'
lzw=(u/'gif.js-LZWEncoder.js').read_text()
lzw=lzw.replace('var cur_accum, cur_bits = 0;', 'var cur_accum = 0, cur_bits = 0;\n  var n_bits, remaining, curPixel; // instance-local, strict-mode-safe state')
lzw=lzw.replace('module.exports = LZWEncoder;', 'return LZWEncoder;')
lzw='const LicensedLZWEncoder = (() => {\n'+lzw+'\n})();\n'
notice='/*\nRebased from pinned gif.js sources; Java integer semantics from pinned Glide NeuQuant.\nSee docs/GIF-ENCODER-LICENSED-REBASE.md for exact derivation and changes.\n'+(u/'gif.js-LICENSE').read_text()+'\n'+(u/'glide-LICENSE').read_text()+'\n*/\n'
for dynamic in [False,True]:
 name='dynamic' if dynamic else 'animation'
 globalname='SmartEaseUXDynamicGifEncoder' if dynamic else 'SmartEaseUXGifEncoder'
 api=(root/'adapter.js.in').read_text().replace('@MAX@','52' if dynamic else '40').replace('@DYNAMIC@','true' if dynamic else 'false')
 result=notice+f"(function(root,factory){{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.{globalname}=api;}})(globalThis,()=>{{\n'use strict';\n"+nq+lzw+api+'\n});\n'
 (root/f'native-coolled-{name}-gif-encoder.js').write_text(result)
