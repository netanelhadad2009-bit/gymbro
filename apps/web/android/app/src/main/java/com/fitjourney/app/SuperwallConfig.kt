package com.fitjourney.app

import android.util.Log

/**
 * Configuration helper for Superwall SDK
 * Mirrors iOS implementation in SuperwallConfig.swift
 *
 * To set the key, add to your gradle.properties (or local.properties for local dev):
 *   SUPERWALL_API_KEY=your_superwall_api_key_here
 */
object SuperwallConfig {
    private const val TAG = "Superwall"

    val apiKey: String
        get() = BuildConfig.SUPERWALL_API_KEY

    /**
     * Check if Superwall is properly configured (non-fatal check)
     */
    val isConfigured: Boolean
        get() = apiKey.isNotEmpty() &&
                !apiKey.startsWith("__REPLACE") &&
                !apiKey.startsWith("YOUR_")

    /**
     * Log configuration status (for debugging)
     */
    fun logStatus() {
        if (isConfigured) {
            val masked = "${apiKey.take(8)}..."
            Log.d(TAG, "Config status: configured (key: $masked)")
        } else {
            Log.w(TAG, "Config status: NOT configured - add SUPERWALL_API_KEY to gradle.properties")
        }
    }
}
