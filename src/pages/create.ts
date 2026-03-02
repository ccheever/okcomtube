export function createPage(result?: { url: string } | { error: string }) {
  const resultHtml = result
    ? "error" in result
      ? `<div class="result error">${escapeHtml(result.error)}</div>`
      : `<div class="result success">
           <p>Share this spoiler-free link:</p>
           <div class="link-box">
             <a href="${escapeHtml(result.url)}" id="share-link">${escapeHtml(result.url)}</a>
             <button onclick="copyLink()" id="copy-btn">Copy</button>
           </div>
         </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>okcomtube - Spoiler-Free YouTube Links</title>
  <meta name="description" content="Share YouTube videos without spoilers in titles or previews">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>okcomtube</h1>
      <p class="tagline">Share YouTube videos without spoilers</p>
    </header>
    <main>
      <form method="POST" action="/create">
        <label for="url">YouTube URL</label>
        <input type="text" id="url" name="url" placeholder="https://www.youtube.com/watch?v=..." required autofocus>
        <div id="original-title-wrap" style="display:none">
          <label for="original-title">Original title <span class="optional">(for reference)</span></label>
          <input type="text" id="original-title" readonly style="color:#888;cursor:text;user-select:all">
        </div>
        <label for="label">Label <span class="optional">(optional — e.g. "800m final")</span> <span id="label-status" style="color:#666;font-weight:400"></span></label>
        <input type="text" id="label" name="label" placeholder="800m final" maxlength="100">
        <button type="submit">Create spoiler-free link</button>
      </form>
      ${resultHtml}
    </main>
  </div>
  <script>
    // Auto-suggest spoiler-free label when a YouTube URL is entered
    var urlInput = document.getElementById('url');
    var labelInput = document.getElementById('label');
    var labelStatus = document.getElementById('label-status');
    var originalTitleWrap = document.getElementById('original-title-wrap');
    var originalTitleInput = document.getElementById('original-title');
    var lastSuggestedUrl = '';

    function suggestLabel() {
      var url = urlInput.value.trim();
      if (!url || url === lastSuggestedUrl) return;
      // Basic check that it looks like a YouTube URL or video ID
      if (!/youtube|youtu\.be/i.test(url) && !/^[a-zA-Z0-9_-]{11}$/.test(url)) return;
      lastSuggestedUrl = url;
      labelStatus.textContent = 'suggesting...';
      fetch('/api/suggest-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        labelStatus.textContent = '';
        if (data.original) {
          originalTitleInput.value = data.original;
          originalTitleWrap.style.display = '';
        }
        if (data.label && !labelInput.value.trim()) {
          labelInput.value = data.label;
          labelInput.focus();
          labelInput.select();
        }
      })
      .catch(function() { labelStatus.textContent = ''; });
    }

    urlInput.addEventListener('paste', function() {
      // Small delay so the pasted value is in the input
      setTimeout(suggestLabel, 100);
    });
    urlInput.addEventListener('blur', suggestLabel);

    function copyLink() {
      const link = document.getElementById('share-link');
      const text = link.href;
      const btn = document.getElementById('copy-btn');
      // navigator.clipboard requires HTTPS; fall back to execCommand for HTTP
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(onCopied);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        onCopied();
      }
      function onCopied() {
        btn.textContent = 'Copied!';
        setTimeout(function() { btn.textContent = 'Copy'; }, 2000);
      }
    }
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
