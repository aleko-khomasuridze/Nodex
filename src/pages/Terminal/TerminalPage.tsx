import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "@xterm/xterm/css/xterm.css";

import useDeviceRecord from "../../hooks/useDeviceRecord";
import useFullscreenBehavior from "../../hooks/useFullscreenBehavior";
import useTerminalInstance from "../../hooks/useTerminalInstance";
import useTerminalSessionEvents from "../../hooks/useTerminalSessionEvents";
import TerminalHeader from "../../components/terminal/TerminalHeader";
import TerminalManualCommand from "../../components/terminal/TerminalManualCommand";
import TerminalQuickReference from "../../components/terminal/TerminalQuickReference";
import TerminalSessionSection from "../../components/terminal/TerminalSessionSection";
import type { RegisteredDevice } from "../../types/device";
import type { TerminalMode } from "./terminal.types";

interface TerminalPageProps {
  showBackButton?: boolean;
  autoStartLocal?: boolean;
  autoFullscreen?: boolean;
}

const TerminalPage = ({
  showBackButton = true,
  autoStartLocal = false,
  autoFullscreen = false,
}: TerminalPageProps) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const { device, isLoading, error } = useDeviceRecord(id);

  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<string>("Session idle");
  const [isStartingRemote, setIsStartingRemote] = useState<boolean>(false);
  const [isStoppingRemote, setIsStoppingRemote] = useState<boolean>(false);
  const [activeRemoteSessionId, setActiveRemoteSessionId] = useState<string | null>(null);

  const [localError, setLocalError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<string>("Session idle");
  const [isStartingLocal, setIsStartingLocal] = useState<boolean>(false);
  const [isStoppingLocal, setIsStoppingLocal] = useState<boolean>(false);
  const [activeLocalSessionId, setActiveLocalSessionId] = useState<string | null>(null);

  const [activeTerminal, setActiveTerminal] = useState<TerminalMode | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<TerminalMode>(id ? "remote" : "local");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(autoFullscreen);

  const remoteSessionIdRef = useRef<string | null>(null);
  const localSessionIdRef = useRef<string | null>(null);
  const activeTerminalRef = useRef<TerminalMode | null>(null);

  const { containerRef, terminalRef, fitAddonRef } = useTerminalInstance({
    activeTerminalRef,
    localSessionIdRef,
    remoteSessionIdRef,
  });

  useTerminalSessionEvents({
    activeTerminalRef,
    localSessionIdRef,
    remoteSessionIdRef,
    terminalRef,
    setActiveLocalSessionId,
    setActiveRemoteSessionId,
    setActiveTerminal,
    setIsStoppingLocal,
    setIsStoppingRemote,
    setLocalError,
    setLocalStatus,
    setRemoteError,
    setRemoteStatus,
  });

  useFullscreenBehavior(isFullscreen, () => setIsFullscreen(false));

  useEffect(() => {
    setSelectedPanel(id ? "remote" : "local");
    setRemoteError(null);
    setRemoteStatus("Session idle");
  }, [id]);

  const cleanupSessions = useCallback(() => {
    const remoteSessionId = remoteSessionIdRef.current;
    if (remoteSessionId && window.terminal?.stopSession) {
      void window.terminal.stopSession(remoteSessionId);
    }

    const localSessionId = localSessionIdRef.current;
    if (localSessionId && window.terminal?.stopLocalSession) {
      void window.terminal.stopLocalSession(localSessionId);
    }

    remoteSessionIdRef.current = null;
    localSessionIdRef.current = null;
    activeTerminalRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupSessions();
    };
  }, [cleanupSessions, id]);

  useEffect(() => {
    if (!activeTerminal) {
      return;
    }

    const fitAddon = fitAddonRef.current;
    const terminal = terminalRef.current;

    if (fitAddon && terminal) {
      fitAddon.fit();
      if (activeTerminal === "local" && window.terminal?.resizeLocalSession) {
        const sessionId = localSessionIdRef.current;
        if (sessionId) {
          window.terminal.resizeLocalSession(sessionId, terminal.cols, terminal.rows);
        }
      }
    }
  }, [activeTerminal, fitAddonRef, terminalRef]);

  useEffect(() => {
    const fitAddon = fitAddonRef.current;
    const terminal = terminalRef.current;

    if (!fitAddon || !terminal) {
      return;
    }

    fitAddon.fit();

    if (activeTerminalRef.current === "local" && window.terminal?.resizeLocalSession) {
      const sessionId = localSessionIdRef.current;
      if (sessionId) {
        window.terminal.resizeLocalSession(sessionId, terminal.cols, terminal.rows);
      }
    }
  }, [fitAddonRef, isFullscreen, terminalRef]);

  const stopRemoteSession = useCallback(
    async (options?: { silent?: boolean }) => {
      const sessionId = remoteSessionIdRef.current;
      if (!sessionId || !window.terminal?.stopSession) {
        return;
      }

      if (!options?.silent) {
        setIsStoppingRemote(true);
        setRemoteStatus("Session ending...");
      }

      try {
        await window.terminal.stopSession(sessionId);
      } finally {
        if (!options?.silent) {
          setIsStoppingRemote(false);
        }
      }
    },
    [],
  );

  const stopLocalSession = useCallback(
    async (options?: { silent?: boolean }) => {
      const sessionId = localSessionIdRef.current;
      if (!sessionId || !window.terminal?.stopLocalSession) {
        return;
      }

      if (!options?.silent) {
        setIsStoppingLocal(true);
        setLocalStatus("Session ending...");
      }

      try {
        await window.terminal.stopLocalSession(sessionId);
      } finally {
        if (!options?.silent) {
          setIsStoppingLocal(false);
        }
      }
    },
    [],
  );

  const getDeviceLabel = useCallback((record: RegisteredDevice) => {
    return record.alias?.trim() || record.hostname?.trim() || record.ip;
  }, []);

  const handleStartRemoteSession = useCallback(async () => {
    if (!device) {
      setRemoteError("Select a registered device to connect.");
      setRemoteStatus("Session idle");
      return;
    }

    if (!window.terminal?.startSession || !terminalRef.current) {
      setRemoteError(
        "You need to open this page from the Electron application to start an SSH session.",
      );
      setRemoteStatus("Session idle");
      return;
    }

    if (localSessionIdRef.current) {
      await stopLocalSession({ silent: true });
    }

    setRemoteError(null);
    setRemoteStatus("Connecting...");
    setIsStartingRemote(true);
    setActiveTerminal("remote");
    activeTerminalRef.current = "remote";

    try {
      const label = getDeviceLabel(device);
      terminalRef.current.reset();
      terminalRef.current.writeln(`\x1b[32mInitializing connection to ${label}...\x1b[0m\r\n`);
      const { sessionId } = await window.terminal.startSession(device.id);
      remoteSessionIdRef.current = sessionId;
      setActiveRemoteSessionId(sessionId);
      setRemoteStatus("Connected");
      terminalRef.current.focus();
    } catch (sessionError) {
      const message =
        sessionError instanceof Error ? sessionError.message : "Unable to start the SSH session.";
      setRemoteError(message);
      setRemoteStatus("Session idle");
      terminalRef.current.writeln(`\x1b[31m${message}\x1b[0m`);
      activeTerminalRef.current = null;
      setActiveTerminal(null);
    } finally {
      setIsStartingRemote(false);
    }
  }, [
    device,
    getDeviceLabel,
    stopLocalSession,
    terminalRef,
  ]);

  const handleStartLocalSession = useCallback(async () => {
    if (!window.terminal?.startLocalSession || !terminalRef.current) {
      setLocalError(
        "You need to open this page from the Electron application to start a local terminal session.",
      );
      setLocalStatus("Session idle");
      return;
    }

    if (remoteSessionIdRef.current) {
      await stopRemoteSession({ silent: true });
    }

    if (localSessionIdRef.current) {
      setActiveTerminal("local");
      activeTerminalRef.current = "local";
      setLocalStatus("Connected");
      terminalRef.current.focus();
      return;
    }

    setLocalError(null);
    setLocalStatus("Starting local shell...");
    setIsStartingLocal(true);
    setActiveTerminal("local");
    activeTerminalRef.current = "local";

    try {
      terminalRef.current.reset();
      terminalRef.current.writeln("\x1b[32mLaunching local shell on this device...\x1b[0m\r\n");
      const { sessionId } = await window.terminal.startLocalSession();
      localSessionIdRef.current = sessionId;
      setActiveLocalSessionId(sessionId);
      setLocalStatus("Connected");
      terminalRef.current.focus();

      if (window.terminal.resizeLocalSession) {
        window.terminal.resizeLocalSession(sessionId, terminalRef.current.cols, terminalRef.current.rows);
      }
    } catch (sessionError) {
      const message =
        sessionError instanceof Error ? sessionError.message : "Unable to start the local terminal session.";
      setLocalError(message);
      setLocalStatus("Session idle");
      terminalRef.current.writeln(`\x1b[31m${message}\x1b[0m`);
      activeTerminalRef.current = null;
      setActiveTerminal(null);
    } finally {
      setIsStartingLocal(false);
    }
  }, [setActiveLocalSessionId, stopRemoteSession, terminalRef]);

  useEffect(() => {
    if (!autoStartLocal || Boolean(id)) {
      return;
    }

    if (!window.terminal?.startLocalSession) {
      return;
    }

    void handleStartLocalSession();
  }, [autoStartLocal, handleStartLocalSession, id]);

  const currentStatus = selectedPanel === "remote" ? remoteStatus : localStatus;
  const currentError = selectedPanel === "remote" ? remoteError : localError;
  const sessionIsActive = selectedPanel === "remote" ? Boolean(activeRemoteSessionId) : Boolean(activeLocalSessionId);
  const isStartingSession = selectedPanel === "remote" ? isStartingRemote : isStartingLocal;
  const isStoppingSession = selectedPanel === "remote" ? isStoppingRemote : isStoppingLocal;

  const handleSelectPanel = useCallback((mode: TerminalMode) => {
    setSelectedPanel(mode);
    if (mode === "remote") {
      setRemoteError(null);
    }
  }, []);

  const handleStopRemoteSession = useCallback(async () => {
    await stopRemoteSession();
  }, [stopRemoteSession]);

  const handleStopLocalSession = useCallback(async () => {
    await stopLocalSession();
  }, [stopLocalSession]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((value) => !value);
  }, []);

  const mainClasses = isFullscreen
    ? "flex min-h-screen flex-col overflow-hidden bg-[#050815] px-4 py-6"
    : "flex-1 min-h-screen overflow-y-auto bg-[#050815] px-4 py-6";

  const terminalWrapperClasses = isFullscreen
    ? "relative flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-[#030712]"
    : "relative h-[420px] overflow-hidden rounded-2xl border border-slate-800 bg-[#030712]/95";

  const terminalHeaderClasses = "flex items-center justify-between border-b border-slate-800/80 bg-[#030712]/80 px-4 py-3";
  const terminalBodyClasses = "relative flex-1 bg-[#030712]";

  const deviceLabel = device ? getDeviceLabel(device) : null;

  const title = deviceLabel ? `Connect to ${deviceLabel}` : "Local terminal";
  const subtitle = deviceLabel
    ? "Manage a live SSH session with your registered device from within Nodex."
    : "Launch an isolated shell that runs directly on this machine.";

  const isTerminalAvailable = typeof window !== "undefined" && Boolean(window.terminal?.startSession);
  const isLocalTerminalAvailable =
    typeof window !== "undefined" && Boolean(window.terminal?.startLocalSession);

  const sshCommand = useMemo(() => {
    if (!device) {
      return "ssh username@host -p 22";
    }

    const username = device.username?.trim() || "username";
    const host = device.hostname?.trim() || device.ip;
    const port = device.port ?? 22;

    return `ssh ${username}@${host} -p ${port}`;
  }, [device]);

  return (
    <main className={mainClasses}>
      <section className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 rounded-3xl border border-slate-800/70 bg-gradient-to-br from-[#0a0f1f] via-[#050815] to-[#0a0f1f] p-8 shadow-[0_0_60px_rgba(16,185,129,0.08)]">
          <TerminalHeader
            title={title}
            subtitle={subtitle}
            onNavigateBack={showBackButton ? () => navigate("/registered-devices") : undefined}
          />

          {error ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
          ) : null}

          {isLoading ? (
            <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
              Loading device details...
            </p>
          ) : null}

          <div className="flex flex-1 flex-col gap-6">
            <TerminalSessionSection
              selectedPanel={selectedPanel}
              onSelectPanel={handleSelectPanel}
              canSelectRemote={Boolean(id && device)}
              currentStatus={currentStatus}
              sessionIsActive={sessionIsActive}
              isStartingSession={isStartingSession}
              isStoppingSession={isStoppingSession}
              onStartRemoteSession={() => void handleStartRemoteSession()}
              onStopRemoteSession={() => void handleStopRemoteSession()}
              onStartLocalSession={() => void handleStartLocalSession()}
              onStopLocalSession={() => void handleStopLocalSession()}
              currentError={currentError}
              isTerminalAvailable={isTerminalAvailable}
              isLocalTerminalAvailable={isLocalTerminalAvailable}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              terminalWrapperClasses={terminalWrapperClasses}
              terminalHeaderClasses={terminalHeaderClasses}
              terminalBodyClasses={terminalBodyClasses}
              containerRef={containerRef}
              activeTerminal={activeTerminal}
            />

            <TerminalQuickReference device={device ?? null} />

            <TerminalManualCommand sshCommand={sshCommand} />
          </div>
        </div>
      </section>
    </main>
  );
};

export default TerminalPage;
