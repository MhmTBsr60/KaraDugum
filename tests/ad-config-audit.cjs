'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{configure}=require('../scripts/configure-ads.cjs');
const rewarded='ca-app-pub-6340528165840202/1111111111',interstitial='ca-app-pub-6340528165840202/2222222222';
const units=require('../admob-units.json');assert.equal(configure({KD_ADS_MODE:'live'}).rewardedUnitId,units.rewardedUnitId);assert.equal(configure({KD_ADS_MODE:'live'}).interstitialUnitId,units.interstitialUnitId);
const live={KD_ADS_MODE:'live',ADMOB_REWARDED_AD_UNIT_ID:rewarded,ADMOB_INTERSTITIAL_AD_UNIT_ID:interstitial};
assert.equal(configure({}).mode,'test');assert(configure({}).rewardedUnitId.includes('3940256099942544'));
assert.deepEqual(configure(live),{mode:'live',applicationId:'ca-app-pub-6340528165840202~8704733869',rewardedUnitId:rewarded,interstitialUnitId:interstitial});
for(const env of [
 {KD_ADS_MODE:'invalid'}, {KD_ADS_MODE:'live'}, {...live,ADMOB_REWARDED_AD_UNIT_ID:''},
 {...live,ADMOB_INTERSTITIAL_AD_UNIT_ID:'ca-app-pub-6340528165840202~8704733869'},
 {...live,ADMOB_REWARDED_AD_UNIT_ID:'ca-app-pub-3940256099942544/5224354917'},
 {...live,ADMOB_INTERSTITIAL_AD_UNIT_ID:'ca-app-pub-9999999999999999/2222222222'},
 {...live,ADMOB_INTERSTITIAL_AD_UNIT_ID:rewarded}, {...live,ADMOB_REWARDED_AD_UNIT_ID:rewarded+' '}
])assert.throws(()=>configure(env,{}),'Invalid live configuration must stop the build');
const workflow=fs.readFileSync('.github/workflows/android-apk.yml','utf8'),java=fs.readFileSync('MainActivity.java','utf8');
assert(workflow.includes('user-messaging-platform:4.0.0'));
for(const file of ['privacy-policy.html','privacy-settings.js','AdConsentGate.java'])assert(workflow.includes('cp '+file+' app/src/main/'),'APK missing '+file);
for(const name of ['REWARDED_AD_UNIT_ID','INTERSTITIAL_AD_UNIT_ID'])assert(java.includes('BuildConfig.'+name));
assert(!java.includes('3940256099942544'),'Main activity must not hard-code sample units');
for(const method of ['loadRewarded()','showRewarded(final String purpose, final String rewardOwner)','loadInterstitial()','onLevelCompletedForAds(int level)']){
 const start=java.indexOf('private void '+method),end=java.indexOf('\n    private ',start+1);assert(start>=0);assert(java.slice(start,end<0?undefined:end).includes('!adsAllowed()'),method+' must check UMP permission');
}
assert(java.includes('generation != adGeneration || !adsAllowed()'),'Late ad-load callbacks must not restore stale ads');
assert(java.includes('policy.getSettings().setJavaScriptEnabled(false)'),'Policy viewer must not run scripts');
assert(java.includes('consentGate.destroy()'),'Consent callbacks must stop with the activity');
console.log('PASS: explicit test/live ad builds; absent/malformed/sample/wrong-publisher/duplicate units rejected; UMP permission checks, stale ad guards and offline policy packaging');
