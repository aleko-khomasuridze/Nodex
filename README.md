# Nodex

An Electron desktop starter powered by React, TypeScript, Tailwind CSS, and Vite.

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?logo=node.js)
![Electron](https://img.shields.io/badge/Electron-29.1.0-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Bundler-Vite_5-646CFF?logo=vite&logoColor=white)

<img title="a title" style="border-radius: 1rem" alt="Alt text" src="./assets/images/nodex-splash.png">

## Getting started
An Electron desktop toolkit for managing local ssh environments. Built with a modern React + TypeScript renderer, Tailwind CSS styling, and a production-grade Electron build pipeline.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Packaging for Distribution](#packaging-for-distribution)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Overview

Nodex delivers a streamlined Electron experience for teams that need to orchestrate, monitor, and troubleshoot local server nodes via ssh from a single desktop application. The project is designed with senior-level maintainability in mind, leveraging Vite for fast iteration and a layered TypeScript architecture to keep the main, preload, and renderer processes cleanly separated.

## Features

- **Instant feedback loop**: Vite-driven renderer with hot module replacement and automatic Electron relaunch during development.
- **Typed main/preload processes**: TypeScript across the entire codebase for reliable IPC contracts and predictable runtime behavior.
- **Tailwind CSS UI toolkit**: Rapidly compose responsive layouts and themed components without leaving your JSX.
- **SSH/PTY integrations**: Backed by `ssh2` and `node-pty` for secure remote shell access and streaming terminal output.
- **Production-ready builds**: Electron Builder configuration for shipping signed installers on Windows and dmg images on macOS.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Renderer | React 18, React Router, Tailwind CSS, Vite |
| Desktop runtime | Electron 29, Electron Builder |
| Language & tooling | TypeScript 5, Node.js ≥ 18, ESLint-ready configuration |
| Integrations | SSH2, node-pty-prebuilt, Remix Icon set |

## Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9 (bundled with modern Node.js distributions)
- macOS, Windows, or Linux environment capable of running Electron

> _Tip:_ On macOS you may need additional build tools (`xcode-select --install`). On Linux ensure that libX11 and related dependencies required by Electron are installed.

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

If you prefer a clean install run `npm ci` on CI or when the `package-lock.json` is authoritative.

If you’d rather not build it yourself, a pre-compiled .exe is available on the Releases page.

## Usage

### Development

Start the complete development environment (renderer + Electron with live reload):

```bash
npm run dev
```

This launches both the Vite dev server (renderer) and Electron with live reload.
This command boots three coordinated processes:

1. `vite` for the renderer with hot module replacement on port `5173`.
2. `tsc --watch` compiling the Electron main and preload code into `dist-electron/`.
3. `electron` launching the desktop shell once the renderer and compilation are ready.

### Preview build output

## Building for production
You can inspect the statically built renderer without packaging Electron by running:

```bash
npm run build
npm run preview
```

The compiled assets live in `dist/` and are served via Vite's preview server.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Launches concurrent renderer, TypeScript watch, and Electron sessions for rapid development. |
| `npm run build` | Produces production bundles for both renderer (`dist/`) and Electron (`dist-electron/`). |
| `npm run build:renderer` | Builds only the Vite renderer bundle. |
| `npm run build:electron` | Transpiles Electron main and preload TypeScript into JavaScript. |
| `npm run preview` | Serves the built renderer locally for smoke testing. |
| `npm run package:win` | Generates a Windows installer via Electron Builder. |
| `npm run package:mac` | Creates a macOS disk image (dmg) package. |

## Project Structure

```
.
├── electron/           # Main & preload process TypeScript sources
├── src/                # React renderer application (components, routes, hooks)
├── assets/             # Icons and static assets bundled with the app
├── dist/               # Vite renderer output (generated)
├── dist-electron/      # Compiled Electron main/preload (generated)
├── release/            # Electron Builder artifacts (generated)
├── package.json        # npm metadata, scripts, and Electron Builder configuration
└── vite.config.ts      # Vite configuration with React SWC plugin
```

The command bundles the renderer into `dist/` and compiles the Electron main + preload scripts into `dist-electron/`.
## Packaging for Distribution

Electron Builder is configured via `package.json`. To create platform-specific installers:

- **Windows**: `npm run package:win`
- **macOS**: `npm run package:mac`

Artifacts are emitted to the `release/` directory. Ensure that platform builds are executed on the corresponding operating system (e.g., build Windows installers on Windows) to satisfy native dependencies and signing requirements.

## Configuration

Runtime configuration is driven by environment variables loaded from `.env` via `dotenv` during packaging. Copy `.env.example` to `.env` (if provided) and adjust remote connection settings, SSH credentials, or API endpoints as required. Treat secrets carefully—avoid committing `.env` files to version control.

## Troubleshooting

- **Electron window does not launch**: Confirm that port `5173` is available and that `npm run dev:renderer` succeeds on its own. The orchestrator waits on this port before booting Electron.
- **Native module rebuilds**: If `node-pty-prebuilt` fails on your platform, run `npx electron-rebuild` after `npm install`.
- **Type checking errors**: Execute `tsc -p tsconfig.json --noEmit` to surface issues in both renderer and Electron codebases.

---

For engineering discussions, roadmap planning, or major architectural changes, please open an internal issue so we can review requirements and coordinate releases.