# Theme Helper

Companion extension for [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine) themes.

## Purpose
Theme Helper solves limitations in the Marinara Engine's hardcoded styles, enabling themes to more reliably customize the UI.

## Key Features
- **Bubble Opacity CSS Variable:** Extracts the message bubble opacity from the engine's slider and exposes it as `--bubble-opacity`, allowing themes to use `color-mix()` for dynamic bubble coloring.
- **Class Normalization:** Strips hardcoded Tailwind utility classes and replaces them with stable, semantic `themed-*` classes (e.g., `.themed-bubble`, `.themed-chat-input`, `.themed-popover`).
- **Guided State Support:** Adds a standard `.guided` class to elements currently undergoing guided generation.

## Settings
- There are no configurable option. It just provides some css classes for themes to use. check the comments in the js file for details on that.

## Info
- **Author:** jake9000
- **License:** CC-0, no rights reserved
- **Targeting:** Marinara Engine v1.5.6
