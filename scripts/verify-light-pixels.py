"""Pixel evidence on an Android emulator, never a physical POCO certification."""
from pathlib import Path
from PIL import Image,ImageChops
import json,sys
root=Path(sys.argv[1]);report=json.loads((root/'report.json').read_text())
g=report['lightGeometry'];info=report['lightNativeInfo'];scale=info['width']/g['viewportWidth']
rect=tuple(round(v*scale) for v in [g['x'],g['y'],g['x']+g['width'],g['y']+g['height']])
a=Image.open(root/'native-light-on.png').convert('RGB').crop(rect)
b=Image.open(root/'native-light-settled.png').convert('RGB').crop(rect)
d=ImageChops.difference(a,b);pixels=list(d.getdata());fraction=sum(max(p)>24 for p in pixels)/len(pixels)
assert fraction>.2,('No substantial real Surface pixel change in touched node at the first captured frame',fraction,rect)
assert report['lightOn']['nativeDraws']>0 and report['lightOn']['nativePaints']>0
assert report['nativeVisibleHoldMs']>=500
assert report['lightOn']['duration']==500 and report['lightOn']['preference']['matches']
assert report['forcedNativeRejectionFallback']['htmlPaints']>0
h=Image.open(root/'native-rejection-html-fallback.png').convert('RGB').crop(rect)
h0=Image.open(root/'native-rejection-html-settled.png').convert('RGB').crop(rect)
hp=list(ImageChops.difference(h,h0).getdata());html_fraction=sum(max(v)>24 for v in hp)/len(hp)
assert html_fraction>.2,('HTML callback without visible Surface light',html_fraction)
report['htmlLightPixels']={'changedFractionAtFirstCapturedFrame':html_fraction,'phoneVerified':False}
report['lightPixels']={'rect':rect,'changedFractionAtFirstCapturedFrame':fraction,'observedOn':'Android emulator Surface screenshots','phoneVerified':False}
(root/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS: real node pixel change at the first captured frame:',fraction,'; phone verification pending')
