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

  if (request.action === 'fetchTranscriptFromYTT') {
    fetchTranscriptFromYTTInBackground(request.videoId, request.apiKey)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
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

async function fetchTranscriptFromYTTInBackground(videoId, apiKeyValue) {
  const url = new URL('https://youtubetotranscript.com/');
  url.searchParams.set('v', videoId);
  if (apiKeyValue) {
    url.searchParams.set('key', apiKeyValue);
    url.searchParams.set('api_key', apiKeyValue);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'x-api-key': apiKeyValue || '',
      'Authorization': apiKeyValue ? `Bearer ${apiKeyValue}` : ''
    }
  });

  const contentType = response.headers.get('content-type') || '';
  const bodyText = await response.text();

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      contentType,
      bodyText
    };
  }

  return {
    ok: true,
    status: response.status,
    contentType,
    bodyText
  };
}
