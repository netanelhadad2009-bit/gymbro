package com.fitjourney.app

import android.os.Bundle
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
    }
}
