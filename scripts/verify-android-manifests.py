#!/usr/bin/env python3
"""Verify the merged manifest and the XML dumped from an actual release AAB.

The caller supplies both release numbers.  Manifest attributes are read by XML
namespace URI, never by prefix or textual matching.  Equivalent uncapped AD_ID
duplicates are allowed; any capped or removal declaration makes the proof fail.
An optional AAB is hashed as provenance, not decoded by this script.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import xml.etree.ElementTree as ET


ANDROID = "http://schemas.android.com/apk/res/android"
TOOLS = "http://schemas.android.com/tools"
APPLICATION_ID = "com.orynexa.karadugum"
MIN_SDK = 24
TARGET_SDK = 36
AD_ID_PERMISSION = "com.google.android.gms.permission.AD_ID"
ADMOB_METADATA = "com.google.android.gms.ads.APPLICATION_ID"
ADMOB_APPLICATION_ID = "ca-app-pub-6340528165840202~8704733869"
PERMISSION_TAGS = {"uses-permission", "uses-permission-sdk-23", "uses-permission-sdk-m"}


def android_attribute(element, name):
    return element.get("{" + ANDROID + "}" + name)


def _android_integer(element, name, errors, description):
    raw = android_attribute(element, name)
    if raw is None or not raw.isascii() or not raw.isdecimal():
        errors.append("{} must be a decimal integer; received {!r}".format(description, raw))
        return None
    return int(raw)


def _source_info(filename):
    path = Path(filename)
    return {"filename": path.name, "path": str(path.resolve()), "sha256": None, "bytes": None}


def inspect_manifest(filename, version_name, version_code):
    """Return parsed fields and all applicable errors for one XML file."""
    proof = {
        **_source_info(filename),
        "valid": False,
        "identity": {"packageName": None, "versionName": None, "versionCode": None},
        "sdk": {"minSdkVersion": None, "targetSdkVersion": None},
        "adIdPermission": {
            "name": AD_ID_PERMISSION,
            "declarationCount": 0,
            "directDeclarationCount": 0,
            "uncapped": False,
            "removalDirective": False,
        },
        "adMobApplicationId": None,
        "errors": [],
    }
    errors = proof["errors"]
    try:
        data = Path(filename).read_bytes()
    except OSError as error:
        errors.append("Cannot read manifest: {}".format(error))
        return proof
    proof["sha256"] = hashlib.sha256(data).hexdigest()
    proof["bytes"] = len(data)
    try:
        manifest = ET.fromstring(data)
    except (ET.ParseError, LookupError, ValueError) as error:
        errors.append("Malformed XML: {}".format(error))
        return proof

    if manifest.tag != "manifest":
        errors.append("Root element must be <manifest>; received {!r}".format(manifest.tag))

    identity = proof["identity"]
    identity["packageName"] = manifest.get("package")
    identity["versionName"] = android_attribute(manifest, "versionName")
    identity["versionCode"] = _android_integer(manifest, "versionCode", errors, "android:versionCode")
    for key, expected in (("packageName", APPLICATION_ID), ("versionName", version_name), ("versionCode", version_code)):
        if identity[key] != expected:
            errors.append("{} mismatch: expected {!r}, received {!r}".format(key, expected, identity[key]))

    sdk_nodes = [element for element in manifest if element.tag == "uses-sdk"]
    if len(sdk_nodes) != 1:
        errors.append("Expected exactly one direct-root <uses-sdk>; received {}".format(len(sdk_nodes)))
    if sdk_nodes:
        sdk = proof["sdk"]
        for key, expected in (("minSdkVersion", MIN_SDK), ("targetSdkVersion", TARGET_SDK)):
            sdk[key] = _android_integer(sdk_nodes[0], key, errors, "android:" + key)
            if sdk[key] != expected:
                errors.append("{} mismatch: expected {}, received {!r}".format(key, expected, sdk[key]))

    # A valid sibling must not conceal a capped/remove declaration elsewhere.
    ad_nodes = [element for element in manifest.iter()
                if element.tag in PERMISSION_TAGS and android_attribute(element, "name") == AD_ID_PERMISSION]
    direct_nodes = [element for element in manifest
                    if element.tag == "uses-permission" and android_attribute(element, "name") == AD_ID_PERMISSION]
    capped_nodes = [element for element in ad_nodes if "{" + ANDROID + "}maxSdkVersion" in element.attrib]
    removed_nodes = [element for element in ad_nodes
                     if element.get("{" + TOOLS + "}node", "").strip() in {"remove", "removeAll"}]
    proof["adIdPermission"].update({
        "declarationCount": len(ad_nodes),
        "directDeclarationCount": len(direct_nodes),
        "uncapped": bool(direct_nodes) and not capped_nodes,
        "removalDirective": bool(removed_nodes),
    })
    if not direct_nodes:
        errors.append("Missing direct-root <uses-permission android:name=\"{}\">".format(AD_ID_PERMISSION))
    if capped_nodes:
        errors.append("AD_ID permission must not declare android:maxSdkVersion ({} declaration(s))".format(len(capped_nodes)))
    if removed_nodes:
        errors.append("AD_ID permission must not declare tools:node=remove/removeAll ({} declaration(s))".format(len(removed_nodes)))

    applications = [element for element in manifest if element.tag == "application"]
    if len(applications) != 1:
        errors.append("Expected exactly one direct-root <application>; received {}".format(len(applications)))
    if applications:
        metadata = [element for element in applications[0]
                    if element.tag == "meta-data" and android_attribute(element, "name") == ADMOB_METADATA]
        if len(metadata) != 1:
            errors.append("Expected exactly one application AdMob APPLICATION_ID meta-data; received {}".format(len(metadata)))
        if metadata:
            value = android_attribute(metadata[0], "value")
            proof["adMobApplicationId"] = value
            if value != ADMOB_APPLICATION_ID:
                errors.append("AdMob application ID mismatch: expected {!r}, received {!r}".format(ADMOB_APPLICATION_ID, value))
            if "{" + ANDROID + "}resource" in metadata[0].attrib:
                errors.append("AdMob APPLICATION_ID must use a literal android:value without android:resource")

    proof["valid"] = not errors
    return proof


def verify_manifests(merged, bundle, version_name, version_code, aab=None):
    """Build a deterministic proof report; inspect both files even if one fails."""
    if not isinstance(version_name, str) or not version_name.strip():
        raise ValueError("Expected version name must be non-empty")
    if type(version_code) is not int or version_code < 1:
        raise ValueError("Expected version code must be a positive integer")
    proofs = {
        "merged": inspect_manifest(merged, version_name, version_code),
        "bundle": inspect_manifest(bundle, version_name, version_code),
    }
    errors = ["{}: {}".format(kind, error) for kind, proof in proofs.items() for error in proof["errors"]]
    report = {
        "schemaVersion": 1,
        "status": "failed" if errors else "passed",
        "expected": {
            "packageName": APPLICATION_ID,
            "versionName": version_name,
            "versionCode": version_code,
            "minSdkVersion": MIN_SDK,
            "targetSdkVersion": TARGET_SDK,
            "adIdPermission": AD_ID_PERMISSION,
            "adMobApplicationId": ADMOB_APPLICATION_ID,
        },
        "proofs": proofs,
        "aabFilename": None,
        "aabPath": None,
        "aabSha256": None,
        "aabBytes": None,
        "errors": errors,
    }
    if aab is not None:
        info = _source_info(aab)
        report.update({"aabFilename": info["filename"], "aabPath": info["path"]})
        try:
            digest = hashlib.sha256()
            size = 0
            with Path(aab).open("rb") as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(chunk)
                    size += len(chunk)
            report.update({"aabSha256": digest.hexdigest(), "aabBytes": size})
            if not size:
                errors.append("AAB: file is empty")
        except OSError as error:
            errors.append("AAB: cannot read file: {}".format(error))
        report["status"] = "failed" if errors else "passed"
    return report


def _positive_integer(value):
    try:
        parsed = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("must be a positive integer") from error
    if parsed < 1:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return parsed


def _version_name(value):
    if not value.strip():
        raise argparse.ArgumentTypeError("must be non-empty")
    return value


def _write_report(filename, report):
    destination = Path(filename)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=destination.parent,
                                         prefix=destination.name + ".", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(report, stream, ensure_ascii=False, indent=2, sort_keys=True)
            stream.write("\n")
        os.replace(temporary, destination)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--merged", required=True, type=Path, help="Actual merged AndroidManifest.xml")
    parser.add_argument("--bundle", required=True, type=Path, help="XML from official bundletool dump manifest on the actual AAB")
    parser.add_argument("--version", required=True, type=_version_name, help="Expected Android versionName")
    parser.add_argument("--code", required=True, type=_positive_integer, help="Expected Android versionCode")
    parser.add_argument("--aab", type=Path, help="Optional actual AAB to record its SHA-256 and byte count")
    parser.add_argument("--out", required=True, type=Path, help="JSON proof report, also written on verification failure")
    args = parser.parse_args(argv)
    inputs = [args.merged, args.bundle] + ([args.aab] if args.aab is not None else [])
    if any(args.out.resolve() == path.resolve() for path in inputs):
        parser.error("--out must not overwrite an input manifest or AAB")
    report = verify_manifests(args.merged, args.bundle, args.version, args.code, args.aab)
    try:
        _write_report(args.out, report)
    except OSError as error:
        print("Android manifest verification failed: cannot write JSON report: {}".format(error), file=sys.stderr)
        return 1
    if report["status"] != "passed":
        for error in report["errors"]:
            print("Android manifest verification failed: " + error, file=sys.stderr)
        return 1
    print("PASS: merged + bundle Android {} ({}), SDK {}/{}, uncapped AD_ID and AdMob application ID; report {}".format(
        args.version, args.code, MIN_SDK, TARGET_SDK, args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
