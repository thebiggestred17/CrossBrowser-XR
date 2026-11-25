import * as xb from 'xrblocks';
import {CrossBrowserApp} from './components/CrossBrowserApp.ts';

function start(): void {
  const options = new xb.Options();

  // WebXR Device API session configuration
  options.xrSessionMode = 'immersive-ar';
  options.referenceSpaceType = 'local-floor';
  options.enableLayers();

  // Three.js WebGL rendering pipeline configuration
  options.rendererBackend = 'webgl';
  options.antialias = true;
  options.setFramebufferScaleFactor('native');
  options.camera.near = 0.05;
  options.camera.far = 100;

  // Hand tracking, gestures, and spatial reticle targeting
  options.enableHands();
  options.hands.visualization = true;
  options.hands.visualizeJoints = true;
  options.hands.visualizeMeshes = true;
  options.enableGestures();
  options.enableReticles();

  options.setAppTitle('CrossBrowser XR');
  options.setAppDescription(
    'Five-display spatial web browser in a cross formation with hand tracking for window manipulation and scrolling.'
  );

  xb.add(new CrossBrowserApp());
  void xb.init(options);
}

document.addEventListener('DOMContentLoaded', start);
