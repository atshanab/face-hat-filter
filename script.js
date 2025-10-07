// Pure MediaPipe FaceMesh (no TFJS). Often more reliable on iOS Safari.
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const toggleDots = document.getElementById('toggleDots');
const flipCam = document.getElementById('flipCam');
let currentFacingMode = 'user';
let camera = null;

const hatImg = new Image();
hatImg.src = 'assets/hat.png';

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas, {passive:true});

function normToCanvas(x, y) {
  // Map normalized [0..1] coords to canvas space, compensating for object-fit:cover
  const vw = video.videoWidth, vh = video.videoHeight;
  const cw = canvas.width, ch = canvas.height;
  const videoAspect = vw / vh;
  const canvasAspect = cw / ch;

  let renderW, renderH, offsetX, offsetY;
  if (videoAspect > canvasAspect) {
    renderH = ch;
    renderW = ch * videoAspect;
    offsetX = (cw - renderW) / 2;
    offsetY = 0;
  } else {
    renderW = cw;
    renderH = cw / videoAspect;
    offsetX = 0;
    offsetY = (ch - renderH) / 2;
  }

  return [x * renderW + offsetX, y * renderH + offsetY];
}

function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  resizeCanvas();

  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
  const landmarks = results.multiFaceLandmarks[0];

  // Draw dots if enabled
  if (toggleDots.checked) {
    ctx.fillStyle = 'rgba(0,255,0,0.9)';
    for (let i = 0; i < landmarks.length; i+=2) {
      const [cx, cy] = normToCanvas(landmarks[i].x, landmarks[i].y);
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // Key anchors
  const kp10 = landmarks[10];
  const kp234 = landmarks[234];
  const kp454 = landmarks[454];

  const [x10, y10]   = normToCanvas(kp10.x, kp10.y);
  const [x234, y234] = normToCanvas(kp234.x, kp234.y);
  const [x454, y454] = normToCanvas(kp454.x, kp454.y);

  const dx = x454 - x234;
  const dy = y454 - y234;
  const angle = Math.atan2(dy, dx);
  const faceWidth = Math.hypot(dx, dy);

  const hatWidth = faceWidth * 1.6;
  const hatHeight = hatWidth * (hatImg.height / hatImg.width);
  const anchorX = x10;
  const anchorY = y10 - hatHeight * 0.55;

  ctx.save();
  ctx.translate(anchorX, anchorY);
  ctx.rotate(angle);
  ctx.drawImage(hatImg, -hatWidth/2, -hatHeight*0.15, hatWidth, hatHeight);
  ctx.restore();
}

async function start() {
  // Build FaceMesh
  const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  faceMesh.onResults(onResults);

  // Camera pipeline; MediaPipe Camera handles frames -> FaceMesh -> onResults
  if (camera) camera.stop();
  const constraints = { facingMode: currentFacingMode };
  camera = new Camera(video, {
    onFrame: async () => {
      await faceMesh.send({ image: video });
    },
    width: 1280,
    height: 720,
    facingMode: constraints.facingMode
  });
  await camera.start();
  resizeCanvas();
}

startBtn.addEventListener('click', () => start());
flipCam.addEventListener('change', () => {
  currentFacingMode = flipCam.checked ? 'environment' : 'user';
  start();
});

// Try auto start on load; button remains if permissions require a tap
document.addEventListener('DOMContentLoaded', () => {
  start().catch(()=>{});
});
