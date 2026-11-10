'use strict';

// Execute the production auth callbacks against controllable SDK tasks, without Android.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'MainActivity.java'),'utf8');
const start=source.indexOf('    private void checkSignIn() {'),end=source.indexOf('    private JSONObject mergeSave',start);
assert(start>=0&&end>start,'Production authentication method boundaries must exist');
const methods=source.slice(start,end);
for(const name of ['checkSignIn','signInFailed','signIn','announceUser'])assert.match(methods,new RegExp('private void '+name+'\\('));
const work=fs.mkdtempSync(path.join(os.tmpdir(),'kd-native-auth-'));
const java=String.raw`package com.orynexa.karadugum;
import java.util.*;
import java.util.function.Consumer;

public class NativeAuthAudit {
    private static final String TAG="NativeAuthAudit";
    private AudiencePolicy audience=AudiencePolicy.choose("adult");
    private boolean gamesInitialized=true,manualSigningIn,checkingSignIn,signedIn,finishing,destroyed;
    private int authGeneration,delivered;
    private String currentPlayerId="";
    final SignInClient signInClient=new SignInClient();
    final PlayersClient playersClient=new PlayersClient();
    private final List<String> events=new ArrayList<>(),errors=new ArrayList<>();
    private boolean isFinishing(){return finishing;}
    private boolean isDestroyed(){return destroyed;}
    private void error(String value){errors.add(value);}
    private void send(String event,String payload){events.add(event+":"+payload);}
    private void deliverPendingRewards(){delivered++;}

${methods}

    private static int checks;
    private static void require(boolean condition,String message){checks++;if(!condition)throw new AssertionError(message);}
    private static Exception developerError(){return new Exception("10: DEVELOPER_ERROR private SDK detail");}
    private static void disconnected(NativeAuthAudit h,String context){
        require(!h.signedIn&&h.currentPlayerId.isEmpty(),context+": no authenticated owner");
        require(!h.checkingSignIn&&!h.manualSigningIn,context+": busy flags released");
        require(h.events.equals(List.of("user:null")),context+": actual signed-out callback");
        require(h.delivered==0,context+": no account reward delivery");
    }
    private static void genericError(NativeAuthAudit h,String context){
        require(h.errors.size()==1,context+": one explicit user-facing failure");
        String text=h.errors.get(0);
        require(text.contains("Yerel kayıtların korunuyor"),context+": explains local progress survives");
        require(!text.contains("10")&&!text.contains("DEVELOPER_ERROR")&&!text.contains("private SDK detail"),context+": no raw developer code");
    }
    private static void resolveManual(NativeAuthAudit h,String uid){
        h.signInClient.manual.get(h.signInClient.manual.size()-1).success(new AuthenticationResult(true));
        h.playersClient.tasks.get(h.playersClient.tasks.size()-1).success(new Player(uid,"Player "+uid));
    }
    private static void connected(NativeAuthAudit h,String uid,String context){
        require(h.signedIn&&h.currentPlayerId.equals(uid),context+": real account owner published");
        require(!h.checkingSignIn&&!h.manualSigningIn,context+": busy flags released");
        require(h.events.size()==1&&h.events.get(0).contains("\"uid\":\""+uid+"\""),context+": one matching user event");
        require(h.errors.isEmpty(),context+": no visible error");
        require(h.delivered==1,context+": reward delivery starts after profile");
    }
    public static void main(String[] args){
        for(String age:new String[]{null,"under13","teen","unknown"}){
            NativeAuthAudit h=new NativeAuthAudit();h.audience=AudiencePolicy.choose(age);h.checkSignIn();h.signIn();
            require(h.signInClient.automatic.isEmpty()&&h.signInClient.manual.isEmpty()&&h.playersClient.tasks.isEmpty(),"Restricted/pending age never calls account SDK: "+age);
            require(h.events.isEmpty()&&h.currentPlayerId.isEmpty(),"Restricted/pending age never publishes a user");
        }
        NativeAuthAudit uninitialized=new NativeAuthAudit();uninitialized.gamesInitialized=false;uninitialized.checkSignIn();uninitialized.signIn();
        require(uninitialized.signInClient.automatic.isEmpty()&&uninitialized.signInClient.manual.isEmpty(),"No auth call before explicit SDK initialization");

        NativeAuthAudit automatic=new NativeAuthAudit();automatic.checkSignIn();automatic.checkSignIn();automatic.checkSignIn();
        require(automatic.signInClient.automatic.size()==1,"Concurrent automatic checks coalesce");
        automatic.signInClient.automatic.get(0).failure(developerError());disconnected(automatic,"Automatic developer error");
        require(automatic.errors.isEmpty(),"Startup error 10 never opens Toast/alert path");
        require(Log.failures.stream().anyMatch(x->x.contains("10: DEVELOPER_ERROR")),"Full SDK detail remains in developer logs");

        for(AuthenticationResult result:new AuthenticationResult[]{null,new AuthenticationResult(false)}){
            NativeAuthAudit h=new NativeAuthAudit();h.checkSignIn();h.signInClient.automatic.get(0).success(result);
            disconnected(h,"Unauthenticated automatic result");require(h.errors.isEmpty(),"Automatic not-signed-in is quiet");
            require(h.playersClient.tasks.isEmpty(),"Unauthenticated auto result never loads profile");
        }

        NativeAuthAudit manual=new NativeAuthAudit();manual.signIn();manual.signIn();
        require(manual.signInClient.manual.size()==1,"Concurrent explicit sign-ins coalesce");
        manual.signInClient.manual.get(0).failure(developerError());disconnected(manual,"Manual developer error");genericError(manual,"Manual developer error");

        for(AuthenticationResult result:new AuthenticationResult[]{null,new AuthenticationResult(false)}){
            NativeAuthAudit h=new NativeAuthAudit();h.signIn();h.signInClient.manual.get(0).success(result);
            disconnected(h,"Unfinished manual sign-in");genericError(h,"Unfinished manual sign-in");
            require(h.playersClient.tasks.isEmpty(),"Unfinished manual sign-in never loads profile");
        }

        NativeAuthAudit success=new NativeAuthAudit();success.signIn();success.signInClient.manual.get(0).success(new AuthenticationResult(true));
        require(success.events.isEmpty()&&success.currentPlayerId.isEmpty()&&success.delivered==0,"Authentication alone cannot publish owner or deliver account rewards");
        require(success.playersClient.tasks.size()==1&&success.manualSigningIn,"Wait for actual player profile");
        success.playersClient.tasks.get(0).success(new Player("verified-player","Verified"));connected(success,"verified-player","Manual verified profile");

        NativeAuthAudit autoSuccess=new NativeAuthAudit();autoSuccess.checkSignIn();autoSuccess.signInClient.automatic.get(0).success(new AuthenticationResult(true));
        require(autoSuccess.events.isEmpty()&&autoSuccess.delivered==0,"Automatic authentication also waits for profile");
        autoSuccess.playersClient.tasks.get(0).success(new Player("automatic-player","Automatic"));connected(autoSuccess,"automatic-player","Automatic verified profile");

        for(boolean interactive:new boolean[]{false,true}){
            NativeAuthAudit h=new NativeAuthAudit();if(interactive){h.signIn();h.signInClient.manual.get(0).success(new AuthenticationResult(true));}else{h.checkSignIn();h.signInClient.automatic.get(0).success(new AuthenticationResult(true));}
            h.playersClient.tasks.get(0).failure(developerError());disconnected(h,"Profile failure "+interactive);
            if(interactive)genericError(h,"Manual profile failure");else require(h.errors.isEmpty(),"Automatic profile failure is quiet");
        }

        for(Player profile:new Player[]{null,new Player(null,"Missing ID"),new Player("","Empty ID"),new Player("broken","Broken"){@Override public String getDisplayName(){throw new IllegalStateException("profile decoding private detail");}}}){
            NativeAuthAudit h=new NativeAuthAudit();h.signIn();h.signInClient.manual.get(0).success(new AuthenticationResult(true));h.playersClient.tasks.get(0).success(profile);
            disconnected(h,"Invalid profile");genericError(h,"Invalid profile");
        }

        for(boolean oldTaskSuccess:new boolean[]{false,true}){
            NativeAuthAudit h=new NativeAuthAudit();h.checkSignIn();FakeTask<AuthenticationResult> stale=h.signInClient.automatic.get(0);
            h.signIn();resolveManual(h,"new-owner");int profiles=h.playersClient.tasks.size();
            if(oldTaskSuccess)stale.success(new AuthenticationResult(true));else stale.failure(developerError());
            connected(h,"new-owner","Stale automatic callback");require(h.playersClient.tasks.size()==profiles,"Stale auth success cannot request another profile");
        }

        for(boolean oldProfileSuccess:new boolean[]{false,true}){
            NativeAuthAudit h=new NativeAuthAudit();h.checkSignIn();h.signInClient.automatic.get(0).success(new AuthenticationResult(true));FakeTask<Player> stale=h.playersClient.tasks.get(0);
            h.signIn();resolveManual(h,"new-profile-owner");
            if(oldProfileSuccess)stale.success(new Player("old-owner","Old"));else stale.failure(developerError());
            connected(h,"new-profile-owner","Stale profile callback");
        }

        for(boolean destroy:new boolean[]{false,true})for(boolean callbackSuccess:new boolean[]{false,true})for(int stage=0;stage<3;stage++){
            NativeAuthAudit h=new NativeAuthAudit();
            if(stage==0)h.checkSignIn();else if(stage==1)h.signIn();else{h.signIn();h.signInClient.manual.get(0).success(new AuthenticationResult(true));}
            h.destroyed=destroy;h.finishing=!destroy;
            if(stage==0){if(callbackSuccess)h.signInClient.automatic.get(0).success(new AuthenticationResult(true));else h.signInClient.automatic.get(0).failure(developerError());}
            else if(stage==1){if(callbackSuccess)h.signInClient.manual.get(0).success(new AuthenticationResult(true));else h.signInClient.manual.get(0).failure(developerError());}
            else{if(callbackSuccess)h.playersClient.tasks.get(0).success(new Player("dead-owner","Dead"));else h.playersClient.tasks.get(0).failure(developerError());}
            require(h.events.isEmpty()&&h.errors.isEmpty()&&h.delivered==0,"Dead/finishing Activity ignores callback stage "+stage);
            int calls=h.signInClient.automatic.size()+h.signInClient.manual.size();h.checkSignIn();h.signIn();
            require(calls==h.signInClient.automatic.size()+h.signInClient.manual.size(),"Dead/finishing Activity cannot launch auth");
        }
        System.out.println("PASS: "+checks+" assertions against actual MainActivity auth methods; quiet startup errors, explicit generic failures, real profile ownership, age/init/coalescing and stale/lifecycle callbacks");
    }
}

final class AuthenticationResult {
    private final boolean authenticated;AuthenticationResult(boolean value){authenticated=value;}
    boolean isAuthenticated(){return authenticated;}
}
class Player {
    private final String id,name;Player(String uid,String label){id=uid;name=label;}
    public String getPlayerId(){return id;}public String getDisplayName(){return name;}
}
final class FakeTask<T> {
    private final List<Consumer<FakeTask<T>>> complete=new ArrayList<>();
    private final List<Consumer<T>> success=new ArrayList<>();
    private final List<Consumer<Exception>> failure=new ArrayList<>();
    private boolean done,ok;private T result;private Exception error;
    FakeTask<T> addOnCompleteListener(Consumer<FakeTask<T>> listener){complete.add(listener);if(done)listener.accept(this);return this;}
    FakeTask<T> addOnSuccessListener(Consumer<T> listener){success.add(listener);if(done&&ok)listener.accept(result);return this;}
    FakeTask<T> addOnFailureListener(Consumer<Exception> listener){failure.add(listener);if(done&&!ok)listener.accept(error);return this;}
    boolean isSuccessful(){return done&&ok;}T getResult(){return result;}Exception getException(){return error;}
    void success(T value){settle(true,value,null);}void failure(Exception value){settle(false,null,value);}
    private void settle(boolean passed,T value,Exception problem){if(done)throw new AssertionError("Task settled twice");done=true;ok=passed;result=value;error=problem;for(Consumer<FakeTask<T>> listener:List.copyOf(complete))listener.accept(this);if(ok){for(Consumer<T> listener:List.copyOf(success))listener.accept(result);}else{for(Consumer<Exception> listener:List.copyOf(failure))listener.accept(error);}}
}
final class SignInClient {
    final List<FakeTask<AuthenticationResult>> automatic=new ArrayList<>(),manual=new ArrayList<>();
    FakeTask<AuthenticationResult> isAuthenticated(){FakeTask<AuthenticationResult> task=new FakeTask<>();automatic.add(task);return task;}
    FakeTask<AuthenticationResult> signIn(){FakeTask<AuthenticationResult> task=new FakeTask<>();manual.add(task);return task;}
}
final class PlayersClient {
    final List<FakeTask<Player>> tasks=new ArrayList<>();
    FakeTask<Player> getCurrentPlayer(){FakeTask<Player> task=new FakeTask<>();tasks.add(task);return task;}
}
final class PlayGames {
    static SignInClient getGamesSignInClient(NativeAuthAudit host){return host.signInClient;}
    static PlayersClient getPlayersClient(NativeAuthAudit host){return host.playersClient;}
}
final class Log {
    static final List<String> failures=new ArrayList<>();
    static void w(String tag,String context,Exception failure){failures.add(context+":"+(failure==null?"":failure.getMessage()));}
}
final class JSONObject {
    private final Map<String,Object> fields=new LinkedHashMap<>();
    JSONObject put(String key,Object value){fields.put(key,value);return this;}
    static String quote(String value){return value==null?"null":"\""+value.replace("\\","\\\\").replace("\"","\\\"")+"\"";}
    @Override public String toString(){List<String> parts=new ArrayList<>();for(Map.Entry<String,Object> field:fields.entrySet())parts.add(quote(field.getKey())+":"+quote((String)field.getValue()));return "{"+String.join(",",parts)+"}";}
}
`;
try{
  fs.writeFileSync(path.join(work,'NativeAuthAudit.java'),java);
  fs.copyFileSync(path.join(root,'AudiencePolicy.java'),path.join(work,'AudiencePolicy.java'));
  const args=['-encoding','UTF-8','-d',work,path.join(work,'AudiencePolicy.java'),path.join(work,'NativeAuthAudit.java')];
  try{execFileSync('javac',args,{stdio:'inherit'});}catch(error){if(error.code!=='ENOENT')throw error;execFileSync('java',['com.sun.tools.javac.Main',...args],{stdio:'inherit'});}
  execFileSync('java',['-cp',work,'com.orynexa.karadugum.NativeAuthAudit'],{stdio:'inherit'});
}finally{fs.rmSync(work,{recursive:true,force:true});}
