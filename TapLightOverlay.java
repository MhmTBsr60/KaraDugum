package com.orynexa.karadugum;

import android.animation.ValueAnimator;
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
    public interface Listener { void painted(int sequence); }
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF bounds = new RectF();
    private final Listener listener;
    private boolean enabled, active, still, announced, frameQueued;
    private long start;
    private int sequence, duration;
    private final Runnable clearTask = this::clear;

    public TapLightOverlay(Context context, Listener listener) {
        super(context);
        this.listener = listener;
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
        setFocusable(false);
        setClickable(false);
        setWillNotDraw(false);
    }
    public void enabled(boolean value) { enabled=value; if(!value)clear(); }
    public void clear() { removeCallbacks(clearTask);active=false;invalidate(); }
    public void flash(float x,float y,float width,float height,boolean reduced,int id) {
        if(!enabled||width<=0||height<=0||!Float.isFinite(x)||!Float.isFinite(y)
                ||!Float.isFinite(width)||!Float.isFinite(height))return;
        bounds.set(Math.max(0,x),Math.max(0,y),Math.min(getWidth(),x+width),Math.min(getHeight(),y+height));
        if(bounds.width()<1||bounds.height()<1)return;
        removeCallbacks(clearTask);
        sequence=id;announced=false;frameQueued=false;still=reduced||(Build.VERSION.SDK_INT>=26&&!ValueAnimator.areAnimatorsEnabled());
        duration=still?200:260;start=0;active=true;
        // Start visible lifetime at the first actual paint, never at a queued touch.
        invalidate();
    }
    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        if(!enabled||!active)return;
        float progress=start==0?0:Math.min(1f,(SystemClock.uptimeMillis()-start)/(float)duration);
        float alpha=still?1f:progress<.25f?1f:1f-(progress-.25f)/.75f;
        float density=getResources().getDisplayMetrics().density;
        RectF r=new RectF(bounds);r.inset(density,density);
        paint.setStyle(Paint.Style.FILL);paint.setColor(Color.argb((int)(44*alpha),255,197,68));
        canvas.drawRoundRect(r,5*density,5*density,paint);
        paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(2*density);
        paint.setColor(Color.argb((int)(245*alpha),255,218,116));
        canvas.drawRoundRect(r,5*density,5*density,paint);
        r.inset(2*density,2*density);paint.setStrokeWidth(density);
        paint.setColor(Color.argb((int)(130*alpha),255,239,181));canvas.drawRoundRect(r,4*density,4*density,paint);
        if(!frameQueued){
            frameQueued=true;final int painted=sequence;
            if(isHardwareAccelerated()&&Build.VERSION.SDK_INT>=29){
                getViewTreeObserver().registerFrameCommitCallback(()->post(()->beginVisible(painted)));
            }else if(isHardwareAccelerated()){
                postOnAnimation(()->postOnAnimation(()->beginVisible(painted)));
            }else beginVisible(painted);
        }
        if(!announced||!still&&progress<1f)postInvalidateOnAnimation();
    }
    private void beginVisible(int painted) {
        if(!active||!enabled||sequence!=painted||announced)return;
        announced=true;start=SystemClock.uptimeMillis();postDelayed(clearTask,duration);
        listener.painted(painted);
        if(!still)postInvalidateOnAnimation();
    }
}
