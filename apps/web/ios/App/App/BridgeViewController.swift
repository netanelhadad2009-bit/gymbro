import Capacitor
import UIKit
import WebKit

class BridgeViewController: CAPBridgeViewController, WKNavigationDelegate {
    private let allowedHosts: Set<String> = ["127.0.0.1", "localhost", "172.20.10.6", "0.0.0.0"]

    override func viewDidLoad() {
        super.viewDidLoad() // MUST be first so Capacitor builds WKWebView

        // Define the background color matching the web app
        let bg = UIColor(red: 0x0B/255.0, green: 0x0D/255.0, blue: 0x0E/255.0, alpha: 1.0)

        // Make the view controller's view non-opaque with dark background
        view.isOpaque = false
        view.backgroundColor = bg

        // Make the WKWebView non-opaque with dark background
        webView?.isOpaque = false
        webView?.backgroundColor = bg

        // Prevent white flashes during rubber-banding (elastic scroll)
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.contentInsetAdjustmentBehavior = .never

        // Attach navigation guard to prevent Safari opens
        if let webView = webView {
            webView.navigationDelegate = self

            // Prevent popup windows
            webView.configuration.preferences.javaScriptCanOpenWindowsAutomatically = false

            #if DEBUG
            print("✅ BridgeViewController: webView configured with navigation guard")
            #endif
        } else {
            #if DEBUG
            print("⚠️ BridgeViewController: webView is nil - Capacitor bridge may not have initialized")
            #endif
        }
    }

    // MARK: - WKNavigationDelegate (Keep navigation in WebView, prevent Safari opens)

    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {

        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        // Allow capacitor scheme and file loads
        if url.scheme == "capacitor" || url.isFileURL {
            decisionHandler(.allow)
            return
        }

        // Same-origin dev server stays in webview
        if let host = url.host, allowedHosts.contains(host) {
            decisionHandler(.allow)
            return
        }

        // If it's opening in a new frame (target=_blank), force same webview
        if navigationAction.targetFrame == nil {
            webView.load(URLRequest(url: url))
            decisionHandler(.cancel)
            return
        }

        // Default: keep in-app (cancel external, reload in same webview)
        webView.load(URLRequest(url: url))
        decisionHandler(.cancel)
    }
}
