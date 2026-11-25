# The local WebView calls this public, annotated API by name.
-keepattributes RuntimeVisibleAnnotations,AnnotationDefault
-keepclassmembers class com.orynexa.karadugum.** {
    @android.webkit.JavascriptInterface <methods>;
}
