"""Measure warm stone illumination from the Android WebView Surface shot."""
import json
import math
import re
import sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(sys.argv[1])
report = json.loads((root/'webview-report.json').read_text())
assert report['status'] == 'PASS'
state = report['middle']
assert state['effects']['reflections']
assert not report['settled']['effects']['reflections']
assert not report['reduced']['effects']['reflections']
views = re.findall(r'<node\b[^>]*class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',
                   (root/'ui.xml').read_text())
left, top, right, bottom = max((tuple(map(int,box)) for box in views),
                               key=lambda b:(b[2]-b[0])*(b[3]-b[1]))
scale = (right-left) / report['viewport']['width']
r = state['rect']
crop = tuple(round(v) for v in (
    left+r['x']*scale, top+r['y']*scale,
    left+(r['x']+r['width'])*scale,top+(r['y']+r['height'])*scale
))
base = Image.open(root/'wave-metal.png').convert('RGB').crop(crop)
wave = Image.open(root/'layer-wave.png').convert('RGB').crop(crop)
mask = Image.new('L',base.size)
draw = ImageDraw.Draw(mask)
for stamp in state['effects']['reflections']:
    x,y = (v*scale for v in stamp['center'])
    radius = stamp['radius']*scale
    draw.ellipse((x-radius,y-radius,x+radius,y+radius),fill=255)

warm = 0
outside = 0
for a,b,inside in zip(wave.getdata(),base.getdata(),mask.getdata()):
    dr,dg,db = (p-q for p,q in zip(a,b))
    if max(b)<100 and dr>=9 and dr>dg>db:
        warm += int(bool(inside))
        outside += int(not inside)

assert warm>=70, warm
assert outside<=max(10,math.ceil(warm*.015)), (outside,warm)
result = {'status':'PASS','scope':'Android 35 actual Surface, same board with wave only versus Canvas hidden',
          'warmStonePixels':warm,'warmOutsideFootprint':outside,'physicalPOCO':False}
(root/'stone-surface-proof.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
