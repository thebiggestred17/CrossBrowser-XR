import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import * as xb from 'xrblocks';

export type XRPipelineMode =
  | 'initializing'
  | 'xr-ready'
  | 'immersive-ar'
  | 'simulator'
  | 'unsupported'
  | 'error';

export interface XRPipelineStatus {
  readonly mode: XRPipelineMode;
  readonly referenceSpaceType: XRReferenceSpaceType;
  readonly blendMode: string;
  readonly enabledFeatures: readonly string[];
  readonly isSoftwareGl: boolean;
  readonly detail: string;
}

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const param = debugInfo ? debugInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const rendererName = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
      rendererName
    );
  } catch {
    return false;
  }
}

/**
 * Configures the Three.js WebGL rendering pipeline and monitors the WebXR
 * Device API session lifecycle via XR Blocks' WebXRSessionManager.
 */
export class XRSessionPipeline extends xb.Script {
  private readonly onStatusChange?: (status: XRPipelineStatus) => void;
  private isSoftwareGl = false;
  private envRenderTarget: THREE.WebGLRenderTarget | null = null;
  private activeSession: XRSession | null = null;

  private status: XRPipelineStatus = {
    mode: 'initializing',
    referenceSpaceType: 'local-floor',
    blendMode: 'alpha-blend',
    enabledFeatures: [],
    isSoftwareGl: false,
    detail: 'Initializing WebXR Device API & Three.js pipeline…',
  };

  private readonly handleReady = (event: {sessionOptions: XRSessionInit}) => {
    const optional = event.sessionOptions.optionalFeatures ?? [];
    this.updateStatus({
      mode: 'xr-ready',
      enabledFeatures: [...optional],
      detail: 'WebXR Device API ready • Click Enter XR or use Simulator',
    });
  };

  private readonly handleUnsupported = () => {
    this.updateStatus({
      mode: 'unsupported',
      detail: 'WebXR Device API unavailable • Using Three.js simulator',
    });
  };

  private readonly handleSessionError = (event: {error: unknown}) => {
    const message =
      event.error instanceof Error ? event.error.message : String(event.error);
    this.updateStatus({
      mode: 'error',
      detail: `WebXR session error: ${message}`,
    });
  };

  private readonly handleVisibilityChange = () => {
    if (!this.activeSession) return;
    this.updateStatus({
      detail: `Immersive AR (${this.activeSession.visibilityState}) • ${this.status.referenceSpaceType}`,
    });
  };

  constructor(onStatusChange?: (status: XRPipelineStatus) => void) {
    super();
    this.name = 'XRSessionPipeline';
    this.onStatusChange = onStatusChange;
  }

  get currentStatus(): XRPipelineStatus {
    return this.status;
  }

  init(): void {
    this.isSoftwareGl = detectSoftwareWebGL();
    this.configureThreeRenderingPipeline();
    this.attachWebXRSessionListeners();
  }

  private configureThreeRenderingPipeline(): void {
    const renderer = xb.core.renderer;
    if (!renderer || !('domElement' in renderer)) return;

    const webglRenderer = renderer as THREE.WebGLRenderer;
    webglRenderer.outputColorSpace = THREE.SRGBColorSpace;
    webglRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    webglRenderer.toneMappingExposure = 1.05;
    webglRenderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    webglRenderer.xr.enabled = true;
    webglRenderer.xr.setReferenceSpaceType(xb.core.options.referenceSpaceType);

    if (typeof webglRenderer.getContext === 'function') {
      const pmremGenerator = new THREE.PMREMGenerator(webglRenderer);
      const roomEnv = new RoomEnvironment();
      this.envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
      xb.core.scene.environment = this.envRenderTarget.texture;
      roomEnv.dispose();
      pmremGenerator.dispose();
    }

    this.updateStatus({
      isSoftwareGl: this.isSoftwareGl,
      referenceSpaceType: xb.core.options.referenceSpaceType,
    });
  }

  private attachWebXRSessionListeners(): void {
    const manager = xb.core.webXRSessionManager;
    if (!manager) return;

    manager.addEventListener(
      xb.WebXRSessionEventType.READY,
      this.handleReady
    );
    manager.addEventListener(
      xb.WebXRSessionEventType.UNSUPPORTED,
      this.handleUnsupported
    );
    manager.addEventListener(
      xb.WebXRSessionEventType.SESSION_ERROR,
      this.handleSessionError
    );

    if (manager.isXRSupported() === true) {
      const opts = manager.getSessionOptions();
      this.handleReady({sessionOptions: opts ?? {}});
    } else if (manager.isXRSupported() === false) {
      this.handleUnsupported();
    }
  }

  onXRSessionStarted(session?: XRSession): void {
    if (!session) return;
    this.activeSession = session;
    session.addEventListener('visibilitychange', this.handleVisibilityChange);

    const enabledFeatures = session.enabledFeatures
      ? Array.from(session.enabledFeatures)
      : [];
    const blendMode = session.environmentBlendMode ?? 'alpha-blend';
    const refSpace = xb.core.options.referenceSpaceType;

    this.updateStatus({
      mode: 'immersive-ar',
      referenceSpaceType: refSpace,
      blendMode,
      enabledFeatures,
      detail: `Immersive AR active • ${refSpace} • ${blendMode}`,
    });
  }

  onXRSessionEnded(): void {
    if (this.activeSession) {
      this.activeSession.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange
      );
      this.activeSession = null;
    }
    this.updateStatus({
      mode: xb.core.simulatorRunning ? 'simulator' : 'xr-ready',
      detail: 'WebXR session ended • Ready to resume',
    });
  }

  onSimulatorStarted(): void {
    this.updateStatus({
      mode: 'simulator',
      blendMode: 'simulated-passthrough',
      detail: 'Desktop XR Simulator active • WebGL Three.js pipeline running',
    });
  }

  private updateStatus(patch: Partial<XRPipelineStatus>): void {
    this.status = {...this.status, ...patch};
    this.onStatusChange?.(this.status);
  }

  dispose(): void {
    const manager = xb.core.webXRSessionManager;
    if (manager) {
      manager.removeEventListener(
        xb.WebXRSessionEventType.READY,
        this.handleReady
      );
      manager.removeEventListener(
        xb.WebXRSessionEventType.UNSUPPORTED,
        this.handleUnsupported
      );
      manager.removeEventListener(
        xb.WebXRSessionEventType.SESSION_ERROR,
        this.handleSessionError
      );
    }
    if (this.activeSession) {
      this.activeSession.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange
      );
      this.activeSession = null;
    }
    if (this.envRenderTarget) {
      if (xb.core.scene.environment === this.envRenderTarget.texture) {
        xb.core.scene.environment = null;
      }
      this.envRenderTarget.dispose();
      this.envRenderTarget = null;
    }
  }
}
