import * as THREE from 'three';
import {
  BUILTIN_PAGES,
  DEFAULT_BOOKMARKS,
  DEFAULT_NOTES_TEXT,
  STORAGE_KEYS,
} from '../constants.ts';
import type {BookmarkItem, BrowserPage} from '../types.ts';

const heroTextureCache = new Map<string, THREE.CanvasTexture>();

export function createHeroBannerTexture(
  key: string,
  eyebrow: string,
  headline: string,
  palette: readonly [string, string, string]
): THREE.CanvasTexture {
  const existing = heroTextureCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, palette[0]);
    grad.addColorStop(0.55, palette[1]);
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle geometric accent rings on the right side
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = palette[2];
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(canvas.width - 110, 150, 56 + i * 36, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = palette[2];
    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    ctx.arc(canvas.width - 110, 150, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Subtle horizontal grid accent
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let y = 40; y < canvas.height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Eyebrow pill text
    ctx.fillStyle = palette[2];
    ctx.font = 'bold 22px "Google Sans", Roboto, Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(eyebrow.toUpperCase(), 40, 44);

    // Headline wrapped cleanly
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px "Google Sans", Roboto, Arial, sans-serif';
    const words = headline.split(/\s+/u);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(candidate).width > canvas.width - 140) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);

    lines.slice(0, 2).forEach((line, idx) => {
      ctx.fillText(line, 40, 92 + idx * 58);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  heroTextureCache.set(key, texture);
  return texture;
}

export function disposeHeroTextures(): void {
  for (const texture of heroTextureCache.values()) {
    texture.dispose();
  }
  heroTextureCache.clear();
}

export function loadBookmarks(): BookmarkItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.bookmarks);
    if (!raw) return [...DEFAULT_BOOKMARKS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Ignore storage issues
  }
  return [...DEFAULT_BOOKMARKS];
}

export function saveBookmarks(bookmarks: BookmarkItem[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.bookmarks,
      JSON.stringify(bookmarks)
    );
  } catch {
    // Ignore storage issues
  }
}

export function loadPersonalNotes(): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEYS.notes);
    return saved ?? DEFAULT_NOTES_TEXT;
  } catch {
    return DEFAULT_NOTES_TEXT;
  }
}

export function savePersonalNotes(text: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.notes, text);
  } catch {
    // Ignore storage issues
  }
}

export function loadChecklistState(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.checklist);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function saveChecklistState(state: Record<string, boolean>): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.checklist, JSON.stringify(state));
  } catch {
    // Ignore storage issues
  }
}

export function normalizeInputToUrl(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return 'home://start';
  if (BUILTIN_PAGES[trimmed]) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower === 'start' || lower === 'home' || lower === 'about:home') {
    return 'home://start';
  }
  if (lower === 'news' || lower.includes('chronicle')) return 'news://digest';
  if (lower === 'wiki' || lower === 'spatial') return 'wiki://spatial';
  if (lower === 'recipes' || lower === 'recipe' || lower === 'kitchen') {
    return 'recipes://kitchen';
  }
  if (lower === 'notes' || lower === 'bookmarks' || lower === 'scratchpad') {
    return 'notes://scratchpad';
  }
  if (lower === 'weather' || lower === 'forecast') return 'weather://local';
  if (lower === 'music' || lower === 'radio' || lower === 'audio') {
    return 'music://focus';
  }

  if (lower.startsWith('search://')) {
    return trimmed;
  }

  // Handle wikipedia URLs like https://en.wikipedia.org/wiki/WebXR
  const wikiMatch = trimmed.match(/wikipedia\.org\/wiki\/([^?#]+)/i);
  if (wikiMatch) {
    return `search://${decodeURIComponent(wikiMatch[1])}`;
  }

  return `search://${trimmed}`;
}

interface WikiSummaryResponse {
  title?: string;
  description?: string;
  extract?: string;
  content_urls?: {desktop?: {page?: string}};
}

export async function resolveBrowserPage(inputUrl: string): Promise<BrowserPage> {
  const normalized = normalizeInputToUrl(inputUrl);
  const builtin = BUILTIN_PAGES[normalized];
  if (builtin) return builtin;

  const query = normalized.replace(/^search:\/\//i, '').replace(/_/g, ' ').trim();
  const cleanDomain = query.includes('.') && !query.includes(' ')
    ? query.replace(/^https?:\/\//i, '').split('/')[0]
    : 'en.wikipedia.org';

  // If user typed a domain like example.com, extract readable topic name for lookup
  const lookupTopic =
    query.includes('.') && !query.includes(' ')
      ? query.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('.')[0]
      : query;

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3500);
    const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(lookupTopic.replace(/\s+/g, '_'))}`;
    const res = await fetch(endpoint, {signal: controller.signal});
    window.clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as WikiSummaryResponse;
      if (data.extract) {
        const displayTitle = data.title || query;
        const pageUrl = `search://${displayTitle.replace(/\s+/g, '_')}`;
        return {
          url: pageUrl,
          domain: cleanDomain,
          title: `${displayTitle} — Reader View`,
          category: 'Web Lookup',
          accentColor: '#60a5fa',
          blocks: [
            {
              type: 'hero',
              eyebrow: 'READER MODE • LIVE SUMMARY',
              headline: displayTitle,
              subtitle:
                data.description || 'Encyclopedia reference loaded into spatial reader.',
              palette: ['#172554', '#1e3a8a', '#60a5fa'],
              icon: 'public',
            },
            {
              type: 'heading',
              text: 'Article Overview',
            },
            {
              type: 'paragraph',
              text: data.extract,
            },
            {
              type: 'callout',
              title: 'Spatial Reading Tip',
              body:
                'Tap "Send to Middle" in the window title bar to move this article to your center display while keeping your other four windows open around you.',
              accent: '#60a5fa',
            },
            {
              type: 'heading',
              text: 'Related Destinations',
            },
            {
              type: 'link-card',
              title: 'Return to Start Portal',
              description: 'Browse curated personal dashboards, news, recipes, and notes.',
              url: 'home://start',
              meta: 'home://start',
            },
            {
              type: 'link-card',
              title: 'Spatial Computing & WebXR Reference',
              description: 'Explore tips on five-display cross layouts and hand tracking.',
              url: 'wiki://spatial',
              meta: 'wiki://spatial',
            },
          ],
        };
      }
    }
  } catch {
    // Fall through cleanly to offline / local search results page
  }

  return {
    url: `search://${query}`,
    domain: 'search.local',
    title: `Results for "${query}"`,
    category: 'Search',
    accentColor: '#38bdf8',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'SPATIAL SEARCH',
        headline: query,
        subtitle:
          'Showing local workspace matches and quick personal browsing portals.',
        palette: ['#0f172a', '#1e293b', '#38bdf8'],
        icon: 'search',
      },
      {
        type: 'paragraph',
        text:
          `No live encyclopedia article matched "${query}" directly, or the network request timed out. You can jump straight into any of the built-in personal browser destinations below or try another topic.`,
      },
      {
        type: 'link-card',
        title: 'The Spatial Chronicle — Daily News Digest',
        description: 'Curated science, web, and design reading.',
        url: 'news://digest',
        meta: 'news://digest',
      },
      {
        type: 'link-card',
        title: 'Spatial Computing & WebXR Wiki',
        description: 'Reference guide for cross-formation multi-window browsing.',
        url: 'wiki://spatial',
        meta: 'wiki://spatial',
      },
      {
        type: 'link-card',
        title: 'Personal Notes & Bookmarks',
        description: 'Open your scratchpad and saved links.',
        url: 'notes://scratchpad',
        meta: 'notes://scratchpad',
      },
      {
        type: 'link-card',
        title: 'Weekend Kitchen Recipes',
        description: 'Hands-free focaccia & broth checklists.',
        url: 'recipes://kitchen',
        meta: 'recipes://kitchen',
      },
    ],
  };
}
