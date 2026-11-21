#!/usr/bin/env bash
set -euo pipefail
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable
adb shell svc data disable
adb shell settings put secure immersive_mode_confirmations confirmed
mkdir -p dist/tutorial
remote_files=/sdcard/Android/data/com.orynexa.karadugum/files/webview-audit
trap 'adb pull "$remote_files/." dist/tutorial/ || true' EXIT
apk=app/build/outputs/apk/release/app-release.apk
audit() {
  local method="$1"
  timeout 125s adb shell am instrument -w \
    -e class "com.orynexa.karadugum.PocoEnergyUpgradeAudit#$method" \
    -e fromStyle energy-reference-3-poco -e fromVersion 6.51 \
    -e toVersion "$KD_TEST_VERSION" -e candidateCode "$KD_VERSION_CODE" \
    com.orynexa.karadugum.test/androidx.test.runner.AndroidJUnitRunner | tee "dist/tutorial/$method.log"
  grep -F 'OK (1 test)' "dist/tutorial/$method.log"
}
if [[ "$KD_SCENARIO" == fresh ]]; then
  timeout 45s adb install "$apk"
else
  timeout 45s adb install "$RUNNER_TEMP/baseline-114.apk"
fi
timeout 45s adb install app/build/outputs/apk/androidTest/release/app-release-androidTest.apk
if [[ "$KD_SCENARIO" == fresh ]]; then
  audit verifyTutorialFresh115
else
  audit verifyTutorial114
  adb shell am force-stop com.orynexa.karadugum
  audit seedPreviousSignedTest
  adb shell am force-stop com.orynexa.karadugum
  audit verifyPreviousBeforeUpgrade
  adb shell am force-stop com.orynexa.karadugum
  timeout 45s adb install -r "$apk"
  audit verifyAfterInPlaceInstall
  adb shell am force-stop com.orynexa.karadugum
  audit verifyTutorialExisting115
fi
