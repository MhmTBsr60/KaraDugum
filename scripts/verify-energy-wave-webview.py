"""Verify Android Surface pixels using the native WebView bounds, not trigger counts."""
from pathlib import Path
import sys,json,re,math
from PIL import Image,ImageDraw
root=Path(sys.argv[1]);s=json.loads((root/'webview-report.json').read_text());assert s['status']=='PASS' and s['noGameApkBuilt'] and s['clockControlled'] and s['capableHardwareSimulated'];assert len(s['themes'])==6
xml=(root/'ui.xml').read_text();bounds=[list(map(int,m)) for m in re.findall(r'<node\b[^>]*class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',xml)];assert bounds
x,y,right,bottom=max(bounds,key=lambda a:(a[2]-a[0])*(a[3]-a[1]));scale=(right-x)/s['viewport']['width'];f=s['middle'];r=f['rect'];board=tuple(round(v) for v in [x+r['x']*scale,y+r['y']*scale,x+(r['x']+r['width'])*scale,y+(r['y']+r['height'])*scale]);imgs={n:Image.open(root/(n+'.png')).convert('RGB') for n in ['wave-early','wave-middle','wave-metal','wave-settled','light-off']};on,off=[imgs[n].crop(board) for n in ['wave-middle','wave-metal']]
mask=Image.new('L',on.size);d=ImageDraw.Draw(mask);width=math.ceil(r['width']/4*.23*scale)
for seg in f['segments']:
 pts=[(a*scale,b*scale) for a,b in seg['points']];d.line(pts,fill=255,width=width,joint='curve')
 for a,b in pts:d.ellipse((a-width/2,b-width/2,a+width/2,b+width/2),fill=255)
a,b,m=list(on.getdata()),list(off.getdata()),list(mask.getdata());changed=[i for i,(p,q) in enumerate(zip(a,b)) if max(abs(u-v) for u,v in zip(p,q))>20];white=[i for i in changed if min(a[i])>=230 and sum(a[i])-sum(b[i])>45];outside=sum(not m[i] for i in changed)/max(1,len(changed));assert len(white)>=12,('Native white core not visible',len(white));assert outside<.01,('Light outside bounded pipe halo',outside)
edge=next(z for z in f['segments'] if z['id']==f['effects']['waves'][0]['id']);pts=edge['points'];roi=tuple(round(v) for v in [x+(r['x']+min(p[0] for p in pts)-9)*scale,y+(r['y']+min(p[1] for p in pts)-9)*scale,x+(r['x']+max(p[0] for p in pts)+9)*scale,y+(r['y']+max(p[1] for p in pts)+9)*scale]);metal=imgs['wave-metal'].crop(roi);centers=[]
for n in ['wave-early','wave-middle']:
 pic=imgs[n].crop(roi);pixels=[(i%pic.width,i//pic.width) for i,(p,q) in enumerate(zip(pic.getdata(),metal.getdata())) if min(p)>=230 and sum(p)-sum(q)>45];assert len(pixels)>=6,(n,len(pixels));centers.append([sum(p[j] for p in pixels)/len(pixels) for j in [0,1]])
travel=math.dist(*centers);assert travel>5,('White light did not visibly travel',travel)
settled=list(imgs['wave-settled'].crop(board).getdata());dark=list(imgs['light-off'].crop(board).getdata());remain=sum(max(abs(u-v) for u,v in zip(p,q))>12 for p,q in zip(settled,dark));assert remain>50,('Settled light invisible',remain)
proof={'status':'PASS','actualAndroidSurfacePixels':True,'nativeWebViewBounds':[x,y,right,bottom],'whiteCorePixels':len(white),'outsideBoundedPipeHaloFraction':outside,'movingWhiteCentroids':centers,'visibleTravelPixels':travel,'settledLightPixels':remain,'negativeControlRejected':not any(p!=q for p,q in zip(b,b)),'phoneVerified':False,'scope':'Android35 built-in system WebView source preview; native adb input and Surface screenshots; controlled clock/capable hardware. No game APK build; not phone FPS or game bridge validation.'};(root/'surface-proof.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof,indent=2))
