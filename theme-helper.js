(function() {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────────
    // CONFIGURATION - Edit these values to customize your conversation theme
    // ─────────────────────────────────────────────────────────────────────────────
    const CONVERSATION_GRADIENT = {
        // Whether to apply conversation gradient to RP mode as well
        applyToRP: false,
        // Light mode gradient
        light: { from: '#f0f4f8', to: '#e2e8f0' },
        // Dark mode gradient
        dark:  { from: '#0a0a0e', to: '#1c2133' },
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────────

    function getAlphaFromRgba(rgbaString) {
        if (!rgbaString || !rgbaString.startsWith('rgba')) {
            return null;
        }
        const match = rgbaString.match(/rgba\([\s\d,]+,\s*([\d.]+)\)/);
        return match ? parseFloat(match[1]) : null;
    }

    function hexToRgb(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.startsWith('#')) {
            hex = hex.slice(1);
            if (hex.length === 3) {
                r = parseInt(hex[0] + hex[0], 16);
                g = parseInt(hex[1] + hex[1], 16);
                b = parseInt(hex[2] + hex[2], 16);
            } else if (hex.length === 6) {
                r = parseInt(hex.slice(0, 2), 16);
                g = parseInt(hex.slice(2, 4), 16);
                b = parseInt(hex.slice(4, 6), 16);
            }
        } else if (hex.startsWith('rgb')) {
            const match = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
            if (match) {
                return `${match[1]}, ${match[2]}, ${match[3]}`;
            }
        }
        return `${r}, ${g}, ${b}`;
    }

    /**
     * Reads the current light/dark mode from the <html> data-theme attribute
     * and returns the CSS gradient string for the active theme.
     * Falls back to dark gradient if no data-theme is set.
     */
    function getConversationGradient() {
        const theme = document.documentElement.getAttribute('data-theme');
        const colors = theme === 'light' ? CONVERSATION_GRADIENT.light : CONVERSATION_GRADIENT.dark;
        return `linear-gradient(135deg, ${colors.from}, ${colors.to})`;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // NORMALIZATION LOGIC
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Cleans an element of hardcoded engine styles and adds a stable themed class.
     */
    function normalizeStyle(el, themedClass, classesToRemove = []) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return;

        // Add the stable themed class
        if (!el.classList.contains(themedClass)) {
            el.classList.add(themedClass);
        }

        // Remove problematic engine classes
        classesToRemove.forEach(cls => {
            if (el.classList.contains(cls)) {
                el.classList.remove(cls);
            }
        });
    }

    const ENGINE_SURFACE_CLASSES = ['bg-black/40', 'bg-black/60', 'bg-black/80', 'backdrop-blur-md', 'backdrop-blur-xl', 'border-white/10', 'border-white/15', 'ring-white/10', 'ring-white/8'];
    const ENGINE_BUTTON_CLASSES = ['bg-foreground/5', 'bg-black/30', 'bg-white/5', 'hover:bg-black/60', 'hover:bg-white/10'];

    /**
     * Apply the conversation gradient to a .mari-chat-area element.
     *
     * Convo mode:  Overrides the engine's inline background gradient.
     * RP mode:     Only applied if CONVERSATION_GRADIENT.applyToRP is true.
     *              Sets the gradient as a default background; shows when no
     *              chatBackground image is configured (the CrossfadeBackground
     *              renders on top with absolute positioning).
     */
    function applyChatAreaGradient(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return;

        // Convo mode (ConversationView): .mari-chat-area without .rpg-chat-area
        // This overrides the engine's inline background gradient style
        if (el.classList.contains('mari-chat-area') && !el.classList.contains('rpg-chat-area')) {
            const gradient = getConversationGradient();
            // Only update if the gradient has changed (avoids redundant DOM writes)
            if (el.getAttribute('data-convo-gradient') !== gradient) {
                el.style.setProperty('background', gradient, 'important');
                el.setAttribute('data-convo-gradient', gradient);
            }
        }

        // RP mode: .rpg-chat-area — only if applyToRP is enabled
        if (CONVERSATION_GRADIENT.applyToRP && el.classList.contains('rpg-chat-area')) {
            const gradient = getConversationGradient();
            if (el.getAttribute('data-convo-gradient') !== gradient) {
                // Don't use !important here — let the background image stack on top
                // if one is configured. This serves as the default background.
                el.style.setProperty('background', gradient);
                el.setAttribute('data-convo-gradient', gradient);
            }
        }
    }

    /**
     * Refreshes the gradient on all existing .mari-chat-area elements.
     * Called when the light/dark theme changes (data-theme attribute on <html>).
     */
    function refreshAllGradients() {
        // Convo areas (ConversationView)
        document.querySelectorAll('.mari-chat-area:not(.rpg-chat-area)').forEach(applyChatAreaGradient);
        // RP areas (if enabled)
        if (CONVERSATION_GRADIENT.applyToRP) {
            document.querySelectorAll('.rpg-chat-area').forEach(applyChatAreaGradient);
        }
    }

    function processElement(el) {
        // Chat Input Box
        if (el.classList.contains('mari-chat-input-box')) {
            normalizeStyle(el, 'themed-chat-input', ENGINE_SURFACE_CLASSES);
        }

        // Roleplay HUD Widgets
        if (el.closest('.rpg-hud') && (el.tagName === 'BUTTON' || el.classList.contains('rounded-xl') || el.classList.contains('rounded-lg'))) {
            normalizeStyle(el, 'themed-hud-widget', ENGINE_SURFACE_CLASSES);
        }

        // Popovers and Menus (z-9999 is a common engine indicator for portals)
        if (el.classList.contains('z-[9999]') || el.closest('.z-\\[9999\\]')) {
            normalizeStyle(el, 'themed-popover', ENGINE_SURFACE_CLASSES);
        }

        // Message Actions
        if (el.classList.contains('mari-message-actions')) {
            normalizeStyle(el, 'themed-action-bar', ENGINE_SURFACE_CLASSES);
        }
        if (el.closest('.mari-message-actions') && (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button')) {
            normalizeStyle(el, 'themed-action-button', ENGINE_BUTTON_CLASSES);
        }

        // Message Bubbles
        if (el.classList.contains('mari-message-bubble')) {
            normalizeStyle(el, 'themed-bubble', ['ring-white/10', 'ring-white/8', 'ring-amber-400/30']);
            processBubble(el); // Still need the alpha correction logic
        }

        // Textareas (Edit mode)
        if (el.tagName === 'TEXTAREA' && (el.classList.contains('bg-black/30') || el.closest('.mari-message-bubble'))) {
            normalizeStyle(el, 'themed-textarea', ENGINE_SURFACE_CLASSES);
        }
        
        // Thinking Indicator
        if (el.classList.contains('mari-message-typing') || el.closest('.mari-message-typing')) {
            normalizeStyle(el, 'themed-thinking', ENGINE_SURFACE_CLASSES);
        }

        // ── Conversation Gradient ──
        // Apply themed gradient to .mari-chat-area containers
        applyChatAreaGradient(el);
    }

    function processBubble(bubble) {
        const originalBgColor = bubble.style.backgroundColor;
        if (originalBgColor && originalBgColor.startsWith('rgba(23, 23, 23')) {
            const rawAlpha = getAlphaFromRgba(originalBgColor);
            if (rawAlpha !== null) {
                const isUserBubble = bubble.closest('.mari-message-user');
                const maxAlpha = isUserBubble ? 0.7 : 0.6;
                const sliderPercentage = maxAlpha > 0 ? rawAlpha / maxAlpha : 0;
                const finalAlpha = Math.max(0, Math.min(1, sliderPercentage));

                // Store opacity as CSS custom property so the CSS rule can
                // use color-mix() with the current --secondary value.
                // This lets bubbles react to theme changes (dark/light) without
                // requiring re-processing or a page refresh.
                bubble.style.setProperty('--bubble-opacity', String(finalAlpha));
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // OBSERVER & INIT
    // ─────────────────────────────────────────────────────────────────────────────

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        processElement(node);
                        node.querySelectorAll('*').forEach(processElement);
                    }
                });
            } else if (mutation.type === 'attributes') {
                if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
                    processElement(mutation.target);
                }
            }
        }
    });

    /**
     * Watches the <html> element for data-theme attribute changes.
     * When the user switches between light and dark mode, this refreshes
     * all conversation gradients to use the appropriate color scheme.
     *
     * This works because the engine sets data-theme="light" or data-theme="dark"
     * on the <html> element when the user changes the color scheme setting.
     */
    const themeObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                refreshAllGradients();
                return; // Only need to refresh once per batch
            }
        }
    });

    function init() {
        document.querySelectorAll('body *').forEach(processElement);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        // Watch for light/dark theme switches
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();