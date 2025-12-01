import Foundation

/// Helper to read AppsFlyer configuration from Info.plist
/// Keys: AppsFlyerDevKey, AppsFlyerAppID
enum AppsFlyerConfig {
    static var devKey: String {
        return Bundle.main.object(forInfoDictionaryKey: "AppsFlyerDevKey") as? String ?? ""
    }

    static var appId: String {
        return Bundle.main.object(forInfoDictionaryKey: "AppsFlyerAppID") as? String ?? ""
    }

    static var isConfigured: Bool {
        return !devKey.isEmpty
            && !appId.isEmpty
            && !devKey.hasPrefix("__REPLACE")
            && !appId.hasPrefix("__REPLACE")
    }

    /// Log configuration status (masks sensitive devKey)
    static func logStatus() {
        let maskedKey = devKey.isEmpty ? "(empty)" : "\(devKey.prefix(6))..."
        print("[AppsFlyer] Config status:")
        print("[AppsFlyer]   devKey: \(maskedKey)")
        print("[AppsFlyer]   appId: \(appId.isEmpty ? "(empty)" : appId)")
        print("[AppsFlyer]   isConfigured: \(isConfigured)")
    }
}
