// Popup script to handle user interactions
let scrapedVideos = [];
let apiKey = '';
let yttApiKey = '';

// Load saved API key on popup open
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.local.get(['openaiApiKey', 'yttApiKey']);
  if (result.openaiApiKey) {
    apiKey = result.openaiApiKey;
    document.getElementById('apiKey').value = '••••••••';
  }
  if (result.yttApiKey) {
    yttApiKey = result.yttApiKey;
    document.getElementById('yttApiKey').value = '••••••••';
  }
});

// Save API key
document.getElementById('saveApiKey').addEventListener('click', async () => {
  const input = document.getElementById('apiKey');
  const key = input.value;
  
  if (key && key !== '••••••••') {
    await chrome.storage.local.set({ openaiApiKey: key });
    apiKey = key;
    input.value = '••••••••';
    showStatus('API key saved successfully!', 'success');
  }
});

// Save YouTubeToTranscript API key
document.getElementById('saveYttApiKey').addEventListener('click', async () => {
  const input = document.getElementById('yttApiKey');
  const key = input.value;

  if (key && key !== '••••••••') {
    await chrome.storage.local.set({ yttApiKey: key });
    yttApiKey = key;
    input.value = '••••••••';
    showStatus('YouTubeToTranscript API key saved successfully!', 'success');
  }
});

async function scrapeVideosFromCurrentTab() {
  showStatus('Scraping videos from page...', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getYouTubeLinks' });

    if (response && response.links && response.links.length > 0) {
      scrapedVideos = response.links;
      displayVideos(scrapedVideos);
      showStatus(`Found ${scrapedVideos.length} video(s)!`, 'success');
      return true;
    }

    showStatus('No YouTube videos found on this page.', 'error');
    scrapedVideos = [];
    return false;
  } catch (error) {
    console.error('Error scraping videos:', error);
    showStatus('Error: Make sure you are on a PCRS page.', 'error');
    scrapedVideos = [];
    return false;
  }
}

// Generate summaries for all videos
document.getElementById('generateSummaries').addEventListener('click', async () => {
  if (!apiKey || apiKey === '••••••••') {
    const result = await chrome.storage.local.get(['openaiApiKey']);
    if (!result.openaiApiKey) {
      showStatus('Please enter your OpenAI API key first!', 'error');
      return;
    }
    apiKey = result.openaiApiKey;
  }

  if (!yttApiKey || yttApiKey === '••••••••') {
    const result = await chrome.storage.local.get(['yttApiKey']);
    if (!result.yttApiKey) {
      showStatus('Please enter your YouTubeToTranscript API key first!', 'error');
      return;
    }
    yttApiKey = result.yttApiKey;
  }
  
  document.getElementById('generateSummaries').disabled = true;

  const foundVideos = await scrapeVideosFromCurrentTab();
  if (!foundVideos || scrapedVideos.length === 0) {
    document.getElementById('generateSummaries').disabled = false;
    return;
  }

  showStatus('Fetching transcripts and generating summaries...', 'info');

  const summariesContainer = document.getElementById('summaries');
  summariesContainer.innerHTML = '';
  
  for (let i = 0; i < scrapedVideos.length; i++) {
    const video = scrapedVideos[i];
    showStatus(`Processing video ${i + 1} of ${scrapedVideos.length}...`, 'info');
    
    try {
      // Fetch transcript
      const transcript = await fetchTranscript(video.videoId);
      
      if (!transcript) {
        appendSummary(i + 1, video, null, 'Failed to fetch transcript');
        continue;
      }
      
      // Generate summary
      const summary = await generateSummary(transcript, video.title);
      appendSummary(i + 1, video, transcript, summary);

      // Small pacing delay to reduce rate-limit risk
      await sleep(750);
      
    } catch (error) {
      console.error(`Error processing video ${video.videoId}:`, error);
      appendSummary(i + 1, video, null, `Error: ${error.message}`);
    }
  }
  
  showStatus('All summaries generated!', 'success');
  document.getElementById('generateSummaries').disabled = false;
});

// Fetch transcript from youtubetotranscript.com
async function fetchTranscript(videoId) {
  try {
    const transcript = await fetchTranscriptFromYTT(videoId, yttApiKey);
    if (transcript) {
      return transcript;
    }
    addDebug('YTT returned empty transcript, falling back to YouTube timedtext.');
  } catch (error) {
    console.error('Error fetching transcript:', error);
    addDebug(`YTT error: ${error.message}. Falling back to YouTube timedtext.`);
  }

  try {
    const fallbackTranscript = await fetchTranscriptFromYouTube(videoId);
    if (fallbackTranscript) {
      return fallbackTranscript;
    }
  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    addDebug(`YouTube timedtext error: ${error.message}`);
  }

  return null;
}

async function fetchTranscriptFromYTT(videoId, apiKeyValue) {
  const response = await chrome.runtime.sendMessage({
    action: 'fetchTranscriptFromYTT',
    videoId,
    apiKey: apiKeyValue || ''
  });

  if (!response || !response.success) {
    addDebug(`YTT background failure: ${response?.error || 'no response'}`);
    throw new Error(response?.error || 'Failed to reach YouTubeToTranscript');
  }

  const { ok, status, contentType, bodyText, triedUrls } = response;

  if (triedUrls?.length) {
    addDebug(`YTT tried URLs:\n- ${triedUrls.join('\n- ')}`);
  }

  if (!ok) {
    const preview = (bodyText || '').slice(0, 200);
    addDebug(`YTT HTTP ${status} content-type=${contentType || 'n/a'} preview=${preview}`);
    throw new Error(`YouTubeToTranscript error ${status}: ${preview || 'No response body'}`);
  }

  if ((contentType || '').includes('application/json') || /^[{\[]/.test(bodyText.trim())) {
    try {
      const data = JSON.parse(bodyText);
      const transcriptText = data?.transcript || data?.text || data?.data?.transcript;
      const arrayTranscript = extractTranscriptFromArray(data);
      const normalized = normalizeTranscriptText(transcriptText || '');
      const normalizedArray = normalizeTranscriptText(arrayTranscript || '');
      addDebug(`YTT JSON parsed length=${normalized.length}`);
      if (normalized) {
        return normalized;
      }
      if (normalizedArray) {
        return normalizedArray;
      }
    } catch (error) {
      addDebug(`YTT JSON parse error: ${error.message}`);
    }
  }

  const extracted = extractTranscriptFromHtml(bodyText);
  addDebug(`YTT HTML extracted length=${extracted.length}`);
  return extracted;
}

function extractTranscriptFromHtml(htmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    const selectors = [
      '#transcript',
      '#transcript-text',
      '.transcript',
      '.transcript-text',
      '#transcript-container',
      '.captions-text',
      'textarea#transcript',
      'textarea#transcript-text',
      'pre'
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      const text = element?.value || element?.textContent || '';
      const normalized = normalizeTranscriptText(text);
      if (normalized) {
        return normalized;
      }
    }

    const timedNodes = doc.querySelectorAll('[data-start], [data-time], .cue, .segment-text');
    if (timedNodes.length > 0) {
      const combined = Array.from(timedNodes)
        .map(node => node.textContent || '')
        .join(' ');
      const normalized = normalizeTranscriptText(combined);
      if (normalized) {
        return normalized;
      }
    }
  } catch (error) {
    console.warn('Failed to parse YouTubeToTranscript HTML:', error);
  }

  return '';
}

function extractTranscriptFromArray(data) {
  if (!data) return '';
  if (Array.isArray(data)) {
    return data.map(item => item?.text || '').join(' ');
  }
  if (Array.isArray(data?.data)) {
    return data.data.map(item => item?.text || '').join(' ');
  }
  return '';
}

async function fetchTranscriptFromYouTube(videoId) {
  const response = await chrome.runtime.sendMessage({
    action: 'fetchTranscript',
    videoId
  });

  if (!response || !response.success) {
    throw new Error(response?.error || 'Failed to fetch YouTube transcript');
  }

  const normalized = normalizeTranscriptText(response.transcript || '');
  addDebug(`YouTube timedtext length=${normalized.length}`);
  return normalized;
}

function normalizeTranscriptText(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function parseOpenAIError(response) {
  const contentType = response.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const json = await response.json();
      const message = json?.error?.message || JSON.stringify(json);
      return { message, json };
    }
  } catch (_) {
    // ignore
  }

  try {
    const text = await response.text();
    return { message: text || `HTTP ${response.status}`, json: null };
  } catch (_) {
    return { message: `HTTP ${response.status}`, json: null };
  }
}

// Generate summary using OpenAI API
async function generateSummary(transcript, videoTitle) {
  const model = 'gpt-4o-mini';
  const transcriptSnippet = (transcript || '').substring(0, 6000);
  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant that creates concise, educational summaries of video transcripts. Focus on key concepts, main points, and important details.'
      },
      {
        role: 'user',
        content:
          `Summarize the following transcript from a video titled "${videoTitle}". ` +
          `Return 5-10 bullet points and a short 1-2 sentence takeaway at the end.\n\n` +
          transcriptSnippet
      }
    ],
    temperature: 0.4,
    max_tokens: 450
  };

  const maxAttempts = 5;
  let lastErrorMessage = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'No summary returned.';
      }

      const { message } = await parseOpenAIError(response);
      lastErrorMessage = message;

      // 429 often means either rate-limit OR "insufficient_quota".
      // For rate-limit, we back off and retry; for quota issues, retrying won't help.
      if (response.status === 429) {
        const lower = (message || '').toLowerCase();
        if (lower.includes('quota') || lower.includes('insufficient')) {
          return `OpenAI API error 429 (quota). ${message} ` +
            'Fix: add billing / credits in your OpenAI account, then retry.';
        }

        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
        const backoffMs = Number.isFinite(retryAfterSeconds)
          ? Math.max(1, retryAfterSeconds) * 1000
          : 1000 * Math.pow(2, attempt);

        showStatus(`Rate-limited (429). Waiting ${Math.ceil(backoffMs / 1000)}s then retrying...`, 'info');
        await sleep(backoffMs);
        continue;
      }

      // Retry a few transient server/network errors
      if ([500, 502, 503, 504].includes(response.status) && attempt < maxAttempts) {
        const backoffMs = 750 * Math.pow(2, attempt);
        showStatus(`OpenAI temporary error (${response.status}). Retrying in ${Math.ceil(backoffMs / 1000)}s...`, 'info');
        await sleep(backoffMs);
        continue;
      }

      return `OpenAI API error ${response.status}: ${message}`;
    } catch (error) {
      console.error('Error generating summary:', error);
      lastErrorMessage = error?.message || String(error);
      const backoffMs = 750 * Math.pow(2, attempt);
      if (attempt < maxAttempts) {
        showStatus(`Network error talking to OpenAI. Retrying in ${Math.ceil(backoffMs / 1000)}s...`, 'info');
        await sleep(backoffMs);
        continue;
      }
      return `Error generating summary: ${lastErrorMessage}`;
    }
  }

  return `Error generating summary: ${lastErrorMessage || 'Unknown error'}`;
}

// Display scraped videos
function displayVideos(videos) {
  const videoList = document.getElementById('videoList');
  videoList.innerHTML = '<h3 style="margin-top:0;">Found Videos:</h3>';
  
  videos.forEach((video, index) => {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    videoItem.innerHTML = `
      <strong>${index + 1}.</strong> ${video.title}<br>
      <small style="color: #999;">ID: ${video.videoId}</small>
    `;
    videoList.appendChild(videoItem);
  });
}

// Append summary to the UI
function appendSummary(index, video, transcript, summary) {
  const summariesContainer = document.getElementById('summaries');
  
  const summaryItem = document.createElement('div');
  summaryItem.className = 'summary-item';
  
  const transcriptSection = transcript 
    ? `<div class="transcript-section">
         <strong>Transcript Preview:</strong><br>
         ${transcript.substring(0, 200)}${transcript.length > 200 ? '...' : ''}
       </div>`
    : '';
  
  summaryItem.innerHTML = `
    <h3>Video ${index}</h3>
    <div class="video-title">${video.title}</div>
    <small style="color: #999;">YouTube ID: ${video.videoId}</small>
    ${transcriptSection}
    <div class="summary-text">
      <strong>Summary:</strong><br>
      ${summary}
    </div>
  `;
  
  summariesContainer.appendChild(summaryItem);
}

// Show status message
function showStatus(message, type = '') {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

const debugLines = [];

function addDebug(line) {
  const stamp = new Date().toISOString().slice(11, 19);
  debugLines.push(`[${stamp}] ${line}`);
  const debugLog = document.getElementById('debugLog');
  if (debugLog) {
    debugLog.textContent = debugLines.slice(-50).join('\n');
  }
}

document.getElementById('testYtt').addEventListener('click', async () => {
  const input = document.getElementById('testVideoId');
  const videoId = input.value.trim() || scrapedVideos?.[0]?.videoId;

  if (!videoId) {
    showStatus('Enter a video ID or scrape videos first.', 'error');
    return;
  }

  showStatus(`Testing YTT for ${videoId}...`, 'info');
  addDebug(`Test YTT started for videoId=${videoId}`);

  try {
    const transcript = await fetchTranscript(videoId);
    if (transcript) {
      showStatus(`YTT OK (${transcript.length} chars).`, 'success');
      addDebug(`YTT OK: transcript length=${transcript.length}`);
    } else {
      showStatus('YTT returned empty transcript.', 'error');
      addDebug('YTT returned empty transcript.');
    }
  } catch (error) {
    showStatus(`YTT error: ${error.message}`, 'error');
    addDebug(`YTT error: ${error.message}`);
  }
});
