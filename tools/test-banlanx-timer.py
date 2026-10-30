from pathlib import Path
import json,hashlib,subprocess,sys
from PIL import Image
r=Path(__file__).resolve().parents[1];a=json.loads((r/'assets/native-banlanx/authored-timer-provenance.json').read_text());p=r/a['path'];data=p.read_bytes();im=Image.open(p)
assert list(im.size)==[693,459];assert list(im.getbbox())==[0,69,693,459];assert hashlib.sha256(data).hexdigest()==a['sha256']
subprocess.run([sys.executable,str(r/'tools/generate-banlanx-timer.py')],check=True);assert p.read_bytes()==data
print('Timer illustration: hash,693x459,bounds,deterministic regeneration pass')
