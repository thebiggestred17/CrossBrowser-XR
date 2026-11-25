import * as THREE from 'three';
import * as xb from 'xrblocks';
import {
  CROSS_FORMATION_SLOTS,
  THEME_ROTATION,
} from '../constants.ts';
import {
  disposeHeroTextures,
  loadBookmarks,
  resolveBrowserPage,
  saveBookmarks,
} from '../services/webContentService.ts';
import type {BookmarkItem, BrowserPage, DisplaySlot} from '../types.ts';
import {
  BrowserWindowCard,
  type BrowserWindowHost,
} from './BrowserWindowCard.ts';
import {
  XRSessionPipeline,
  type XRPipelineStatus,
} from '../xr/XRSessionPipeline.ts';

const _targetPos = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();

export class CrossBrowserApp extends xb.Script implements BrowserWindowHost {
  private readonly windows = new Map<DisplaySlot, BrowserWindowCard>();
  private readonly windowVisible = new Map<DisplaySlot, boolean>();
  private readonly dockSlotButtons = new Map<DisplaySlot, xb.UIButton>();
  private bookmarks: BookmarkItem[] = loadBookmarks();

  private themeIndex = 0;
  private wideSpread = false;

  private dockOverlay?: xb.UIOverlay;
  private statusLabel?: xb.UIText;
  private themeButton?: xb.UIButton;
  private spreadButton?: xb.UIButton;
  private gestureBadgeText?: xb.UIText;

  private readonly activeHandGestures = new Map<string, string>();
  private onGestureStart?: (event: {detail: xb.GestureEventDetail}) => void;
  private onGestureEnd?: (event: {detail: xb.GestureEventDetail}) => void;
  private hasValidatedLayout = false;
  private elapsedSeconds = 0;
  private readonly xrPipeline: XRSessionPipeline;

  constructor() {
    super();
    this.xrPipeline = new XRSessionPipeline((status) =>
      this.handlePipelineStatus(status)
    );
    this.add(this.xrPipeline);
  }

  async init(): Promise<void> {
    this.addLights();
    this.createWindows();
    this.createDockOverlay();
    this.bindGestureFeedback();
    this.handlePipelineStatus(this.xrPipeline.currentStatus);

    await Promise.all(
      Array.from(this.windows.values()).map((win) => win.loadInitialPage())
    );
  }

  private addLights(): void {
    this.add(new THREE.HemisphereLight(0xdbeafe, 0x334155, 2.4));
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    keyLight.position.set(1.5, 3.5, 2.0);
    this.add(keyLight);
  }

  private createWindows(): void {
    for (const slotConfig of CROSS_FORMATION_SLOTS) {
      const card = new BrowserWindowCard(slotConfig, this);
      this.applySlotTransformImmediate(card, slotConfig.slot);
      this.windows.set(slotConfig.slot, card);
      this.windowVisible.set(slotConfig.slot, true);
      this.add(card);
    }
  }

  private computeSlotPose(
    slot: DisplaySlot,
    outPosition: THREE.Vector3,
    outQuaternion: THREE.Quaternion
  ): void {
    const config = CROSS_FORMATION_SLOTS.find((s) => s.slot === slot)!;
    const spreadMultiplier = this.wideSpread ? 1.16 : 1.0;
    const distanceMultiplier = this.wideSpread ? 1.08 : 1.0;
    const baseHeight = xb.user.height;

    outPosition.set(
      config.offset[0] * spreadMultiplier,
      baseHeight + config.offset[1] * spreadMultiplier,
      config.offset[2] * distanceMultiplier
    );
    _euler.set(config.rotation[0], config.rotation[1], config.rotation[2], 'YXZ');
    outQuaternion.setFromEuler(_euler);
  }

  private applySlotTransformImmediate(
    card: BrowserWindowCard,
    slot: DisplaySlot
  ): void {
    this.computeSlotPose(slot, _targetPos, _targetQuat);
    card.position.copy(_targetPos);
    card.quaternion.copy(_targetQuat);
    card.scale.set(1, 1, 1);
  }

  private createDockOverlay(): void {
    const statusLabel = new xb.UIText({
      text: '5-Display Cross • Drag outer edge to move, corner to resize, inside page to scroll',
      pointerEvents: 'none',
      style: {
        flexGrow: 1,
        flexShrink: 1,
        fontSize: 12,
        opacity: 0.78,
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
      },
    });
    this.statusLabel = statusLabel;

    const gestureBadgeText = new xb.UIText({
      text: 'Hands: Ready',
      pointerEvents: 'none',
      style: {
        fontSize: 11.5,
        fontWeight: 'bold',
        color: '#61dafb',
        whiteSpace: 'nowrap',
      },
    });
    this.gestureBadgeText = gestureBadgeText;

    const gestureBadge = new xb.UIPanel({
      pointerEvents: 'none',
      style: {
        height: 24,
        paddingLeft: 10,
        paddingRight: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(97, 218, 251, 0.14)',
        borderColor: 'rgba(97, 218, 251, 0.45)',
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
      },
      children: [gestureBadgeText],
    });

    const slotButtons = CROSS_FORMATION_SLOTS.map((slotConfig) => {
      const btn = new xb.UIButton({
        label: slotConfig.shortLabel,
        style: {
          height: 30,
          paddingLeft: 10,
          paddingRight: 10,
          borderRadius: 15,
          fontSize: 12,
          borderColor: slotConfig.accentColor,
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
        },
        onClick: () => this.toggleWindowVisibility(slotConfig.slot),
      });
      this.dockSlotButtons.set(slotConfig.slot, btn);
      return btn;
    });

    const snapButton = new xb.UIButton({
      label: 'Snap Cross',
      icon: 'apps',
      style: {
        height: 32,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 16,
        fontSize: 12.5,
      },
      onClick: () => this.snapAllToCross(),
    });

    const spreadButton = new xb.UIButton({
      label: 'Wide',
      icon: 'open_with',
      style: {
        height: 32,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 16,
        fontSize: 12.5,
      },
      onClick: () => this.toggleSpread(),
    });
    this.spreadButton = spreadButton;

    const themeButton = new xb.UIButton({
      label: THEME_ROTATION[0].label,
      icon: 'palette',
      style: {
        height: 32,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 16,
        fontSize: 12.5,
      },
      onClick: () => this.cycleTheme(),
    });
    this.themeButton = themeButton;

    const topRow = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      },
      children: [statusLabel, gestureBadge],
    });

    const controlsRow = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      },
      children: [
        new xb.UIPanel({
          style: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
          },
          children: slotButtons,
        }),
        new xb.UIPanel({
          style: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          },
          children: [snapButton, spreadButton, themeButton],
        }),
      ],
    });

    this.dockOverlay = new xb.UIOverlay({
      style: {
        width: 590,
        position: 'absolute',
        left: '50%',
        bottom: 14,
        transform: {translateX: '-50%'},
        flexDirection: 'column',
        padding: 12,
        gap: 8,
        borderRadius: 22,
      },
      children: [new xb.UIExitButton(), topRow, controlsRow],
    });
    this.dockOverlay.name = 'CrossBrowser Workspace Dock';
    this.add(this.dockOverlay);
  }

  private bindGestureFeedback(): void {
    const gestures = xb.core.gestureRecognition;
    if (!gestures) return;

    this.onGestureStart = (event) => {
      const detail = event.detail;
      if (!detail?.hand || !detail?.name) return;
      this.activeHandGestures.set(detail.hand, detail.name);
      this.updateGestureBadge();
    };

    this.onGestureEnd = (event) => {
      const detail = event.detail;
      if (!detail?.hand) return;
      this.activeHandGestures.delete(detail.hand);
      this.updateGestureBadge();
    };

    gestures.addEventListener('gesturestart', this.onGestureStart);
    gestures.addEventListener('gestureend', this.onGestureEnd);
  }

  private handlePipelineStatus(status: XRPipelineStatus): void {
    if (this.statusLabel) {
      this.statusLabel.text = status.detail;
    }
  }

  private updateGestureBadge(): void {
    if (!this.gestureBadgeText) return;
    if (this.activeHandGestures.size === 0) {
      this.gestureBadgeText.text = 'Hands: Ready';
      this.gestureBadgeText.style.color = '#61dafb';
      return;
    }
    const summary = Array.from(this.activeHandGestures.entries())
      .map(([hand, name]) => `${hand === 'left' ? 'L' : 'R'}: ${name}`)
      .join(' • ');
    this.gestureBadgeText.text = summary;
    this.gestureBadgeText.style.color = '#34d399';
  }

  snapAllToCross(): void {
    for (const slotConfig of CROSS_FORMATION_SLOTS) {
      const card = this.windows.get(slotConfig.slot);
      if (!card) continue;
      if (!card.visible) {
        card.visible = true;
        this.windowVisible.set(slotConfig.slot, true);
        this.syncDockSlotButton(slotConfig.slot);
      }
      this.computeSlotPose(slotConfig.slot, _targetPos, _targetQuat);
      card.setSnapTarget(_targetPos, _targetQuat);
    }
    if (this.statusLabel) {
      this.statusLabel.text = 'Snapped all 5 displays into cross formation';
    }
  }

  private toggleSpread(): void {
    this.wideSpread = !this.wideSpread;
    if (this.spreadButton) {
      this.spreadButton.label = this.wideSpread ? 'Compact' : 'Wide';
    }
    this.snapAllToCross();
  }

  private cycleTheme(): void {
    this.themeIndex = (this.themeIndex + 1) % THEME_ROTATION.length;
    const next = THEME_ROTATION[this.themeIndex];
    xb.ui.theme = next.name;
    if (this.themeButton) {
      this.themeButton.label = next.label;
    }
    if (this.statusLabel) {
      this.statusLabel.text = `Theme switched to ${next.label}`;
    }
  }

  private toggleWindowVisibility(slot: DisplaySlot): void {
    const card = this.windows.get(slot);
    if (!card) return;
    const nextVisible = !card.visible;
    card.visible = nextVisible;
    this.windowVisible.set(slot, nextVisible);
    this.syncDockSlotButton(slot);
    if (nextVisible) {
      this.resetWindowPose(slot);
    }
  }

  private syncDockSlotButton(slot: DisplaySlot): void {
    const btn = this.dockSlotButtons.get(slot);
    const visible = this.windowVisible.get(slot) ?? true;
    if (!btn) return;
    btn.style.opacity = visible ? 1 : 0.45;
  }

  // BrowserWindowHost implementation
  resolvePage(url: string): Promise<BrowserPage> {
    return resolveBrowserPage(url);
  }

  getBookmarks(): readonly BookmarkItem[] {
    return this.bookmarks;
  }

  isBookmarked(url: string): boolean {
    return this.bookmarks.some((b) => b.url === url);
  }

  toggleBookmark(page: BrowserPage): boolean {
    const idx = this.bookmarks.findIndex((b) => b.url === page.url);
    let added = false;
    if (idx >= 0) {
      this.bookmarks.splice(idx, 1);
    } else {
      this.bookmarks.unshift({
        id: `bm_${Date.now()}`,
        title: page.title,
        url: page.url,
        icon: 'bookmark',
        category: page.category,
      });
      added = true;
    }
    saveBookmarks(this.bookmarks);
    for (const card of this.windows.values()) {
      card.refreshBookmarksViewIfActive();
    }
    return added;
  }

  sendToCenter(url: string): void {
    const center = this.windows.get('center');
    if (!center) return;
    if (!center.visible) {
      center.visible = true;
      this.windowVisible.set('center', true);
      this.syncDockSlotButton('center');
    }
    void center.navigate(url);
  }

  resetWindowPose(slot: DisplaySlot): void {
    const card = this.windows.get(slot);
    if (!card) return;
    this.computeSlotPose(slot, _targetPos, _targetQuat);
    card.setSnapTarget(_targetPos, _targetQuat);
    if (this.statusLabel) {
      this.statusLabel.text = `Snapped ${card.slotConfig.label} display back to cross`;
    }
  }

  hideWindow(slot: DisplaySlot): void {
    const card = this.windows.get(slot);
    if (!card) return;
    card.visible = false;
    this.windowVisible.set(slot, false);
    this.syncDockSlotButton(slot);
    if (this.statusLabel) {
      this.statusLabel.text = `Hidden ${card.slotConfig.label} — tap ${card.slotConfig.shortLabel} in dock to restore`;
    }
  }

  onWindowActivity(_slot: DisplaySlot, description: string): void {
    if (this.statusLabel) {
      this.statusLabel.text = description;
    }
  }

  update(): void {
    const deltaTime = xb.getDeltaTime();
    for (const card of this.windows.values()) {
      card.stepSnapAnimation(deltaTime);
    }

    if (!this.hasValidatedLayout) {
      this.elapsedSeconds += deltaTime;
      if (this.elapsedSeconds > 1.0) {
        this.hasValidatedLayout = true;
        const report = xb.ui.validate();
        if (report.ready && !report.ok) {
          console.warn('Spatial UI validation issues:', report.issues);
        }
      }
    }
  }

  dispose(): void {
    const gestures = xb.core.gestureRecognition;
    if (gestures) {
      if (this.onGestureStart) {
        gestures.removeEventListener('gesturestart', this.onGestureStart);
      }
      if (this.onGestureEnd) {
        gestures.removeEventListener('gestureend', this.onGestureEnd);
      }
    }
    disposeHeroTextures();
  }
}
