import json,sys
from PIL import Image,ImageDraw
old,new,state=sys.argv[1:];s=json.load(open(state));a,b=[Image.open(p).convert('RGBA') for p in [old,new]];assert a.size==b.size
scale=a.width/s['rect']['width'];mask=Image.new('L',a.size);d=ImageDraw.Draw(mask);width=round((s['rect']['width']/4*.10+3)*scale)
for seg in s['segments']:
 points=[(round(x*scale),round(y*scale)) for x,y in seg['points']];d.line(points,fill=255,width=width,joint='curve')
 for x,y in points:d.ellipse((x-width/2,y-width/2,x+width/2,y+width/2),fill=255)
# Compare light itself (premultiplied luminance), not the unchanged gold metal.
energy=lambda p:sum((.2126*r+.7152*g+.0722*b)*alpha/255 for r,g,b,alpha in p.getdata())
x,y=energy(a),energy(b);seg=next(v for v in s['segments'] if v['id']=='0:1');points=seg['points'];box=(int(min(p[0] for p in points)*scale-6),int(min(p[1] for p in points)*scale-6),int(max(p[0] for p in points)*scale+6),int(max(p[1] for p in points)*scale+6));pulse_old,pulse_new=energy(a.crop(box)),energy(b.crop(box));pixels=list(b.getdata());allowed=list(mask.getdata());lit=[i for i,p in enumerate(pixels) if p[3]>20];outside=sum(not allowed[i] for i in lit)/max(1,len(lit));assert y>x
print(json.dumps({'baselineLight':x,'strongLight':y,'ratio':pulse_new/pulse_old,'wholeBoardRatio':y/x,'scope':'newly formed connection 0:1 at the same 400ms frame','changedOutsidePipesFraction':outside,'sameEngineState':True}))
