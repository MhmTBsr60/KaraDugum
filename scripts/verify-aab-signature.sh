#!/usr/bin/env bash
set -euo pipefail
kd_aab_path="${1:?AAB path required}"
kd_expected_path="${2:?Expected certificate SHA-256 file required}"
test -s "$kd_aab_path"
jarsigner -verify "$kd_aab_path"
kd_actual=$(keytool -printcert -jarfile "$kd_aab_path" -rfc | openssl x509 -noout -fingerprint -sha256 | cut -d= -f2 | tr -d '[:space:]:' | tr '[:upper:]' '[:lower:]')
kd_expected=$(tr -d '[:space:]:' < "$kd_expected_path" | tr '[:upper:]' '[:lower:]')
[[ "$kd_expected" =~ ^[a-f0-9]{64}$ ]] && test "$kd_actual" = "$kd_expected"
echo 'AAB imzasi dogrulandi.'
