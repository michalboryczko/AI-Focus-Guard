# Extension Icons

This directory should contain three icon files for the extension:

- **icon16.png** - 16x16 pixels (toolbar icon)
- **icon48.png** - 48x48 pixels (extensions page)
- **icon128.png** - 128x128 pixels (Chrome Web Store)

## Quick Icon Creation Options

### Option 1: Use an Online Tool
1. Go to https://favicon.io/favicon-generator/
2. Create a simple icon with text (e.g., "🎯" or "FG")
3. Download and extract the generated icons
4. Rename them to match the required names above

### Option 2: Use Emoji
1. Find a focus-related emoji (🎯, 🔍, 🧠, etc.)
2. Take a screenshot or use an emoji-to-image tool
3. Resize to the required dimensions using an image editor

### Option 3: Create Simple Icons
1. Open any image editor (Paint, GIMP, Photoshop, etc.)
2. Create a new image with the required dimensions
3. Add a simple shape or text
4. Save as PNG

### Option 4: Use AI Generation
1. Use DALL-E, Midjourney, or similar to generate an icon
2. Resize to required dimensions

## Design Tips

- **Simple is better**: Small icons should be clear and recognizable
- **High contrast**: Use colors that stand out in the browser toolbar
- **Consistent theme**: Use the same design for all three sizes
- **Focus-related**: Consider symbols like target (🎯), brain (🧠), or eye (👁️)

## Temporary Workaround

If you want to test the extension without icons:

1. Open `manifest.json`
2. Remove or comment out the `action.default_icon` and `icons` sections
3. The extension will work but show a default Chrome icon

## Color Suggestions

Based on the extension theme:
- Primary: Blue (#4a90e2) - Focus and productivity
- Accent: Green (#27ae60) - On-topic state
- Warning: Orange (#f39c12) - Borderline state
- Alert: Red (#e74c3c) - Off-topic state
