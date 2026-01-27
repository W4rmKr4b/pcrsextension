# Quick Setup Guide for PCRS Video Summarizer

## What You Have

Your Chrome extension is complete! All the code files are ready:

✅ manifest.json - Extension configuration
✅ popup.html/css/js - User interface
✅ content.js - Scrapes videos from PCRS
✅ background.js - Background processes
✅ README.md - Full documentation

## What You Need to Do

### 1. Create Icon Files (Required)

The extension needs 3 icon files. Choose ONE method:

**Method A: Use the Python script (Easiest if you have Pillow)**
```bash
pip install Pillow
python3 create_icons.py
```

**Method B: Use the HTML file**
- Open `generate_icons.html` in any web browser
- It will automatically download 3 icon files
- Move them to the extension folder

**Method C: Create manually**
- Create 3 blue square images with "PS" text in white
- Sizes: 16x16, 48x48, 128x128 pixels
- Name them: icon16.png, icon48.png, icon128.png
- Tools: Paint, GIMP, Photoshop, Canva, etc.

**Method D: Use online generators**
- Visit https://www.favicon-generator.org/
- Upload any image
- Download the generated icons
- Rename to match required names

### 2. Load the Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select the `/workspaces/pcrsextension` folder
6. The extension should now appear in your extensions list

### 3. Configure Your API Keys

1. Get an OpenAI API key from https://platform.openai.com/
2. Get a YouTubeToTranscript API key from your provider
3. Click the extension icon in Chrome
4. Enter your OpenAI API key and click "Save Key"
5. Enter your YouTubeToTranscript API key and click "Save Key"

### 4. Use the Extension

1. Go to any UofT PCRS page with YouTube videos
2. Click the extension icon
3. Click "Scrape Videos"
4. Click "Generate Summaries"
5. Wait for AI-generated summaries to appear

## Troubleshooting

**Icons Missing Error:**
- You must create the 3 icon files first
- Use any of the methods above

**No Videos Found:**
- Make sure you're on a PCRS page
- The page must have embedded YouTube videos
- Check browser console for errors (F12)

**API Errors:**
- Verify your OpenAI API key is valid
- Verify your YouTubeToTranscript API key is valid
- Check you have credits in your OpenAI account
- Make sure the keys have proper permissions

**Extension Not Loading:**
- Ensure all files are in the same folder
- Check for syntax errors in Chrome's extension page
- Look at the "Errors" button on the extension card

## File Checklist

Before loading the extension, ensure you have:
- [ ] manifest.json
- [ ] popup.html
- [ ] popup.css
- [ ] popup.js
- [ ] content.js
- [ ] background.js
- [ ] icon16.png ⚠️ YOU NEED TO CREATE THIS
- [ ] icon48.png ⚠️ YOU NEED TO CREATE THIS
- [ ] icon128.png ⚠️ YOU NEED TO CREATE THIS

## Next Steps

1. Create the 3 icon files using any method above
2. Load the extension in Chrome
3. Add your OpenAI API key
4. Start summarizing PCRS videos!

## Questions?

Check the full README.md for detailed documentation and troubleshooting.
