"""Verify the actual signed TEST APK; never writes or reads a production bundle."""
import json, os, re, subprocess, sys, zipfile
from pathlib import Path
apk=Path(sys.argv[1])
sdk=Path(os.environ.get('ANDROID_HOME') or os.environ['ANDROID_SDK_ROOT'])
aapt=sorted((sdk/'build-tools').glob('*/aapt'))[-1]
badging=subprocess.check_output([str(aapt),'dump','badging',str(apk)],text=True)
for token in ["name='com.orynexa.karadugum'", "versionCode='110'", "versionName='6.50-ux-test2'", "targetSdkVersion:'36'", "uses-permission: name='com.google.android.gms.permission.AD_ID'"]:
    assert token in badging,token
config=json.loads(Path('app/kd-ads.json').read_text())
assert config['mode']=='test'
assert config['rewardedUnitId']=='ca-app-pub-3940256099942544/5224354917'
assert config['interstitialUnitId']=='ca-app-pub-3940256099942544/1033173712'
java=Path('app/build/generated/source/buildConfig/release/com/orynexa/karadugum/BuildConfig.java').read_text()
assert re.search(r'ADS_TEST_MODE\s*=\s*true\s*;',java)
with zipfile.ZipFile(apk) as archive:
    for file in ['index.html','obsidian-gold.css','obsidian-gold.js','board-renderer.js','theme-renderer.js','localization.js','cloud-model.js','cloud-sync.js','reward-receipts.js','board-focus.css','board-focus.js','feedback.js','wheel.js','wheel-motion.js','ux-locales.js','ux-polish.css']:
        assert archive.read('assets/'+file)==Path(file).read_bytes(),file
    assert not any(name.endswith(('.jks','.keystore')) for name in archive.namelist())
    assert not any(name.startswith('assets/design/') for name in archive.namelist())
    dex=b''.join(archive.read(name) for name in archive.namelist() if re.match(r'classes\d*\.dex$',name))
    for native_symbol in [b'UiFeedbackGate',b'hapticAvailable',b'feedbackAudioAllowed']:
        assert native_symbol in dex,native_symbol
    for key in ['rewardedUnitId','interstitialUnitId']:
        assert config[key].encode() in dex,key
    assert b'ca-app-pub-6340528165840202/' not in dex,'LIVE ad unit unexpectedly packaged'
assert not list(Path('app/build/outputs').rglob('*.aab')),'This workflow must not build an AAB'
print('PASS: signed TEST APK version/API/AD_ID, sample ad units, exact game/save/design assets; no preview media or AAB')
