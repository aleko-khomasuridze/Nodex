# Testing Nodex

Even without automated tests, you can validate the Electron + React + Tailwind stack with the following manual and build checks.

## 1. Install dependencies

```bash
npm install
```

> Installs Electron, Vite, Tailwind CSS, and related tooling.

## 2. Run the development environment

```bash
npm run dev
```

- Wait for the Vite dev server to report it is running at `http://localhost:5173`.
- An Electron window should open automatically. If it does not, start Electron manually with `npm run start:electron` in another terminal after the dev server is up.
- Confirm the welcome screen renders with Tailwind styling and that the Developer Tools open in development mode.

## 3. Build the application

```bash
npm run build
```

- The renderer bundle is emitted to `dist/`.
- The Electron main and preload scripts compile to `dist-electron/`.
- Launch the packaged app for a smoke test by running:

  ```bash
  npm run build && electron dist-electron/main.js
  ```

  Ensure the rendered UI matches the development build.

## 4. Optional: Preview the production renderer

```bash
npm run preview
```

- Starts the Vite preview server so you can spot-check the production bundle via the browser before wiring it into Electron.
