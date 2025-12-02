import Foundation
import SuperwallKit

/// Configuration helper for Superwall SDK
/// Reads SUPERWALL_API_KEY from Info.plist for secure key management
enum SuperwallConfig {
    /// Superwall API key read from Info.plist
    /// Crashes early with a clear message if key is missing or empty
    static var apiKey: String {
        guard
            let value = Bundle.main.object(forInfoDictionaryKey: "SUPERWALL_API_KEY") as? String,
            !value.isEmpty,
            !value.hasPrefix("YOUR_")  // Catch placeholder values
        else {
            fatalError("SUPERWALL_API_KEY missing or empty in Info.plist. Please add your Superwall API key.")
        }
        return value
    }

    /// Check if Superwall is properly configured (non-fatal check)
    static var isConfigured: Bool {
        guard
            let value = Bundle.main.object(forInfoDictionaryKey: "SUPERWALL_API_KEY") as? String,
            !value.isEmpty,
            !value.hasPrefix("YOUR_")
        else {
            return false
        }
        return true
    }

    /// Log configuration status (for debugging)
    static func logStatus() {
        if isConfigured {
            let masked = apiKey.prefix(8) + "..."
            print("[Superwall] Config status: configured (key: \(masked))")
        } else {
            print("[Superwall] Config status: NOT configured - add SUPERWALL_API_KEY to Info.plist")
        }
    }
}
