package com.fitjourney.app

import android.util.Log

/**
 * Helper to read AppsFlyer configuration from BuildConfig
 * Mirrors iOS implementation in AppsFlyerConfig.swift
 *
 * To set the key, add to your gradle.properties (or local.properties for local dev):
 *   APPSFLYER_DEV_KEY=your_appsflyer_dev_key_here
 */
object AppsFlyerConfig {
    private const val TAG = "AppsFlyer"

    val devKey: String
        get() = BuildConfig.APPSFLYER_DEV_KEY

    val isConfigured: Boolean
        get() = devKey.isNotEmpty() &&
                !devKey.startsWith("__REPLACE")

    /**
     * Log configuration status (masks sensitive devKey)
     */
    fun logStatus() {
        val maskedKey = if (devKey.isEmpty()) "(empty)" else "${devKey.take(6)}..."
        Log.d(TAG, "Config status:")
        Log.d(TAG, "  devKey: $maskedKey")
        Log.d(TAG, "  isConfigured: $isConfigured")
    }
}
