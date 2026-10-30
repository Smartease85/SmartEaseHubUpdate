from pathlib import Path
import re,json
root=Path(__file__).resolve().parent; base=root/'src'; modules={}
def add(f):
 f=f.resolve();key=str(f.relative_to(base))
 if key in modules:return key
 src=f.read_text();modules[key]=None;deps={}
 for target in re.findall(r"require\(['\"]([^'\"]+)['\"]\)",src):
  if not target.startswith('.'):raise ValueError(target)
  path=f.parent/target
  if not path.is_file():path=Path(str(path)+'.js')
  deps[target]=add(path)
 modules[key]=(src,deps);return key
entry=add(base/'api.cjs');chunks=[json.dumps(k)+':[function(require,module,exports){\n'+s+'\n},'+json.dumps(d)+']' for k,(s,d)in sorted(modules.items())]
s="(function(){'use strict';const modules={"+','.join(chunks)+"},cache={};function load(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}},e=modules[id];e[0](n=>load(e[1][n]),m,m.exports);return m.exports;}window.SmartEaseUXTemplate=load("+json.dumps(entry)+");})();\n"
(root.parent/'native-coolled-template-bundle.js').write_text(s);print(len(modules),len(s.encode()))
