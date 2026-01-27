#!/bin/bash

# Script to create placeholder icon files for the Chrome extension
# These are simple SVG icons that can be used until you create custom ones

echo "Creating placeholder icons..."

# Create a simple SVG icon
cat > temp_icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" fill="#2196F3"/>
  <text x="64" y="75" font-family="Arial" font-size="60" fill="white" text-anchor="middle" font-weight="bold">PS</text>
</svg>
EOF

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
    echo "Using ImageMagick to convert SVG to PNG..."
    convert temp_icon.svg -resize 16x16 icon16.png
    convert temp_icon.svg -resize 48x48 icon48.png
    convert temp_icon.svg -resize 128x128 icon128.png
    echo "Icons created successfully!"
else
    echo "ImageMagick not found. Creating a note file instead..."
    cat > ICONS_NEEDED.txt << 'EOF'
ICON FILES NEEDED
=================

This extension requires three icon files:
- icon16.png (16x16 pixels)
- icon48.png (48x48 pixels)
- icon128.png (128x128 pixels)

You can create these in several ways:

1. Use an online icon generator:
   - https://www.favicon-generator.org/
   - https://realfavicongenerator.net/

2. Use a graphics editor like:
   - GIMP (free)
   - Photoshop
   - Canva (online, free)

3. Use the temp_icon.svg file in this directory:
   - Open it in Inkscape or any SVG editor
   - Export as PNG at the three sizes listed above

4. Use simple colored squares as placeholders:
   - Any image editor can create these quickly

Design suggestions:
- Use blue (#2196F3) as the background
- Add "PS" or "PCRS" text in white
- Keep it simple and recognizable
- Make sure the design is clear at 16x16 pixels

Once created, place all three icon files in this directory.
EOF
    echo "Created ICONS_NEEDED.txt with instructions"
fi

echo "Note: You can also use any PNG images for now as placeholders."
echo "The extension will work once you add the three icon files."
