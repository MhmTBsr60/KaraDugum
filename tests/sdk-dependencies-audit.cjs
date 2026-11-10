'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { verify, SDK_PINS, RELEASE } = require('../scripts/verify-sdk-dependencies.cjs');

function fixture() {
  return {
    schemaVersion: 1,
    ...RELEASE,
    modules: Object.entries(SDK_PINS).map(([key, version]) => {
      const [group, name] = key.split(':');
      return { group, name, version };
    }).concat([{ group: 'com.google.android.gms', name: 'play-services-basement', version: '18.9.0' }]),
    edges: [
      { from: 'com.google.android.gms:play-services-basement:18.9.0', requested: 'androidx.fragment:fragment:1.1.0', selected: 'androidx.fragment:fragment:1.9.1', constraint: false },
      { from: 'com.orynexa.karadugum:app:6.46', requested: 'androidx.fragment:fragment:1.9.1', selected: 'androidx.fragment:fragment:1.9.1', constraint: true }
    ]
  };
}

function rejects(edit, pattern) {
  const report = fixture();
  edit(report);
  assert.throws(() => verify(report), pattern);
}

const accepted = fixture();
const original = JSON.stringify(accepted);
const summary = verify(accepted);
assert.equal(summary.moduleCount, 5);
assert.equal(summary.edgeCount, 2);
assert.equal(summary.versionName, '6.46');
assert.equal(summary.versionCode, 106);
assert.deepEqual(summary.sdkVersions, SDK_PINS);
assert.equal(JSON.stringify(accepted), original, 'Verification must not alter the exported graph');
assert.equal(verify({ ...fixture(), edges: [] }).edgeCount, 0, 'Small fixtures do not need a complete graph');

assert.throws(() => verify(null), /JSON object/);
assert.throws(() => verify([]), /JSON object/);
rejects(r => { r.schemaVersion = 2; }, /schemaVersion/);
rejects(r => { r.schemaVersion = '1'; }, /schemaVersion/);
for (const [key, bad] of Object.entries({ applicationId: 'com.other.game', versionName: '6.45', versionCode: 105, minSdk: 25, targetSdk: 35, compileSdk: 35 })) {
  rejects(r => { r[key] = bad; }, new RegExp(key), `${key} mismatch must fail`);
}
rejects(r => { r.minSdk = 23; }, /minSdk/);
rejects(r => { r.versionCode = '106'; }, /versionCode/);
rejects(r => { r.modules = []; }, /non-empty array/);
rejects(r => { r.modules = {}; }, /non-empty array/);
rejects(r => { r.edges = null; }, /edges must be an array/);

for (const [key, pin] of Object.entries(SDK_PINS)) {
  rejects(r => { r.modules = r.modules.filter(m => `${m.group}:${m.name}` !== key); }, /Missing required SDK/);
  rejects(r => { r.modules.find(m => `${m.group}:${m.name}` === key).version = pin === '1.9.1' ? '1.1.0' : '1.0.0'; }, /Resolved SDK mismatch/);
}
rejects(r => { r.modules.push({ ...r.modules[0] }); }, /Duplicate resolved module/);
rejects(r => { r.modules.push({ ...r.modules[0], version: '1.1.0' }); }, /Duplicate resolved module/);
rejects(r => { r.modules.push({ group: 'androidx.core', name: 'core', version: '1.+' }); }, /Invalid or unresolved module/);
rejects(r => { r.modules.push({ group: 'androidx.core', name: 'core', version: '[1.0,2.0)' }); }, /Invalid or unresolved module/);
rejects(r => { r.modules.push({ group: 'androidx.core', name: 'core', version: 'unresolved' }); }, /Invalid or unresolved module/);
rejects(r => { r.modules.push(null); }, /Invalid or unresolved module/);
rejects(r => { r.modules[0].group = 'androidx.fragment:fragment'; }, /Invalid or unresolved module/);

rejects(r => { r.edges.push({ from: ':app', requested: 'missing:dependency:1.0', selected: null, constraint: false }); }, /unresolved selected/);
rejects(r => { r.edges[0].selected = 'androidx.fragment:fragment:1.1.0'; }, /missing from modules/);
rejects(r => { r.edges[0].selected = 'androidx.fragment:fragment:1.+'; }, /unresolved selected/);
rejects(r => { r.edges[0].constraint = 'false'; }, /Invalid dependency edge/);
rejects(r => { r.edges[0].requested = ''; }, /Invalid dependency edge/);
rejects(r => { r.edges[0].from = ' '; }, /Invalid dependency edge/);
rejects(r => { r.edges.push(null); }, /Invalid dependency edge/);
assert.equal(verify({ ...fixture(), edges: [{ from: ':app', requested: 'androidx.fragment:fragment:[1.9,2.0)', selected: 'androidx.fragment:fragment:1.9.1', constraint: false }] }).edgeCount, 1, 'An unresolved selector syntax is valid only on the requested side');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-sdk-report-'));
const cli = path.resolve(__dirname, '../scripts/verify-sdk-dependencies.cjs');
try {
  const reportFile = path.join(tmp, 'dependencies.json');
  fs.writeFileSync(reportFile, JSON.stringify(fixture()));
  let result = spawnSync(process.execPath, [cli, reportFile], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS: Android 6\.46 \(106\)/);
  assert.match(result.stdout, /fragment=1\.9\.1/);
  assert.match(result.stdout, /play-services-ads=25\.5\.0/);

  const old = fixture();
  old.modules[0].version = '1.1.0';
  fs.writeFileSync(reportFile, JSON.stringify(old));
  result = spawnSync(process.execPath, [cli, reportFile], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Resolved SDK mismatch/);
  assert.equal(result.stdout, '', 'Rejected graphs cannot print a passing result');

  fs.writeFileSync(reportFile, '{invalid json');
  result = spawnSync(process.execPath, [cli, reportFile], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SDK dependency verification failed/);
  result = spawnSync(process.execPath, [cli], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:/);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('PASS: resolved SDK pins, legacy request selection, release identity/API compatibility, duplicate/unresolved rejection and CLI failures');
