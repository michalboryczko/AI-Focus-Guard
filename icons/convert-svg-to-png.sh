#!/bin/bash

# Script to convert SVG to PNG at different sizes
# Requires: rsvg-convert (install via: brew install librsvg)
# Or use online converter: https://cloudconvert.com/svg-to-png

echo "Converting SVG to PNG icons..."

# Check if rsvg-convert is available
if command -v rsvg-convert &> /dev/null; then
    echo "Using rsvg-convert..."
    rsvg-convert -w 16 -h 16 icon.svg -o icon16.png
    rsvg-convert -w 48 -h 48 icon.svg -o icon48.png
    rsvg-convert -w 128 -h 128 icon.svg -o icon128.png
    echo "✓ Icons created successfully!"
    echo "  - icon16.png (16x16)"
    echo "  - icon48.png (48x48)"
    echo "  - icon128.png (128x128)"
elif command -v convert &> /dev/null; then
    echo "Using ImageMagick..."
    convert -background none -resize 16x16 icon.svg icon16.png
    convert -background none -resize 48x48 icon.svg icon48.png
    convert -background none -resize 128x128 icon.svg icon128.png
    echo "✓ Icons created successfully!"
else
    echo "❌ No SVG converter found."
    echo ""
    echo "Option 1 - Install librsvg:"
    echo "  brew install librsvg"
    echo "  Then run this script again"
    echo ""
    echo "Option 2 - Install ImageMagick:"
    echo "  brew install imagemagick"
    echo "  Then run this script again"
    echo ""
    echo "Option 3 - Use online converter:"
    echo "  1. Go to https://cloudconvert.com/svg-to-png"
    echo "  2. Upload icon.svg"
    echo "  3. Convert to PNG at sizes: 16x16, 48x48, 128x128"
    echo "  4. Save as icon16.png, icon48.png, icon128.png"
    exit 1
fi
