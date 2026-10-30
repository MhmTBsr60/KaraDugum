#!/usr/bin/env bash
set -euo pipefail
kd_apk_path="${1:?APK path required}"
kd_expected_path="${2:?Expected certificate SHA-256 file required}"
test -s "$kd_apk_path"
kd_sdk_path="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/usr/local/lib/android/sdk}}"
kd_signer_path=$(find "$kd_sdk_path/build-tools" -type f -name apksigner | sort -V | tail -n 1)
test -n "$kd_signer_path"
kd_cert_path=$(mktemp)
trap 'rm -f "$kd_cert_path"' EXIT
"$kd_signer_path" verify --print-certs "$kd_apk_path" | tee "$kd_cert_path"
kd_actual=$(awk -F': ' '/certificate SHA-256 digest:/{print $NF;exit}' "$kd_cert_path" | tr -d '[:space:]:' | tr '[:upper:]' '[:lower:]')
kd_expected=$(tr -d '[:space:]:' < "$kd_expected_path" | tr '[:upper:]' '[:lower:]')
[[ "$kd_expected" =~ ^[a-f0-9]{64}$ ]] && test "$kd_actual" = "$kd_expected"
echo 'APK imzasi dogrulandi.'
