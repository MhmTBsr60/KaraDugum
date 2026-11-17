package com.orynexa.karadugum;
public final class UiFeedbackGateAudit {
 static int checks;
 static void check(boolean ok,String label){checks++;if(!ok)throw new AssertionError(label);}
 public static void main(String[] args){
  UiFeedbackGate g=new UiFeedbackGate();
  check(!g.allow("tap",false,true,true,false,true,0),"opt-in required");
  check(!g.allow("tap",true,false,true,false,true,0),"background");
  check(!g.allow("tap",true,true,false,false,true,0),"hidden/unfocused");
  check(!g.allow("tap",true,true,true,true,true,0),"silent");
  check(!g.allow("tap",true,true,true,false,false,0),"no motor");
  check(!g.allow("unknown",true,true,true,false,true,0),"unknown");
  check(!g.allow(null,true,true,true,false,true,0),"null");
  check(g.allow("tap",true,true,true,false,true,0),"first");
  check(!g.allow("tap",true,true,true,false,true,64),"throttled");
  check(g.allow("tap",true,true,true,false,true,65),"65ms boundary");
  check(!g.allow("tap",true,true,true,false,true,64),"backwards clock");
  check(g.allow("wheelTick",true,true,true,false,true,93),"bounded short tick");
  check(!g.allow("wheelTick",true,true,true,false,true,120),"tick throttle");
  for(String k:new String[]{"tap","ui","lock","undo","chain","win","fail","wheel","reward","empty","confirm","wheelTick"})check(UiFeedbackGate.known(k),k);
  System.out.println("PASS: "+checks+" haptic eligibility, quiet/background, hardware, rate/clock and cue assertions");
 }
}
