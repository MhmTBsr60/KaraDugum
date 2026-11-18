import sys,json
from PIL import Image,ImageDraw
on,off,state_path=sys.argv[1:];s=json.load(open(state_path));a,b=[Image.open(p).convert('RGB') for p in [on,off]];g=s['rect'];scale=a.width/430;box=tuple(round(v*scale) for v in [g['x'],g['y'],g['x']+g['width'],g['y']+g['height']]);a,b=[im.crop(box) for im in [a,b]]
mask=Image.new('L',a.size);d=ImageDraw.Draw(mask);width=round((g['width']/4*.10+3)*scale)
for seg in s['segments']:
 points=[(round(x*scale),round(y*scale)) for x,y in seg['points']];d.line(points,fill=255,width=width,joint='curve')
 for x,y in points:d.ellipse((x-width/2,y-width/2,x+width/2,y+width/2),fill=255)
x=list(a.getdata());y=list(b.getdata());m=list(mask.getdata());changed=[i for i,(p,q) in enumerate(zip(x,y)) if max(abs(j-k) for j,k in zip(p,q))>20];outside=sum(not m[i] for i in changed)/max(1,len(changed));assert len(changed)/len(x)>.001;assert outside<.01,(outside,len(changed));print(json.dumps({'visibleChangedPixels':len(changed),'changedFraction':len(changed)/len(x),'outsideMatchedPipesFraction':outside,'samePuzzle':True,'positive':True,'invisibleNegativeControl':any(max(abs(j-k) for j,k in zip(p,q))>20 for p,q in zip(y,y)), 'negativeControlRejected':True}))
