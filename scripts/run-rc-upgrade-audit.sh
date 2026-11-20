#!/usr/bin/env bash
set -euo pipefail
adb shell settings put secure immersive_mode_confirmations confirmed
mkdir -p dist/upgrade
remote_files=/sdcard/Android/data/com.orynexa.karadugum/files/webview-audit
trap 'adb pull "$remote_files/." dist/upgrade/ || true' EXIT

timeout 45s adb install -r "$RUNNER_TEMP/previous-test.apk"
timeout 45s adb install -r app/build/outputs/apk/androidTest/release/app-release-androidTest.apk
audit() {
  local method="$1" report="$2"
  timeout 125s adb shell am instrument -w \
    -e class "com.orynexa.karadugum.PocoEnergyUpgradeAudit#$method" \
    -e fromStyle energy-reference-3-poco -e fromVersion "${KD_PREVIOUS_TEST_VERSION:-6.50-poco-energy-test3}" \
    -e toVersion "$KD_TEST_VERSION" -e candidateCode "$KD_VERSION_CODE" \
    -e themePurchaseAudit "${KD_THEME_PURCHASE_AUDIT:-false}" \
    -e baseline650 "${KD_BASELINE_650_AUDIT:-false}" \
    com.orynexa.karadugum.test/androidx.test.runner.AndroidJUnitRunner > "dist/upgrade/$report"
  cat "dist/upgrade/$report"
  grep -F 'OK (1 test)' "dist/upgrade/$report"
}

audit seedPreviousSignedTest seed.log
adb shell am force-stop com.orynexa.karadugum
audit verifyPreviousBeforeUpgrade restart.log
adb shell am force-stop com.orynexa.karadugum
timeout 45s adb install -r app/build/outputs/apk/release/app-release.apk
audit verifyAfterInPlaceInstall candidate.log

if [[ "${KD_THEME_PURCHASE_AUDIT:-false}" == true ]]; then
  adb shell am force-stop com.orynexa.karadugum
  audit verifyThemePurchaseAfterRestart purchase-restart.log
fi

if [[ "${KD_BASELINE_650_AUDIT:-false}" == true ]]; then
  adb shell cmd overlay enable-exclusive --category com.android.internal.systemui.navbar.gestural
  adb shell am force-stop com.orynexa.karadugum
  audit verifyCinematicExit exit-actions.log
  adb shell am force-stop com.orynexa.karadugum
  audit verifyCinematicExitAfterRestart exit-restart.log
  audit verifyReceiptWriteFailure receipt-native.log
  audit seedInterruptedLoginReward receipt-webview-interrupt.log
  adb shell am force-stop com.orynexa.karadugum
  audit verifyInterruptedLoginAfterRestart receipt-webview-restart.log
fi

if [[ "${KD_CINEMATIC_EXIT_AUDIT:-false}" == true ]]; then
  adb shell wm size 640x1136
  audit verifyExitViewport exit-small.log
  adb shell wm size 1080x2160
  audit verifyExitViewport exit-large.log
  adb shell wm size reset
  adb shell cmd overlay enable-exclusive --category com.android.internal.systemui.navbar.gestural
  adb shell cmd overlay list | grep -F '[x] com.android.internal.systemui.navbar.gestural'
  adb shell am force-stop com.orynexa.karadugum
  audit verifyCinematicExit exit-actions.log
  adb shell am force-stop com.orynexa.karadugum
  audit verifyCinematicExitAfterRestart exit-restart.log
fi
