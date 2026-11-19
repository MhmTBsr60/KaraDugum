from pathlib import Path
from PIL import Image
import json,sys
root=Path(sys.argv[1]);p=root/'treasure-preview-report.json';r=json.loads(p.read_text());assert r['status']=='PASS' and len(r['cases'])==2
proof=[]
for case in r['cases']:
 day=case['r']['day'];im=Image.open(root/f'treasure-day{day}.png').convert('RGB');scale=im.width/case['vw'];g=case['heroRect'];box=tuple(round(v*scale) for v in [g['x'],g['y'],g['right'],g['bottom']]);pixels=list(im.crop(box).getdata());gold=sum(a>150 and b>90 and c<155 and a>b*1.05 for a,b,c in pixels);blue=sum(c>130 and c>a*1.25 and c>b*1.05 for a,b,c in pixels)
 assert gold>100 and blue>25,('Chest and blue crystals must be visible on actual Android Surface',day,gold,blue)
 proof.append({'day':day,'goldHeroPixels':gold,'blueCrystalPixels':blue,'method':'actual Android Surface screenshot, decoded chest asset; not DOM counters','phoneVerified':False})
r['surfaceProof']=proof;p.write_text(json.dumps(r,indent=2));print(json.dumps(proof))
