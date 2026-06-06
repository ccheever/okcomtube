export function watchPage(videoId: string, label?: string) {
  const displayLabel = label || "Watch video";
  const ogTitle = label || "Watch on okcomtube";
  const escapedLabel = escapeHtml(displayLabel);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapedLabel} - okcomtube</title>

  <!-- Spoiler-free OpenGraph / iMessage preview -->
  <meta property="og:title" content="${escapeAttr(ogTitle)}">
  <meta property="og:description" content="Spoiler-free video">
  <meta property="og:type" content="video.other">
  <meta property="og:image" content="/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="okcomtube">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(ogTitle)}">
  <meta name="twitter:description" content="Spoiler-free video">
  <meta name="twitter:image" content="/og.png">

  <link rel="stylesheet" href="/style.css">
  <style>
    .player-wrap {
      position: relative;
      width: 100%;
      max-width: 854px;
      margin: 0 auto;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .player-wrap iframe {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      border: 0;
    }
    /* Layer 2: title overlay bar — always present, blocks YouTube title on hover/pause */
    .title-cover {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 80px;
      background: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%);
      z-index: 10;
      pointer-events: auto;
      cursor: default;
      opacity: 1;
      transition: opacity 0.3s;
    }
    /* Layer 1: pre-play overlay — hides thumbnail completely */
    .pre-overlay {
      position: absolute;
      inset: 0;
      background: #000;
      z-index: 15;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      cursor: pointer;
    }
    .pre-overlay.hidden { pointer-events: none; opacity: 0; transition: opacity 0.3s ease 0.8s; }
    .pre-overlay .play-icon {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(55, 92, 255, 0.15);
      border: 2px solid rgba(55, 92, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, border-color 0.2s, transform 0.2s;
    }
    .pre-overlay:hover .play-icon {
      background: rgba(55, 92, 255, 0.25);
      border-color: rgba(55, 92, 255, 0.6);
      transform: scale(1.05);
    }
    .pre-overlay .play-icon svg {
      width: 32px;
      height: 32px;
      margin-left: 4px;
    }
    .pre-overlay .pre-label {
      color: #7a7a9b;
      font-size: 0.9rem;
      font-weight: 500;
      font-family: 'Inter', system-ui, sans-serif;
    }
    /* Layer 3: end-screen overlay */
    .end-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 20;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }
    .end-overlay.active { display: flex; }
    .end-overlay button {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 0.95rem;
      padding: 14px 36px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-weight: 600;
      transition: opacity 0.2s, transform 0.1s;
    }
    .end-overlay button:active { transform: scale(0.97); }
    .replay-btn {
      background: linear-gradient(135deg, #375cff 0%, #5a3cff 100%);
      color: #fff;
    }
    .replay-btn:hover { opacity: 0.9; }
    .end-label {
      color: #7a7a9b;
      font-size: 0.9rem;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .player-label {
      text-align: center;
      margin: 16px 0 12px;
      font-size: 1.15rem;
      font-weight: 500;
      color: #a0a0c0;
      font-family: 'Inter', system-ui, sans-serif;
    }
  </style>
</head>
<body class="watch-body">
  <div class="container watch-container">
    <a href="/" class="back-link">okcomtube</a>
    <p class="player-label">${escapedLabel}</p>
    <div class="player-wrap" id="player-wrap">
      <div id="player"></div>
      <!-- Layer 1: covers entire thumbnail until user clicks play -->
      <div class="pre-overlay" id="pre-overlay" onclick="startVideo()">
        <div class="play-icon">
          <svg viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21"/></svg>
        </div>
        <div class="pre-label">Click to play</div>
      </div>
      <!-- Layer 2: covers YouTube title gradient at top -->
      <div class="title-cover" id="title-cover"></div>
      <!-- Layer 3: blocks end-screen suggestions -->
      <div class="end-overlay" id="end-overlay">
        <div class="end-label">Video ended</div>
        <button class="replay-btn" onclick="replay()">Replay</button>
      </div>
    </div>
  </div>

  <script>
    var player;
    var preOverlay = document.getElementById('pre-overlay');
    var endOverlay = document.getElementById('end-overlay');
    var hasStarted = false;

    // Load YouTube IFrame API
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        videoId: '${videoId}',
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          rel: 0,
          enablejsapi: 1,
          modestbranding: 1,
          autoplay: 0,
          playsinline: 1
        },
        events: {
          onStateChange: onStateChange
        }
      });
    }

    function startVideo() {
      if (player && player.playVideo) {
        preOverlay.classList.add('hidden');
        hasStarted = true;
        player.playVideo();
      }
    }

    function onStateChange(event) {
      switch (event.data) {
        case YT.PlayerState.PLAYING:
          preOverlay.classList.add('hidden');
          endOverlay.classList.remove('active');
          break;
        case YT.PlayerState.PAUSED:
          break;
        case YT.PlayerState.ENDED:
          endOverlay.classList.add('active');
          break;
      }
    }

    function replay() {
      endOverlay.classList.remove('active');
      player.seekTo(0);
      player.playVideo();
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

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
