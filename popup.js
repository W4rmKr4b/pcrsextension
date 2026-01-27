// Popup script to handle user interactions
let scrapedVideos = [];
let apiKey = '';

// Load saved API key on popup open
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.local.get(['openaiApiKey']);
  if (result.openaiApiKey) {
    apiKey = result.openaiApiKey;
    document.getElementById('apiKey').value = '••••••••';
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

// Scrape videos from current page
document.getElementById('scrapeVideos').addEventListener('click', async () => {
  showStatus('Scraping videos from page...', 'info');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getYouTubeLinks' });
    
    if (response && response.links && response.links.length > 0) {
      scrapedVideos = response.links;
      displayVideos(scrapedVideos);
      showStatus(`Found ${scrapedVideos.length} video(s)!`, 'success');
      document.getElementById('generateSummaries').disabled = false;
    } else {
      showStatus('No YouTube videos found on this page.', 'error');
      scrapedVideos = [];
      document.getElementById('generateSummaries').disabled = true;
    }
  } catch (error) {
    console.error('Error scraping videos:', error);
    showStatus('Error: Make sure you are on a PCRS page.', 'error');
  }
});

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
  
  if (scrapedVideos.length === 0) {
    showStatus('No videos to summarize. Please scrape videos first.', 'error');
    return;
  }
  
  showStatus('Fetching transcripts and generating summaries...', 'info');
  document.getElementById('generateSummaries').disabled = true;
  
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
    // Method 1: Try to scrape youtubetotranscript.com
    const url = `https://youtubetotranscript.com/?v=${videoId}`;
    
    // Since we can't directly fetch from the site due to CORS, 
    // we'll use YouTube's built-in transcript API as a fallback
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Try to extract captions/transcript data from YouTube page
    // This is a simplified approach - in production, you might want to use YouTube API
    const captionsMatch = html.match(/"captions":\s*({[^}]+})/);
    
    if (captionsMatch) {
      // For now, we'll return a placeholder
      // In a real implementation, you'd parse the captions URL and fetch the actual transcript
      return await fetchYouTubeTranscriptAlternative(videoId);
    }
    
    return await fetchYouTubeTranscriptAlternative(videoId);
    
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return null;
  }
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

// Alternative method to fetch YouTube transcript
async function fetchYouTubeTranscriptAlternative(videoId) {
  try {
    // Use a more reliable method - YouTube's timedtext API
    const response = await fetch(
      `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`
    );
    
    if (response.ok) {
      const xmlText = await response.text();
      // Parse XML and extract text
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const textNodes = xmlDoc.getElementsByTagName('text');
      
      let transcript = '';
      for (let node of textNodes) {
        transcript += node.textContent + ' ';
      }
      
      return transcript.trim() || 'Transcript not available for this video.';
    }
    
    return 'Transcript not available for this video.';
    
  } catch (error) {
    console.error('Error with alternative transcript method:', error);
    return 'Transcript not available for this video.';
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
