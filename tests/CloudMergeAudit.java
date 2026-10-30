package com.orynexa.karadugum;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import org.json.JSONArray;
import org.json.JSONObject;
public final class CloudMergeAudit {
    public static void main(String[] args)throws Exception {
        JSONArray fixtures=new JSONArray(new String(Files.readAllBytes(Paths.get(args[0])),StandardCharsets.UTF_8));
        for(int i=0;i<fixtures.length();i++){
            JSONObject f=fixtures.getJSONObject(i);JSONObject result;
            try{result=CloudMerge.merge(f.optJSONObject("a"),f.optJSONObject("b"));}catch(Exception e){if(f.optBoolean("error"))continue;throw new AssertionError("Fixture "+i,e);}
            if(f.optBoolean("error"))throw new AssertionError("Invalid fixture accepted: "+i);
            String actual=CloudMerge.canonical(result),expected=CloudMerge.canonical(f.opt("expected"));
            if(!actual.equals(expected))throw new AssertionError("Java/JavaScript mismatch at fixture "+i+"\n"+actual+"\n"+expected);
        }
        System.out.println("PASS: native Java and JavaScript cloud merge agree on "+fixtures.length()+" fixtures");
    }
}
