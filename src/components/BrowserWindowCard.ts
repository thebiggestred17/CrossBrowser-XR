import * as THREE from 'three';
import * as xb from 'xrblocks';
import {QUICK_TAB_URLS} from '../constants.ts';
import {
  createHeroBannerTexture,
  loadChecklistState,
  loadPersonalNotes,
  saveChecklistState,
  savePersonalNotes,
} from '../services/webContentService.ts';
import type {BookmarkItem, BrowserPage, DisplaySlot, SlotTransform} from '../types.ts';

export interface BrowserWindowHost {
  resolvePage(url: string): Promise<BrowserPage>;
  getBookmarks(): readonly BookmarkItem[];
  isBookmarked(url: string): boolean;
  toggleBookmark(page: BrowserPage): boolean;
  sendToCenter(url: string): void;
  resetWindowPose(slot: DisplaySlot): void;
  hideWindow(slot: DisplaySlot): void;
  onWindowActivity(slot: DisplaySlot, description: string): void;
}

function createCompactIconButton(
  iconName: string,
  ariaLabel: string,
  onClick: () => void,
  size = 30,
  iconSize = 18
): {button: xb.UIButton; icon: xb.UIIcon} {
  const icon = new xb.UIIcon({
    icon: iconName,
    pointerEvents: 'none',
    style: {
      width: iconSize,
      height: iconSize,
      color: '#ffffff',
    },
  });
  const button = new xb.UIButton({
    ariaLabel,
    onClick,
    children: [icon],
    style: {
      width: size,
      height: size,
      minWidth: size,
      padding: 0,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      borderRadius: size / 2,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
  });
  return {button, icon};
}

export class BrowserWindowCard extends xb.UICard {
  readonly slotConfig: SlotTransform;
  private readonly host: BrowserWindowHost;

  private history: string[] = [];
  private historyIndex = -1;
  private currentPage: BrowserPage | null = null;
  private navigationToken = 0;

  // Retained UI controls
  private readonly titleText: xb.UIText;
  private readonly statusText: xb.UIText;
  private readonly urlInput: xb.UITextInput;
  private readonly backButton: xb.UIButton;
  private readonly forwardButton: xb.UIButton;
  private readonly bookmarkButton: xb.UIButton;
  private readonly bookmarkIcon: xb.UIIcon;
  private readonly scrollView: xb.UIScrollView;
  private readonly tabButtons: {url: string; button: xb.UIButton}[] = [];

  // Smooth snap animation state
  isSnapping = false;
  readonly targetPosition = new THREE.Vector3();
  readonly targetQuaternion = new THREE.Quaternion();
  readonly targetScale = new THREE.Vector3(1, 1, 1);

  constructor(slotConfig: SlotTransform, host: BrowserWindowHost) {
    const titleText = new xb.UIText({
      text: 'Loading...',
      pointerEvents: 'none',
      style: {
        flexGrow: 1,
        flexShrink: 1,
        fontSize: 15,
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
      },
    });

    const statusText = new xb.UIText({
      text: slotConfig.defaultUrl,
      pointerEvents: 'none',
      style: {
        flexGrow: 1,
        flexShrink: 1,
        fontSize: 12,
        opacity: 0.72,
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
      },
    });

    const urlInput = new xb.UITextInput({
      ariaLabel: `${slotConfig.label} address bar`,
      value: slotConfig.defaultUrl,
      placeholder: 'Search Wikipedia or enter URL...',
      style: {
        flexGrow: 1,
        flexShrink: 1,
        height: 32,
        minHeight: 32,
        fontSize: 13,
        borderRadius: 16,
        paddingLeft: 12,
        paddingRight: 12,
      },
      onSubmit: (value) => {
        void this.navigate(value);
      },
    });

    const scrollView = new xb.UIScrollView({
      ariaLabel: `${slotConfig.label} web viewport`,
      style: {
        width: '100%',
        flexGrow: 1,
        flexBasis: 0,
        minHeight: 110,
        gap: 10,
        paddingRight: 10,
      },
      onScroll: () => this.refreshStatusText(),
    });

    const backCtrl = createCompactIconButton(
      'arrow_back',
      `${slotConfig.label} back`,
      () => void this.goBack()
    );
    const forwardCtrl = createCompactIconButton(
      'arrow_forward',
      `${slotConfig.label} forward`,
      () => void this.goForward()
    );
    const reloadCtrl = createCompactIconButton(
      'refresh',
      `${slotConfig.label} reload`,
      () => void this.reload()
    );
    const homeCtrl = createCompactIconButton(
      'home',
      `${slotConfig.label} home`,
      () => void this.navigate(slotConfig.defaultUrl)
    );
    const goCtrl = createCompactIconButton(
      'search',
      `${slotConfig.label} go to URL`,
      () => void this.navigate(urlInput.value)
    );
    const bookmarkCtrl = createCompactIconButton(
      'bookmark_border',
      `${slotConfig.label} toggle bookmark`,
      () => this.handleBookmarkToggle()
    );

    const titleActions: THREE.Object3D[] = [];
    if (slotConfig.slot !== 'center') {
      const sendCenterCtrl = createCompactIconButton(
        'open_in_new',
        `Open ${slotConfig.label} page in middle display`,
        () => {
          if (this.currentPage) {
            this.host.sendToCenter(this.currentPage.url);
          }
        },
        28,
        16
      );
      titleActions.push(sendCenterCtrl.button);
    }

    const resetPoseCtrl = createCompactIconButton(
      'my_location',
      `Snap ${slotConfig.label} window back to cross`,
      () => this.host.resetWindowPose(slotConfig.slot),
      28,
      16
    );
    const hideCtrl = createCompactIconButton(
      'visibility_off',
      `Hide ${slotConfig.label} display`,
      () => this.host.hideWindow(slotConfig.slot),
      28,
      16
    );
    titleActions.push(resetPoseCtrl.button, hideCtrl.button);

    const slotBadge = new xb.UIPanel({
      pointerEvents: 'none',
      style: {
        height: 24,
        paddingLeft: 9,
        paddingRight: 9,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: slotConfig.accentColor,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
      },
      children: [
        new xb.UIText({
          text: slotConfig.label,
          pointerEvents: 'none',
          style: {
            fontSize: 11,
            fontWeight: 'bold',
            color: slotConfig.accentColor,
          },
        }),
      ],
    });

    const titleBar = new xb.UIPanel({
      style: {
        width: '100%',
        height: 30,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      children: [slotBadge, titleText, ...titleActions],
    });

    const navBar = new xb.UIPanel({
      style: {
        width: '100%',
        height: 34,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      },
      children: [
        backCtrl.button,
        forwardCtrl.button,
        reloadCtrl.button,
        homeCtrl.button,
        urlInput,
        goCtrl.button,
        bookmarkCtrl.button,
      ],
    });

    const tabButtons: {url: string; button: xb.UIButton}[] = [];
    const tabBar = new xb.UIPanel({
      style: {
        width: '100%',
        height: 28,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      },
      children: QUICK_TAB_URLS.map((tab) => {
        const button = new xb.UIButton({
          label: tab.label,
          style: {
            flexGrow: 1,
            height: 26,
            paddingLeft: 8,
            paddingRight: 8,
            borderRadius: 13,
            fontSize: 12,
          },
          onClick: () => void this.navigate(tab.url),
        });
        tabButtons.push({url: tab.url, button});
        return button;
      }),
    });

    const scrollUpCtrl = createCompactIconButton(
      'keyboard_arrow_up',
      `Scroll ${slotConfig.label} up`,
      () => this.scrollStep(-130),
      26,
      16
    );
    const scrollDownCtrl = createCompactIconButton(
      'keyboard_arrow_down',
      `Scroll ${slotConfig.label} down`,
      () => this.scrollStep(130),
      26,
      16
    );
    const scrollTopCtrl = createCompactIconButton(
      'vertical_align_top',
      `Scroll ${slotConfig.label} to top`,
      () => this.scrollView.scrollTo(0),
      26,
      15
    );

    const footerBar = new xb.UIPanel({
      style: {
        width: '100%',
        height: 26,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
      },
      children: [
        statusText,
        new xb.UIPanel({
          style: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          },
          children: [
            scrollUpCtrl.button,
            scrollDownCtrl.button,
            scrollTopCtrl.button,
          ],
        }),
      ],
    });

    super({
      size: {width: slotConfig.size.width, height: slotConfig.size.height},
      pixelSize: 0.001,
      manipulation: {
        actions: {
          translate: {
            faceCamera: true,
            scaleWithDistance: true,
            pushPull: true,
            minDistance: 0.65,
            maxDistance: 4.5,
          },
          scale: {minScale: 0.6, maxScale: 1.8},
          resize: {
            anchor: 'center',
            minSize: {width: 0.44, height: 0.32},
            maxSize: {width: 1.35, height: 1.0},
          },
        },
        handle: {action: xb.ManipulationAction.Translate},
      },
      edge: {translateFromSurface: false},
      style: {
        flexDirection: 'column',
        padding: 14,
        gap: 8,
        overflow: 'hidden',
      },
      children: [titleBar, navBar, tabBar, scrollView, footerBar],
    });

    this.name = `${slotConfig.label} Browser Window`;
    this.slotConfig = slotConfig;
    this.host = host;
    this.titleText = titleText;
    this.statusText = statusText;
    this.urlInput = urlInput;
    this.backButton = backCtrl.button;
    this.forwardButton = forwardCtrl.button;
    this.bookmarkButton = bookmarkCtrl.button;
    this.bookmarkIcon = bookmarkCtrl.icon;
    this.scrollView = scrollView;
    this.tabButtons = tabButtons;

    this.backButton.disabled = true;
    this.forwardButton.disabled = true;
  }

  onObjectManipulate(event: xb.ManipulationEvent): void {
    if (event.phase === 'start') {
      this.isSnapping = false;
    }
    if (event.phase === 'end') {
      this.host.onWindowActivity(
        this.slotConfig.slot,
        `${this.slotConfig.label}: ${event.action}`
      );
    }
  }

  async loadInitialPage(): Promise<void> {
    await this.navigate(this.slotConfig.defaultUrl, true);
  }

  async navigate(rawUrl: string, pushHistory = true): Promise<void> {
    const token = ++this.navigationToken;
    this.titleText.text = 'Loading...';
    this.statusText.text = `Loading ${rawUrl}...`;

    const page = await this.host.resolvePage(rawUrl);
    if (token !== this.navigationToken) return;

    if (pushHistory) {
      const current = this.history[this.historyIndex];
      if (current !== page.url) {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(page.url);
        this.historyIndex = this.history.length - 1;
      }
    }

    this.currentPage = page;
    this.urlInput.value = page.url;
    this.titleText.text = page.title;
    this.updateNavigationButtons();
    this.updateActiveTabHighlight(page.url);
    this.renderPageContent(page);
    this.scrollView.scrollTo(0);
    this.refreshStatusText();
    this.host.onWindowActivity(
      this.slotConfig.slot,
      `${this.slotConfig.label} → ${page.title}`
    );
  }

  async goBack(): Promise<void> {
    if (this.historyIndex <= 0) return;
    this.historyIndex -= 1;
    await this.navigate(this.history[this.historyIndex], false);
  }

  async goForward(): Promise<void> {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex += 1;
    await this.navigate(this.history[this.historyIndex], false);
  }

  async reload(): Promise<void> {
    const target = this.currentPage?.url ?? this.slotConfig.defaultUrl;
    await this.navigate(target, false);
  }

  refreshBookmarksViewIfActive(): void {
    if (this.currentPage?.url === 'notes://scratchpad') {
      this.renderPageContent(this.currentPage);
    }
    this.updateBookmarkButton();
  }

  scrollStep(delta: number): void {
    if (!this.scrollView.ready) return;
    this.scrollView.scrollBy(delta);
    this.refreshStatusText();
  }

  setSnapTarget(
    position: THREE.Vector3,
    quaternion: THREE.Quaternion
  ): void {
    this.targetPosition.copy(position);
    this.targetQuaternion.copy(quaternion);
    this.targetScale.set(1, 1, 1);
    this.isSnapping = true;
  }

  stepSnapAnimation(deltaTime: number): void {
    if (!this.isSnapping) return;
    const lambda = 9;
    const alpha = 1 - Math.exp(-lambda * Math.min(deltaTime, 0.05));
    this.position.lerp(this.targetPosition, alpha);
    this.quaternion.slerp(this.targetQuaternion, alpha);
    this.scale.lerp(this.targetScale, alpha);

    // Also smoothly restore default physical card size
    const dw = this.slotConfig.size.width - this.size.width;
    const currentH =
      typeof this.size.height === 'number'
        ? this.size.height
        : this.slotConfig.size.height;
    const dh = this.slotConfig.size.height - currentH;
    if (Math.abs(dw) > 0.002) {
      this.size.width = this.size.width + dw * alpha;
    } else {
      this.size.width = this.slotConfig.size.width;
    }
    if (Math.abs(dh) > 0.002) {
      this.size.height = currentH + dh * alpha;
    } else {
      this.size.height = this.slotConfig.size.height;
    }

    if (
      this.position.distanceToSquared(this.targetPosition) < 0.00002 &&
      this.quaternion.angleTo(this.targetQuaternion) < 0.003 &&
      Math.abs(this.scale.x - 1) < 0.003 &&
      Math.abs(this.size.width - this.slotConfig.size.width) < 0.002
    ) {
      this.position.copy(this.targetPosition);
      this.quaternion.copy(this.targetQuaternion);
      this.scale.copy(this.targetScale);
      this.size.width = this.slotConfig.size.width;
      this.size.height = this.slotConfig.size.height;
      this.isSnapping = false;
    }
  }

  private handleBookmarkToggle(): void {
    if (!this.currentPage) return;
    const added = this.host.toggleBookmark(this.currentPage);
    this.updateBookmarkButton();
    this.host.onWindowActivity(
      this.slotConfig.slot,
      added
        ? `Bookmarked "${this.currentPage.title}"`
        : `Removed bookmark "${this.currentPage.title}"`
    );
  }

  private updateNavigationButtons(): void {
    this.backButton.disabled = this.historyIndex <= 0;
    this.forwardButton.disabled = this.historyIndex >= this.history.length - 1;
    this.updateBookmarkButton();
  }

  private updateBookmarkButton(): void {
    const active = this.currentPage
      ? this.host.isBookmarked(this.currentPage.url)
      : false;
    this.bookmarkIcon.icon = active ? 'bookmark' : 'bookmark_border';
    this.bookmarkIcon.filled = active;
    this.bookmarkIcon.style.color = active ? '#fbbf24' : '#ffffff';
    this.bookmarkButton.ariaLabel = active
      ? 'Remove bookmark'
      : 'Bookmark this page';
  }

  private updateActiveTabHighlight(url: string): void {
    for (const tab of this.tabButtons) {
      const isActive = tab.url === url;
      tab.button.style.backgroundColor = isActive
        ? 'rgba(97, 218, 251, 0.24)'
        : undefined;
      tab.button.style.borderColor = isActive
        ? 'rgba(97, 218, 251, 0.7)'
        : undefined;
    }
  }

  private refreshStatusText(): void {
    if (!this.currentPage) return;
    const max = this.scrollView.maxScrollTop;
    const pct =
      max > 1 ? Math.round((this.scrollView.scrollTop / max) * 100) : 0;
    const scrollHint = max > 1 ? `Scroll ${pct}%` : 'Pinch & drag to scroll';
    this.statusText.text = `${this.currentPage.domain}  •  ${scrollHint}`;
  }

  private renderPageContent(page: BrowserPage): void {
    for (const child of [...this.scrollView.children]) {
      this.scrollView.remove(child);
    }

    const checklistState = loadChecklistState();

    for (const block of page.blocks) {
      if (block.type === 'hero') {
        const texture = createHeroBannerTexture(
          `${page.url}:${block.headline}`,
          block.eyebrow,
          block.headline,
          block.palette
        );
        const heroCard = new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'column',
            gap: 8,
            padding: 10,
            borderRadius: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
          children: [
            new xb.UIImage({
              src: texture,
              ariaLabel: `${block.headline} banner`,
              pointerEvents: 'none',
              style: {
                width: '100%',
                height: 132,
                objectFit: 'cover',
                borderRadius: 12,
              },
            }),
            new xb.UIText({
              text: block.subtitle,
              pointerEvents: 'none',
              style: {
                width: '100%',
                fontSize: 14,
                lineHeight: 1.35,
                opacity: 0.88,
              },
            }),
          ],
        });
        this.scrollView.add(heroCard);
      } else if (block.type === 'heading') {
        this.scrollView.add(
          new xb.UIText({
            text: block.text,
            pointerEvents: 'none',
            style: {
              width: '100%',
              fontSize: 17,
              fontWeight: 'bold',
              marginTop: 4,
            },
          })
        );
      } else if (block.type === 'paragraph') {
        this.scrollView.add(
          new xb.UIText({
            text: block.text,
            pointerEvents: 'none',
            style: {
              width: '100%',
              fontSize: 14,
              lineHeight: 1.4,
              whiteSpace: 'pre-line',
              opacity: 0.9,
            },
          })
        );
      } else if (block.type === 'callout') {
        this.scrollView.add(
          new xb.UIPanel({
            style: {
              width: '100%',
              flexDirection: 'column',
              gap: 6,
              padding: 12,
              borderRadius: 14,
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              borderColor: block.accent,
              borderWidth: 1.5,
            },
            children: [
              new xb.UIText({
                text: block.title,
                pointerEvents: 'none',
                style: {
                  width: '100%',
                  fontSize: 15,
                  fontWeight: 'bold',
                  color: block.accent,
                },
              }),
              new xb.UIText({
                text: block.body,
                pointerEvents: 'none',
                style: {
                  width: '100%',
                  fontSize: 13.5,
                  lineHeight: 1.4,
                  whiteSpace: 'pre-line',
                  opacity: 0.92,
                },
              }),
            ],
          })
        );
      } else if (block.type === 'link-card') {
        const card = new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'column',
            gap: 6,
            padding: 12,
            borderRadius: 14,
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            borderColor: 'rgba(255, 255, 255, 0.14)',
            borderWidth: 1,
          },
          children: [
            new xb.UIText({
              text: block.title,
              pointerEvents: 'none',
              style: {
                width: '100%',
                fontSize: 15,
                fontWeight: 'bold',
              },
            }),
            new xb.UIText({
              text: block.description,
              pointerEvents: 'none',
              style: {
                width: '100%',
                fontSize: 13,
                lineHeight: 1.35,
                opacity: 0.78,
              },
            }),
            new xb.UIPanel({
              style: {
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                marginTop: 2,
              },
              children: [
                new xb.UIText({
                  text: block.meta ?? block.url,
                  pointerEvents: 'none',
                  style: {
                    flexGrow: 1,
                    flexShrink: 1,
                    fontSize: 12,
                    color: page.accentColor,
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  },
                }),
                new xb.UIButton({
                  label: 'Open',
                  style: {
                    height: 30,
                    paddingLeft: 14,
                    paddingRight: 14,
                    borderRadius: 15,
                    fontSize: 12,
                    flexShrink: 0,
                  },
                  onClick: () => void this.navigate(block.url),
                }),
              ],
            }),
          ],
        });
        this.scrollView.add(card);
      } else if (block.type === 'checklist') {
        const rows = block.items.map((item) => {
          let checked = Boolean(checklistState[item.id] ?? item.checked);
          const checkIcon = new xb.UIIcon({
            icon: checked ? 'check_box' : 'check_box_outline_blank',
            pointerEvents: 'none',
            style: {
              width: 20,
              height: 20,
              color: checked ? page.accentColor : '#ffffff',
              flexShrink: 0,
            },
          });
          const label = new xb.UIText({
            text: item.text,
            pointerEvents: 'none',
            style: {
              flexGrow: 1,
              flexShrink: 1,
              fontSize: 13.5,
              lineHeight: 1.3,
              opacity: checked ? 0.55 : 0.95,
              textAlign: 'left',
            },
          });
          return new xb.UIButton({
            ariaLabel: item.text,
            style: {
              width: '100%',
              height: 'auto',
              minHeight: 38,
              padding: 10,
              paddingLeft: 12,
              paddingRight: 12,
              borderRadius: 12,
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 10,
            },
            children: [checkIcon, label],
            onClick: () => {
              checked = !checked;
              checklistState[item.id] = checked;
              saveChecklistState(checklistState);
              checkIcon.icon = checked
                ? 'check_box'
                : 'check_box_outline_blank';
              checkIcon.style.color = checked ? page.accentColor : '#ffffff';
              label.style.opacity = checked ? 0.55 : 0.95;
            },
          });
        });

        this.scrollView.add(
          new xb.UIPanel({
            style: {
              width: '100%',
              flexDirection: 'column',
              gap: 8,
            },
            children: [
              new xb.UIText({
                text: block.title,
                pointerEvents: 'none',
                style: {width: '100%', fontSize: 16, fontWeight: 'bold'},
              }),
              ...rows,
            ],
          })
        );
      } else if (block.type === 'weather-row') {
        const rows = block.items.map(
          (item) =>
            new xb.UIPanel({
              style: {
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 10,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                gap: 10,
              },
              children: [
                new xb.UIIcon({
                  icon: item.icon,
                  pointerEvents: 'none',
                  style: {width: 24, height: 24, color: '#38bdf8', flexShrink: 0},
                }),
                new xb.UIText({
                  text: item.day,
                  pointerEvents: 'none',
                  style: {width: 64, fontSize: 14, fontWeight: 'bold', flexShrink: 0},
                }),
                new xb.UIText({
                  text: item.condition,
                  pointerEvents: 'none',
                  style: {flexGrow: 1, fontSize: 14, opacity: 0.84},
                }),
                new xb.UIText({
                  text: item.temp,
                  pointerEvents: 'none',
                  style: {fontSize: 14, fontWeight: 'bold', flexShrink: 0},
                }),
              ],
            })
        );
        this.scrollView.add(
          new xb.UIPanel({
            style: {width: '100%', flexDirection: 'column', gap: 6},
            children: rows,
          })
        );
      } else if (block.type === 'notes-editor') {
        const editor = new xb.UITextInput({
          ariaLabel: 'Personal scratchpad',
          multiline: true,
          value: loadPersonalNotes(),
          placeholder: block.placeholder,
          style: {
            width: '100%',
            minHeight: 160,
            fontSize: 13.5,
            lineHeight: 1.4,
            borderRadius: 14,
            padding: 12,
          },
          onInput: (val) => savePersonalNotes(val),
        });
        this.scrollView.add(editor);
      } else if (block.type === 'bookmark-list') {
        const bookmarks = this.host.getBookmarks();
        const items = bookmarks.map(
          (bm) =>
            new xb.UIPanel({
              style: {
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 10,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                gap: 8,
              },
              children: [
                new xb.UIIcon({
                  icon: bm.icon,
                  pointerEvents: 'none',
                  style: {width: 22, height: 22, color: '#34d399', flexShrink: 0},
                }),
                new xb.UIPanel({
                  style: {
                    flexGrow: 1,
                    flexShrink: 1,
                    flexDirection: 'column',
                    gap: 2,
                  },
                  children: [
                    new xb.UIText({
                      text: bm.title,
                      pointerEvents: 'none',
                      style: {
                        width: '100%',
                        fontSize: 14,
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      },
                    }),
                    new xb.UIText({
                      text: bm.url,
                      pointerEvents: 'none',
                      style: {
                        width: '100%',
                        fontSize: 11.5,
                        opacity: 0.65,
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      },
                    }),
                  ],
                }),
                new xb.UIButton({
                  label: 'Here',
                  style: {
                    height: 28,
                    paddingLeft: 10,
                    paddingRight: 10,
                    borderRadius: 14,
                    fontSize: 12,
                    flexShrink: 0,
                  },
                  onClick: () => void this.navigate(bm.url),
                }),
                new xb.UIButton({
                  label: 'Middle',
                  style: {
                    height: 28,
                    paddingLeft: 10,
                    paddingRight: 10,
                    borderRadius: 14,
                    fontSize: 12,
                    flexShrink: 0,
                  },
                  onClick: () => this.host.sendToCenter(bm.url),
                }),
              ],
            })
        );
        this.scrollView.add(
          new xb.UIPanel({
            style: {width: '100%', flexDirection: 'column', gap: 6},
            children: items,
          })
        );
      }
    }
  }
}
