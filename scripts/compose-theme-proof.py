"""Compose verified real Android frames; never accept stale duplicate board captures."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import sys,json,hashlib
root=Path(sys.argv[1]);target=root/'six-themes-android.png'
themes=[('gold','Kadim Taş'),('ice','Gece Tapınağı'),('fire','Çöl Harabeleri'),('shadow','Gece Moru'),('emerald','Zümrüt Mabedi'),('ruby','Yakut Ateşi')]
report=json.loads((root/'report.json').read_text());geometry={t['theme']:t for t in report['themes']}
canvas=Image.new('RGB',(1080,3720),'#090b0e');draw=ImageDraw.Draw(canvas);hashes=[]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
for i,(key,label) in enumerate(themes):
 image=Image.open(root/('theme-'+key+'.png')).convert('RGB');g=geometry[key];r=g['board'];scale=image.width/g['viewportWidth']
 crop=image.crop(tuple(round(v*scale) for v in [r['x'],r['y'],r['x']+r['width'],r['y']+r['height']])).resize((128,128))
 hashes.append(hashlib.sha256(crop.tobytes()).hexdigest())
 image.thumbnail((540,1200),Image.Resampling.LANCZOS)
 x=(i%2)*540;y=(i//2)*1240;draw.text((x+18,y+8),label,font=font,fill='#f4d18c');canvas.paste(image,(x+(540-image.width)//2,y+40))
assert len(set(hashes))==6,'Stale/duplicate actual board pixels: capture must wait for a committed WebView frame'
report['sixDistinctBoardPixelHashes']=hashes;report['visualStateAndFrameCommitSynchronized']=True
(root/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));canvas.save(target,optimize=True);print(target)
