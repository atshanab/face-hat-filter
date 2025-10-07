// Cross‑platform face tracking with green dots + hat overlay
// Uses TensorFlow.js + @tensorflow-models/face-landmarks-detection with the MediaPipe backend.
// Works on iOS Safari (iPhone 14 / iOS 16+) and Android Chrome when hosted over HTTPS (e.g., GitHub Pages).

const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const startBtn = document.getElementById('startBtn');
const toggleDots = document.getElementById('toggleDots');
const flipCam = document.getElementById('flipCam');

let model;
let running = false;
let currentFacingMode = 'user';
let hatImg = new Image();
hatImg.src = 'assets/hat.png';

async function setupCamera() {
  // Some browsers require a user gesture; we try first, and if it fails, show Start button.
  if (video.srcObject) {
    // If already set up, stop tracks before switching cameras.
    for (const t of video.srcObject.getTracks()) t.stop();
  }
  const constraints = {
    audio: false,
    video: {
      facingMode: currentFacingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  await video.play();
  return new Promise((resolve) => {
    video.onloadedmetadata = () => resolve(video);
  });
}

function resizeCanvasToVideo() {
  const { videoWidth, videoHeight } = video;
  // match canvas size to displayed size
  canvas.width = video.clientWidth;
  canvas.height = video.clientHeight;

  // set transform to map video pixels -> canvas CSS pixels
  // We'll compute a scale factor based on how the video is fit (cover).
}

function videoToCanvasCoords(x, y) {
  // Because we use object-fit: cover, we need to map from the underlying video pixel
  // space to the drawn canvas space. We'll compute the scale and offsets.
  const vw = video.videoWidth, vh = video.videoHeight;
  const cw = canvas.width, ch = canvas.height;
  const videoAspect = vw / vh;
  const canvasAspect = cw / ch;

  let renderW, renderH, offsetX, offsetY;
  if (videoAspect > canvasAspect) {
    // video is wider; height matches, width cropped
    renderH = ch;
    renderW = ch * videoAspect;
    offsetX = (cw - renderW) / 2;
    offsetY = 0;
  } else {
    // video is taller; width matches, height cropped
    renderW = cw;
    renderH = cw / videoAspect;
    offsetX = 0;
    offsetY = (ch - renderH) / 2;
  }
  const scaleX = renderW / vw;
  const scaleY = renderH / vh;
  return [x * scaleX + offsetX, y * scaleY + offsetY];
}

async function loadModel() {
  // Use MediaPipe FaceMesh via CDN (no local wasm hosting needed)
  const modelConfig = {
    runtime: 'mediapipe', // use mediapipe solution
    refineLandmarks: true,
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh', // fetches assets
  };
  model = await faceLandmarksDetection.createDetector(
    faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
    modelConfig
  );
}

async function init() {
  try {
    await setupCamera();
    resizeCanvasToVideo();
    window.addEventListener('resize', resizeCanvasToVideo, { passive: true });
    if (!model) await loadModel();
    running = true;
    requestAnimationFrame(loop);
  } catch (e) {
    console.error(e);
    alert('Camera permission needed. Tap Start to try again.');
  }
}

startBtn.addEventListener('click', async () => {
  await init();
});

flipCam.addEventListener('change', async () => {
  currentFacingMode = flipCam.checked ? 'environment' : 'user';
  await init();
});

// Try to auto-start on load; if it fails due to permissions, the Start button will remain.
document.addEventListener('DOMContentLoaded', () => {
  init().catch(() => {});
});

function drawHatAndDots(keypoints) {
  // Dots
  if (toggleDots.checked) {
    ctx.fillStyle = 'rgba(0,255,0,0.9)';
  }

  // Some stable reference points:
  // 10 ~ forehead/glabella-ish, 152 ~ chin, 234 ~ left side, 454 ~ right side
  const kp10 = keypoints[10];
  const kp152 = keypoints[152];
  const kp234 = keypoints[234];
  const kp454 = keypoints[454];

  // Convert to canvas coords
  const [x10, y10]   = videoToCanvasCoords(kp10.x * video.videoWidth, kp10.y * video.videoHeight);
  const [x152, y152] = videoToCanvasCoords(kp152.x * video.videoWidth, kp152.y * video.videoHeight);
  const [x234, y234] = videoToCanvasCoords(kp234.x * video.videoWidth, kp234.y * video.videoHeight);
  const [x454, y454] = videoToCanvasCoords(kp454.x * video.videoWidth, kp454.y * video.videoHeight);

  // Draw dots (subset for performance)
  if (toggleDots.checked) {
    for (let i = 0; i < keypoints.length; i += 2) { // half the points for speed
      const kp = keypoints[i];
      const [cx, cy] = videoToCanvasCoords(kp.x * video.videoWidth, kp.y * video.videoHeight);
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Compute head tilt using left/right temple points
  const dx = x454 - x234;
  const dy = y454 - y234;
  const angle = Math.atan2(dy, dx);

  const faceWidth = Math.hypot(dx, dy);
  const hatWidth = faceWidth * 1.6;
  const aspect = hatImg.height / hatImg.width;
  const hatHeight = hatWidth * aspect;

  // Anchor the hat slightly above the forehead (kp10)
  const anchorX = x10;
  const anchorY = y10 - hatHeight * 0.55;

  // Draw rotated hat
  ctx.save();
  ctx.translate(anchorX, anchorY);
  ctx.rotate(angle);
  ctx.drawImage(hatImg, -hatWidth / 2, -hatHeight * 0.15, hatWidth, hatHeight);
  ctx.restore();
}

async function loop() {
  if (!running) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Keep canvas in sync if layout changes
  resizeCanvasToVideo();

  if (model && video.readyState >= 2) {
    try {
      const faces = await model.estimateFaces(video, { flipHorizontal: currentFacingMode === 'user' });
      if (faces && faces.length > 0) {
        // Use the first face
        const face = faces[0];
        drawHatAndDots(face.keypoints);
      }
    } catch (err) {
      // Model can throw during hot camera switches; fail softly
      console.warn('estimateFaces warning:', err);
    }
  }

  requestAnimationFrame(loop);
}
