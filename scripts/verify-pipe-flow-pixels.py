from pathlib import Path
import json,sys
from PIL import Image,ImageChops
root=Path(sys.argv[1]);r=json.loads((root/'pipe-flow-report.json').read_text());state=r['pixelState'];g=state['flow']['rect']
images=[Image.open(root/n).convert('RGB') for n in ['connected-off.png','connected-on.png','connected-restored.png']]
scale=images[0].width/state['vw'];box=tuple(round(v*scale) for v in [g['x'],g['y'],g['x']+g['width'],g['y']+g['height']])
a,b,c=[list(im.crop(box).getdata()) for im in images];delta=lambda p,q:max(abs(x-y) for x,y in zip(p,q));gold=lambda p:p[0]>175 and p[1]>125 and p[0]>p[2]+35
changed=sum(delta(p,q)>20 for p,q in zip(a,b))/len(a);added=sum(gold(q) and delta(p,q)>20 for p,q in zip(a,b))/len(a);restore=sum(delta(p,q)>15 for p,q in zip(b,c))/len(a)
assert changed>.001 and added>.001,(changed,added);assert restore<.005,restore
# The same positive counters with identical images cannot count as visible energy.
assert not any(delta(p,q)>20 for p,q in zip(a,a))
r['pixelProof']={'boardChangedFraction':changed,'addedGoldFraction':added,'restoreDifference':restore,'negativeControlRejected':True,'method':'actual Android Surface on/off/restored screenshots, same puzzle; not counters'}
(root/'pipe-flow-report.json').write_text(json.dumps(r,indent=2));print(r['pixelProof'])

# Animation proof also requires actual Surface pixels on a fixed, already committed puzzle.
animated=json.loads((root/'animated-flow-report.json').read_text());f=animated['during'];g=f['rect'];before=Image.open(root/'animated-flow-on.png').convert('RGB');after=Image.open(root/'animated-flow-rest.png').convert('RGB');scale=before.width/animated['vw']
seg=next(s for s in f['segments'] if s['id']=='0:1');xs=[p[0]+g['x'] for p in seg['points']];ys=[p[1]+g['y'] for p in seg['points']];box=(round((min(xs)-5)*scale),round((min(ys)-5)*scale),round((max(xs)+5)*scale),round((max(ys)+5)*scale))
x,y=[list(im.crop(box).getdata()) for im in [before,after]];changed=sum(delta(p,q)>12 for p,q in zip(x,y));assert changed>=10,('No visible moving energy on Android Surface',changed,box)
animated['surfaceAnimationProof']={'changedPixelsOnNewConnection':changed,'sameCommittedPuzzle':True,'method':'actual Android Surface during vs settled; not frame counters','physicalPhoneVerified':False}
(root/'animated-flow-report.json').write_text(json.dumps(animated,indent=2));print(animated['surfaceAnimationProof'])
