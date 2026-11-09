#!/usr/bin/env bash
set -euo pipefail
kd_mode="${1:?Ad mode required}"
kd_version="${2:?Version name required}"
kd_code="${3:?Version code required}"
kd_bundletool="${4:?Verified bundletool JAR required}"
[[ "$kd_mode" == test || "$kd_mode" == live ]]
kd_report_dir="build/reports/manifests/$kd_mode"
kd_aab="app/build/outputs/bundle/release/app-release.aab"
kd_merged="app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml"
test -s "$kd_bundletool"
test -s "$kd_merged"
test -s "$kd_aab"
mkdir -p "$kd_report_dir"
cp "$kd_merged" "$kd_report_dir/merged-manifest.xml"
java -jar "$kd_bundletool" validate --bundle="$kd_aab" > "$kd_report_dir/bundle-validation.txt"
java -jar "$kd_bundletool" dump manifest --bundle="$kd_aab" --module=base > "$kd_report_dir/bundle-manifest.xml"
python3 scripts/verify-android-manifests.py \
  --merged "$kd_report_dir/merged-manifest.xml" \
  --bundle "$kd_report_dir/bundle-manifest.xml" \
  --aab "$kd_aab" --version "$kd_version" --code "$kd_code" \
  --out "$kd_report_dir/manifest-verification.json"
