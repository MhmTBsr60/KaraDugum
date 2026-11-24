// Execute the production verification and deletion callbacks against controlled Play Games responses.
'use strict';
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-erasure-'));
const input = fs.readFileSync(path.join(__dirname, '../GameDataDeletion.java'), 'utf8');
const section = (start, stop) => input.slice(input.indexOf(start), input.indexOf(stop));
const methods = section('    private void verifyPlayer', '    private void confirm') +
    section('    private void snapshots', '    private void complete');
const source = `import java.util.*;
import java.util.function.*;
class ErasureAudit {
    String owner="A"; int errors, finished, deletes, loads; boolean stalePlayer, staleList, changePlayer, failSecond;
    String actual="A"; List<SnapshotMetadata> rows=new ArrayList<>(); int buffersClosed;
    boolean closed(){return false;} void fail(){errors++;} void complete(){finished++;}
    record Player(String id){String getPlayerId(){return id;} String getDisplayName(){return id;}}
    record Annotated<T>(T get, boolean isStale){}
    record Task<T>(T getResult, boolean isSuccessful){
        void addOnCompleteListener(Consumer<Task<T>> next){next.accept(this);}
    }
    static class Tasks {static Task<Void> whenAll(List<Task<?>> tasks){
        return new Task<>(null,tasks.stream().allMatch(Task::isSuccessful));}}
    class SnapshotMetadataBuffer extends ArrayList<SnapshotMetadata>{
        void release(){buffersClosed++;}
    }
    record SnapshotMetadata(String getUniqueName, Player getOwner, boolean hasChangePending){
        SnapshotMetadata freeze(){return this;}
    }
    static class MainActivity {static boolean isGameSave(String name){return name.equals("full")||name.equals("old");}}
    static class PlayGames {
        static ErasureAudit getPlayersClient(ErasureAudit host){return host;}
        static SnapshotsClient getSnapshotsClient(ErasureAudit host){return host.new SnapshotsClient();}
    }
    Task<Annotated<Player>> getCurrentPlayer(boolean fresh){
        return new Task<>(new Annotated<>(new Player(actual),stalePlayer),true);
    }
    class SnapshotsClient {
        Task<Annotated<SnapshotMetadataBuffer>> load(boolean fresh){
            loads++;SnapshotMetadataBuffer buffer=new SnapshotMetadataBuffer();buffer.addAll(rows);
            if(changePlayer)actual="B";
            return new Task<>(new Annotated<>(buffer,staleList),true);
        }
        Task<String> delete(SnapshotMetadata row){
            deletes++;boolean ok=!(failSecond&&deletes==2);if(ok)rows.remove(row);
            return new Task<>(row.getUniqueName(),ok);
        }
    }
    ${methods.replaceAll('com.google.android.gms.tasks.', '')}
    void run(){verifyPlayer(name -> snapshots(false));}
    void row(String name,String player){rows.add(new SnapshotMetadata(name,new Player(player),false));}
    void expect(int submitted,int success,int failures){
        if(deletes!=submitted||finished!=success||errors!=failures||buffersClosed!=loads)throw new AssertionError();
    }
    public static void main(String[] args){
        ErasureAudit h=new ErasureAudit();h.row("full","A");h.row("old","A");h.row("unrelated","A");h.run();h.expect(2,1,0);
        if(h.rows.size()!=1||!h.rows.get(0).getUniqueName().equals("unrelated"))throw new AssertionError();
        ErasureAudit mixed=new ErasureAudit();mixed.row("old","A");mixed.row("full","B");mixed.run();mixed.expect(0,0,1);
        ErasureAudit offline=new ErasureAudit();offline.staleList=true;offline.run();offline.expect(0,0,1);
        ErasureAudit wrong=new ErasureAudit();wrong.actual="B";wrong.run();wrong.expect(0,0,1);
        ErasureAudit stale=new ErasureAudit();stale.stalePlayer=true;stale.run();stale.expect(0,0,1);
        ErasureAudit empty=new ErasureAudit();empty.run();empty.expect(0,1,0);
        ErasureAudit switcher=new ErasureAudit();switcher.row("full","A");switcher.changePlayer=true;switcher.run();switcher.expect(0,0,1);
        ErasureAudit pending=new ErasureAudit();pending.rows.add(new SnapshotMetadata("full",new Player("A"),true));
        pending.run();pending.expect(0,0,1);
        ErasureAudit partial=new ErasureAudit();partial.row("old","A");partial.row("full","A");partial.failSecond=true;
        partial.run();partial.expect(2,0,1);partial.failSecond=false;partial.run();partial.expect(3,1,1);
        System.out.println("PASS: cloud deletion checks owner, freshness, pending writes, both slots, partial failure and retry");
    }
}`;
try {
    fs.writeFileSync(path.join(dir, 'ErasureAudit.java'), source);
    execFileSync('java', [path.join(dir, 'ErasureAudit.java')], {stdio:'inherit'});
} finally {fs.rmSync(dir, {recursive:true, force:true});}
