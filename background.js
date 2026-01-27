// Background service worker for the extension
console.log('PCRS Video Summarizer: Background service worker loaded');

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchTranscript') {
    fetchTranscriptInBackground(request.videoId)
      .then(transcript => sendResponse({ success: true, transcript }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// Function to fetch transcript in background
async function fetchTranscriptInBackground(videoId) {
  try {
    // Try YouTube's timedtext API
    const response = await fetch(
      `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`
    );
    
    if (response.ok) {
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const textNodes = xmlDoc.getElementsByTagName('text');
      
      let transcript = '';
      for (let node of textNodes) {
        transcript += node.textContent + ' ';
      }
      
      return transcript.trim();
    }
    
    throw new Error('Transcript not available');
  } catch (error) {
    throw error;
  }
}
