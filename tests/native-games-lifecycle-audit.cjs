'use strict';

// Execute production startup ordering and the actual helper against a small Android lifecycle model.
// The SDK model follows the inspected 22.1.0 Created/Started/Resumed contract; it is not a device test.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'MainActivity.java'),'utf8');
function method(signature){
 const start=source.indexOf(signature);assert(start>=0,'Production method missing: '+signature);
 let depth=0,inString=false,escaped=false,startBody=source.indexOf('{',start);
 for(let i=startBody;i<source.length;i++){
  const ch=source[i];if(inString){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')inString=false;continue;}
  if(ch==='"'){inString=true;continue;}if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);
 }
 throw Error('Unclosed production method: '+signature);
}
const createStart=source.indexOf('public void onCreate(Bundle state) {'),superEnd=source.indexOf('super.onCreate(state);',createStart);
assert(createStart>=0&&superEnd>createStart,'Actual onCreate startup prefix required');
const create=source.slice(createStart,superEnd+'super.onCreate(state);'.length)+'\n    }';
const prepare=method('private void prepareGamesLifecycle()'),result=method('protected void onActivityResult(int requestCode, int resultCode, Intent data)'),resume=method('protected void onResume()'),eligible=method('private void startEligibleServices()');
for(const body of [prepare,result,resume])assert(!/\brecreate\s*\(|\bview\s*=|\bnew\s+WebView|\bview\.(?:loadUrl|reload|destroy)\s*\(|\bkdSelectLevel\b|\bgenerate\s*\(|\blocalStorage\b|\bset64\s*\(/.test(body),'Startup transition must retain the game WebView and avoid game-save writes');
const helper=fs.readFileSync(path.join(root,'GamesStartupActivity.java'),'utf8');
const manifest=fs.readFileSync(path.join(root,'AndroidManifest.xml'),'utf8');
assert(/<activity\b[^>]*android:name="\.GamesStartupActivity"[^>]*android:exported="false"|<activity\b[^>]*android:exported="false"[^>]*android:name="\.GamesStartupActivity"/.test(manifest),'Lifecycle helper must be declared non-exported');
const work=fs.mkdtempSync(path.join(os.tmpdir(),'kd-native-games-lifecycle-'));
function write(name,value){const f=path.join(work,name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,value);return f;}
const files=[];
files.push(write('android/os/Bundle.java','package android.os; public class Bundle {}'));
files.push(write('android/content/Context.java',`package android.content;
public class Context { public Context getApplicationContext(){return com.orynexa.karadugum.LifecycleModel.application;} public java.io.File getNoBackupFilesDir(){return com.orynexa.karadugum.LifecycleModel.directory;} }`));
files.push(write('android/content/Intent.java',`package android.content;
public class Intent { public final Class<?> target; public Intent(Context from,Class<?> value){target=value;} }`));
files.push(write('android/app/Application.java','package android.app; public class Application extends android.content.Context {}'));
files.push(write('android/app/Activity.java',`package android.app;
import android.os.Bundle; import android.content.Intent; import com.orynexa.karadugum.LifecycleModel;
public class Activity extends android.content.Context {
 public static final int RESULT_OK=-1,RESULT_CANCELED=0;
 public boolean finishing,destroyed,launchFailure,finished; public int resultCode=RESULT_CANCELED,launches,baseResults; public Intent launched; public int request;
 protected void onCreate(Bundle state){LifecycleModel.created(this);} protected void onStart(){LifecycleModel.foreground(this);} protected void onResume(){LifecycleModel.foreground(this);} protected void onActivityResult(int requestCode,int resultCode,Intent data){baseResults++;}
 public boolean isFinishing(){return finishing;} public boolean isDestroyed(){return destroyed;}
 public void setResult(int code){resultCode=code;LifecycleModel.events.add("result:"+getClass().getSimpleName());}
 public void finish(){finished=true;LifecycleModel.events.add("finish:"+getClass().getSimpleName());}
 public void startActivityForResult(Intent intent,int code){if(launchFailure)throw new IllegalStateException("Fixture launch failure");launched=intent;request=code;launches++;LifecycleModel.events.add("launch:"+intent.target.getSimpleName());}
 public final void dispatchCreate(){onCreate(new Bundle());} public final void dispatchStart(){onStart();} public final void dispatchResume(){onResume();}
}`));
files.push(write('com/google/android/gms/games/PlayGamesSdk.java',`package com.google.android.gms.games;
public final class PlayGamesSdk {public static void initialize(android.content.Context context){com.orynexa.karadugum.LifecycleModel.initialize(context);}}`));
files.push(write('com/orynexa/karadugum/LifecycleModel.java',`package com.orynexa.karadugum;
import java.io.File; import java.util.*;
public final class LifecycleModel {
 public static final android.app.Application application=new android.app.Application(); public static File directory;
 public static final List<String> events=new ArrayList<>(); public static boolean initialized,watching,authenticationStarted; public static android.app.Activity foreground; public static int initializeCalls;
 public static void reset(File dir){directory=dir;events.clear();initialized=false;watching=false;authenticationStarted=false;foreground=null;initializeCalls=0;}
 public static void initialize(android.content.Context context){if(context!=application)throw new AssertionError("Use Application context");initializeCalls++;events.add("sdk.initialize");if(!initialized){initialized=true;watching=true;}}
 public static void created(android.app.Activity activity){events.add("created:"+activity.getClass().getSimpleName());if(watching){watching=false;authenticationStarted=true;events.add("authentication.started");}}
 public static void foreground(android.app.Activity activity){events.add("resumed:"+activity.getClass().getSimpleName());if(initialized)foreground=activity;}
 public static int authenticationStatus(){return authenticationStarted?0:10;}
}`));
files.push(write('com/orynexa/karadugum/GamesStartupActivity.java',helper));
for(const name of ['AudiencePolicy.java','AudienceChoiceStore.java'])files.push(write('com/orynexa/karadugum/'+name,fs.readFileSync(path.join(root,name),'utf8')));
files.push(write('com/orynexa/karadugum/MainActivity.java',`package com.orynexa.karadugum;
import android.app.Activity;import android.os.Bundle;import android.content.Intent;import com.google.android.gms.games.PlayGamesSdk;
import java.io.File;import java.util.*;
public class MainActivity extends Activity {
 private static final String TAG="LifecycleAudit";private static final int GAMES_STARTUP_REQUEST=9002;
 private static AudiencePolicy audience=AudiencePolicy.choose(null);private static boolean audienceAnswered;
 private AudienceChoiceStore audienceChoices;private boolean gamesInitialized,gamesLifecycleReady,gamesStartupPending,gamesStartupFailed,pendingInteractiveLogin;
 private Object audienceDialog,consentGate;private FakeView view=new FakeView();private int automaticProbes,manualProbes,states,rewardDeliveries;
 private final List<Integer> statuses=new ArrayList<>();private final List<String> errors=new ArrayList<>();
 private void configureAudienceAds(){}private void initializeConsent(){consentGate=new Object();}private boolean adsAllowed(){return false;}private void initializeAds(){}private void loadRewarded(){}private void loadInterstitial(){}
 private void sendAudienceState(){states++;}private void error(String value){errors.add(value);}private void deliverPendingRewards(){rewardDeliveries++;}
 private void checkSignIn(){automaticProbes++;statuses.add(LifecycleModel.authenticationStatus());}private void signIn(){manualProbes++;statuses.add(LifecycleModel.authenticationStatus());}
 ${create}
 ${prepare}
 ${eligible}
 ${result}
 ${resume}
 private static int checks;
 private static void require(boolean value,String label){checks++;if(!value)throw new AssertionError(label);}
 private static MainActivity fresh(File base,String choice)throws Exception{
  LifecycleModel.reset(new File(base,UUID.randomUUID().toString()+"/no_backup"));audience=AudiencePolicy.choose(null);audienceAnswered=false;
  if(choice!=null)require(new AudienceChoiceStore(LifecycleModel.directory).save(choice),"Seed explicit persisted band");
  return new MainActivity();
 }
 private static void sameGame(MainActivity h,FakeView original,String label){
  require(h.view==original,label+": same WebView reference");require(h.view.board.equals("board-17-rotations")&&h.view.undo.equals(List.of(11,22,33)),label+": board and undo retained");require(h.view.attempts==4&&h.view.coins==240,label+": no extra attempt or wallet mutation");
 }
 public static void main(String[] args)throws Exception{
  File base=new File(args[0]);
  // Reproduce the previously documented late-start pattern with the inspected SDK lifecycle contract.
  LifecycleModel.reset(new File(base,"old-pattern"));Activity old=new Activity();old.dispatchCreate();old.dispatchStart();old.dispatchResume();PlayGamesSdk.initialize(old.getApplicationContext());
  require(LifecycleModel.authenticationStatus()==10,"Late SDK initialization misses Created and returns UNINITIALIZED code10 in SDK model");require(LifecycleModel.foreground==null,"Late initialization also missed foreground lifecycle");

  MainActivity cold=fresh(base,"adult");cold.dispatchCreate();
  require(LifecycleModel.initializeCalls==1&&LifecycleModel.authenticationStarted,"Persisted adult initializes before actual super.onCreate event");require(LifecycleModel.events.indexOf("sdk.initialize")<LifecycleModel.events.indexOf("created:MainActivity"),"SDK listener registration precedes Created dispatch");
  require(cold.gamesInitialized&&cold.gamesLifecycleReady&&!cold.gamesStartupPending,"Cold adult lifecycle is ready");require(cold.automaticProbes==0&&cold.manualProbes==0,"Cold startup prefix does not probe before later lifecycle");
  cold.dispatchStart();cold.dispatchResume();require(LifecycleModel.foreground==cold&&cold.statuses.equals(List.of(0)),"Actual Main.onResume probes after SDK tracked foreground and started auth");require(cold.launches==0,"Cold adult needs no helper");

  for(String code:new String[]{null,"under13","teen","unknown"}){
   MainActivity h=fresh(base,code);h.dispatchCreate();h.prepareGamesLifecycle();h.dispatchStart();h.dispatchResume();
   require(LifecycleModel.initializeCalls==0&&!LifecycleModel.authenticationStarted,"Pending/restricted band never initializes account SDK: "+code);require(h.launches==0&&h.statuses.isEmpty(),"Pending/restricted band cannot launch helper or account probes: "+code);
  }

  for(boolean interactive:new boolean[]{false,true}){
   MainActivity h=fresh(base,null);h.dispatchCreate();h.dispatchStart();h.dispatchResume();FakeView original=h.view;
   audience=AudiencePolicy.choose("adult");audienceAnswered=true;h.pendingInteractiveLogin=interactive;h.startEligibleServices();
   require(h.gamesInitialized&&h.gamesStartupPending&&!h.gamesLifecycleReady,"First explicit adult selection waits for real helper lifecycle");require(h.launches==1&&h.launched.target==GamesStartupActivity.class&&h.request==GAMES_STARTUP_REQUEST,"Actual prepare launches the internal helper once");require(h.statuses.isEmpty(),"No early auth probe while helper is pending");
   h.prepareGamesLifecycle();require(h.launches==1,"Repeated preparation coalesces while pending");sameGame(h,original,"Before helper");
   GamesStartupActivity trampoline=new GamesStartupActivity();trampoline.dispatchCreate();require(LifecycleModel.authenticationStarted&&trampoline.resultCode==RESULT_OK,"Actual helper Created dispatch starts auth and reports success");require(!trampoline.finished,"Helper waits for foreground lifecycle before finish");
   trampoline.dispatchStart();trampoline.dispatchResume();require(trampoline.finished&&LifecycleModel.foreground==trampoline,"Actual helper resumes before finish");require(!h.gamesLifecycleReady&&h.statuses.isEmpty(),"Main cannot probe merely because helper ran");
   h.onActivityResult(GAMES_STARTUP_REQUEST,trampoline.resultCode,null);require(h.gamesLifecycleReady&&!h.gamesStartupPending&&h.statuses.isEmpty(),"Actual result marks lifecycle ready but does not probe against old foreground");
   h.dispatchResume();require(LifecycleModel.foreground==h&&h.statuses.equals(List.of(0)),"Main resumes and probes initialized state without code10");require(interactive?h.manualProbes==1&&h.automaticProbes==0:h.automaticProbes==1&&h.manualProbes==0,"Deferred interactive intent is preserved");sameGame(h,original,"After helper");
  }

  MainActivity cancelled=fresh(base,null);cancelled.dispatchCreate();audience=AudiencePolicy.choose("adult");audienceAnswered=true;cancelled.prepareGamesLifecycle();cancelled.onActivityResult(GAMES_STARTUP_REQUEST,RESULT_CANCELED,null);
  require(!cancelled.gamesLifecycleReady&&!cancelled.gamesStartupPending&&cancelled.gamesStartupFailed&&cancelled.statuses.isEmpty(),"Cancelled helper cannot declare SDK lifecycle ready or issue auth");
  cancelled.dispatchResume();require(cancelled.launches==1&&cancelled.statuses.isEmpty(),"Cancelled helper must not reopen automatically on Main resume");

  MainActivity unrelated=fresh(base,null);unrelated.dispatchCreate();audience=AudiencePolicy.choose("adult");audienceAnswered=true;unrelated.prepareGamesLifecycle();unrelated.onActivityResult(4321,RESULT_OK,null);
  require(unrelated.gamesStartupPending&&!unrelated.gamesLifecycleReady,"Unrelated result cannot unlock account SDK");

  MainActivity failed=fresh(base,null);failed.dispatchCreate();audience=AudiencePolicy.choose("adult");audienceAnswered=true;failed.launchFailure=true;FakeView original=failed.view;failed.prepareGamesLifecycle();
  require(!failed.gamesStartupPending&&!failed.gamesLifecycleReady&&failed.gamesStartupFailed&&failed.statuses.isEmpty(),"Rejected launch cannot falsely declare ready");require(failed.errors.size()==1&&!failed.errors.get(0).contains("Fixture"),"Rejected launch gives generic connection message");sameGame(failed,original,"Rejected launch");
  failed.dispatchResume();require(failed.launches==0&&failed.errors.size()==1&&failed.statuses.isEmpty(),"Rejected helper launch must not keep retrying on Main resume");
  for(boolean destroy:new boolean[]{false,true}){MainActivity h=fresh(base,null);h.dispatchCreate();audience=AudiencePolicy.choose("adult");audienceAnswered=true;h.destroyed=destroy;h.finishing=!destroy;h.prepareGamesLifecycle();require(LifecycleModel.initializeCalls==0&&h.launches==0,"Dead/finishing Main cannot initialize or launch helper");}
  System.out.println("PASS: "+checks+" assertions against actual MainActivity startup/lifecycle and actual GamesStartupActivity; old late-init code10 contract, adult-before-Created ordering, restricted gates, real helper/result/resume sequence, cancelled/rejected starts and retained game WebView");
 }
}
final class FakeView {final String board="board-17-rotations";final List<Integer> undo=List.of(11,22,33);int attempts=4,coins=240;void onResume(){}void evaluateJavascript(String script,Object callback){}}
final class Log {static void e(String tag,String message,RuntimeException error){}}
`));
try{
 const args=['-encoding','UTF-8','-d',work,...files];
 try{execFileSync('javac',args,{stdio:'inherit'});}catch(error){if(error.code!=='ENOENT')throw error;execFileSync('java',['com.sun.tools.javac.Main',...args],{stdio:'inherit'});}
 execFileSync('java',['-cp',work,'com.orynexa.karadugum.MainActivity',path.join(work,'fixtures')],{stdio:'inherit'});
}finally{fs.rmSync(work,{recursive:true,force:true});}
