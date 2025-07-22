const toggleSniffingBtn = document.getElementById('toggle-sniffing');
const clearListBtn = document.getElementById('clear-list');
const apiList = document.getElementById('api-list');
const detailsPanel = document.getElementById('details-panel');
const tabs = document.querySelectorAll('.tab-link');
const codeElements = {
  csharp: document.getElementById('csharp-code'),
  python: document.getElementById('python-code'),
};
const copyButtons = document.querySelectorAll('.copy-btn');

let sniffing = false;
let requests = [];

// Initialize
chrome.runtime.sendMessage({ command: 'getRequests' }, (response) => {
  requests = response.requests || [];
  updatePopup();
});

chrome.runtime.sendMessage({ command: 'isSniffing' }, (response) => {
  sniffing = response.sniffing;
  toggleSniffingBtn.textContent = sniffing ? 'Stop Sniffing' : 'Start Sniffing';
});


toggleSniffingBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ command: 'toggleSniffing' }, (response) => {
    sniffing = response.sniffing;
    toggleSniffingBtn.textContent = sniffing ? 'Stop Sniffing' : 'Start Sniffing';
  });
});

clearListBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ command: 'clearRequests' }, (response) => {
    requests = response.requests;
    updatePopup();
    detailsPanel.classList.add('hidden');
  });
});

apiList.addEventListener('click', (e) => {
  if (e.target.tagName === 'LI') {
    const index = e.target.dataset.index;
    const request = requests[index];
    displayDetails(request);
  }
});

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(target).classList.add('active');
  });
});

copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        const code = codeElements[lang].textContent;
        navigator.clipboard.writeText(code).then(() => {
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = 'Copy Code';
            }, 2000);
        });
    });
});

function updatePopup() {
  apiList.innerHTML = '';
  requests.forEach((req, index) => {
    const listItem = document.createElement('li');
    listItem.textContent = `${req.method} - ${req.url}`;
    listItem.dataset.index = index;
    apiList.appendChild(listItem);
  });
}

function displayDetails(request) {
  detailsPanel.classList.remove('hidden');
  generateCode(request);
}

function generateCode(request) {
    // C# Code Generation
    let csharpCode = `using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

public class ApiClient
{
    private static readonly HttpClient client = new HttpClient();

    public async Task<string> CallApi()
    {
        var request = new HttpRequestMessage(new HttpMethod("${request.method}"), "${request.url}");
`;
    if (request.headers) {
        request.headers.forEach(h => {
            csharpCode += `        request.Headers.TryAddWithoutValidation("${h.name}", "${h.value}");\n`;
        });
    }
    if (request.body) {
        csharpCode += `        request.Content = new StringContent("${request.body}", Encoding.UTF8, "application/json");\n`;
    }
    csharpCode += `
        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync();
    }
}`;
    codeElements.csharp.textContent = csharpCode;

    // Python Code Generation
    let pythonCode = `import requests
import json

url = "${request.url}"
`;
    if (request.body) {
        pythonCode += `payload = json.dumps(${request.body})\n`;
    } else {
        pythonCode += `payload = {}
`;
    }
    pythonCode += `headers = {
`;
    if (request.headers) {
        request.headers.forEach(h => {
            pythonCode += `    '${h.name}': '${h.value}',\n`;
        });
    }
    pythonCode += `}

response = requests.request("${request.method}", url, headers=headers, data=payload)

print(response.text)
`;
    codeElements.python.textContent = pythonCode;
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.requests) {
        requests = changes.requests.newValue;
        updatePopup();
    }
});
