package com.fitjourney.app

import android.util.Log
import com.appsflyer.AppsFlyerLib
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor plugin to bridge AppsFlyer SDK to JavaScript
 * Mirrors iOS implementation in AppsFlyerPlugin.swift
 *
 * Usage from TypeScript:
 *   import { Capacitor, registerPlugin } from '@capacitor/core';
 *   const AppsFlyerPlugin = registerPlugin('AppsFlyerPlugin');
 *   await AppsFlyerPlugin.setCustomerUserId({ userId: 'user_123' });
 *   await AppsFlyerPlugin.logEvent({ eventName: 'purchase', eventValues: { revenue: 9.99 } });
 */
@CapacitorPlugin(name = "AppsFlyerPlugin")
class AppsFlyerPlugin : Plugin() {
    companion object {
        private const val TAG = "AppsFlyer"
    }

    /**
     * Set the customer user ID for attribution
     * Called from JS: AppsFlyerPlugin.setCustomerUserId({ userId: 'user_123' })
     */
    @PluginMethod
    fun setCustomerUserId(call: PluginCall) {
        val userId = call.getString("userId")

        if (userId.isNullOrEmpty()) {
            Log.w(TAG, "setCustomerUserId called with empty userId")
            call.reject("userId is required")
            return
        }

        activity?.runOnUiThread {
            AppsFlyerLib.getInstance().setCustomerUserId(userId)
            Log.d(TAG, "customerUserID set to: $userId")

            val result = JSObject()
            result.put("success", true)
            result.put("userId", userId)
            call.resolve(result)
        }
    }

    /**
     * Log an in-app event
     * Called from JS: AppsFlyerPlugin.logEvent({ eventName: 'purchase', eventValues: { revenue: 9.99 } })
     */
    @PluginMethod
    fun logEvent(call: PluginCall) {
        val eventName = call.getString("eventName")

        if (eventName.isNullOrEmpty()) {
            Log.w(TAG, "logEvent called with empty eventName")
            call.reject("eventName is required")
            return
        }

        val eventValuesObj = call.getObject("eventValues")
        val eventValues = mutableMapOf<String, Any>()

        // Convert JSObject to Map
        eventValuesObj?.keys()?.forEach { key ->
            eventValuesObj.get(key)?.let { value ->
                eventValues[key] = value
            }
        }

        activity?.runOnUiThread {
            Log.d(TAG, "Logging event: $eventName")
            Log.d(TAG, "   values: $eventValues")

            AppsFlyerLib.getInstance().logEvent(context, eventName, eventValues)

            val result = JSObject()
            result.put("success", true)
            result.put("eventName", eventName)
            call.resolve(result)
        }
    }

    /**
     * Get the AppsFlyer unique device ID
     * Called from JS: AppsFlyerPlugin.getAppsFlyerUID()
     */
    @PluginMethod
    fun getAppsFlyerUID(call: PluginCall) {
        activity?.runOnUiThread {
            val uid = AppsFlyerLib.getInstance().getAppsFlyerUID(context) ?: ""
            Log.d(TAG, "getAppsFlyerUID: ${if (uid.isEmpty()) "(not available)" else uid}")

            val result = JSObject()
            result.put("uid", uid)
            call.resolve(result)
        }
    }
}
