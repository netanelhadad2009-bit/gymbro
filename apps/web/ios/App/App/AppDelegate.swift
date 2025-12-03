import UIKit
import Capacitor
import AppsFlyerLib
import SuperwallKit
import AppTrackingTransparency
import AdSupport

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.

        #if DEBUG
        // Log the Capacitor dev URL at runtime by reading capacitor.config.json
        if let configPath = Bundle.main.path(forResource: "capacitor.config", ofType: "json"),
           let configData = try? Data(contentsOf: URL(fileURLWithPath: configPath)),
           let config = try? JSONSerialization.jsonObject(with: configData) as? [String: Any] {
            if let server = config["server"] as? [String: Any],
               let url = server["url"] as? String {
                print("🔧 Capacitor dev URL:", url)
            } else {
                print("📦 Capacitor: Using bundled web assets")
            }
        }
        #endif

        // MARK: - AppsFlyer SDK Initialization
        AppsFlyerConfig.logStatus()
        if AppsFlyerConfig.isConfigured {
            let af = AppsFlyerLib.shared()
            af.appsFlyerDevKey = AppsFlyerConfig.devKey
            af.appleAppID = AppsFlyerConfig.appId
            af.delegate = self
            // Wait up to 60 seconds for ATT user authorization before sending first launch
            af.waitForATTUserAuthorization(timeoutInterval: 60)
            // NOTE: Set isDebug = false before App Store release
            #if DEBUG
            af.isDebug = true
            print("[AppsFlyer] Debug mode ENABLED (set isDebug=false for production)")
            #else
            af.isDebug = false
            #endif
            print("[AppsFlyer] ✅ SDK initialized successfully")
        } else {
            print("[AppsFlyer] ⚠️ SDK not configured - check Info.plist keys")
        }

        // NOTE: ATT permission is now requested in SceneDelegate.sceneDidBecomeActive
        // after the window is visible (required for the popup to appear)

        // MARK: - Superwall SDK Initialization (after AppsFlyer)
        SuperwallConfig.logStatus()
        if SuperwallConfig.isConfigured {
            Superwall.configure(apiKey: SuperwallConfig.apiKey)
            Superwall.shared.delegate = self
            print("[Superwall] ✅ SDK initialized successfully")
        } else {
            print("[Superwall] ⚠️ SDK not configured - add SUPERWALL_API_KEY to Info.plist")
        }

        // MARK: - Debug: Log IDFV for AppsFlyer test device registration
        #if DEBUG
        if let idfv = UIDevice.current.identifierForVendor?.uuidString {
            print("[Debug] IDFV:", idfv)
        } else {
            print("[Debug] IDFV is nil")
        }
        #endif

        return true
    }

    // MARK: - AppsFlyer App Lifecycle
    func applicationDidBecomeActive(_ application: UIApplication) {
        if AppsFlyerConfig.isConfigured {
            AppsFlyerLib.shared().start()
            print("[AppsFlyer] start() called in applicationDidBecomeActive")
        }
    }

    // MARK: - Push Notification Delegates
    // These methods forward APNs events to Capacitor's PushNotifications plugin

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Convert token to hex string for logging
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("📱 [APNs] Received device token: \(tokenString.prefix(20))...")

        // Forward to Capacitor's notification handler
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ [APNs] Failed to register: \(error.localizedDescription)")

        // Forward error to Capacitor
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    // MARK: UISceneSession Lifecycle

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        // Called when a new scene session is being created.
        // Use this method to select a configuration to create the new scene with.
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
        // Called when the user discards a scene session.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// MARK: - AppsFlyer Delegate
extension AppDelegate: AppsFlyerLibDelegate {
    func onConversionDataSuccess(_ installData: [AnyHashable : Any]) {
        print("[AppsFlyer] onConversionDataSuccess: \(installData)")
    }

    func onConversionDataFail(_ error: Error) {
        print("[AppsFlyer] onConversionDataFail: \(error.localizedDescription)")
    }
}

// MARK: - Superwall Delegate
extension AppDelegate: SuperwallDelegate {
    func handleSuperwallEvent(withInfo eventInfo: SuperwallEventInfo) {
        print("[Superwall] Event: \(eventInfo.event)")
    }

    func subscriptionStatusDidChange(to newValue: SubscriptionStatus) {
        print("[Superwall] Subscription status changed: \(newValue)")
    }

    func handleLog(level: String, scope: String, message: String?, info: [String : Any]?, error: Error?) {
        #if DEBUG
        let logMessage = message ?? "No message"
        print("[Superwall] [\(level)] [\(scope)] \(logMessage)")
        if let error = error {
            print("[Superwall] Error: \(error.localizedDescription)")
        }
        #endif
    }
}
