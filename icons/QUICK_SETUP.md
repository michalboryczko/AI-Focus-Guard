# Quick Icon Setup

## Fastest Method: Use Online Emoji-to-PNG Converter

1. Go to: https://emoji-to-png.com/
2. Select the 🎯 emoji (or any focus-related emoji like 🧠, 🔍, 👁️)
3. Download at these sizes:
   - 16x16 → Save as `icon16.png`
   - 48x48 → Save as `icon48.png`
   - 128x128 → Save as `icon128.png`
4. Move the files to this `icons` folder

## Alternative: Use Favicon Generator

1. Go to: https://favicon.io/favicon-generator/
2. Configure:
   - Text: "FG" or "🎯"
   - Background: Rounded, Blue (#4a90e2)
   - Font: Any
3. Click "Download"
4. Extract ZIP and copy:
   - `favicon-16x16.png` → Rename to `icon16.png`
   - `favicon-32x32.png` → Resize to 48x48 → Save as `icon48.png`
   - `android-chrome-192x192.png` → Resize to 128x128 → Save as `icon128.png`

## Alternative: Simple Colored Squares (For Testing Only)

If you just want to test the extension without proper icons, you can create simple colored squares:

1. Open any image editor (even MS Paint)
2. Create new image:
   - 16x16 pixels, fill with blue, save as `icon16.png`
   - 48x48 pixels, fill with blue, save as `icon48.png`
   - 128x128 pixels, fill with blue, save as `icon128.png`
3. Save all to this folder

## Using macOS Preview (Mac Users)

1. Open Preview
2. File → New from Clipboard (after copying any image/emoji)
3. Tools → Adjust Size → Set to 16x16, 48x48, or 128x128
4. File → Export → Save as PNG

## Temporary: Skip Icons

If you want to test without icons:
1. Edit `manifest.json`
2. Remove the `"action"` section's `"default_icon"` property
3. Remove the `"icons"` section
4. The extension will work with Chrome's default icon
