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
      const transcript = extractTranscriptFromTimedText(xmlText);
      if (!transcript) {
        throw new Error('Transcript not available');
      }
      return transcript;
    }
    
    throw new Error('Transcript not available');
  } catch (error) {
    throw error;
  }
}

async function fetchTranscriptFromYTTInBackground(videoId, apiKeyValue) {
  const base = 'https://youtubetotranscript.com';

  const urlVariants = buildYttUrls(base, videoId, apiKeyValue);
  const triedUrls = [];

  let lastResponse = null;

  for (const url of urlVariants) {
    triedUrls.push(redactApiKey(url, apiKeyValue));
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKeyValue || '',
        'Authorization': apiKeyValue ? `Bearer ${apiKeyValue}` : ''
      }
    });

    const contentType = response.headers.get('content-type') || '';
    const bodyText = await response.text();

    lastResponse = {
      ok: response.ok,
      status: response.status,
      contentType,
      bodyText,
      triedUrls
    };

    if (response.ok) {
      return lastResponse;
    }
  }

  return lastResponse || {
    ok: false,
    status: 0,
    contentType: '',
    bodyText: 'No response from YouTubeToTranscript',
    triedUrls
  };
}

function redactApiKey(url, apiKeyValue) {
  if (!apiKeyValue) return url;
  return url.replaceAll(apiKeyValue, 'REDACTED');
}
function buildYttUrls(base, videoId, apiKeyValue) {
  const endpoints = [
    '/',
    '/api/transcript',
    '/api/v1/transcript',
    '/api/transcripts'
  ];

  const paramSets = [
    [['v', videoId]],
    [['video_id', videoId]],
    [['videoId', videoId]],
    [['id', videoId]]
  ];

  const urls = [];

  for (const endpoint of endpoints) {
    for (const params of paramSets) {
      const url = new URL(endpoint, base);
      for (const [key, value] of params) {
        url.searchParams.set(key, value);
      }
      if (apiKeyValue) {
        url.searchParams.set('key', apiKeyValue);
        url.searchParams.set('api_key', apiKeyValue);
      }
      urls.push(url.toString());
    }
  }

  return urls;
}

function extractTranscriptFromTimedText(xmlText) {
  const textNodes = [];
  const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
  for (const match of xmlText.matchAll(regex)) {
    const rawText = match[1].replace(/<br\s*\/?>/gi, '\n');
    const decoded = decodeXmlEntities(rawText);
    if (decoded) {
      textNodes.push(decoded);
    }
  }

  return textNodes.join(' ').replace(/\s+/g, ' ').trim();
}

function decodeXmlEntities(text) {
  if (!text) return '';
  let decoded = text.replace(/&amp;/g, '&');
  decoded = decoded
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const code = Number.parseInt(hex, 16);
    return Number.isNaN(code) ? _ : String.fromCodePoint(code);
  });
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => {
    const code = Number.parseInt(num, 10);
    return Number.isNaN(code) ? _ : String.fromCodePoint(code);
  });
  return decoded;
}
