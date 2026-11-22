#!/usr/bin/env bash
set -euo pipefail
kd_output="$PWD/ump-evidence"
mkdir -p "$kd_output"
record_evidence() {
  adb logcat -d -s KdUmpRegion KaraDugum UserMessagingPlatform > "$kd_output/ump-logcat.txt" || true
  adb exec-out screencap -p > "$kd_output/end.png" || true
  for kind in settings options-form options-attempt not-required startup; do
    if adb shell run-as com.orynexa.karadugum test -f "files/$KD_REGION-$kind.png"; then
      adb exec-out run-as com.orynexa.karadugum cat "files/$KD_REGION-$kind.png" > "$kd_output/$KD_REGION-$kind.png"
    fi
  done
}
trap record_evidence EXIT
adb shell pm list packages com.orynexa.karadugum | if grep -q .; then exit 1; fi
# The emulator starts fresh. Dismiss the OS-only immersion tutorial before running the app.
adb shell settings put secure immersive_mode_confirmations confirmed
adb shell settings put secure anr_show_background 0
adb install source/app/build/outputs/apk/debug/app-debug.apk
adb install source/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
set +e
adb shell am instrument -w -r -e class com.orynexa.karadugum.UmpRegionAudit -e region "$KD_REGION" com.orynexa.karadugum.test/androidx.test.runner.AndroidJUnitRunner | tee "$kd_output/instrumentation.txt"
kd_result=${PIPESTATUS[0]}
set -e
test "$kd_result" = 0
grep -q 'OK (1 test)' "$kd_output/instrumentation.txt"
adb logcat -d -s KdUmpRegion | grep -E "verified region=$KD_REGION (required=true visible=true native_form_displayed=true|required=false visible=false native_form_displayed=false)"
