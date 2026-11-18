package com.orynexa.karadugum;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;

/** One native, non-interactive light layer, independent of SVG/WebView composition. */
public final class TapLightOverlay extends View {
    public interface Listener {
        void painted(int sequence);
        default void stage(int sequence, String phase) { }
    }
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF bounds = new RectF();
    private final Listener listener;
    private boolean enabled, active, announced, frameQueued;
    private long start;
    private int sequence, duration;
    private final Runnable clearTask = () -> clear("elapsed_500ms");

    public TapLightOverlay(Context context, Listener listener) {
        super(context);
        this.listener = listener;
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
        setFocusable(false);
        setClickable(false);
        setWillNotDraw(false);
    }
    public boolean lightEnabled() { return enabled; }
    public long visibleSinceMs() { return start; }
    public void enabled(boolean value) { enabled=value; if(!value)clear("disabled"); }
    public void clear() { clear("lifecycle"); }
    public void cancel(int id) { if(active&&sequence==id)clear("cancelled"); }
    private void clear(String reason) {
        removeCallbacks(clearTask);boolean wasActive=active;active=false;invalidate();
        if(wasActive)listener.stage(sequence,"cleared_"+reason);
    }
    public void flash(float x,float y,float width,float height,boolean reduced,int id) {
        if(!enabled||width<=0||height<=0||!Float.isFinite(x)||!Float.isFinite(y)
                ||!Float.isFinite(width)||!Float.isFinite(height)){
            listener.stage(id,enabled?"rejected_geometry":"rejected_disabled");return;
        }
        bounds.set(Math.max(0,x),Math.max(0,y),Math.min(getWidth(),x+width),Math.min(getHeight(),y+height));
        if(bounds.width()<1||bounds.height()<1){listener.stage(id,"rejected_clipped");return;}
        removeCallbacks(clearTask);
        if(active)clear("superseded");
        sequence=id;announced=false;frameQueued=false;
        // Diagnostic build: static 500 ms even on reduced motion/slow devices.
        // This isolates duration, CSS cancellation and compositor issues without animation cost.
        duration=500;start=0;active=true;
        listener.stage(sequence,"accepted");
        // Start visible lifetime at the first actual paint, never at a queued touch.
        invalidate();
    }
    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        if(!enabled||!active)return;
        float density=getResources().getDisplayMetrics().density;
        RectF r=new RectF(bounds);r.inset(density,density);
        paint.setStyle(Paint.Style.FILL);paint.setColor(Color.argb(102,255,208,79));
        canvas.drawRoundRect(r,5*density,5*density,paint);
        paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(3*density);
        paint.setColor(Color.argb(245,255,218,116));
        canvas.drawRoundRect(r,5*density,5*density,paint);
        r.inset(2*density,2*density);paint.setStrokeWidth(density);
        paint.setColor(Color.argb(130,255,239,181));canvas.drawRoundRect(r,4*density,4*density,paint);
        if(!frameQueued){
            frameQueued=true;final int painted=sequence;
            listener.stage(painted,"drawn");
            if(isHardwareAccelerated()&&Build.VERSION.SDK_INT>=29){
                getViewTreeObserver().registerFrameCommitCallback(()->post(()->beginVisible(painted)));
            }else if(isHardwareAccelerated()){
                postOnAnimation(()->postOnAnimation(()->beginVisible(painted)));
            }else beginVisible(painted);
        }
        if(!announced)postInvalidateOnAnimation();
    }
    private void beginVisible(int painted) {
        if(!active||!enabled||sequence!=painted||announced)return;
        announced=true;start=SystemClock.uptimeMillis();postDelayed(clearTask,duration);
        listener.painted(painted);
    }
}
