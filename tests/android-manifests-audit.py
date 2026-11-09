#!/usr/bin/env python3
"""Regression fixtures for actual merged/AAB XML release manifest proofs."""

import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from xml.sax.saxutils import quoteattr


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "verify-android-manifests.py"
sys.dont_write_bytecode = True
SPEC = importlib.util.spec_from_file_location("kd_android_manifest_verifier", SCRIPT)
CHECKER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECKER)

# Intentionally independent fixture values: changes to the verifier's production
# constants must not silently change the expected Android/application contract.
ANDROID = "http://schemas.android.com/apk/res/android"
TOOLS = "http://schemas.android.com/tools"
PACKAGE = "com.orynexa.karadugum"
PERMISSION = "com.google.android.gms.permission.AD_ID"
METADATA = "com.google.android.gms.ads.APPLICATION_ID"
ADMOB = "ca-app-pub-6340528165840202~8704733869"


def fixture(version="6.42", code="102", package=PACKAGE, min_sdk="24", target_sdk="36",
            android="android", tools="tools", android_uri=ANDROID, permission=None,
            metadata=None, sdk=None, application=None, extra="", root="manifest"):
    if permission is None:
        permission = '<uses-permission {}:name={} />'.format(android, quoteattr(PERMISSION))
    if metadata is None:
        metadata = '<meta-data {0}:name={1} {0}:value={2} />'.format(android, quoteattr(METADATA), quoteattr(ADMOB))
    if sdk is None:
        sdk = '<uses-sdk {0}:minSdkVersion={1} {0}:targetSdkVersion={2} />'.format(android, quoteattr(min_sdk), quoteattr(target_sdk))
    if application is None:
        application = '<application android:label="Kara Düğüm">{}</application>'.format(metadata).replace("android:label", android + ":label")
    return ('<{root} xmlns:{android}={android_uri} xmlns:{tools}={tools_uri} package={package} '
            '{android}:versionName={version} {android}:versionCode={code}>\n'
            '{sdk}\n{permission}\n{application}\n{extra}\n</{root}>').format(
                root=root, android=android, tools=tools, android_uri=quoteattr(android_uri), tools_uri=quoteattr(TOOLS),
                package=quoteattr(package), version=quoteattr(version), code=quoteattr(code),
                sdk=sdk, permission=permission, application=application, extra=extra)


class AndroidManifestAudit(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="kd-manifest-audit-")
        self.directory = Path(self.temporary.name)
        self.merged = self.directory / "actual-merged.xml"
        self.bundle = self.directory / "bundletool-base.xml"
        self.aab = self.directory / "actual-release.aab"
        self.out = self.directory / "proof.json"
        # The helper hashes this artifact only; official bundletool owns decoding.
        self.aab.write_bytes(b"fixture artifact bytes\x00\x01\xff")
        self.write_pair()

    def tearDown(self):
        self.temporary.cleanup()

    def write_pair(self, merged=None, bundle=None):
        self.merged.write_text(fixture() if merged is None else merged, encoding="utf-8")
        self.bundle.write_text(fixture() if bundle is None else bundle, encoding="utf-8")

    def verify(self, **options):
        return CHECKER.verify_manifests(self.merged, self.bundle,
                                        options.get("version", "6.42"), options.get("code", 102), options.get("aab"))

    def rejects_both(self, xml, message):
        self.write_pair(xml, xml)
        report = self.verify()
        self.assertEqual(report["status"], "failed")
        for proof in report["proofs"].values():
            self.assertFalse(proof["valid"])
            self.assertIn(message, "\n".join(proof["errors"]))
        return report

    def cli(self, *extra, version="6.42", code="102", out=None, aab=True):
        arguments = [sys.executable, str(SCRIPT), "--merged", str(self.merged), "--bundle", str(self.bundle),
                     "--version", version, "--code", code, "--out", str(self.out if out is None else out)]
        if aab:
            arguments.extend(["--aab", str(self.aab)])
        return subprocess.run(arguments + list(extra), capture_output=True, text=True, check=False)

    def test_valid_proofs_capture_exact_bytes_identity_and_contract(self):
        original = (self.merged.read_bytes(), self.bundle.read_bytes())
        report = self.verify(aab=self.aab)
        self.assertEqual(report["schemaVersion"], 1)
        self.assertEqual(report["status"], "passed")
        self.assertEqual(report["errors"], [])
        self.assertEqual(report["expected"], {
            "packageName": PACKAGE, "versionName": "6.42", "versionCode": 102,
            "minSdkVersion": 24, "targetSdkVersion": 36,
            "adIdPermission": PERMISSION, "adMobApplicationId": ADMOB,
        })
        for kind, file in (("merged", self.merged), ("bundle", self.bundle)):
            proof = report["proofs"][kind]
            self.assertTrue(proof["valid"])
            self.assertEqual(proof["filename"], file.name)
            self.assertEqual(proof["path"], str(file.resolve()))
            self.assertEqual(proof["sha256"], hashlib.sha256(file.read_bytes()).hexdigest())
            self.assertEqual(proof["bytes"], len(file.read_bytes()))
            self.assertEqual(proof["identity"], {"packageName": PACKAGE, "versionName": "6.42", "versionCode": 102})
            self.assertEqual(proof["sdk"], {"minSdkVersion": 24, "targetSdkVersion": 36})
            self.assertEqual(proof["adIdPermission"], {
                "name": PERMISSION, "declarationCount": 1, "directDeclarationCount": 1,
                "uncapped": True, "removalDirective": False,
            })
            self.assertEqual(proof["adMobApplicationId"], ADMOB)
        self.assertEqual(report["aabFilename"], self.aab.name)
        self.assertEqual(report["aabPath"], str(self.aab.resolve()))
        self.assertEqual(report["aabSha256"], hashlib.sha256(self.aab.read_bytes()).hexdigest())
        self.assertEqual(report["aabBytes"], len(self.aab.read_bytes()))
        self.assertEqual((self.merged.read_bytes(), self.bundle.read_bytes()), original)

    def test_future_release_is_supplied_by_caller(self):
        self.write_pair(fixture(version="7.10-beta", code="212"), fixture(version="7.10-beta", code="212"))
        report = self.verify(version="7.10-beta", code=212)
        self.assertEqual(report["status"], "passed")
        self.assertEqual(report["expected"]["versionCode"], 212)
        self.assertIsNone(report["aabSha256"])
        self.assertIsNone(report["aabBytes"])

    def test_namespace_prefixes_and_utf16_are_not_text_matched(self):
        xml = fixture(android="a", tools="merge")
        self.write_pair(xml, xml)
        self.bundle.write_bytes(xml.encode("utf-16"))
        report = self.verify()
        self.assertEqual(report["status"], "passed")
        self.assertNotEqual(report["proofs"]["merged"]["sha256"], report["proofs"]["bundle"]["sha256"])
        self.assertEqual(report["proofs"]["merged"]["identity"], report["proofs"]["bundle"]["identity"])

    def test_wrong_android_namespace_and_unqualified_permission_cannot_supply_proof(self):
        self.rejects_both(fixture(android_uri="https://example.invalid/android"), "Missing direct-root")
        self.rejects_both(fixture(permission='<uses-permission name="{}"/>'.format(PERMISSION)), "Missing direct-root")
        self.rejects_both(fixture(permission='<uses-permission xmlns:a="urn:wrong" a:name="{}"/>'.format(PERMISSION)), "Missing direct-root")

    def test_missing_comment_nested_and_sdk_only_permission_are_rejected(self):
        valid_permission = '<uses-permission android:name="{}"/>'.format(PERMISSION)
        variants = ["", "<!-- {} -->".format(valid_permission),
                    '<uses-permission-sdk-23 android:name="{}"/>'.format(PERMISSION),
                    '<uses-permission-sdk-m android:name="{}"/>'.format(PERMISSION)]
        for permission in variants:
            with self.subTest(permission=permission):
                self.rejects_both(fixture(permission=permission), "Missing direct-root")
        app = '<application>{}<meta-data android:name="{}" android:value="{}"/></application>'.format(valid_permission, METADATA, ADMOB)
        self.rejects_both(fixture(permission="", application=app), "Missing direct-root")

    def test_every_cap_is_rejected_even_empty_or_hidden_beside_valid_permission(self):
        for value in ("32", "0", "", "99"):
            bad = '<uses-permission android:name="{}" android:maxSdkVersion={}/>'.format(PERMISSION, quoteattr(value))
            with self.subTest(value=value):
                self.rejects_both(fixture(permission=bad), "must not declare android:maxSdkVersion")
                self.rejects_both(fixture(extra=bad), "must not declare android:maxSdkVersion")
        for tag in ("uses-permission-sdk-23", "uses-permission-sdk-m"):
            bad = '<{} android:name="{}" android:maxSdkVersion="32"/>'.format(tag, PERMISSION)
            self.rejects_both(fixture(extra=bad), "must not declare android:maxSdkVersion")

    def test_removal_directives_in_any_ad_id_declaration_are_rejected(self):
        for directive in ("remove", " remove ", "removeAll"):
            bad = '<uses-permission a:name="{}" merge:node={}/>'.format(PERMISSION, quoteattr(directive))
            with self.subTest(directive=directive):
                self.rejects_both(fixture(android="a", tools="merge", permission=bad), "tools:node=remove")
                self.rejects_both(fixture(android="a", tools="merge", extra=bad), "tools:node=remove")
                nested = '<application>{}<meta-data a:name="{}" a:value="{}"/></application>'.format(bad, METADATA, ADMOB)
                self.rejects_both(fixture(android="a", tools="merge", application=nested), "tools:node=remove")
        sdk_bad = '<uses-permission-sdk-23 android:name="{}" tools:node="remove"/>'.format(PERMISSION)
        self.rejects_both(fixture(extra=sdk_bad), "tools:node=remove")

    def test_equivalent_duplicates_and_unrelated_caps_are_unambiguous(self):
        duplicate = '<uses-permission android:name="{}"/>'.format(PERMISSION)
        unrelated = '<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" tools:node="remove"/>'
        self.write_pair(fixture(extra=duplicate + unrelated), fixture(extra=duplicate + unrelated))
        report = self.verify()
        self.assertEqual(report["status"], "passed")
        for proof in report["proofs"].values():
            self.assertEqual(proof["adIdPermission"]["declarationCount"], 2)
            self.assertEqual(proof["adIdPermission"]["directDeclarationCount"], 2)
            self.assertTrue(proof["adIdPermission"]["uncapped"])

    def test_identity_mismatch_in_either_proof_cannot_hide_behind_the_other(self):
        for option, value, error in (("package", "com.other.game", "packageName mismatch"),
                                     ("version", "6.41", "versionName mismatch"),
                                     ("code", "101", "versionCode mismatch")):
            for kind in ("merged", "bundle"):
                with self.subTest(option=option, kind=kind):
                    values = {"merged": fixture(), "bundle": fixture()}
                    values[kind] = fixture(**{option: value})
                    self.write_pair(**values)
                    report = self.verify()
                    self.assertEqual(report["status"], "failed")
                    self.assertFalse(report["proofs"][kind]["valid"])
                    other = "bundle" if kind == "merged" else "merged"
                    self.assertTrue(report["proofs"][other]["valid"])
                    self.assertIn(error, "\n".join(report["proofs"][kind]["errors"]))

    def test_sdk_values_missing_duplicate_and_non_decimal_versions_fail(self):
        for options, error in (({"min_sdk": "23"}, "minSdkVersion mismatch"),
                               ({"min_sdk": "25"}, "minSdkVersion mismatch"),
                               ({"target_sdk": "35"}, "targetSdkVersion mismatch"),
                               ({"target_sdk": "37"}, "targetSdkVersion mismatch"),
                               ({"min_sdk": ""}, "decimal integer"),
                               ({"target_sdk": "VanillaIceCream"}, "decimal integer"),
                               ({"code": "not-a-number"}, "decimal integer"),
                               ({"code": ""}, "decimal integer"),
                               ({"sdk": ""}, "exactly one direct-root <uses-sdk>"),
                               ({"sdk": '<uses-sdk android:minSdkVersion="24"/>'}, "targetSdkVersion")):
            with self.subTest(options=options):
                self.rejects_both(fixture(**options), error)
        sdk = '<uses-sdk android:minSdkVersion="24" android:targetSdkVersion="36"/>'
        self.rejects_both(fixture(sdk=sdk + sdk), "exactly one direct-root <uses-sdk>")
        self.rejects_both(fixture(root="not-manifest"), "Root element must be <manifest>")

    def test_admob_application_metadata_must_be_unique_direct_and_literal(self):
        good = '<meta-data android:name="{}" android:value="{}"/>'.format(METADATA, ADMOB)
        self.rejects_both(fixture(application=""), "exactly one direct-root <application>")
        self.rejects_both(fixture(extra='<application>{}</application>'.format(good)), "exactly one direct-root <application>")
        for metadata in ("", "<!-- {} -->".format(good), good + good,
                         '<activity android:name=".MainActivity">{}</activity>'.format(good)):
            with self.subTest(metadata=metadata):
                self.rejects_both(fixture(metadata=metadata), "exactly one application AdMob")
        for value in ("", "ca-app-pub-3940256099942544~3347511713", "@string/admob_app_id"):
            metadata = '<meta-data android:name="{}" android:value={}/>'.format(METADATA, quoteattr(value))
            self.rejects_both(fixture(metadata=metadata), "AdMob application ID mismatch")
        for value_attr in ("", ' android:value="{}"'.format(ADMOB)):
            metadata = '<meta-data android:name="{}" android:resource="@string/admob_app_id"{}/>'.format(METADATA, value_attr)
            self.rejects_both(fixture(metadata=metadata), "without android:resource")
        self.rejects_both(fixture(metadata="", extra=good), "exactly one application AdMob")

    def test_malformed_or_unreadable_manifest_still_has_a_failure_proof(self):
        for xml in ("", "<manifest>", "<manifest></not-manifest>", '<manifest android:versionCode="102"/>',
                    '<?xml version="1.0" encoding="unknown-encoding"?><manifest/>'):
            with self.subTest(xml=xml):
                report = self.rejects_both(xml, "Malformed XML")
                self.assertEqual(report["proofs"]["merged"]["sha256"], hashlib.sha256(xml.encode()).hexdigest())
        self.write_pair()
        self.merged.unlink()
        report = self.verify()
        self.assertEqual(report["status"], "failed")
        self.assertTrue(report["proofs"]["bundle"]["valid"])
        self.assertIsNone(report["proofs"]["merged"]["sha256"])
        self.assertIn("Cannot read manifest", "\n".join(report["proofs"]["merged"]["errors"]))

    def test_missing_and_empty_aab_provenance_fail_without_losing_xml_proofs(self):
        self.aab.unlink()
        report = self.verify(aab=self.aab)
        self.assertEqual(report["status"], "failed")
        self.assertTrue(all(proof["valid"] for proof in report["proofs"].values()))
        self.assertIn("AAB: cannot read file", "\n".join(report["errors"]))
        self.aab.write_bytes(b"")
        report = self.verify(aab=self.aab)
        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["aabBytes"], 0)
        self.assertEqual(report["aabSha256"], hashlib.sha256(b"").hexdigest())
        self.assertIn("AAB: file is empty", report["errors"])

    def test_cli_success_and_failure_replace_report_without_a_false_pass(self):
        result = self.cli()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("PASS: merged + bundle Android 6.42 (102)", result.stdout)
        self.assertEqual(result.stderr, "")
        saved = json.loads(self.out.read_text())
        self.assertEqual(saved["status"], "passed")
        self.assertEqual(saved["aabSha256"], hashlib.sha256(self.aab.read_bytes()).hexdigest())
        self.bundle.write_text(fixture(permission=""))
        result = self.cli()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout, "")
        self.assertIn("bundle: Missing direct-root", result.stderr)
        saved = json.loads(self.out.read_text())
        self.assertEqual(saved["status"], "failed", "A previous successful JSON must not survive a failed verification")
        self.assertTrue(saved["proofs"]["merged"]["valid"])
        self.assertFalse(saved["proofs"]["bundle"]["valid"])
        self.assertEqual(saved["proofs"]["bundle"]["sha256"], hashlib.sha256(self.bundle.read_bytes()).hexdigest())

    def test_cli_reports_malformed_xml_missing_files_and_optional_aab(self):
        self.bundle.write_text("<broken>")
        result = self.cli(aab=False)
        self.assertEqual(result.returncode, 1)
        self.assertIn("Malformed XML", result.stderr)
        self.assertTrue(self.out.is_file())
        self.assertIsNone(json.loads(self.out.read_text())["aabSha256"])
        self.write_pair()
        self.merged.unlink()
        result = self.cli()
        self.assertEqual(result.returncode, 1)
        self.assertIn("Cannot read manifest", result.stderr)
        self.assertTrue(json.loads(self.out.read_text())["proofs"]["bundle"]["valid"])

    def test_cli_arguments_output_errors_and_input_preservation(self):
        for code in ("0", "-1", "abc", "1.5"):
            with self.subTest(code=code):
                result = self.cli(code=code)
                self.assertEqual(result.returncode, 2)
                self.assertEqual(result.stdout, "")
                self.assertIn("positive integer", result.stderr)
        result = self.cli(version=" ")
        self.assertEqual(result.returncode, 2)
        self.assertIn("non-empty", result.stderr)
        result = subprocess.run([sys.executable, str(SCRIPT)], capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 2)
        self.assertIn("required", result.stderr)
        for file in (self.merged, self.bundle, self.aab):
            with self.subTest(out=file):
                original = file.read_bytes()
                result = self.cli(out=file)
                self.assertEqual(result.returncode, 2)
                self.assertIn("must not overwrite", result.stderr)
                self.assertEqual(file.read_bytes(), original)
        result = self.cli(out=self.directory)
        self.assertEqual(result.returncode, 1)
        self.assertIn("cannot write JSON report", result.stderr)
        self.assertEqual(result.stdout, "")
        self.assertEqual(list(self.directory.glob("*.tmp")), [])

    def test_invalid_library_expectations_are_rejected(self):
        for options in ({"version": ""}, {"version": None}, {"code": "102"}, {"code": 0}, {"code": True}):
            with self.subTest(options=options):
                with self.assertRaises(ValueError):
                    self.verify(**options)


if __name__ == "__main__":
    unittest.main(verbosity=2)
