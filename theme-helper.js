(function () {
  "use strict";

  // ═══════════════════════════════════════════════════════════════════════════════
  //  THEME HELPER — Companion extension for Marinara Engine themes.
  //
  //  Two jobs:
  //    1. Expose message-bubble opacity as a CSS variable (--bubble-opacity)
  //       so themes can control bubble colors with color-mix().
  //    2. Strip hardcoded engine Tailwind classes and replace them with
  //       stable themed-* class names that theme CSS can target reliably.
  //
  //  Without this extension, message bubbles have an inline background-color
  //  set by the engine's opacity slider, and many UI elements carry Tailwind
  //  classes like bg-black/40 or border-white/10 that can't be overridden
  //  with CSS variables alone.
  // ═══════════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════════
  //  BUBBLE OPACITY → CSS VARIABLE
  //
  //  This is the main feature themes need.  The engine's bubble opacity
  //  slider sets an inline background-color with alpha (e.g. rgba(23,23,23,0.42)).
  //  Pure CSS cannot read that alpha value.  We extract it, normalize it to a
  //  0–1 range, and store it as --bubble-opacity on the bubble element.
  //
  //  Themes can then use it in color-mix():
  //
  //    .themed-bubble {
  //      background-color: color-mix(
  //        in srgb,
  //        var(--secondary) calc(var(--bubble-opacity, 0.6) * 100%),
  //        transparent
  //      );
  //    }
  //
  //  Because --bubble-opacity tracks the slider position, bubble colors
  //  automatically respect both the user's opacity preference AND the
  //  theme's --secondary variable.  Toggling light/dark mode works without
  //  a page refresh — color-mix() re-evaluates when the variable changes.
  // ═══════════════════════════════════════════════════════════════════════════════

  function getAlphaFromRgba(rgbaString) {
    if (!rgbaString || !rgbaString.startsWith("rgba")) return null;
    const match = rgbaString.match(/rgba\([\s\d,]+,\s*([\d.]+)\)/);
    return match ? parseFloat(match[1]) : null;
  }

  function processBubble(bubble) {
    var bg = bubble.style.backgroundColor;
    if (!bg || !bg.startsWith("rgba(")) return;
    var alpha = getAlphaFromRgba(bg);
    if (alpha === null) return;

    var isUser = !!bubble.closest(".mari-message-user");
    var theme = document.documentElement.getAttribute("data-theme");

    // Engine uses different max opacities per theme and role.
    // Dark: user 0.7, assistant 0.6.  Light: user 0.85, assistant 0.9.
    var maxAlpha;
    if (theme === "light") {
      maxAlpha = isUser ? 0.85 : 0.9;
    } else {
      maxAlpha = isUser ? 0.7 : 0.6;
    }

    var ratio = maxAlpha > 0 ? alpha / maxAlpha : 0;
    var normalized = Math.max(0, Math.min(1, ratio));

    var currentOpacity = bubble.style.getPropertyValue("--bubble-opacity");
    var newOpacity = String(normalized);
    if (currentOpacity !== newOpacity) {
      bubble.style.setProperty("--bubble-opacity", newOpacity);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  CLASS NORMALIZATION
  //
  //  The engine applies hardcoded Tailwind classes (bg-black/40, border-white/10,
  //  backdrop-blur-md, etc.) directly in JSX.  We can't change the JSX from an
  //  extension, so instead we strip those classes at runtime and add a stable
  //  themed-* class that theme CSS can hook into.
  //
  //  Stable classes added by this extension (use these in theme CSS):
  //
  //    .themed-chat-input    — the chat input bar
  //    .themed-bubble        — message bubbles (uses --bubble-opacity)
  //    .themed-hud-widget    — RP-mode HUD buttons
  //    .themed-popover       — dropdown menus / popovers
  //    .themed-action-bar    — message action row (edit, copy, delete, etc.)
  //    .themed-action-button — individual buttons inside the action bar
  //    .themed-textarea      — edit-mode textareas
  //    .themed-thinking      — "thinking..." typing indicator
  // ═══════════════════════════════════════════════════════════════════════════════

  var ENGINE_SURFACE_CLASSES = [
    "bg-black/40",
    "bg-black/60",
    "bg-black/80",
    "backdrop-blur-md",
    "backdrop-blur-xl",
    "border-white/10",
    "border-white/15",
    "ring-white/10",
    "ring-white/8",
  ];

  var ENGINE_BUTTON_CLASSES = [
    "bg-foreground/5",
    "bg-black/30",
    "bg-white/5",
    "hover:bg-black/60",
    "hover:bg-white/10",
  ];

  function normalizeStyle(el, themedClass, classesToRemove) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
    if (!classesToRemove) classesToRemove = [];
    if (!el.classList.contains(themedClass)) {
      el.classList.add(themedClass);
    }
    for (var i = 0; i < classesToRemove.length; i++) {
      if (el.classList.contains(classesToRemove[i])) {
        el.classList.remove(classesToRemove[i]);
      }
    }
  }

  function processElement(el) {
    if (!el || !el.classList) return;

    // Chat input
    if (el.classList.contains("mari-chat-input-box")) {
      normalizeStyle(el, "themed-chat-input", ENGINE_SURFACE_CLASSES);
    }

    // RP HUD widgets
    if (
      el.closest(".rpg-hud") &&
      (el.tagName === "BUTTON" ||
        el.classList.contains("rounded-xl") ||
        el.classList.contains("rounded-lg"))
    ) {
      normalizeStyle(el, "themed-hud-widget", ENGINE_SURFACE_CLASSES);
    }

    // Popovers / dropdown menus
    if (el.classList.contains("z-[9999]") || el.closest(".z-\\[9999\\]")) {
      normalizeStyle(el, "themed-popover", ENGINE_SURFACE_CLASSES);
    }

    // Message action bar
    if (el.classList.contains("mari-message-actions")) {
      normalizeStyle(el, "themed-action-bar", ENGINE_SURFACE_CLASSES);
    }
    if (
      el.closest(".mari-message-actions") &&
      (el.tagName === "BUTTON" || el.getAttribute("role") === "button")
    ) {
      normalizeStyle(el, "themed-action-button", ENGINE_BUTTON_CLASSES);
    }

    // Message bubbles — strip ring classes, then expose --bubble-opacity
    if (el.classList.contains("mari-message-bubble")) {
      normalizeStyle(el, "themed-bubble", [
        "ring-white/10",
        "ring-white/8",
        "ring-amber-400/30",
        "ring-amber-300/35",
        "saturate-75",
      ]);
      processBubble(el);
    }

    // Edit-mode textareas
    if (
      el.tagName === "TEXTAREA" &&
      (el.classList.contains("bg-black/30") ||
        el.closest(".mari-message-bubble"))
    ) {
      normalizeStyle(el, "themed-textarea", ENGINE_SURFACE_CLASSES);
    }

    // Thinking indicator
    if (
      el.classList.contains("mari-message-typing") ||
      el.closest(".mari-message-typing")
    ) {
      normalizeStyle(el, "themed-thinking", ENGINE_SURFACE_CLASSES);
    }

    // Guided state (new in Engine #263)
    var title = el.getAttribute("title") || "";
    if (title.indexOf("(guided)") !== -1) {
      if (!el.classList.contains("guided")) el.classList.add("guided");
    } else {
      if (el.classList.contains("guided")) el.classList.remove("guided");
    }

    // Conversation gradient
    // applyChatAreaGradient(el);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  CONVERSATION GRADIENT (cosmetic, optional)
  // ═══════════════════════════════════════════════════════════════════════════════

  /*
  var CONVERSATION_GRADIENT = {
    applyToRP: false,
    light: { from: "#f0f4f8", to: "#e2e8f0" },
    dark: { from: "#0a0a0e", to: "#1c2133" },
  };

  function getConversationGradient() {
    var theme = document.documentElement.getAttribute("data-theme");
    var colors =
      theme === "light" ? CONVERSATION_GRADIENT.light : CONVERSATION_GRADIENT.dark;
    return "linear-gradient(135deg, " + colors.from + ", " + colors.to + ")";
  }

  function applyChatAreaGradient(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;

    // Convo mode: override engine inline gradient
    if (
      el.classList.contains("mari-chat-area") &&
      !el.classList.contains("rpg-chat-area")
    ) {
      var gradient = getConversationGradient();
      if (el.getAttribute("data-convo-gradient") !== gradient) {
        el.style.setProperty("background", gradient, "important");
        el.setAttribute("data-convo-gradient", gradient);
      }
    }

    // RP mode: only if opted in
    if (
      CONVERSATION_GRADIENT.applyToRP &&
      el.classList.contains("rpg-chat-area")
    ) {
      var rpGradient = getConversationGradient();
      if (el.getAttribute("data-convo-gradient") !== rpGradient) {
        el.style.setProperty("background", rpGradient);
        el.setAttribute("data-convo-gradient", rpGradient);
      }
    }
  }

  function refreshAllGradients() {
    document
      .querySelectorAll(".mari-chat-area:not(.rpg-chat-area)")
      .forEach(applyChatAreaGradient);
    if (CONVERSATION_GRADIENT.applyToRP) {
      document.querySelectorAll(".rpg-chat-area").forEach(applyChatAreaGradient);
    }
  }
  */

  // ═══════════════════════════════════════════════════════════════════════════════
  //  OBSERVERS & INIT
  // ═══════════════════════════════════════════════════════════════════════════════

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === "childList") {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processElement(node);
            node.querySelectorAll("*").forEach(processElement);
          }
        });
      } else if (m.type === "attributes") {
        if (m.attributeName === "class" || m.attributeName === "style" || m.attributeName === "title") {
          processElement(m.target);
        }
      }
    }
  });

  var themeObserver = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (
        mutations[i].type === "attributes" &&
        mutations[i].attributeName === "data-theme"
      ) {
        // refreshAllGradients();
        return;
      }
    }
  });

  function init() {
    document.querySelectorAll("body *").forEach(processElement);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "title"],
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
