package com.musicplayer.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.musicplayer.app.plugins.MusicPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MusicPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
