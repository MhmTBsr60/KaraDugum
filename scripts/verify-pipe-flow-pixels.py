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

# Decode continuous native screenrecord frames outside this script. Reference and
# samples share the same codec, avoiding PNG screenshot latency/codec differences.
from PIL import ImageDraw
import shutil
animated=json.loads((root/'animated-flow-report.json').read_text());f=animated['during'];g=f['rect'];frames=sorted(Path(sys.argv[2]).glob('*.png'));assert len(frames)>=12
rest=Image.open(frames[-1]).convert('RGB');assert abs(rest.width/rest.height-animated['vw']/animated['vh'])<.01,'Unexpected recording projection';scale=rest.width/animated['vw'];boardbox=tuple(round(v*scale) for v in [g['x'],g['y'],g['x']+g['width'],g['y']+g['height']]);small=(round(g['width']),round(g['height']))
# Analyse at CSS resolution; raw full-resolution chosen frames remain available.
mask=Image.new('L',small);draw=ImageDraw.Draw(mask);width=round(g['width']/4*.10+3)
for seg in f['segments']:
 points=[(round(x),round(y)) for x,y in seg['points']];draw.line(points,fill=255,width=width,joint='curve')
 for x,y in points:draw.ellipse((x-width/2,y-width/2,x+width/2,y+width/2),fill=255)
seg=next(v for v in f['segments'] if v['id']=='0:1');xs=[p[0] for p in seg['points']];ys=[p[1] for p in seg['points']];roi=(round(min(xs)-5),round(min(ys)-5),round(max(xs)+5),round(max(ys)+5))
base=rest.crop(boardbox).resize(small,Image.Resampling.LANCZOS);reference=list(base.getdata());allowed=list(mask.getdata());end=list(base.crop(roi).getdata());valid=[]
luma=lambda p:.2126*p[0]+.7152*p[1]+.0722*p[2]
for i,name in enumerate(frames):
 im=Image.open(name).convert('RGB').crop(boardbox).resize(small,Image.Resampling.LANCZOS);pixels=list(im.getdata());changed=[k for k,(p,q) in enumerate(zip(pixels,reference)) if delta(p,q)>16];outside=sum(not allowed[k] for k in changed)/max(1,len(changed));bright=[k for k,(p,q) in enumerate(zip(im.crop(roi).getdata(),end)) if luma(p)-luma(q)>12]
 if outside<.03 and len(bright)>=8:valid.append({'sample':name.name,'frame':i,'brightPixels':len(bright),'centroidX':sum(roi[0]+k%(roi[2]-roi[0]) for k in bright)/len(bright)*scale,'outsideMatchedPipesFraction':outside})
assert len(valid)>=2,('No two visible moving-light video frames on the same committed puzzle',valid)
shift=max(v['centroidX'] for v in valid)-min(v['centroidX'] for v in valid);assert shift>=3,('Energy must visibly travel along the pipe',valid)
best=max(valid,key=lambda v:v['brightPixels']);shutil.copyfile(Path(sys.argv[2])/best['sample'],root/'animated-flow-on.png');shutil.copyfile(frames[-1],root/'animated-flow-settled-video.png')
animated['surfaceAnimationProof']={'changedPixelsOnNewConnection':best['brightPixels'],'sameCommittedPuzzle':True,'visibleSamples':valid,'travelPixels':shift,'selectedSample':best['sample'],'method':'continuous Android screenrecord frames: positive luminance + directional travel inside matched pipes; not counters','physicalPhoneVerified':False}
(root/'animated-flow-report.json').write_text(json.dumps(animated,indent=2));print(animated['surfaceAnimationProof'])
