package com.fitjourney.app

import android.os.Bundle
import androidx.core.view.WindowCompat
import com.getcapacitor.BridgeActivity

/**
 * Main Activity for FitJourney Android app
 * Registers custom Capacitor plugins (AppsFlyerPlugin)
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // Register custom plugins before super.onCreate
        registerPlugin(AppsFlyerPlugin::class.java)

        super.onCreate(savedInstanceState)

        // Enable edge-to-edge display
        WindowCompat.setDecorFitsSystemWindows(window, false)
    }
}
