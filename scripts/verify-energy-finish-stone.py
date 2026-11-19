"""Measure the moving stone reflection independently of the crest and rings."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

root = Path(sys.argv[1])
states = json.loads((root/'preview-state.json').read_text())['states']
scene = states['reflection-proof']
baseline = states['wave-without-reflection']
assert scene['game'] == baseline['game']
assert scene['flow']['effects']['reflections']
assert not states['01-light-off']['flow']['canvas']
assert not states['03-settled']['flow']['effects']['reflections']

image = Image.open(root/'reflection-proof-board.png').convert('RGB')
control = Image.open(root/'wave-without-reflection-board.png').convert('RGB')
assert control.size == image.size
scale = image.width / scene['flow']['rect']['width']
tiles = Image.new('L', image.size)
allowed = ImageDraw.Draw(tiles)
for x, y, w, h in scene['tiles']:
    allowed.rectangle(tuple(round(p*scale) for p in (x+1,y+1,x+w-1,y+h-1)), fill=255)

warm = 0
changed = 0
grid = 0
dark_stone = 0
peak = 0
for new, old, inside in zip(image.getdata(),control.getdata(),tiles.getdata()):
    red, green, blue = [p-q for p,q in zip(new,old)]
    gain = max(red,green,blue)
    peak = max(peak,gain)
    if gain < 9:
        continue
    changed += 1
    warm += int(red > green > blue)
    dark_stone += int(max(old) < 100)
    grid += int(not inside)

assert changed >= 200
assert warm/changed > .8, (warm, changed)
assert dark_stone/changed > .95, (dark_stone, changed)
assert grid == 0, grid
assert changed/(image.width*image.height) < .07
assert peak < 75, peak
proof = {'status':'PASS','sameEngineState':True,'changedPixels':changed,
         'warmPixels':warm,'darkStonePixels':dark_stone,'gridPixels':grid,
         'peakAddedComponent':peak,'settledAndOffClear':True}
(root/'stone-pixel-proof.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof,indent=2))
