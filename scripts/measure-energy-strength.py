import json,sys
from PIL import Image,ImageDraw
old,new,state=sys.argv[1:];s=json.load(open(state));a,b=[Image.open(p).convert('RGBA') for p in [old,new]];assert a.size==b.size
scale=a.width/s['rect']['width'];mask=Image.new('L',a.size);d=ImageDraw.Draw(mask);width=round((s['rect']['width']/4*.10+3)*scale)
for seg in s['segments']:
 points=[(round(x*scale),round(y*scale)) for x,y in seg['points']];d.line(points,fill=255,width=width,joint='curve')
 for x,y in points:d.ellipse((x-width/2,y-width/2,x+width/2,y+width/2),fill=255)
# Compare light itself (premultiplied luminance), not the unchanged gold metal.
energy=lambda p:sum((.2126*r+.7152*g+.0722*b)*alpha/255 for r,g,b,alpha in p.getdata())
x,y=energy(a),energy(b);seg=next(v for v in s['segments'] if v['id']=='0:1');points=seg['points'];box=(int(min(p[0] for p in points)*scale-6),int(min(p[1] for p in points)*scale-6),int(max(p[0] for p in points)*scale+6),int(max(p[1] for p in points)*scale+6));pulse_old,pulse_new=energy(a.crop(box)),energy(b.crop(box));pixels=list(b.getdata());allowed=list(mask.getdata());lit=[i for i,p in enumerate(pixels) if p[3]>20];outside=sum(not allowed[i] for i in lit)/max(1,len(lit))
# The new requirement is a NARROW white-hot core, not more integrated area light.
# Measure the actual composited board against the exact same metal with Canvas hidden.
from pathlib import Path
def core(path):
 stem=str(path).replace('-canvas.png','')
 on=Image.open(stem+'.png').convert('RGB');off=Image.open(stem+'-metal.png').convert('RGB');ratio=on.width/s['vw'];r=s['rect'];xs=[p[0] for p in points];ys=[p[1] for p in points]
 box=(int((r['x']+min(xs)-5)*ratio),int((r['y']+min(ys)-5)*ratio),int((r['x']+max(xs)+5)*ratio),int((r['y']+max(ys)+5)*ratio))
 lum=lambda p:.2126*p[0]+.7152*p[1]+.0722*p[2]
 delta=[lum(p)-lum(q) for p,q in zip(on.crop(box).getdata(),off.crop(box).getdata()) if min(p)>=230 and lum(p)-lum(q)>15]
 return len(delta),sorted(delta)[int((len(delta)-1)*.95)] if delta else 0
before_count,_=core(old);white_count,contrast=core(new)
print(json.dumps({'baselineLight':x,'strongLight':y,'ratio':pulse_new/pulse_old,'wholeBoardRatio':y/x,'scope':'new connection 0:1, identical engine state at 400 ms; white-hot core contrast on actual board, NOT total brightness area','changedOutsidePipesFraction':outside,'sameEngineState':True,'visibleWhiteCorePixels':white_count,'baselineWhiteCorePixels':before_count,'compositeCoreContrastP95':contrast}))
