// Mobile adaptation script for Android WebView
(function () {
  "use strict";

  // 1. Ensure viewport meta tag is set correctly
  function ensureViewport() {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      document.head.appendChild(viewport);
    }
    // Only set if not already configured for mobile
    if (!viewport.content || viewport.content.indexOf("width=") === -1) {
      viewport.content =
        "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover";
    }
  }

  // 2. Force mobile layout via CSS hints
  function injectMobileStyles() {
    const style = document.createElement("style");
    style.id = "pake-mobile-styles";
    style.textContent = `
      /* Ensure body uses full width */
      html, body {
        -webkit-text-size-adjust: 100%;
        -webkit-tap-highlight-color: transparent;
        overflow-x: hidden;
      }

      /* Safe area insets for notch/home indicator */
      body {
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      }

      /* Better touch targets */
      a, button, input, select, textarea {
        min-height: 44px;
        min-width: 44px;
      }

      /* Prevent horizontal scroll */
      * {
        max-width: 100vw;
        box-sizing: border-box;
      }

      /* Smooth scrolling */
      html {
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
      }

      /* Disable text selection on UI elements */
      button, a, nav, header, footer {
        -webkit-user-select: none;
        user-select: none;
      }

      /* Allow text selection in content areas */
      p, span, li, td, th, h1, h2, h3, h4, h5, h6, article, section {
        -webkit-user-select: text;
        user-select: text;
      }

      /* Fix for fixed position elements */
      [style*="position: fixed"], [style*="position:fixed"] {
        max-width: 100vw !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 3. Handle orientation change
  function handleOrientation() {
    window.addEventListener("orientationchange", function () {
      setTimeout(function () {
        window.scrollTo(0, 0);
      }, 100);
    });
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      ensureViewport();
      injectMobileStyles();
      handleOrientation();
    });
  } else {
    ensureViewport();
    injectMobileStyles();
    handleOrientation();
  }
})();
