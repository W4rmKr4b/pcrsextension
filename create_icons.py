#!/usr/bin/env python3
"""
Simple script to create placeholder PNG icons for the Chrome extension
using PIL (Pillow)
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    
    def create_icon(size, filename):
        # Create a new image with blue background
        img = Image.new('RGB', (size, size), color='#2196F3')
        draw = ImageDraw.Draw(img)
        
        # Add text
        text = "PS"
        # Use a basic font (PIL includes a default font)
        font_size = size // 2
        
        # Try to use a better font if available, otherwise use default
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", font_size)
            except:
                font = ImageFont.load_default()
        
        # Get text size using textbbox
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Calculate position to center the text
        x = (size - text_width) // 2
        y = (size - text_height) // 2
        
        # Draw the text
        draw.text((x, y), text, fill='white', font=font)
        
        # Save the image
        img.save(filename, 'PNG')
        print(f"Created {filename}")
    
    # Create all three icon sizes
    create_icon(16, 'icon16.png')
    create_icon(48, 'icon48.png')
    create_icon(128, 'icon128.png')
    
    print("\nAll icons created successfully!")
    print("The extension is now ready to use.")
    
except ImportError:
    print("PIL (Pillow) is not installed.")
    print("You can install it with: pip install Pillow")
    print("\nAlternatively, you can:")
    print("1. Open generate_icons.html in a browser to download icons")
    print("2. Create icons manually using any image editor")
    print("3. Use online icon generators")
