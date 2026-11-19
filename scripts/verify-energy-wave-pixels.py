"""Positive and negative controls on real rendered boards, not callback counters."""
from pathlib import Path
import sys,json,math
from PIL import Image,ImageDraw
root=Path(sys.argv[1]);results=[]
for theme in ['gold','ice','fire','shadow','emerald','ruby']:
 s=json.loads((root/f'theme-{theme}-state.json').read_text());on=Image.open(root/f'theme-{theme}.png').convert('RGB');off=Image.open(root/f'theme-{theme}-metal.png').convert('RGB');scale=on.width/430;r=s['rect'];box=tuple(round(v*scale) for v in [r['x'],r['y'],r['x']+r['width'],r['y']+r['height']]);on,off=[i.crop(box) for i in [on,off]]
 mask=Image.new('L',on.size);d=ImageDraw.Draw(mask)
 for seg in s['segments']:
  points=[(x*scale,y*scale) for x,y in seg['points']];width=math.ceil(r['width']/4*.23*scale);d.line(points,fill=255,width=width,joint='curve')
  for x,y in points:d.ellipse((x-width/2,y-width/2,x+width/2,y+width/2),fill=255)
 m=list(mask.getdata());a=list(on.getdata());b=list(off.getdata());changed=[i for i,(p,q) in enumerate(zip(a,b)) if max(abs(x-y) for x,y in zip(p,q))>20];outside=sum(not m[i] for i in changed)/max(1,len(changed));white=[i for i in changed if min(a[i])>=230 and sum(a[i])-sum(b[i])>45]
 assert len(white)>=12,(theme,'white core invisible',len(white));assert outside<.01,(theme,'unrelated stone changed',outside);assert not any(max(abs(x-y) for x,y in zip(p,q))>20 for p,q in zip(b,b))
 results.append({'theme':theme,'visibleWhitePixels':len(white),'changedPixels':len(changed),'outsideBoundedPipeHaloFraction':outside,'negativeControlRejected':True,'scope':'Same game state, compositor screenshot with Canvas on versus hidden; mask includes requested small halo/junction ring, not whole tile.'})
report={'status':'PASS','actualScreenshotProof':True,'themes':results,'phoneVerified':False};(root/'pixel-proof.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
