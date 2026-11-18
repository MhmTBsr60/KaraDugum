from pathlib import Path
import importlib.util,json,sys
root=Path(sys.argv[1]);spec=importlib.util.spec_from_file_location('metrics',Path(__file__).with_name('visible-light-metrics.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=json.loads((root/'visibility-report.json').read_text());g=r['state']['geometry'];scale=r['state']['nativeInfo']['width']/g['viewportWidth']
rect=[round(v*scale) for v in [g['x'],g['y'],g['x']+g['width'],g['y']+g['height']]]
before=root/'visible-before.png';on=root/'visible-on.png';after=root/'visible-after.png'
positive=m.measure(before,on,after,rect);negative=m.measure(before,before,after,rect)
assert positive['visible'],('No same-state added GOLD visible on actual Android Surface',positive,rect)
assert not negative['visible'],'Positive callback counts alone must never pass'
assert r['samePuzzleNoMove'] and r['state']['paintEvidence']['topLayer'] and not r['state']['nativeInfo']['enabled']
r['pixelEvidence']={'positive':positive,'negativeControl':negative,'rect':rect,'device':'Android emulator Surface PNG, not a physical POCO'}
(root/'visibility-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print('PASS: actual Android same-state added GOLD pixels and restoration; negative control rejected',positive)
