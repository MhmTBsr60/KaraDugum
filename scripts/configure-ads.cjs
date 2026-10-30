/* Test and live ad builds are explicit; a live build never falls back to sample IDs. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const applicationId='ca-app-pub-6340528165840202~8704733869';
const projectUnits=require('../admob-units.json');
function configure(env,units=projectUnits){
 const mode=env.KD_ADS_MODE||'test';
 if(!['test','live'].includes(mode))throw Error('KD_ADS_MODE must be test or live');
 if(mode==='test')return {mode,applicationId,rewardedUnitId:'ca-app-pub-3940256099942544/5224354917',interstitialUnitId:'ca-app-pub-3940256099942544/1033173712'};
 const values=[['ADMOB_REWARDED_AD_UNIT_ID','rewardedUnitId'],['ADMOB_INTERSTITIAL_AD_UNIT_ID','interstitialUnitId']].map(([key,field])=>{
  const value=env[key]||units[field]||'';
  if(!/^ca-app-pub-\d{16}\/\d{10}$/.test(value))throw Error(key+' is required for live ads and must be an ad unit ID (ca-app-pub-…/…), not an app ID');
  if(!value.startsWith('ca-app-pub-6340528165840202/'))throw Error(key+' must belong to the configured AdMob publisher; Google sample IDs are not allowed in live mode');
  return value;
 });
 if(values[0]===values[1])throw Error('Rewarded and interstitial ads require separate ad unit IDs');
 return {mode,applicationId,rewardedUnitId:values[0],interstitialUnitId:values[1]};
}
module.exports={configure};
if(require.main===module){
 try{const config=configure(process.env),target=process.argv[2]||'app/kd-ads.json';fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(config));console.log('Ads configuration: '+config.mode.toUpperCase());}
 catch(error){console.error('Ad configuration error: '+error.message);process.exitCode=1;}
}
