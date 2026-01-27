# PCRS Video Summarizer Chrome Extension

A Chrome extension that scrapes YouTube videos from UofT's PCRS learning system, fetches transcripts, and generates AI-powered summaries using ChatGPT.

## Features

- 🎥 Automatically scrapes YouTube video links from PCRS pages
- 📝 Fetches video transcripts (using YouTube's API)
- 🤖 Generates concise summaries using OpenAI's ChatGPT
- 🔢 Enumerates summaries for easy reference
- 💾 Stores your OpenAI API key securely in browser storage

## Installation

### Step 1: Get Your OpenAI API Key

1. Go to [OpenAI's Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key and copy it

### Step 2: Install the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the folder containing this extension's files

### Step 3: Add Icons (Optional)

Icons are optional. If you want custom icons, add three PNG files: `icon16.png`, `icon48.png`, and `icon128.png`. You can:
- Create simple icons yourself (16x16, 48x48, and 128x128 pixels)
- Use online icon generators
- Download free icons from icon websites

Place these PNG files in the extension's root directory.

## Usage

### Step 1: Configure API Key

1. Click the extension icon in Chrome's toolbar
2. Enter your OpenAI API key in the input field
3. Click "Save Key"

### Step 2: Scrape Videos

1. Navigate to any PCRS page with YouTube videos
2. Click the extension icon
3. Click "Scrape Videos"
4. The extension will find all YouTube videos on the page

### Step 3: Generate Summaries

1. After scraping videos, click "Generate Summaries"
2. Wait while the extension:
   - Fetches transcripts for each video
   - Sends them to ChatGPT for summarization
3. View numbered summaries in the popup

## File Structure

```
pcrsextension/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup UI
├── popup.css             # Popup styling
├── popup.js              # Main logic for UI interactions
├── content.js            # Script that scrapes PCRS pages
├── background.js         # Background service worker
├── icon16.png           # 16x16 icon (optional)
├── icon48.png           # 48x48 icon (optional)
├── icon128.png          # 128x128 icon (optional)
└── README.md            # This file
```

## How It Works

1. **Content Script** (`content.js`): Runs on PCRS pages and extracts YouTube video links
2. **Popup** (`popup.html/js`): Provides the user interface for interacting with the extension
3. **Transcript Fetching**: Uses YouTube's timedtext API to retrieve video transcripts
4. **Summary Generation**: Sends transcripts to OpenAI's GPT-3.5-turbo model for summarization
5. **Display**: Shows enumerated summaries with video titles and transcript previews

## Important Notes

### API Costs
- This extension uses OpenAI's API which charges per token
- Each video summary typically costs $0.001-0.005 depending on transcript length
- Monitor your API usage at [OpenAI Platform](https://platform.openai.com/usage)

### Transcript Availability
- Not all YouTube videos have transcripts
- The extension tries to fetch transcripts using YouTube's API
- If a transcript isn't available, you'll see an error message for that video

### PCRS Page Compatibility
- The extension is configured to work on `*.utoronto.ca` and `*.pcrs.utoronto.ca` domains
- If PCRS uses a different domain, update the `matches` field in `manifest.json`

## Troubleshooting

### No Videos Found
- Make sure you're on a PCRS page with embedded YouTube videos
- Check the browser console for any errors
- Try refreshing the page and scraping again

### Transcript Errors
- Some videos may not have transcripts available
- Try checking if the video has closed captions on YouTube directly
- The extension will skip videos without transcripts

### API Errors
- Verify your API key is correct
- Check your OpenAI account has credits
- Ensure your API key has proper permissions

### Extension Not Loading
- Make sure all files are in the same directory
- Add the three icon files (or use placeholder images)
- Check `chrome://extensions/` for any error messages

## Privacy

- Your OpenAI API key is stored locally in Chrome's storage
- No data is sent to any third parties except OpenAI
- The extension only runs on PCRS pages you explicitly visit

## Future Enhancements

Possible improvements:
- Export summaries to PDF or text file
- Support for multiple languages
- Batch processing with progress indicators
- Integration with other transcript services
- Custom summary length preferences
- Save/load summary history

## License

This project is provided as-is for educational purposes.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Verify all files are present and properly configured

---

Made for UofT PCRS students to enhance their learning experience! 📚