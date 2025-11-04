import type { RefObject } from "react";

import type { TerminalMode } from "../../pages/Terminal/terminal.types";

interface TerminalSessionSectionProps {
  selectedPanel: TerminalMode;
  onSelectPanel: (mode: TerminalMode) => void;
  canSelectRemote: boolean;
  currentStatus: string;
  sessionIsActive: boolean;
  isStartingSession: boolean;
  isStoppingSession: boolean;
  onStartRemoteSession: () => void;
  onStopRemoteSession: () => void;
  onStartLocalSession: () => void;
  onStopLocalSession: () => void;
  currentError: string | null;
  isTerminalAvailable: boolean;
  isLocalTerminalAvailable: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  terminalWrapperClasses: string;
  terminalHeaderClasses: string;
  terminalBodyClasses: string;
  containerRef: RefObject<HTMLDivElement>;
  activeTerminal: TerminalMode | null;
}

const TerminalSessionSection = ({
  selectedPanel,
  onSelectPanel,
  canSelectRemote,
  currentStatus,
  sessionIsActive,
  isStartingSession,
  isStoppingSession,
  onStartRemoteSession,
  onStopRemoteSession,
  onStartLocalSession,
  onStopLocalSession,
  currentError,
  isTerminalAvailable,
  isLocalTerminalAvailable,
  isFullscreen,
  onToggleFullscreen,
  terminalWrapperClasses,
  terminalHeaderClasses,
  terminalBodyClasses,
  containerRef,
  activeTerminal,
}: TerminalSessionSectionProps) => (
  <section className="rounded-2xl border border-slate-800/70 bg-[#070d1a]/70 p-6 backdrop-blur">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/50 p-1 text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
          <button
            type="button"
            className={`rounded-full px-3 py-1 transition ${
              selectedPanel === "remote"
                ? "bg-emerald-500/10 text-emerald-300"
                : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => onSelectPanel("remote")}
            disabled={!canSelectRemote}
          >
            Remote device
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 transition ${
              selectedPanel === "local"
                ? "bg-emerald-500/10 text-emerald-300"
                : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => onSelectPanel("local")}
          >
            This device
          </button>
        </div>
        <h2 className="text-lg font-semibold text-white">
          {selectedPanel === "remote" ? "Embedded terminal" : "Local terminal"}
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          {selectedPanel === "remote"
            ? "Start a live SSH session directly from Nodex. Input and output are streamed in real time."
            : "Spin up an isolated shell that runs on this machine without requiring SSH access."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{currentStatus}</span>
        {sessionIsActive ? (
          <button
            type="button"
            onClick={() =>
              selectedPanel === "remote"
                ? onStopRemoteSession()
                : onStopLocalSession()
            }
            disabled={isStoppingSession}
            className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStoppingSession ? "Stopping..." : "End session"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              selectedPanel === "remote"
                ? onStartRemoteSession()
                : onStartLocalSession()
            }
            disabled={
              selectedPanel === "remote"
                ? !canSelectRemote || !isTerminalAvailable || isStartingSession
                : !isLocalTerminalAvailable || isStartingSession
            }
            className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStartingSession
              ? selectedPanel === "remote"
                ? "Connecting..."
                : "Starting..."
              : selectedPanel === "remote"
              ? "Start session"
              : "Launch local terminal"}
          </button>
        )}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:border-emerald-500 hover:text-emerald-300"
        >
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>
    </div>

    {selectedPanel === "remote" && !isTerminalAvailable ? (
      <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Launch Nodex through the Electron application to unlock the embedded terminal experience.
      </p>
    ) : null}

    {selectedPanel === "local" && !isLocalTerminalAvailable ? (
      <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        The local terminal is only available from the Electron application. Start the desktop app to interact with your device's shell here.
      </p>
    ) : null}

    {currentError ? (
      <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{currentError}</p>
    ) : null}

    <div className={terminalWrapperClasses}>
      <div className={terminalHeaderClasses}>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
          {activeTerminal === "local" ? "Local shell" : "Shell"}
        </p>
        <span className="text-[10px] font-mono uppercase tracking-wide text-slate-500">xterm</span>
      </div>
      <div className={terminalBodyClasses}>
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  </section>
);

export default TerminalSessionSection;
