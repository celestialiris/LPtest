// Katalog badge. Hanya superadmin yang bisa memberikan / mencabut badge.
// Ikon memakai path SVG 24×24.

export const BADGES = {
  verified: {
    label: "Verified", color: "#3b82f6",
    icon: '<path d="M12 2l2.4 2.1 3.1-.4.9 3 2.8 1.5-.9 3 1.5 2.8-2.6 1.8-.2 3.2-3.1.4L12 22l-2.4-2.1-3.1.4-.9-3-2.8-1.5.9-3L2.2 10l2.6-1.8.2-3.2 3.1-.4z" fill="currentColor"/><path d="M8 12l3 3 5-6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  developer: {
    label: "Developer", color: "#22c55e",
    icon: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  gamer: {
    label: "Gamer", color: "#a855f7",
    icon: '<path d="M6 8h12a4 4 0 014 4v1a4 4 0 01-7 2.6L14 14h-4l-1 1.6A4 4 0 012 13v-1a4 4 0 014-4z" fill="currentColor"/><path d="M7 10.5v3M5.5 12h3" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="16" cy="11" r="1" fill="#fff"/><circle cx="17.8" cy="13" r="1" fill="#fff"/>'
  },
  technician: {
    label: "Technician", color: "#f59e0b",
    icon: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" fill="currentColor"/>'
  },
  creator: {
    label: "Creator", color: "#ec4899",
    icon: '<path d="M12 3l2.4 5.6 6 .6-4.5 4 1.3 6L12 16.2 6.8 19.2l1.3-6-4.5-4 6-.6z" fill="currentColor"/>'
  },
  moderator: {
    label: "Moderator", color: "#06b6d4",
    icon: '<path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z" fill="currentColor"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>'
  },
  vip: {
    label: "VIP", color: "#eab308",
    icon: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor"/>'
  },
  streamer: {
    label: "Streamer", color: "#ef4444",
    icon: '<rect x="3" y="6" width="13" height="12" rx="3" fill="currentColor"/><path d="M16 10l5-3v10l-5-3z" fill="currentColor"/>'
  },
  musician: {
    label: "Musician", color: "#8b5cf6",
    icon: '<path d="M9 18V5l11-2v13" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="6.5" cy="18" r="2.8" fill="currentColor"/><circle cx="17.5" cy="16" r="2.8" fill="currentColor"/>'
  },
  artist: {
    label: "Artist", color: "#f97316",
    icon: '<path d="M12 3a9 9 0 100 18c1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 005-5c0-4.1-4-7.6-9-7.6z" fill="currentColor"/><circle cx="7.5" cy="11" r="1.3" fill="#fff"/><circle cx="10.5" cy="7.5" r="1.3" fill="#fff"/><circle cx="15" cy="8" r="1.3" fill="#fff"/>'
  },
  supporter: {
    label: "Supporter", color: "#f43f5e",
    icon: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" fill="currentColor"/>'
  },
  og: {
    label: "OG Member", color: "#94a3b8",
    icon: '<circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M12 7v5l3 2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>'
  }
};

export const BADGE_KEYS = Object.keys(BADGES);
export const SUPERADMIN_BADGES = ["verified", "developer"];

export function badgeHtml(key, { withLabel = false } = {}) {
  const b = BADGES[key];
  if (!b) return "";
  return `<span class="badge" style="--bc:${b.color}" title="${b.label}" aria-label="${b.label}" tabindex="0">
    <svg viewBox="0 0 24 24" aria-hidden="true">${b.icon}</svg>${withLabel ? `<em>${b.label}</em>` : `<i class="tip">${b.label}</i>`}</span>`;
}

export function badgesHtml(list = []) {
  return (list || []).filter((k) => BADGES[k]).map((k) => badgeHtml(k)).join("");
}
