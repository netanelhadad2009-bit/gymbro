import Foundation
import Capacitor
import AppsFlyerLib

/// Capacitor plugin to bridge AppsFlyer SDK to JavaScript
///
/// Usage from TypeScript:
///   import { Capacitor, registerPlugin } from '@capacitor/core';
///   const AppsFlyerPlugin = registerPlugin('AppsFlyerPlugin');
///   await AppsFlyerPlugin.setCustomerUserId({ userId: 'user_123' });
///   await AppsFlyerPlugin.logEvent({ eventName: 'purchase', eventValues: { revenue: 9.99 } });
///
@objc(AppsFlyerPlugin)
public class AppsFlyerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppsFlyerPlugin"
    public let jsName = "AppsFlyerPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setCustomerUserId", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logEvent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAppsFlyerUID", returnType: CAPPluginReturnPromise),
    ]

    /// Set the customer user ID for attribution
    /// Called from JS: AppsFlyerPlugin.setCustomerUserId({ userId: 'user_123' })
    @objc func setCustomerUserId(_ call: CAPPluginCall) {
        guard let userId = call.getString("userId"), !userId.isEmpty else {
            print("[AppsFlyer] setCustomerUserId called with empty userId")
            call.reject("userId is required")
            return
        }

        DispatchQueue.main.async {
            AppsFlyerLib.shared().customerUserID = userId
            print("[AppsFlyer] ✅ customerUserID set to: \(userId)")
            call.resolve(["success": true, "userId": userId])
        }
    }

    /// Log an in-app event
    /// Called from JS: AppsFlyerPlugin.logEvent({ eventName: 'purchase', eventValues: { revenue: 9.99 } })
    @objc func logEvent(_ call: CAPPluginCall) {
        guard let eventName = call.getString("eventName"), !eventName.isEmpty else {
            print("[AppsFlyer] logEvent called with empty eventName")
            call.reject("eventName is required")
            return
        }

        let eventValues = call.getObject("eventValues") ?? [:]

        DispatchQueue.main.async {
            print("[AppsFlyer] 📊 Logging event: \(eventName)")
            print("[AppsFlyer]    values: \(eventValues)")

            AppsFlyerLib.shared().logEvent(eventName, withValues: eventValues)
            call.resolve(["success": true, "eventName": eventName])
        }
    }

    /// Get the AppsFlyer unique device ID
    /// Called from JS: AppsFlyerPlugin.getAppsFlyerUID()
    @objc func getAppsFlyerUID(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let uid = AppsFlyerLib.shared().getAppsFlyerUID() ?? ""
            print("[AppsFlyer] getAppsFlyerUID: \(uid.isEmpty ? "(not available)" : uid)")
            call.resolve(["uid": uid])
        }
    }
}
