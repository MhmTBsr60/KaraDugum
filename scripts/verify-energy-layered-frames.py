"""Compare the four isolated passes to the same board with the energy canvas hidden."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops

preview = Path(sys.argv[1])
base = Image.open(preview/'same-state-metal-board.png').convert('RGB')
states = json.loads((preview/'preview-state.json').read_text())['states']
results = {}
for layer, file in [
    ('channel', 'layer-channel'), ('wave', 'layer-wave'), ('rings', 'layer-rings'),
    ('settled', 'layer-settled'), ('all', '03-bend-rings')
]:
    image = Image.open(preview/(file+'-board.png')).convert('RGB')
    assert image.size == base.size
    assert states[file]['game'] == states['same-state-metal']['game'], file
    diff = ImageChops.difference(image, base)
    visible = 0
    hot = 0
    for pixel, delta in zip(image.getdata(), diff.getdata()):
        if max(delta) >= 18:
            visible += 1
            hot += int(min(pixel) >= 225)
    assert visible >= 80, (layer, visible)
    results[layer] = {'changedPixels': visible, 'whitePixels': hot}
assert results['channel']['whitePixels'] >= 100
assert results['channel']['changedPixels'] > results['wave']['changedPixels']
assert results['all']['changedPixels'] > max(results[p]['changedPixels'] for p in results if p != 'all')
report = {'status': 'PASS', 'sameRealBoardAndTime': True, 'layerPixels': results}
(preview/'layer-pixel-proof.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
