// Video background dari YouTube.
// Menerima link watch, youtu.be, shorts, embed, live, atau ID 11 karakter.

export function youtubeId(input = "") {
  const s = String(input).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  let u;
  try { u = new URL(s.includes("://") ? s : "https://" + s); } catch { return ""; }
  const host = u.hostname.replace(/^(www|m|music)\./, "");
  let id = "";
  if (host === "youtu.be") id = u.pathname.split("/")[1] || "";
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
    else {
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      if (m) id = m[1];
    }
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
}

export const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export function ytEmbedUrl(id) {
  const p = new URLSearchParams({
    autoplay: "1", mute: "1", loop: "1", playlist: id, controls: "0", disablekb: "1",
    fs: "0", iv_load_policy: "3", modestbranding: "1", playsinline: "1", rel: "0", showinfo: "0"
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${p}`;
}

export function ytIframe(id, className) {
  const f = document.createElement("iframe");
  f.className = className;
  f.src = ytEmbedUrl(id);
  f.title = "Video background";
  f.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
  f.setAttribute("tabindex", "-1");
  f.setAttribute("aria-hidden", "true");
  f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  f.loading = "eager";
  return f;
}

// =====================================================================
//  Pemutar background dengan suara (YouTube IFrame Player API)
//  Browser melarang autoplay bersuara, jadi video mulai tanpa suara lalu
//  suara dinyalakan saat pengunjung klik "klik untuk masuk".
// =====================================================================
let apiPromise = null;

export function loadYTApi(timeout = 8000) {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => reject(new Error("YouTube API gagal dimuat"));
    document.head.append(s);
    setTimeout(() => reject(new Error("YouTube API timeout")), timeout);
  });
  apiPromise.catch(() => { apiPromise = null; });
  return apiPromise;
}

export function isShortsLink(input = "") {
  return /youtube\.com\/shorts\//i.test(String(input));
}

/**
 * Membuat video background di dalam `wrap`.
 * Mengembalikan controller: { ready, start(), play(), pause(), toggle(), mute(), unmute(),
 *   setVolume(v), getVolume(), isMuted(), isPlaying(), title(), onChange(fn) }
 */
export function createBgPlayer(wrap, id, { volume = 50 } = {}) {
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => { try { fn(); } catch (_) {} });
  const state = { player: null, playing: false, muted: true, volume, title: "", fallback: false, ready: false };

  const holder = document.createElement("div");
  wrap.append(holder);

  const useFallback = () => {
    if (state.fallback) return;
    state.fallback = true;
    holder.replaceWith(ytIframe(id, "yt-frame"));
    wrap.classList.add("playing");
    state.playing = true; emit();
  };

  const ready = loadYTApi().then((YT) => new Promise((resolve) => {
    let resolved = false;
    const done = (v) => { if (!resolved) { resolved = true; resolve(v); } };
    state.player = new YT.Player(holder, {
      videoId: id,
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        autoplay: 1, mute: 1, loop: 1, playlist: id, controls: 0, disablekb: 1, fs: 0,
        iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, origin: location.origin
      },
      events: {
        onReady: (e) => {
          const f = e.target.getIframe();
          f.classList.add("yt-frame");
          f.setAttribute("tabindex", "-1");
          f.setAttribute("aria-hidden", "true");
          e.target.mute();
          e.target.setVolume(state.volume);
          e.target.playVideo();
          try { state.title = e.target.getVideoData()?.title || ""; } catch (_) {}
          state.ready = true;
          if (state.pendingStart !== undefined) { const s = state.pendingStart; delete state.pendingStart; api.start(s); }
          emit(); done(e.target);
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) { e.target.seekTo(0); e.target.playVideo(); }
          state.playing = e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING;
          if (!state.title) { try { state.title = e.target.getVideoData()?.title || ""; } catch (_) {} }
          if (e.data === YT.PlayerState.PLAYING) wrap.classList.add("playing");
          emit();
        },
        onError: () => { useFallback(); done(null); }
      }
    });
    setTimeout(() => done(state.player), 6000);
  })).catch(() => { useFallback(); return null; });

  const p = () => (state.fallback ? null : state.player);
  const api = {
    ready,
    get fallback() { return state.fallback; },
    // Dipanggil langsung di handler klik agar iOS/Safari mengizinkan suara
    start(withSound = true) {
      const pl = p();
      if (!pl || !state.ready) { state.pendingStart = withSound; return; }
      pl.playVideo();
      if (withSound) { pl.unMute(); pl.setVolume(state.volume); state.muted = state.volume === 0; }
      emit();
    },
    play() { p()?.playVideo(); },
    pause() { p()?.pauseVideo(); },
    toggle() { state.playing ? api.pause() : api.play(); },
    mute() { p()?.mute(); state.muted = true; emit(); },
    unmute() {
      const pl = p(); if (!pl) return;
      if (state.volume === 0) { state.volume = 50; pl.setVolume(50); }
      pl.unMute(); state.muted = false; emit();
    },
    setVolume(v) {
      state.volume = Math.max(0, Math.min(100, Math.round(v)));
      const pl = p(); if (!pl) return;
      pl.setVolume(state.volume);
      if (state.volume === 0) { pl.mute(); state.muted = true; } else if (state.muted) { pl.unMute(); state.muted = false; }
      emit();
    },
    getVolume: () => state.volume,
    isMuted: () => state.muted,
    isPlaying: () => state.playing,
    title: () => state.title,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
  return api;
}
