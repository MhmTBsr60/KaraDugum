"""Pixel evidence on an Android emulator, never a physical POCO certification."""
from pathlib import Path
from PIL import Image,ImageChops
import json,sys
root=Path(sys.argv[1]);report=json.loads((root/'report.json').read_text())
g=report['lightGeometry'];info=report['lightNativeInfo'];scale=info['width']/g['viewportWidth']
rect=tuple(round(v*scale) for v in [g['x'],g['y'],g['x']+g['width'],g['y']+g['height']])
a=Image.open(root/'native-light-300ms.png').convert('RGB').crop(rect)
b=Image.open(root/'native-light-settled.png').convert('RGB').crop(rect)
d=ImageChops.difference(a,b);pixels=list(d.getdata());fraction=sum(max(p)>24 for p in pixels)/len(pixels)
assert fraction>.2,('No substantial real Surface pixel change in touched node at 300ms',fraction,rect)
assert report['lightOn']['nativeDraws']>0 and report['lightOn']['nativePaints']>0
assert report['lightOn']['duration']==500 and report['lightOn']['preference']['matches']
assert report['forcedNativeRejectionFallback']['htmlPaints']>0
report['lightPixels']={'rect':rect,'changedFractionAt300ms':fraction,'observedOn':'Android emulator Surface screenshots','phoneVerified':False}
(root/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS: real node pixel change at 300ms:',fraction,'; phone verification pending')
