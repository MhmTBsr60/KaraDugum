"""Use Android Surface PNGs to check each pass, including annular shape."""
import json
import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw

out = Path(sys.argv[1])
report = json.loads((out/'webview-report.json').read_text())
assert report['status'] == 'PASS' and report['noGameApkBuilt'] and len(report['themes']) == 6
bounds = re.findall(r'<node\b[^>]*class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',
                    (out/'ui.xml').read_text())
assert bounds
left, top, right, bottom = max((tuple(map(int, box)) for box in bounds),
                               key=lambda b: (b[2]-b[0])*(b[3]-b[1]))
scale = (right-left)/report['viewport']['width']
state = report['middle']
rect = state['rect']
box = tuple(round(value) for value in [
    left+rect['x']*scale, top+rect['y']*scale,
    left+(rect['x']+rect['width'])*scale, top+(rect['y']+rect['height'])*scale
])


def read(name):
    return Image.open(out/(name+'.png')).convert('RGB').crop(box)


def bright_gain(pixel, baseline):
    return (sum(pixel)-sum(baseline)) / 3


metal = read('wave-metal')
base = list(metal.getdata())
width = metal.width
inside = Image.new('L', metal.size)
draw = ImageDraw.Draw(inside)
inner_width = max(wave['pipeInnerWidth'] for wave in state['effects']['waves'])
for segment in state['segments']:
    points = [(x*scale, y*scale) for x,y in segment['points']]
    brush = math.ceil((inner_width+1)*scale)
    draw.line(points, fill=255, width=brush, joint='curve')
    for x,y in points:
        draw.ellipse((x-brush/2,y-brush/2,x+brush/2,y+brush/2),fill=255)

inner_mask = list(inside.getdata())
pixel_counts = {}
for name in ['settled','rings','channel','wave']:
    image = read('layer-'+name)
    deltas = [(i, bright_gain(p,q)) for i,(p,q) in enumerate(zip(image.getdata(),base))]
    count = sum(delta >= 12 for _,delta in deltas)
    assert count >= 70, (name, count)
    pixel_counts[name] = count

centres = []
white_counts = []
for name in ['wave-early','wave-middle']:
    pixels = list(read(name).getdata())
    white = [i for i,(p,q) in enumerate(zip(pixels,base)) if min(p)>=230 and bright_gain(p,q)>15]
    assert len(white)>=100
    assert sum(not inner_mask[i] for i in white)/len(white)<.01
    centres.append((sum(i%width for i in white)/len(white),sum(i//width for i in white)/len(white)))
    white_counts.append(len(white))
travel = math.dist(*centres)
assert travel>5

# A narrow ridge can be visible without exceeding the old broad halo
# brightness threshold. Check contrast across the expected annulus.
ring_image = list(read('layer-rings').getdata())
ring_proof = []
for ring in state['effects']['rings']:
    x,y = (n*scale for n in ring['center'])
    radius = ring['radius']*scale
    angular = set()
    changed = 0
    strong = 0
    for yy in range(max(0,int(y-radius*1.25)),min(metal.height,int(y+radius*1.25)+1)):
        for xx in range(max(0,int(x-radius*1.25)),min(width,int(x+radius*1.25)+1)):
            i = yy*width+xx
            d = math.hypot(xx-x,yy-y)/radius
            if .62<=d<=1.20 and not inner_mask[i] and bright_gain(ring_image[i],base[i])>=14:
                theta = math.atan2(yy-y,xx-x)
                angular.add(int((theta+math.pi)/(2*math.pi)*24)%24)
                changed += 1
                strong += int(bright_gain(ring_image[i],base[i])>=32)
    assert changed>=90 and len(angular)>=9, (ring['cell'], changed, len(angular))
    ring_proof.append({'cell':ring['cell'],'annulusContrastPixels':changed,
                       'angularBinsOf24':len(angular),'higherContrastPixels':strong})
assert ring_proof
result = {'status':'PASS','source':'Android 35 WebView Surface PNGs',
          'isolatedLayerChangedPixels':pixel_counts,'addedWhitePixels':white_counts,
          'lightCentroidTravelPixels':travel,'annularRidge':ring_proof,
          'phoneVerified':False}
(out/'layer-surface-proof.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
