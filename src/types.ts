export type DisplaySlot = 'center' | 'up' | 'down' | 'left' | 'right';

export interface SlotTransform {
  readonly slot: DisplaySlot;
  readonly label: string;
  readonly shortLabel: string;
  readonly accentColor: string;
  readonly offset: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
  readonly size: {
    readonly width: number;
    readonly height: number;
  };
  readonly defaultUrl: string;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  icon: string;
  category: string;
}

export type PageBlock =
  | {
      type: 'hero';
      eyebrow: string;
      headline: string;
      subtitle: string;
      palette: readonly [string, string, string];
      icon: string;
    }
  | {
      type: 'heading';
      text: string;
    }
  | {
      type: 'paragraph';
      text: string;
    }
  | {
      type: 'callout';
      title: string;
      body: string;
      accent: string;
    }
  | {
      type: 'link-card';
      title: string;
      description: string;
      url: string;
      meta?: string;
    }
  | {
      type: 'checklist';
      title: string;
      items: readonly {id: string; text: string; checked?: boolean}[];
    }
  | {
      type: 'weather-row';
      items: readonly {day: string; condition: string; temp: string; icon: string}[];
    }
  | {
      type: 'notes-editor';
      placeholder: string;
    }
  | {
      type: 'bookmark-list';
    };

export interface BrowserPage {
  url: string;
  domain: string;
  title: string;
  category: string;
  accentColor: string;
  blocks: PageBlock[];
}
