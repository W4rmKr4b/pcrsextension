// Content script to scrape YouTube links from PCRS pages
console.log('PCRS Video Summarizer: Content script loaded');

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
