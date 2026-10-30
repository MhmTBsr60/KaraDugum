'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{configure}=require('../scripts/configure-ads.cjs'),{stage}=require('../scripts/stage-release.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'kd-release-'));
function fixture(mode){const config=configure({KD_ADS_MODE:mode}),generated=`package com.orynexa.karadugum;
public final class BuildConfig {public static final String APPLICATION_ID = "com.orynexa.karadugum";
public static final String VERSION_NAME = "6.36";public static final int VERSION_CODE = 96;
public static final boolean ADS_TEST_MODE = ${mode==='test'};
public static final String REWARDED_AD_UNIT_ID = "${config.rewardedUnitId}";
public static final String INTERSTITIAL_AD_UNIT_ID = "${config.interstitialUnitId}";}`;
 for(const [file,content]of Object.entries({'app/kd-ads.json':JSON.stringify(config),'app/build/generated/source/buildConfig/release/com/orynexa/karadugum/BuildConfig.java':generated,'app/build/outputs/apk/release/app-release.apk':'fixture-apk-'+mode,'app/build/outputs/bundle/release/app-release.aab':'fixture-aab-'+mode})){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),content);}return {config,generated};}
try{
 for(const mode of ['test','live']){fixture(mode);const result=stage({root,version:'6.36',code:96,commit:'fixture-sha'});assert.equal(result.adsMode,mode);assert.equal(result.versionCode,96);for(const [extension,data]of Object.entries(result.files)){assert(data.file.includes('-'+mode.toUpperCase()+'.'));const bytes=fs.readFileSync(path.join(root,'dist',mode,data.file));assert.equal(bytes.toString(),'fixture-'+extension+'-'+mode);assert.equal(data.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));}}
 assert.equal(fs.readFileSync(path.join(root,'dist/test/KaraDugum-v6.36-TEST.apk'),'utf8'),'fixture-apk-test','Live staging must not overwrite the test package');
 const live=fixture('live');fs.writeFileSync(path.join(root,'app/kd-ads.json'),JSON.stringify(configure({KD_ADS_MODE:'test'})));assert.throws(()=>stage({root,version:'6.36',code:96}),/Generated APK configuration mismatch/,'Wrong-mode generated code cannot be labelled as a test release');
 fixture('live');assert.throws(()=>stage({root,version:'6.36',code:95}),/version code/);assert.throws(()=>stage({root,version:'6.35',code:96}),/VERSION_NAME/);assert.throws(()=>stage({root,version:'../6.36',code:96}),/version/);
 fs.writeFileSync(path.join(root,'app/kd-ads.json'),JSON.stringify({...live.config,rewardedUnitId:'invalid'}));assert.throws(()=>stage({root,version:'6.36',code:96}));fixture('test');fs.writeFileSync(path.join(root,'app/build/outputs/bundle/release/app-release.aab'),'');assert.throws(()=>stage({root,version:'6.36',code:96}),/Empty Android output/);
 console.log('PASS: test/live release separation, compiled configuration and version validation, content hashes, stale-mode rejection and empty-output protection');
}finally{fs.rmSync(root,{recursive:true,force:true});}
