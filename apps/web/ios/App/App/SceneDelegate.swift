import UIKit
import AppsFlyerLib
import AppTrackingTransparency
import AdSupport

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var hasRequestedATT = false

    func scene(_ scene: UIScene,
               willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let window = UIWindow(windowScene: windowScene)

        // Use our custom BridgeViewController subclass to handle background colors and bounce behavior
        let root = BridgeViewController()

        window.rootViewController = root
        self.window = window
        window.makeKeyAndVisible()

        #if DEBUG
        print("✅ SceneDelegate: Window created with BridgeViewController")
        #endif
    }

    func sceneDidDisconnect(_ scene: UIScene) {
        // Called as the scene is being released by the system.
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Called when the scene has moved from an inactive state to an active state.
        // Start AppsFlyer SDK here (required for SceneDelegate-based apps)
        if AppsFlyerConfig.isConfigured {
            AppsFlyerLib.shared().start()
            print("[AppsFlyer] start() called in sceneDidBecomeActive")
        }

        // Request ATT permission (only once, after window is visible)
        if !hasRequestedATT {
            hasRequestedATT = true
            // Delay to ensure UI is fully loaded
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                self.requestTrackingAuthorization()
            }
        }
    }

    // MARK: - App Tracking Transparency
    private func requestTrackingAuthorization() {
        if #available(iOS 14, *) {
            print("[ATT] Requesting tracking authorization...")
            ATTrackingManager.requestTrackingAuthorization { status in
                DispatchQueue.main.async {
                    switch status {
                    case .authorized:
                        let idfa = ASIdentifierManager.shared().advertisingIdentifier.uuidString
                        print("[ATT] ✅ Authorized - IDFA: \(idfa)")
                    case .denied:
                        print("[ATT] ❌ Denied by user")
                    case .notDetermined:
                        print("[ATT] ⏳ Not determined")
                    case .restricted:
                        print("[ATT] 🚫 Restricted")
                    @unknown default:
                        print("[ATT] Unknown status")
                    }
                }
            }
        } else {
            let idfa = ASIdentifierManager.shared().advertisingIdentifier.uuidString
            print("[ATT] iOS < 14 - IDFA: \(idfa)")
        }
    }

    func sceneWillResignActive(_ scene: UIScene) {
        // Called when the scene will move from an active state to an inactive state.
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        // Called as the scene transitions from the background to the foreground.
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        // Called as the scene transitions from the foreground to the background.
    }
}
