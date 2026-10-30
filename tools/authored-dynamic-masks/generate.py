"""Independently authored geometric reveal overlays, not traced pixel data.
Uses only Python's standard library. No original art or source APK is read.
Run from any working directory; writes relative to this repository root.
"""
import hashlib,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
FAMILIES={'five':[1,3,4,5,6,7,9],'six':list(range(1,8)), 'seven':list(range(1,8)), 'eight':list(range(1,8))}
def smooth(v):
    v=max(0.,min(1.,v)); return v*v*(3-2*v)
def alpha(family,stage,x,y):
    if stage==0: return 255
    if stage==6: return 0
    p=stage/6
    # Pixel centers and an independently chosen 4%-width soft transition.
    u=(x+.5)/100; v=(y+.5)/100
    if family=='five':
        # A central dark curtain shrinks inward, revealing both outer edges first.
        # The consumer's left-half mirror preserves the symmetric closing cover.
        distance=abs(2*u-1)
        a=smooth(((1-p)-distance)/.04+.5)
    elif family=='six':
        # A left-to-right light sweep: dark cover remains ahead of the sweep.
        a=smooth((u-p)/.04+.5)
    elif family=='seven':
        # Eight horizontal blinds retract within each cell and fade together.
        cell=(v*8)%1
        a=smooth((cell-p)/.06+.5)*(1-p*.45)
    else:
        # Fan opens from twelve o'clock in both directions around the center.
        # angle distance from vertical up is in [0,1] turns of a half-circle.
        angle=abs(math.atan2(u-.5,.5-v))/math.pi
        a=smooth((angle-p)/.035+.5)
    return round(255*a)
def generate():
    out={}
    for family,ids in FAMILIES.items():
        for stage,num in enumerate(ids):
            rgba=[]
            for y in range(100):
                for x in range(100):
                    # Black pigment is intentional; source-over darkens rather
                    # than replacing the user's text with a colored illustration.
                    rgba.extend((0,0,0,alpha(family,stage,x,y)))
            out[f'ic_dynamic_{family}{num}']={'width':100,'height':100,'rgba':rgba}
    return out
if __name__=='__main__':
    path=ROOT/'native-coolled-dynamic/assets/masks.json';path.parent.mkdir(parents=True,exist_ok=True)
    payload=json.dumps(generate(),separators=(',',':'))+'\n';path.write_text(payload)
    manifest={'resource':'native-coolled-dynamic/assets/masks.json','sha256':hashlib.sha256(payload.encode()).hexdigest(),'basis':'Independently authored geometric RGBA overlays; no original pixel data read','generator':'tools/authored-dynamic-masks/generate.py','families':FAMILIES,'dimensions':[100,100],'stagesPerFamily':7}
    dst=ROOT/'docs/authored-dynamic-masks/manifest.json';dst.parent.mkdir(parents=True,exist_ok=True);dst.write_text(json.dumps(manifest,indent=2)+'\n')
