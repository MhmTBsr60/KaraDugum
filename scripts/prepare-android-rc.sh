#!/usr/bin/env bash
set -euo pipefail

case "${KD_ADS_MODE:?}" in
  test|live) ;;
  *) echo 'Choose test or live for the release-candidate build' >&2; exit 1 ;;
esac
[[ "${KD_VERSION_CODE:?}" =~ ^[0-9]+$ ]] && (( KD_VERSION_CODE > 110 ))
test -n "${KD_VERSION_NAME:?}"

mkdir -p app/src/main/{assets,res/drawable-nodpi,res/values,java/com/orynexa/karadugum}
node scripts/configure-ads.cjs app/kd-ads.json
cp ./*.java app/src/main/java/com/orynexa/karadugum/
cp AndroidManifest.xml app/src/main/AndroidManifest.xml
cp icon.png app/src/main/res/drawable-nodpi/karadugum_icon.png
printf '<resources><string name="game_services_project_id">1097423047801</string></resources>\n' > app/src/main/res/values/strings.xml
python3 scripts/verify-rc-assets.py --stage app/src/main/assets

if [[ "$KD_ADS_MODE" == test ]]; then
  sed -i 's/android:label="KARA DÜĞÜM"/android:label="KARA DÜĞÜM TEST"/' app/src/main/AndroidManifest.xml
  mkdir -p app/src/androidTest/java/com/orynexa/karadugum
  cp tests/android/PocoEnergyUpgradeAudit.java app/src/androidTest/java/com/orynexa/karadugum/
  cp tests/android/AndroidManifest.xml app/src/androidTest/AndroidManifest.xml
fi

cat > settings.gradle <<'GRADLE'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories { google(); mavenCentral() }
}
rootProject.name = 'KaraDugum'
include ':app'
GRADLE

cat > build.gradle <<'GRADLE'
plugins {
  id 'com.android.application' version '8.13.2' apply false
}
GRADLE

cat > app/build.gradle <<'GRADLE'
plugins {
  id 'com.android.application'
}
def ads = new groovy.json.JsonSlurper().parse(file('kd-ads.json'))
android {
  buildFeatures { buildConfig true }
  testBuildType 'release'
  namespace 'com.orynexa.karadugum'
  compileSdk 36
  defaultConfig {
    applicationId 'com.orynexa.karadugum'
    testInstrumentationRunner 'androidx.test.runner.AndroidJUnitRunner'
    minSdk 24
    targetSdk 36
    versionCode Integer.parseInt(System.getenv('KD_VERSION_CODE'))
    versionName System.getenv('KD_VERSION_NAME')
    buildConfigField 'boolean', 'ADS_TEST_MODE', String.valueOf(ads.mode == 'test')
    buildConfigField 'String', 'REWARDED_AD_UNIT_ID', groovy.json.JsonOutput.toJson(ads.rewardedUnitId)
    buildConfigField 'String', 'INTERSTITIAL_AD_UNIT_ID', groovy.json.JsonOutput.toJson(ads.interstitialUnitId)
  }
  signingConfigs {
    release {
      storeFile file('karadugum.jks')
      storePassword System.getenv('KEYSTORE_PASSWORD')
      keyAlias System.getenv('KEY_ALIAS')
      keyPassword System.getenv('KEY_PASSWORD')
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled false
    }
  }
}
if (ads.mode == 'test') {
  dependencies {
    androidTestImplementation 'androidx.test:runner:1.6.2'
    androidTestImplementation 'androidx.test:core:1.6.1'
    androidTestImplementation 'androidx.test.ext:junit:1.2.1'
  }
}
apply from: rootProject.file('android-dependencies.gradle')
GRADLE
