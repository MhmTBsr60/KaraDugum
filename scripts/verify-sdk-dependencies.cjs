'use strict';

const fs = require('node:fs');

// Keep these explicit: CI verifies the resolved graph, rather than trusting the
// declarations in a build file or a successful compilation alone.
const SDK_PINS = Object.freeze({
  'androidx.fragment:fragment': '1.9.1',
  'com.google.android.ump:user-messaging-platform': '4.0.0',
  'com.google.android.gms:play-services-ads': '25.5.0',
  'com.google.android.gms:play-services-games-v2': '22.1.0'
});
const RELEASE = Object.freeze({
  applicationId: 'com.orynexa.karadugum',
  versionName: '6.44',
  versionCode: 104,
  minSdk: 24,
  targetSdk: 36,
  compileSdk: 36
});
const PART = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;
const VERSION = /^\d[0-9A-Za-z._-]*$/;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function selectedCoordinate(value) {
  if (typeof value !== 'string') return null;
  const parts = value.split(':');
  return parts.length === 3 && PART.test(parts[0]) && PART.test(parts[1]) && VERSION.test(parts[2]) ? parts : null;
}

function verify(report) {
  check(isObject(report), 'Dependency report must be a JSON object');
  check(report.schemaVersion === 1, 'Unsupported dependency report schemaVersion; expected 1');
  for (const [key, expected] of Object.entries(RELEASE)) {
    check(report[key] === expected, `Dependency report ${key} mismatch: expected ${expected}`);
  }
  check(Array.isArray(report.modules) && report.modules.length > 0, 'Dependency report modules must be a non-empty array');
  check(Array.isArray(report.edges), 'Dependency report edges must be an array');

  const modules = new Map();
  const coordinates = new Set();
  for (const item of report.modules) {
    check(isObject(item) && typeof item.group === 'string' && PART.test(item.group) &&
      typeof item.name === 'string' && PART.test(item.name) &&
      typeof item.version === 'string' && VERSION.test(item.version), 'Invalid or unresolved module in dependency report');
    const key = `${item.group}:${item.name}`;
    check(!modules.has(key), `Duplicate resolved module: ${key}`);
    modules.set(key, item.version);
    coordinates.add(`${key}:${item.version}`);
  }

  for (const [key, expected] of Object.entries(SDK_PINS)) {
    check(modules.has(key), `Missing required SDK: ${key}`);
    check(modules.get(key) === expected, `Resolved SDK mismatch: ${key} must be ${expected}, received ${modules.get(key)}`);
  }

  for (const edge of report.edges) {
    check(isObject(edge) && typeof edge.from === 'string' && edge.from.trim().length > 0 &&
      typeof edge.requested === 'string' && edge.requested.trim().length > 0 &&
      typeof edge.constraint === 'boolean', 'Invalid dependency edge in report');
    // A legacy transitive request is safe when Gradle actually selected the
    // maintained version. Only selected coordinates must be exact resolved GAVs.
    check(selectedCoordinate(edge.selected) !== null, 'Invalid or unresolved selected dependency edge');
    check(coordinates.has(edge.selected), `Selected dependency missing from modules: ${edge.selected}`);
  }

  return {
    ...RELEASE,
    schemaVersion: 1,
    sdkVersions: Object.fromEntries(Object.keys(SDK_PINS).map(key => [key, modules.get(key)])),
    moduleCount: modules.size,
    edgeCount: report.edges.length
  };
}

function main(argv = process.argv.slice(2)) {
  check(argv.length === 1, 'Usage: node scripts/verify-sdk-dependencies.cjs <resolved-dependencies.json>');
  const summary = verify(JSON.parse(fs.readFileSync(argv[0], 'utf8')));
  const versions = Object.entries(summary.sdkVersions).map(([key, version]) => `${key.split(':')[1]}=${version}`).join(', ');
  console.log(`PASS: Android ${summary.versionName} (${summary.versionCode}), ${summary.moduleCount} resolved modules; ${versions}`);
  return summary;
}

module.exports = { verify, SDK_PINS, RELEASE, main };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`SDK dependency verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
