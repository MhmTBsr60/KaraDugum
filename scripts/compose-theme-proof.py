"""Compose real Android Surface screenshots without changing their game contents."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import sys
root=Path(sys.argv[1]);target=root/'six-themes-android.png'
themes=[('gold','Kadim Taş'),('ice','Gece Tapınağı'),('fire','Çöl Harabeleri'),('shadow','Gece Moru'),('emerald','Zümrüt Mabedi'),('ruby','Yakut Ateşi')]
canvas=Image.new('RGB',(1080,3720),'#090b0e');draw=ImageDraw.Draw(canvas)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
for i,(key,label) in enumerate(themes):
 image=Image.open(root/('theme-'+key+'.png')).convert('RGB');image.thumbnail((540,1200),Image.Resampling.LANCZOS)
 x=(i%2)*540;y=(i//2)*1240;draw.text((x+18,y+8),label,font=font,fill='#f4d18c');canvas.paste(image,(x+(540-image.width)//2,y+40))
canvas.save(target,optimize=True);print(target)
