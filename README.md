# Face Hat Filter (WebAR)

A super‑simple, cross‑platform (iOS + Android) WebAR face‑tracking filter that draws a hat on your head **and** green landmark dots.

- **Tech**: TensorFlow.js + `@tensorflow-models/face-landmarks-detection` using the MediaPipe FaceMesh backend via CDN.
- **Hosting**: Works when served over **HTTPS** (e.g., GitHub Pages).
- **Cameras**: Defaults to the **front** camera; toggle to rear camera in UI.
- **Notes for iOS**: iOS often requires a user gesture to start the camera. If auto‑start fails, tap **Start**.

## Quick Start

1. Upload these files to a new GitHub repo named `face-hat-filter`.
2. In the repo settings, enable **GitHub Pages** with source = `main` (or `master`) branch, root (`/`).
3. Open: `https://atshanab.github.io/face-hat-filter/` (update QR if your URL differs).
4. Grant camera permission. You should see:
   - Your camera feed full‑screen
   - **Green dots** on your face (toggleable)
   - A **witch hat** stuck to your forehead area

## Customize
- Replace `assets/hat.png` with your own PNG (transparent background).
- Tweak `script.js` sizing: search for `hatWidth` / `hatHeight` multipliers.

## Troubleshooting
- If you see a blank/black view on iOS:
  - Ensure HTTPS (GitHub Pages) and **Allow Camera** permission.
  - If auto‑start doesn’t work, tap **Start**.
- If you saw "**VISION BUNDLE NOT AVAILABLE**" in previous attempts: this build uses CDN‑hosted MediaPipe assets via `solutionPath`, so you don't need to host any `.wasm` yourself.
