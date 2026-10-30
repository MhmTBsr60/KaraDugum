/* Keep test and live files distinct, and verify the generated build configuration. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{configure}=require('./configure-ads.cjs');
function stage({root=process.cwd(),version,code,commit=null}){
 if(typeof version!=='string'||!/^\d+\.\d+(?:\.\d+)?$/.test(version)||!Number.isSafeInteger(code)||code<1)throw Error('Release version and positive integer version code are required');
 const config=JSON.parse(fs.readFileSync(path.join(root,'app/kd-ads.json'),'utf8'));
 if(!['test','live'].includes(config.mode))throw Error('Release ad mode is invalid');
 const expected=configure({KD_ADS_MODE:config.mode,ADMOB_REWARDED_AD_UNIT_ID:config.rewardedUnitId,ADMOB_INTERSTITIAL_AD_UNIT_ID:config.interstitialUnitId});
 for(const key of Object.keys(expected))if(config[key]!==expected[key])throw Error('Release ad configuration mismatch: '+key);
 const generated=fs.readFileSync(path.join(root,'app/build/generated/source/buildConfig/release/com/orynexa/karadugum/BuildConfig.java'),'utf8');
 for(const [key,value]of Object.entries({APPLICATION_ID:'com.orynexa.karadugum',VERSION_NAME:version,REWARDED_AD_UNIT_ID:config.rewardedUnitId,INTERSTITIAL_AD_UNIT_ID:config.interstitialUnitId})){
  const match=generated.match(new RegExp('\\b'+key+'\\s*=\\s*"([^"\\r\\n]*)"\\s*;'));
  if(match?.[1]!==value)throw Error('Generated APK configuration mismatch: '+key);
 }
 if(generated.match(/\bVERSION_CODE\s*=\s*(\d+)\s*;/)?.[1]!==String(code))throw Error('Generated APK version code mismatch');
 if(generated.match(/\bADS_TEST_MODE\s*=\s*(true|false)\s*;/)?.[1]!==String(config.mode==='test'))throw Error('Generated APK ad mode mismatch');
 const sources={apk:'app/build/outputs/apk/release/app-release.apk',aab:'app/build/outputs/bundle/release/app-release.aab'};
 for(const file of Object.values(sources))if(!fs.statSync(path.join(root,file)).size)throw Error('Empty Android output: '+file);
 const directory=path.join(root,'dist',config.mode),stem='KaraDugum-v'+version+'-'+config.mode.toUpperCase(),files={};fs.mkdirSync(directory,{recursive:true});
 for(const [extension,source]of Object.entries(sources)){
  const file=stem+'.'+extension,target=path.join(directory,file);fs.copyFileSync(path.join(root,source),target);files[extension]={file,sha256:crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')};
 }
 const manifest={version,versionCode:code,commit,adsMode:config.mode,adMob:config,files};fs.writeFileSync(path.join(directory,stem+'-build-info.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
module.exports={stage};
if(require.main===module){try{const result=stage({version:process.argv[2],code:Number(process.argv[3]),commit:process.env.GITHUB_SHA||null});console.log('Release staged: v'+result.version+' / '+result.versionCode+' / '+result.adsMode.toUpperCase());}catch(error){console.error('Release packaging error: '+error.message);process.exitCode=1;}}
