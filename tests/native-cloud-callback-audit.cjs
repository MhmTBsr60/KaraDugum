'use strict';
// Execute the actual native cloud transport methods. SDK tasks are delayed deliberately;
// JSON/merge stand-ins isolate callback ownership, not the separately audited merge algorithm.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'MainActivity.java'),'utf8');
const start=source.indexOf('    private static final class CloudSaveOperation {'),end=source.indexOf('    private void rewardUnavailable',start);
assert(start>=0&&end>start,'Actual cloud operation method boundaries are required');
const methods=source.slice(start,end),work=fs.mkdtempSync(path.join(os.tmpdir(),'kd-cloud-callback-'));
const java=String.raw`package com.orynexa.karadugum;
import java.util.*;
import java.util.function.Consumer;
import java.nio.charset.StandardCharsets;

public class NativeCloudCallbackAudit {
    private static final String TAG="audit",SAVE_NAME="legacy",FULL_SAVE_NAME="full";
    private AudiencePolicy audience=AudiencePolicy.choose("adult");
    private boolean signedIn=true,saving,finishing,destroyed;
    private int authGeneration=1;
    private String currentPlayerId="A",pendingSave;
    final SnapshotsClient client=new SnapshotsClient();
    final List<String> errors=new ArrayList<>();
    final List<JSONObject> received=new ArrayList<>();
    boolean isFinishing(){return finishing;}
    boolean isDestroyed(){return destroyed;}
    void error(String message){errors.add(message);}
    void send(String event,String payload){require(event.equals("cloudSave"),"Only cloud results expected");received.add(new JSONObject(payload));}
    JSONObject mergeSave(JSONObject a,JSONObject b){JSONObject result=new JSONObject(a);result.fields.putAll(new JSONObject(b).fields);return result;}

${methods}

    private static int checks;
    static void require(boolean condition,String message){checks++;if(!condition)throw new AssertionError(message);}
    static String request(String owner,boolean rooted,String marker){
        JSONObject full=new JSONObject().put("account",owner).put("marker",marker);
        if(rooted)full.put("root",new JSONObject().put("id","root-"+owner));
        return new JSONObject().put("level",17).put("completed",new JSONObject().put("16",3)).put("best",new JSONObject().put("16",500)).put("full",full).toString();
    }
    static Snapshot empty(){return new Snapshot();}
    static SnapshotsClient.DataOrConflict<Snapshot> normal(Snapshot value){return new SnapshotsClient.DataOrConflict<>(value,null,false);}
    static SnapshotsClient.DataOrConflict<Snapshot> conflict(Snapshot first,Snapshot second){return new SnapshotsClient.DataOrConflict<>(null,new SnapshotsClient.SnapshotConflict(first,second),true);}
    static void changeAccount(NativeCloudCallbackAudit h,String owner){h.authGeneration++;h.currentPlayerId=owner;h.signedIn=true;h.audience=AudiencePolicy.choose("adult");}
    static void restrict(NativeCloudCallbackAudit h){h.authGeneration++;h.currentPlayerId="";h.signedIn=false;h.audience=AudiencePolicy.choose("under13");h.saving=false;h.pendingSave=null;}
    static void openFirst(NativeCloudCallbackAudit h){h.client.opens.get(0).task.success(normal(empty()));require(h.client.commits.size()==1,"Open snapshot begins one commit");}
    static void untouched(NativeCloudCallbackAudit h,CloudSaveOperation operation,String queued,int openCount,String context){
        require(h.activeCloudSave==operation&&h.saving,context+": cannot clear newer active operation");
        require(Objects.equals(h.pendingSave,queued),context+": cannot clear newer queued payload");
        require(h.client.opens.size()==openCount,context+": cannot flush/start newer queue");
        require(h.received.isEmpty()&&h.errors.isEmpty(),context+": cannot publish or show an old error");
    }
    static NativeCloudCallbackAudit pendingCommit(){NativeCloudCallbackAudit h=new NativeCloudCallbackAudit();h.syncSave(request("A",true,"first"));openFirst(h);return h;}
    public static void main(String[] args){
        NativeCloudCallbackAudit normal=new NativeCloudCallbackAudit();String newest=request("A",true,"newest");
        normal.syncSave(request("A",true,"first"));CloudSaveOperation old=normal.activeCloudSave;
        require(normal.client.opens.size()==1&&normal.client.opens.get(0).slot.equals(FULL_SAVE_NAME)&&normal.client.opens.get(0).create,"Rooted request opens the correct full slot");
        normal.syncSave(request("A",true,"middle"));normal.syncSave(newest);
        require(normal.client.opens.size()==1&&normal.pendingSave.equals(newest),"Concurrent same-owner saves coalesce to latest payload");
        openFirst(normal);normal.client.commits.get(0).task.success(new Object());
        require(normal.received.size()==1&&normal.received.get(0).optJSONObject("full").optString("marker").equals("first"),"Current commit publishes its actual merged payload");
        require(normal.client.opens.size()==2&&normal.saving&&normal.activeCloudSave!=old&&normal.pendingSave==null,"Current finish starts one latest queued operation");
        CloudSaveOperation newer=normal.activeCloudSave;normal.client.commits.get(0).task.success(new Object());
        require(normal.received.size()==1&&normal.activeCloudSave==newer&&normal.saving,"Repeated old completion cannot complete a newer same-generation operation");

        NativeCloudCallbackAudit malformed=new NativeCloudCallbackAudit();malformed.syncSave(request("A",true,"valid"));CloudSaveOperation valid=malformed.activeCloudSave;
        malformed.syncSave("invalid-json-token");
        require(malformed.saving&&malformed.activeCloudSave==valid&&malformed.errors.size()==1,"Malformed input never clears an active native save");
        malformed.syncSave(request("B",true,"wrong-owner"));require(malformed.client.opens.size()==1&&malformed.pendingSave==null,"Wrong account never queues or starts a save");

        NativeCloudCallbackAudit child=pendingCommit();restrict(child);child.client.commits.get(0).task.success(new Object());
        require(child.received.isEmpty()&&child.errors.isEmpty()&&!child.saving&&child.pendingSave==null,"An already-sent old commit may finish but cannot publish after child selection");
        child.syncSave(request("A",true,"blocked"));require(child.client.opens.size()==1,"Restricted audience starts no cloud request");

        for(boolean success:new boolean[]{true,false}){
            NativeCloudCallbackAudit h=pendingCommit();changeAccount(h,"B");h.syncSave(request("B",true,"new-account"));
            CloudSaveOperation active=h.activeCloudSave;String queued=request("B",true,"queued");h.syncSave(queued);
            require(h.client.opens.size()==2,"A fresh auth epoch recovers an old saving flag without waiting for the old server");
            if(success)h.client.commits.get(0).task.success(new Object());else h.client.commits.get(0).task.failure(new Exception("old commit failure"));
            untouched(h,active,queued,2,"Delayed old commit "+success);
        }
        for(boolean success:new boolean[]{true,false}){
            NativeCloudCallbackAudit h=new NativeCloudCallbackAudit();h.syncSave(request("A",true,"old-open"));
            changeAccount(h,"B");h.syncSave(request("B",true,"new-open"));CloudSaveOperation active=h.activeCloudSave;
            String queued=request("B",true,"queued");h.syncSave(queued);Snapshot stale=empty();
            if(success){h.client.opens.get(0).task.success(normal(stale));require(stale.closed,"Stale opened snapshot is discarded");}
            else h.client.opens.get(0).task.failure(new Exception("old open failure"));
            untouched(h,active,queued,2,"Delayed old open "+success);require(h.client.commits.isEmpty(),"Stale open does not start commit");
        }

        for(boolean success:new boolean[]{true,false}){
            NativeCloudCallbackAudit h=new NativeCloudCallbackAudit();h.syncSave(request("A",false,"needs-migration"));
            require(h.client.opens.get(0).slot.equals(SAVE_NAME)&&!h.client.opens.get(0).create,"Migration opens old slot read-only");
            changeAccount(h,"B");h.syncSave(request("B",true,"new-open"));CloudSaveOperation active=h.activeCloudSave;
            String queued=request("B",true,"queued");h.syncSave(queued);Snapshot one=empty(),two=empty();
            if(success){h.client.opens.get(0).task.success(conflict(one,two));require(one.closed&&two.closed,"Both old legacy conflict snapshots are discarded");}
            else h.client.opens.get(0).task.failure(new Exception("old migration failure"));
            untouched(h,active,queued,2,"Delayed old migration "+success);
        }
        NativeCloudCallbackAudit migration=new NativeCloudCallbackAudit();migration.syncSave(request("A",false,"incoming"));
        JSONObject legacyFull=new JSONObject().put("account","legacy").put("root",new JSONObject().put("id","untrusted-old-wallet"));
        Snapshot legacy=empty();legacy.contents.bytes=new JSONObject().put("completed",new JSONObject().put("2",3)).put("full",legacyFull).toString().getBytes(StandardCharsets.UTF_8);
        migration.client.opens.get(0).task.success(normal(legacy));
        require(legacy.closed&&migration.client.opens.size()==2&&migration.client.opens.get(1).slot.equals(FULL_SAVE_NAME),"Current migration closes old snapshot and opens full slot");
        migration.client.opens.get(1).task.success(normal(empty()));migration.client.commits.get(0).task.success(new Object());
        JSONObject preserved=migration.received.get(0).optJSONObject("full");
        require(preserved.optString("account").equals("A")&&preserved.optString("marker").equals("incoming")&&!preserved.has("root"),"Legacy import cannot replace incoming account or import old wallet root");
        NativeCloudCallbackAudit missingLegacy=new NativeCloudCallbackAudit();missingLegacy.syncSave(request("A",false,"incoming"));missingLegacy.client.opens.get(0).task.failure(new Exception("legacy absent"));
        require(missingLegacy.client.opens.size()==2&&missingLegacy.errors.isEmpty(),"Missing legacy slot falls back to current full slot");

        for(boolean success:new boolean[]{true,false}){
            NativeCloudCallbackAudit h=new NativeCloudCallbackAudit();h.syncSave(request("A",true,"old-conflict"));Snapshot chosen=empty(),other=empty();
            h.client.opens.get(0).task.success(conflict(chosen,other));require(h.client.resolves.size()==1&&other.closed,"Current conflict merges and releases unneeded snapshot");
            changeAccount(h,"B");h.syncSave(request("B",true,"new"));CloudSaveOperation active=h.activeCloudSave;String queued=request("B",true,"queued");h.syncSave(queued);
            Snapshot stale=empty();if(success){h.client.resolves.get(0).success(normal(stale));require(stale.closed,"Old resolved result is discarded");}else h.client.resolves.get(0).failure(new Exception("old conflict failure"));
            untouched(h,active,queued,2,"Delayed old conflict resolution "+success);require(h.client.commits.isEmpty(),"Old conflict cannot start a commit after account change");
        }
        NativeCloudCallbackAudit sameOwner=pendingCommit();sameOwner.authGeneration++;sameOwner.syncSave(request("A",true,"new-epoch"));
        CloudSaveOperation resumed=sameOwner.activeCloudSave;sameOwner.client.commits.get(0).task.success(new Object());
        require(sameOwner.activeCloudSave==resumed&&sameOwner.saving&&sameOwner.received.isEmpty(),"Same-owner reauthentication has an independent operation epoch");

        for(boolean failure:new boolean[]{true,false})for(boolean destroyed:new boolean[]{true,false}){
            NativeCloudCallbackAudit h=pendingCommit();h.destroyed=destroyed;h.finishing=!destroyed;
            if(failure)h.client.commits.get(0).task.failure(new Exception("closed activity"));else h.client.commits.get(0).task.success(new Object());
            require(h.received.isEmpty()&&h.errors.isEmpty(),"Closed Activity cannot receive cloud result/error");
        }
        NativeCloudCallbackAudit currentFailure=pendingCommit();String queued=request("A",true,"retry");currentFailure.syncSave(queued);currentFailure.client.commits.get(0).task.failure(new Exception("current failure"));
        require(currentFailure.errors.size()==1&&currentFailure.received.isEmpty()&&currentFailure.client.opens.size()==2&&currentFailure.saving,"Current commit failure reports once and releases its own queue");
        NativeCloudCallbackAudit depth=new NativeCloudCallbackAudit();depth.syncSave(request("A",true,"conflict"));Snapshot one=empty(),two=empty();
        depth.handleSnapshot(depth.client,conflict(one,two),new JSONObject(request("A",true,"conflict")),5,depth.activeCloudSave);
        require(one.closed&&two.closed&&!depth.saving&&depth.errors.size()==1,"Conflict depth limit closes handles and finishes current operation");
        NativeCloudCallbackAudit unverified=new NativeCloudCallbackAudit();unverified.currentPlayerId="";unverified.syncSave(request("A",true,"not-verified"));
        require(unverified.client.opens.isEmpty(),"No cloud API call before a verified player ID");
        System.out.println("PASS: "+checks+" assertions against actual native cloud methods; stale open/import/resolve/commit callbacks cannot publish, clear or flush another owner/epoch; current queue, cleanup and legacy boundaries preserved");
    }
}
final class JSONObject {
    static final Map<String,JSONObject> registry=new HashMap<>();static int next;
    final Map<String,Object> fields=new LinkedHashMap<>();
    JSONObject(){}
    JSONObject(JSONObject other){for(Map.Entry<String,Object> e:other.fields.entrySet())fields.put(e.getKey(),e.getValue() instanceof JSONObject?new JSONObject((JSONObject)e.getValue()):e.getValue());}
    JSONObject(String raw){this(required(raw));}
    static JSONObject required(String raw){JSONObject p=registry.get(raw);if(p==null)throw new IllegalArgumentException("Invalid JSON fixture");return p;}
    JSONObject put(String key,Object value){fields.put(key,value);return this;}
    JSONObject optJSONObject(String key){Object v=fields.get(key);return v instanceof JSONObject?(JSONObject)v:null;}
    JSONObject getJSONObject(String key){JSONObject v=optJSONObject(key);if(v==null)throw new IllegalArgumentException("Missing object");return v;}
    String optString(String key){Object v=fields.get(key);return v instanceof String?(String)v:"";}
    boolean has(String key){return fields.containsKey(key);}
    Object remove(String key){return fields.remove(key);}
    public String toString(){String id="json-fixture-"+(++next);registry.put(id,new JSONObject(this));return id;}
}
final class FakeTask<T> {
    final List<Consumer<T>> success=new ArrayList<>();final List<Consumer<Exception>> failure=new ArrayList<>();
    FakeTask<T> addOnSuccessListener(Consumer<T> c){success.add(c);return this;}
    FakeTask<T> addOnFailureListener(Consumer<Exception> c){failure.add(c);return this;}
    void success(T value){for(Consumer<T> c:new ArrayList<>(success))c.accept(value);}
    void failure(Exception value){for(Consumer<Exception> c:new ArrayList<>(failure))c.accept(value);}
}
final class Snapshot {
    final Contents contents=new Contents();boolean closed;
    Contents getSnapshotContents(){return contents;}
    static final class Contents {byte[] bytes=new byte[0];byte[] readFully(){return bytes.clone();}void writeBytes(byte[] b){bytes=b.clone();}}
}
final class SnapshotMetadataChange {static final SnapshotMetadataChange EMPTY_CHANGE=new SnapshotMetadataChange();}
final class SnapshotsClient {
    static final int RESOLUTION_POLICY_MANUAL=1;
    final List<Open> opens=new ArrayList<>();final List<Commit> commits=new ArrayList<>();final List<FakeTask<DataOrConflict<Snapshot>>> resolves=new ArrayList<>();
    FakeTask<DataOrConflict<Snapshot>> open(String slot,boolean create,int resolution){Open o=new Open(slot,create);opens.add(o);return o.task;}
    FakeTask<DataOrConflict<Snapshot>> resolveConflict(String id,Snapshot chosen){FakeTask<DataOrConflict<Snapshot>> t=new FakeTask<>();resolves.add(t);return t;}
    FakeTask<Object> commitAndClose(Snapshot snapshot,SnapshotMetadataChange ignored){Commit c=new Commit(snapshot);commits.add(c);return c.task;}
    void discardAndClose(Snapshot snapshot){snapshot.closed=true;}
    static final class Open {final String slot;final boolean create;final FakeTask<DataOrConflict<Snapshot>> task=new FakeTask<>();Open(String s,boolean c){slot=s;create=c;}}
    static final class Commit {final Snapshot snapshot;final FakeTask<Object> task=new FakeTask<>();Commit(Snapshot s){snapshot=s;}}
    static final class DataOrConflict<T> {final T data;final SnapshotConflict conflict;final boolean conflicted;DataOrConflict(T d,SnapshotConflict c,boolean v){data=d;conflict=c;conflicted=v;}T getData(){return data;}boolean isConflict(){return conflicted;}SnapshotConflict getConflict(){return conflict;}}
    static final class SnapshotConflict {final Snapshot chosen,other;SnapshotConflict(Snapshot a,Snapshot b){chosen=a;other=b;}Snapshot getSnapshot(){return chosen;}Snapshot getConflictingSnapshot(){return other;}String getConflictId(){return "conflict-id";}}
}
final class PlayGames {static SnapshotsClient getSnapshotsClient(NativeCloudCallbackAudit host){return host.client;}}
final class Log {static void w(String tag,String text){}static void w(String tag,String text,Throwable error){}}
`;
try{
 fs.writeFileSync(path.join(work,'NativeCloudCallbackAudit.java'),java);fs.copyFileSync(path.join(root,'AudiencePolicy.java'),path.join(work,'AudiencePolicy.java'));
 const args=['-encoding','UTF-8','-d',work,path.join(work,'AudiencePolicy.java'),path.join(work,'NativeCloudCallbackAudit.java')];
 try{execFileSync('javac',args,{stdio:'inherit'});}catch(error){if(error.code!=='ENOENT')throw error;execFileSync('java',['com.sun.tools.javac.Main',...args],{stdio:'inherit'});}
 execFileSync('java',['-cp',work,'com.orynexa.karadugum.NativeCloudCallbackAudit'],{stdio:'inherit'});
}finally{fs.rmSync(work,{recursive:true,force:true});}
