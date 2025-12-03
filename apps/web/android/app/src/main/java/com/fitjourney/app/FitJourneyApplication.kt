package com.fitjourney.app

import android.app.Application
import android.util.Log
import com.appsflyer.AppsFlyerConversionListener
import com.appsflyer.AppsFlyerLib
import com.superwall.sdk.Superwall

/**
 * FitJourney Application class
 * Initializes AppsFlyer and Superwall SDKs at app startup
 * Mirrors iOS AppDelegate implementation
 */
class FitJourneyApplication : Application() {

    companion object {
        private const val TAG = "FitJourneyApp"
    }

    override fun onCreate() {
        super.onCreate()

        // MARK: - AppsFlyer SDK Initialization
        initializeAppsFlyer()

        // MARK: - Superwall SDK Initialization (after AppsFlyer)
        initializeSuperwall()

        // MARK: - Debug: Log Android ID for test device registration
        if (BuildConfig.DEBUG) {
            val androidId = android.provider.Settings.Secure.getString(
                contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            )
            Log.d(TAG, "[Debug] Android ID: $androidId")
        }
    }

    private fun initializeAppsFlyer() {
        AppsFlyerConfig.logStatus()

        if (!AppsFlyerConfig.isConfigured) {
            Log.w(TAG, "[AppsFlyer] SDK not configured - check gradle.properties for APPSFLYER_DEV_KEY")
            return
        }

        val conversionListener = object : AppsFlyerConversionListener {
            override fun onConversionDataSuccess(conversionData: MutableMap<String, Any>?) {
                Log.d(TAG, "[AppsFlyer] onConversionDataSuccess: $conversionData")
            }

            override fun onConversionDataFail(errorMessage: String?) {
                Log.e(TAG, "[AppsFlyer] onConversionDataFail: $errorMessage")
            }

            override fun onAppOpenAttribution(attributionData: MutableMap<String, String>?) {
                Log.d(TAG, "[AppsFlyer] onAppOpenAttribution: $attributionData")
            }

            override fun onAttributionFailure(errorMessage: String?) {
                Log.e(TAG, "[AppsFlyer] onAttributionFailure: $errorMessage")
            }
        }

        AppsFlyerLib.getInstance().apply {
            // Initialize with dev key and conversion listener
            init(AppsFlyerConfig.devKey, conversionListener, this@FitJourneyApplication)

            // Set debug mode based on build type
            setDebugLog(BuildConfig.DEBUG)
            if (BuildConfig.DEBUG) {
                Log.d(TAG, "[AppsFlyer] Debug mode ENABLED (set setDebugLog(false) for production)")
            }

            // Start the SDK
            start(this@FitJourneyApplication)
        }

        Log.d(TAG, "[AppsFlyer] SDK initialized successfully")
    }

    private fun initializeSuperwall() {
        SuperwallConfig.logStatus()

        if (!SuperwallConfig.isConfigured) {
            Log.w(TAG, "[Superwall] SDK not configured - add SUPERWALL_API_KEY to local.properties")
            return
        }

        try {
            // Configure Superwall SDK 2.x
            Superwall.configure(this, SuperwallConfig.apiKey)
            Log.d(TAG, "[Superwall] SDK initialized successfully")
        } catch (e: Exception) {
            Log.e(TAG, "[Superwall] Failed to initialize: ${e.localizedMessage}")
        }
    }
}
