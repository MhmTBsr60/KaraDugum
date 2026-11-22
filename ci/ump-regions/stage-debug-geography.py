"""Apply SDK test geography to the emulator-only APK staged by the CI job."""
from pathlib import Path

activity = Path("app/src/main/java/com/orynexa/karadugum/MainActivity.java")
source = activity.read_text()
start = """                information.requestConsentInfoUpdate(MainActivity.this, new ConsentRequestParameters.Builder()
                    .setTagForUnderAgeOfConsent(audience.restrictedAds()).build(),
                    success::run, error -> failure.complete(error.getMessage()));"""
replacement = """                String region = getIntent().getStringExtra("kdUmpRegion");
                if (!BuildConfig.ADS_TEST_MODE || !("eea".equals(region) || "us".equals(region))) {
                    throw new IllegalStateException("Emulator-only UMP audit requires an explicit region");
                }
                int geography = "eea".equals(region)
                    ? com.google.android.ump.ConsentDebugSettings.DebugGeography.DEBUG_GEOGRAPHY_EEA
                    : com.google.android.ump.ConsentDebugSettings.DebugGeography.DEBUG_GEOGRAPHY_REGULATED_US_STATE;
                com.google.android.ump.ConsentDebugSettings debug =
                    new com.google.android.ump.ConsentDebugSettings.Builder(MainActivity.this)
                        .setForceTesting(true).setDebugGeography(geography).build();
                information.requestConsentInfoUpdate(MainActivity.this, new ConsentRequestParameters.Builder()
                    .setTagForUnderAgeOfConsent(audience.restrictedAds()).setConsentDebugSettings(debug).build(),
                    () -> {
                        Log.i("KdUmpRegion", "update_ok region=" + region + " privacy="
                            + information.getPrivacyOptionsRequirementStatus() + " consent="
                            + information.getConsentStatus() + " formAvailable=" + information.isConsentFormAvailable());
                        success.run();
                    }, error -> {
                        Log.w("KdUmpRegion", "update_failed region=" + region + " code="
                            + error.getErrorCode() + " message=" + error.getMessage());
                        failure.complete(error.getMessage());
                    });"""
assert source.count(start) == 1
activity.write_text(source.replace(start, replacement))
gradle = Path("app/build.gradle")
source = gradle.read_text()
assert source.count("testBuildType 'release'") == 1
gradle.write_text(source.replace("testBuildType 'release'", "testBuildType 'debug'"))
