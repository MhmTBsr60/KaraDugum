"""Independent image proof of broad fill, moving energy and outward knee rings."""
from pathlib import Path
import sys,json,re,math
from PIL import Image,ImageDraw
root=Path(sys.argv[1]);j=json.loads((root/'webview-report.json').read_text());assert j['status']=='PASS' and j['noGameApkBuilt'] and len(j['themes'])==6
xml=(root/'ui.xml').read_text();boxes=[list(map(int,m)) for m in re.findall(r'<node\b[^>]*class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',xml)];assert boxes
x,y,right,bottom=max(boxes,key=lambda b:(b[2]-b[0])*(b[3]-b[1]));scale=(right-x)/j['viewport']['width'];s=j['middle'];r=s['rect'];crop=tuple(round(v) for v in [x+r['x']*scale,y+r['y']*scale,x+(r['x']+r['width'])*scale,y+(r['y']+r['height'])*scale]);images={n:Image.open(root/(n+'.png')).convert('RGB').crop(crop) for n in ['wave-early','wave-middle','wave-metal','wave-settled','light-off']};a,b=images['wave-middle'],images['wave-metal'];channel=13;unit=max(w['pipeInnerWidth']/13 for w in s['effects']['waves']);allowed=Image.new('L',a.size);inside=Image.new('L',a.size);metal=Image.new('L',a.size)
for target,width in [(allowed,34),(inside,14),(metal,23)]:
 d=ImageDraw.Draw(target);w=math.ceil(width*unit*scale)
 for seg in s['segments']:
  pts=[(px*scale,py*scale) for px,py in seg['points']];d.line(pts,fill=255,width=w,joint='curve')
  for px,py in pts:d.ellipse((px-w/2,py-w/2,px+w/2,py+w/2),fill=255)
d=ImageDraw.Draw(allowed)
for ring in s['effects']['rings']:
 if ring['kind']!='bend':continue
 cx,cy=[v*scale for v in ring['center']];rad=(ring['radius']+5*unit)*scale;d.ellipse((cx-rad,cy-rad,cx+rad,cy+rad),fill=255)
aa,bb,mask,im,mm=[list(p.getdata()) for p in [a,b,allowed,inside,metal]];changed=[i for i,(p,q) in enumerate(zip(aa,bb)) if max(abs(u-v) for u,v in zip(p,q))>20];white=[i for i in changed if min(aa[i])>=230 and sum(aa[i])-sum(bb[i])>45];outside=sum(not mask[i] for i in changed)/max(1,len(changed));whiteOutside=sum(not im[i] for i in white)/max(1,len(white));assert len(white)>=100,('Broad energy invisible',len(white));assert outside<.01,('Stone outside halo changed',outside);assert whiteOutside<.01,('White covers outer metal/stone',whiteOutside)
centers=[]
for name in ['wave-early','wave-middle']:
 pic=images[name];coords=[(i%pic.width,i//pic.width) for i,(p,q) in enumerate(zip(pic.getdata(),bb)) if min(p)>=230 and sum(p)-sum(q)>45];assert len(coords)>=20;centers.append([sum(c[k] for c in coords)/len(coords) for k in [0,1]])
travel=math.dist(*centers);assert travel>5,('Light pixels stationary',travel)
outward=0
for ring in s['effects']['rings']:
 if ring['kind']!='bend':continue
 cx,cy=[v*scale for v in ring['center']];rad=(ring['radius']+5*unit)*scale
 for yy in range(max(0,int(cy-rad)),min(a.height,int(cy+rad)+1)):
  for xx in range(max(0,int(cx-rad)),min(a.width,int(cx+rad)+1)):
   i=yy*a.width+xx;p,q=aa[i],bb[i]
   if not mm[i] and max(p)>175 and sorted(p)[1]>125 and max(abs(u-v) for u,v in zip(p,q))>25:outward+=1
assert outward>=20,('Outward bend halo invisible',outward)
remaining=sum(max(abs(u-v) for u,v in zip(p,q))>12 for p,q in zip(images['wave-settled'].getdata(),images['light-off'].getdata()));assert remaining>50
proof={'status':'PASS','actualAndroidSurfacePixels':True,'whiteAddedPixels':len(white),'outwardBendRingPixels':outward,'outsideAllowedHaloFraction':outside,'whiteOutsideInnerChannelFraction':whiteOutside,'whiteFillCentroids':centers,'whiteFillCentroidTravelPixels':travel,'settledLightPixels':remaining,'negativeControlRejected':not any(p!=q for p,q in zip(bb,bb)),'nativeWebViewBounds':[x,y,right,bottom],'phoneVerified':False,'scope':'Android35 system WebView/source page, actual adb taps and Surface images, test clock/hardware controlled; not game APK or POCO validation.'};(root/'surface-proof.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof,indent=2))
