import type {UIThemePresetName} from 'xrblocks';
import type {BookmarkItem, BrowserPage, DisplaySlot, SlotTransform} from './types.ts';

export const CROSS_FORMATION_SLOTS: readonly SlotTransform[] = [
  {
    slot: 'center',
    label: 'MIDDLE',
    shortLabel: 'Mid',
    accentColor: '#61dafb',
    offset: [0, 0, -1.26],
    rotation: [0, 0, 0],
    size: {width: 0.78, height: 0.54},
    defaultUrl: 'home://start',
  },
  {
    slot: 'up',
    label: 'UP',
    shortLabel: 'Up',
    accentColor: '#a78bfa',
    offset: [0, 0.55, -1.16],
    rotation: [0.34, 0, 0],
    size: {width: 0.72, height: 0.44},
    defaultUrl: 'news://digest',
  },
  {
    slot: 'down',
    label: 'DOWN',
    shortLabel: 'Down',
    accentColor: '#34d399',
    offset: [0, -0.53, -1.14],
    rotation: [-0.34, 0, 0],
    size: {width: 0.72, height: 0.44},
    defaultUrl: 'notes://scratchpad',
  },
  {
    slot: 'left',
    label: 'LEFT',
    shortLabel: 'Left',
    accentColor: '#fbbf24',
    offset: [-0.82, 0, -1.06],
    rotation: [0, 0.44, 0],
    size: {width: 0.7, height: 0.48},
    defaultUrl: 'wiki://spatial',
  },
  {
    slot: 'right',
    label: 'RIGHT',
    shortLabel: 'Right',
    accentColor: '#f472b6',
    offset: [0.82, 0, -1.06],
    rotation: [0, -0.44, 0],
    size: {width: 0.7, height: 0.48},
    defaultUrl: 'recipes://kitchen',
  },
];

export const DEFAULT_BOOKMARKS: readonly BookmarkItem[] = [
  {
    id: 'start',
    title: 'Start',
    url: 'home://start',
    icon: 'home',
    category: 'Portal',
  },
  {
    id: 'news',
    title: 'News',
    url: 'news://digest',
    icon: 'newspaper',
    category: 'Reading',
  },
  {
    id: 'wiki',
    title: 'Wiki',
    url: 'wiki://spatial',
    icon: 'menu_book',
    category: 'Reference',
  },
  {
    id: 'recipes',
    title: 'Recipes',
    url: 'recipes://kitchen',
    icon: 'restaurant',
    category: 'Lifestyle',
  },
  {
    id: 'notes',
    title: 'Notes',
    url: 'notes://scratchpad',
    icon: 'edit_note',
    category: 'Personal',
  },
  {
    id: 'weather',
    title: 'Weather',
    url: 'weather://local',
    icon: 'wb_sunny',
    category: 'Daily',
  },
  {
    id: 'music',
    title: 'Radio',
    url: 'music://focus',
    icon: 'music_note',
    category: 'Audio',
  },
];

export const QUICK_TAB_URLS: readonly {label: string; url: string}[] = [
  {label: 'Start', url: 'home://start'},
  {label: 'News', url: 'news://digest'},
  {label: 'Wiki', url: 'wiki://spatial'},
  {label: 'Recipes', url: 'recipes://kitchen'},
  {label: 'Notes', url: 'notes://scratchpad'},
];

export const THEME_ROTATION: readonly {name: UIThemePresetName; label: string}[] = [
  {name: 'grayGlass', label: 'Glass'},
  {name: 'glimmer', label: 'Glimmer'},
  {name: 'glimmerOpaque', label: 'Dark'},
  {name: 'highContrast', label: 'Contrast'},
];

export const STORAGE_KEYS = {
  bookmarks: 'crossbrowser_xr_bookmarks_v1',
  notes: 'crossbrowser_xr_notes_v1',
  checklist: 'crossbrowser_xr_checklist_v1',
} as const;

export const DEFAULT_NOTES_TEXT =
  'Personal Scratchpad\n\n' +
  '- Middle display: Main reading & web search\n' +
  '- Up display: Morning news & tech headlines\n' +
  '- Left display: Reference articles & Wikipedia\n' +
  '- Right display: Recipes, weather & listening queue\n\n' +
  'Tip: Pinch any outer window border to reposition it, pinch a corner to resize, or drag inside a page to scroll.';

export const BUILTIN_PAGES: Record<string, BrowserPage> = {
  'home://start': {
    url: 'home://start',
    domain: 'home://start',
    title: 'Personal Spatial Start Page',
    category: 'Portal',
    accentColor: '#61dafb',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'PERSONAL WORKSPACE',
        headline: 'Five-Display Cross Browser',
        subtitle:
          'Browse casually across middle, up, down, left, and right windows with natural hand gestures.',
        palette: ['#0f2942', '#1b4965', '#61dafb'],
        icon: 'public',
      },
      {
        type: 'callout',
        title: 'Hand Tracking & Window Controls',
        body:
          '• Scroll pages: Pinch & drag vertically inside any page (or use the scroll arrows).\n' +
          '• Move display: Pinch & drag the outer edge of any window.\n' +
          '• Resize / Scale: Drag any window corner, or use two-hand pinch to scale.\n' +
          '• Snap Cross: Tap Snap Cross in the bottom dock anytime to re-align all 5 displays.',
        accent: '#61dafb',
      },
      {
        type: 'heading',
        text: 'Quick Jump Destinations',
      },
      {
        type: 'link-card',
        title: 'The Spatial Chronicle — Today’s Reading Digest',
        description:
          'Long-form technology, astronomy, and design stories formatted for comfortable spatial reading.',
        url: 'news://digest',
        meta: 'news://digest • 6 stories',
      },
      {
        type: 'link-card',
        title: 'Open Encyclopedia — Spatial Computing & Optics',
        description:
          'Deep-dive reference guide on mixed reality ergonomics, cross-formation layouts, and WebXR.',
        url: 'wiki://spatial',
        meta: 'wiki://spatial • Reference',
      },
      {
        type: 'link-card',
        title: 'Weekend Kitchen — Slow-Simmered Ramen & Focaccia',
        description:
          'Step-by-step hands-free cooking reference with interactive ingredient checklists.',
        url: 'recipes://kitchen',
        meta: 'recipes://kitchen • Interactive',
      },
      {
        type: 'link-card',
        title: 'Local Sky & 5-Day Forecast',
        description:
          'Clear atmospheric overview, UV index, and weekend outlook at a glance.',
        url: 'weather://local',
        meta: 'weather://local • Daily',
      },
      {
        type: 'link-card',
        title: 'Ambient Focus Radio & Reading Queue',
        description:
          'Curated ambient stations, podcast episodes, and saved bookmarks.',
        url: 'music://focus',
        meta: 'music://focus • Audio',
      },
      {
        type: 'heading',
        text: 'Try Searching Wikipedia',
      },
      {
        type: 'paragraph',
        text:
          'Type any topic (like "James Webb Space Telescope", "Matcha", or "Bauhaus") in the address bar above and press Enter to fetch an instant reader summary directly in that window.',
      },
    ],
  },

  'news://digest': {
    url: 'news://digest',
    domain: 'news.chronicle.local',
    title: 'The Spatial Chronicle — Daily Digest',
    category: 'News',
    accentColor: '#a78bfa',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'MORNING EDITION',
        headline: 'The Spatial Chronicle',
        subtitle:
          'Calm, distraction-free articles on science, architecture, open web standards, and everyday craft.',
        palette: ['#2e1065', '#4c1d95', '#a78bfa'],
        icon: 'newspaper',
      },
      {
        type: 'link-card',
        title: '1. Why Multi-Window Cross Layouts Reduce Neck Strain',
        description:
          'Ergonomic studies suggest placing a primary focal window straight ahead while angling secondary feeds 15–25 degrees keeps posture relaxed during long reading sessions.',
        url: 'wiki://spatial',
        meta: 'Design & Ergonomics • Open in Wiki',
      },
      {
        type: 'paragraph',
        text:
          'Instead of stacking twenty overlapping browser tabs behind one rectangle, spatial displays let peripheral context stay gently visible. Keeping a news feed above eye level and quick notes below creates natural spatial memory—you always know where each context lives without hunting through tab strips.',
      },
      {
        type: 'link-card',
        title: '2. Deep-Sky Spectroscopy Reveals New Exoplanet Cloud Bands',
        description:
          'Astronomers combined infrared transit measurements to map silicate haze layers across a warm Neptune-sized world.',
        url: 'search://Exoplanet',
        meta: 'Science • Tap to look up Exoplanet on Wikipedia',
      },
      {
        type: 'paragraph',
        text:
          'Using multi-wavelength infrared observations, researchers isolated subtle water vapor and sulfur signatures in the upper atmosphere. The findings help refine climate models for worlds orbiting M-dwarf stars.',
      },
      {
        type: 'link-card',
        title: '3. The Quiet Return of Personal Blogs and RSS Feeds',
        description:
          'Independent writers are rediscovering lightweight HTML essays, digital gardens, and chronological reading lists free from algorithmic feeds.',
        url: 'search://RSS',
        meta: 'Web Culture • Tap to look up RSS',
      },
      {
        type: 'paragraph',
        text:
          'A growing wave of personal sites treats the web like a cozy reading room again. Readers curate a handful of trusted voices, read at their own pace, and save favorite essays into local markdown notebooks.',
      },
      {
        type: 'link-card',
        title: '4. Weekend Baking: High-Hydration Sourdough & Rosemary Oil',
        description:
          'Why cold fermentation overnight builds airy crumb structure with minimal active kitchen time.',
        url: 'recipes://kitchen',
        meta: 'Food & Craft • Open Recipes',
      },
      {
        type: 'callout',
        title: 'End of Morning Digest',
        body:
          'Use the "Send to Middle" button in the top-right bar anytime to bring a story you want to focus on into the center display.',
        accent: '#a78bfa',
      },
    ],
  },

  'wiki://spatial': {
    url: 'wiki://spatial',
    domain: 'wiki.openweb.local',
    title: 'Spatial Computing & WebXR Reference',
    category: 'Reference',
    accentColor: '#fbbf24',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'OPEN ENCYCLOPEDIA',
        headline: 'Spatial Multi-Window Browsing',
        subtitle:
          'Reference notes on WebXR, hand-tracked scrolling, and ergonomic 5-display cross geometry.',
        palette: ['#451a03', '#78350f', '#fbbf24'],
        icon: 'menu_book',
      },
      {
        type: 'heading',
        text: '1. The Cross Formation (+)',
      },
      {
        type: 'paragraph',
        text:
          'A five-display cross layout balances peripheral reach with visual clarity:\n\n' +
          '• Middle (0°, 0°): Primary workspace for active reading, search, and media.\n' +
          '• Up (+19° pitch): Ambient monitor for live feeds, news, or dashboards.\n' +
          '• Down (-19° pitch): Desk-angled surface for notes, bookmarks, and quick lookups.\n' +
          '• Left (-25° yaw): Reference documentation, wiki pages, or source material.\n' +
          '• Right (+25° yaw): Companion tools, recipes, weather, or playlists.',
      },
      {
        type: 'heading',
        text: '2. Hand Tracking & Interaction',
      },
      {
        type: 'paragraph',
        text:
          'In XR, hands serve two distinct roles without needing physical controllers:\n\n' +
          '• Direct & Ray Scrolling: Pinch inside any scrollable viewport and glide your hand upward or downward to scroll smoothly through long pages.\n' +
          '• Window Manipulation: Pinch the outer rim of a display card to reposition it in 3D space—it automatically faces toward you. Pinch a corner handle to resize the window proportions, or pinch with both hands to scale.',
      },
      {
        type: 'heading',
        text: '3. Optical Comfort & Contrast',
      },
      {
        type: 'paragraph',
        text:
          'On passthrough headsets and optical see-through glasses, dark translucent surfaces paired with crisp light typography reduce glare against bright rooms. Use the Theme button in the bottom dock to cycle between Glass, Glimmer, Dark, and High Contrast presets.',
      },
      {
        type: 'link-card',
        title: 'Explore "WebXR" on Wikipedia',
        description:
          'Fetch a live encyclopedia summary of the WebXR Device API standard.',
        url: 'search://WebXR',
        meta: 'Live Lookup • Wikipedia',
      },
      {
        type: 'link-card',
        title: 'Explore "Mixed Reality" on Wikipedia',
        description:
          'Read about the reality-virtuality continuum and spatial user interfaces.',
        url: 'search://Mixed_reality',
        meta: 'Live Lookup • Wikipedia',
      },
    ],
  },

  'recipes://kitchen': {
    url: 'recipes://kitchen',
    domain: 'kitchen.personal.local',
    title: 'Weekend Kitchen — Hands-Free Recipes',
    category: 'Lifestyle',
    accentColor: '#f472b6',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'PERSONAL COOKBOOK',
        headline: 'Garlic Rosemary Focaccia & Miso Broth',
        subtitle:
          'Ideal for hands-free spatial browsing in the kitchen—check off steps with a quick pinch.',
        palette: ['#500724', '#831843', '#f472b6'],
        icon: 'restaurant',
      },
      {
        type: 'checklist',
        title: 'Focaccia Ingredients & Prep',
        items: [
          {id: 'f1', text: '500g bread flour + 400ml lukewarm water (80% hydration)'},
          {id: 'f2', text: '10g fine sea salt + 4g instant yeast'},
          {id: 'f3', text: '4 tbsp extra-virgin olive oil, divided'},
          {id: 'f4', text: '2 sprigs fresh rosemary & flaky sea salt for topping'},
          {id: 'f5', text: '3 cloves thinly sliced garlic infused in warm oil'},
        ],
      },
      {
        type: 'heading',
        text: 'Method — Overnight Cold Ferment',
      },
      {
        type: 'paragraph',
        text:
          '1. Whisk water, yeast, and olive oil in a large bowl. Fold in flour and salt until no dry streaks remain.\n\n' +
          '2. Perform two sets of gentle coil folds spaced 30 minutes apart, then cover and refrigerate 12–18 hours.\n\n' +
          '3. Transfer dough into a generously oiled 9×13 baking pan and let rise at room temperature for 2 hours until bubbly.\n\n' +
          '4. Dimple deeply with oiled fingertips, scatter rosemary and garlic oil, and bake at 220°C (430°F) for 22–25 minutes until golden.',
      },
      {
        type: 'checklist',
        title: 'Quick 15-Minute Miso Ginger Broth',
        items: [
          {id: 'm1', text: '4 cups dashi or vegetable stock'},
          {id: 'm2', text: '3 tbsp white miso paste (whisked off heat)'},
          {id: 'm3', text: '1 tbsp grated fresh ginger + sliced scallions'},
          {id: 'm4', text: 'Soft-boiled egg, bok choy & toasted sesame oil'},
        ],
      },
      {
        type: 'link-card',
        title: 'Look up "Focaccia" history on Wikipedia',
        description: 'Read about Ligurian flatbread traditions and regional styles.',
        url: 'search://Focaccia',
        meta: 'Wikipedia Lookup',
      },
    ],
  },

  'notes://scratchpad': {
    url: 'notes://scratchpad',
    domain: 'notes://scratchpad',
    title: 'Personal Notes & Saved Bookmarks',
    category: 'Workspace',
    accentColor: '#34d399',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'PERSONAL WORKSPACE',
        headline: 'Quick Notes & Bookmarks',
        subtitle:
          'Jot down thoughts while browsing across your other four displays. Saved locally in your browser.',
        palette: ['#064e3b', '#065f46', '#34d399'],
        icon: 'edit_note',
      },
      {
        type: 'notes-editor',
        placeholder: 'Write personal notes, reading lists, or reminders here...',
      },
      {
        type: 'heading',
        text: 'Saved Bookmarks',
      },
      {
        type: 'bookmark-list',
      },
    ],
  },

  'weather://local': {
    url: 'weather://local',
    domain: 'weather.personal.local',
    title: 'Local Sky & 5-Day Forecast',
    category: 'Daily',
    accentColor: '#38bdf8',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'ATMOSPHERIC BRIEF',
        headline: '16°C • Partly Cloudy & Crisp',
        subtitle:
          'Light westerly breeze 11 km/h • UV Index 3 (Moderate) • Sunset at 17:18',
        palette: ['#0c4a6e', '#0369a1', '#38bdf8'],
        icon: 'wb_sunny',
      },
      {
        type: 'heading',
        text: '5-Day Outlook',
      },
      {
        type: 'weather-row',
        items: [
          {day: 'Today', condition: 'Partly Cloudy', temp: '16° / 9°', icon: 'partly_cloudy_day'},
          {day: 'Thu', condition: 'Clear & Bright', temp: '18° / 10°', icon: 'wb_sunny'},
          {day: 'Fri', condition: 'Morning Mist', temp: '15° / 8°', icon: 'cloud'},
          {day: 'Sat', condition: 'Sunny Intervals', temp: '17° / 9°', icon: 'wb_sunny'},
          {day: 'Sun', condition: 'Light Showers', temp: '13° / 7°', icon: 'rainy'},
        ],
      },
      {
        type: 'callout',
        title: 'Evening Sky Watch',
        body:
          'Low cloud cover expected after 20:00 with Jupiter high in the eastern sky. Ideal evening for a short walk.',
        accent: '#38bdf8',
      },
    ],
  },

  'music://focus': {
    url: 'music://focus',
    domain: 'audio.personal.local',
    title: 'Ambient Focus Radio & Queue',
    category: 'Audio',
    accentColor: '#c084fc',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'PERSONAL LISTENING ROOM',
        headline: 'Ambient Focus & Reading Queue',
        subtitle:
          'Track reading sessions, chill playlists, and long-form podcast notes while you browse.',
        palette: ['#3b0764', '#581c87', '#c084fc'],
        icon: 'music_note',
      },
      {
        type: 'checklist',
        title: 'Up Next in Queue',
        items: [
          {id: 'a1', text: 'Station 01 — Warm Analog Synth & Rain (64 min)'},
          {id: 'a2', text: 'Podcast — Designing Calm Spatial Interfaces (38 min)'},
          {id: 'a3', text: 'Album — Kyoto Evening Acoustic Guitar (45 min)'},
          {id: 'a4', text: 'Lecture — Early Hypertext & Vannevar Bush (52 min)'},
        ],
      },
      {
        type: 'link-card',
        title: 'Read about "Ambient music" on Wikipedia',
        description: 'Explore the history of ambient soundscapes from Brian Eno onward.',
        url: 'search://Ambient_music',
        meta: 'Wikipedia Lookup',
      },
    ],
  },
};

export function getSlotConfig(slot: DisplaySlot): SlotTransform {
  return CROSS_FORMATION_SLOTS.find((s) => s.slot === slot) ?? CROSS_FORMATION_SLOTS[0];
}
