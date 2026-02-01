// Content script to scrape YouTube links from PCRS pages
console.log('PCRS Video Summarizer: Content script loaded');

const SUMMARY_CONTAINER_ID = 'pcrs-summary-container';
const SUMMARY_STYLE_ID = 'pcrs-summary-style';

function ensureSummaryStyles() {
  if (document.getElementById(SUMMARY_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = SUMMARY_STYLE_ID;
  style.textContent = `
    #${SUMMARY_CONTAINER_ID} {
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: 360px;
      max-height: 60vh;
      overflow: auto;
      background: #111827;
      color: #f9fafb;
      border: 1px solid #374151;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
      z-index: 999999;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }
    #${SUMMARY_CONTAINER_ID} .pcrs-summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid #374151;
      font-weight: 600;
      font-size: 14px;
    }
    #${SUMMARY_CONTAINER_ID} .pcrs-summary-body {
      padding: 12px;
      display: grid;
      gap: 12px;
      font-size: 13px;
      line-height: 1.4;
    }
    #${SUMMARY_CONTAINER_ID} .pcrs-summary-item {
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 10px;
      padding: 10px;
    }
    #${SUMMARY_CONTAINER_ID} .pcrs-summary-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    #${SUMMARY_CONTAINER_ID} .pcrs-summary-meta {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 6px;
    }
    #${SUMMARY_CONTAINER_ID} .pcrs-summary-text {
      white-space: pre-wrap;
    }
    #${SUMMARY_CONTAINER_ID} .pcrs-summary-close {
      background: transparent;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
    }
    #${SUMMARY_CONTAINER_ID} .pcrs-summary-empty {
      color: #9ca3af;
      font-style: italic;
    }
  `;
  document.head.appendChild(style);
}

function ensureSummaryContainer() {
  ensureSummaryStyles();
  let container = document.getElementById(SUMMARY_CONTAINER_ID);
  if (container) {
    return container;
  }

  container = document.createElement('div');
  container.id = SUMMARY_CONTAINER_ID;

  const header = document.createElement('div');
  header.className = 'pcrs-summary-header';
  header.innerHTML = '<span>PCRS Video Summaries</span>';

  const closeButton = document.createElement('button');
  closeButton.className = 'pcrs-summary-close';
  closeButton.type = 'button';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => {
    container.remove();
  });
  header.appendChild(closeButton);

  const body = document.createElement('div');
  body.className = 'pcrs-summary-body';

  container.appendChild(header);
  container.appendChild(body);
  document.body.appendChild(container);

  return container;
}

function resetSummaryContainer() {
  const container = ensureSummaryContainer();
  const body = container.querySelector('.pcrs-summary-body');
  if (body) {
    body.innerHTML = '<div class="pcrs-summary-empty">Generating summaries...</div>';
  }
}

function appendSummaryToPage(summary) {
  const container = ensureSummaryContainer();
  const body = container.querySelector('.pcrs-summary-body');
  if (!body) return;

  if (body.querySelector('.pcrs-summary-empty')) {
    body.innerHTML = '';
  }

  const item = document.createElement('div');
  item.className = 'pcrs-summary-item';

  const title = document.createElement('div');
  title.className = 'pcrs-summary-title';
  title.textContent = `Video ${summary.index}: ${summary.title || 'Untitled Video'}`;

  const meta = document.createElement('div');
  meta.className = 'pcrs-summary-meta';
  meta.textContent = `YouTube ID: ${summary.videoId}`;

  const content = document.createElement('div');
  content.className = 'pcrs-summary-text';
  content.textContent = summary.error
    ? summary.error
    : summary.summary || 'No summary returned.';

  item.appendChild(title);
  item.appendChild(meta);
  item.appendChild(content);
  body.appendChild(item);
}

// Function to extract YouTube video IDs from the page
function extractYouTubeLinks() {
  const youtubeLinks = [];
  const linkPatterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g
  ];

  // Search for YouTube links in anchor tags
  const anchors = document.querySelectorAll('a[href*="youtube.com"], a[href*="youtu.be"]');
  anchors.forEach(anchor => {
    const href = anchor.href;
    const match = href.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      youtubeLinks.push({
        videoId: match[1],
        url: `https://www.youtube.com/watch?v=${match[1]}`,
        title: anchor.textContent.trim() || 'Untitled Video'
      });
    }
  });

  // Search for YouTube iframes
  const iframes = document.querySelectorAll('iframe[src*="youtube.com"]');
  iframes.forEach(iframe => {
    const src = iframe.src;
    const match = src.match(/(?:\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      youtubeLinks.push({
        videoId: match[1],
        url: `https://www.youtube.com/watch?v=${match[1]}`,
        title: iframe.title || 'Untitled Video'
      });
    }
  });

  // Remove duplicates based on videoId
  const uniqueLinks = Array.from(
    new Map(youtubeLinks.map(link => [link.videoId, link])).values()
  );

  return uniqueLinks;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getYouTubeLinks') {
    const links = extractYouTubeLinks();
    console.log('Found YouTube links:', links);
    sendResponse({ links: links });
  }
  if (request.action === 'resetSummaries') {
    resetSummaryContainer();
    sendResponse({ success: true });
  }
  if (request.action === 'appendSummary') {
    appendSummaryToPage(request.summary);
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for async response
});

// Store links when page loads (for quick access)
window.addEventListener('load', () => {
  const links = extractYouTubeLinks();
  if (links.length > 0) {
    chrome.storage.local.set({ 
      lastScrapedLinks: links,
      lastScrapedUrl: window.location.href,
      lastScrapedTime: Date.now()
    });
  }
});
