let sniffing = false;
let requests = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "toggleSniffing") {
    sniffing = !sniffing;
    sendResponse({ sniffing });
  } else if (request.command === "getRequests") {
    sendResponse({ requests });
  } else if (request.command === "clearRequests") {
    requests = [];
    sendResponse({ requests });
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (sniffing) {
      const { tabId, method, url, requestBody } = details;

      // We only care about requests from tabs
      if (tabId === -1) {
        return;
      }

      let body = '';
      if (requestBody && requestBody.raw) {
        body = new TextDecoder().decode(requestBody.raw[0].bytes);
      }

      requests.push({
        url,
        method,
        body,
        headers: details.requestHeaders,
      });

      chrome.storage.local.set({ requests });
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody", "extraHeaders"]
);
