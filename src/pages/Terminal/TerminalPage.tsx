import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "@xterm/xterm/css/xterm.css";

import TerminalHeader from "../../components/terminal/TerminalHeader";
import TerminalManualCommand from "../../components/terminal/TerminalManualCommand";
import TerminalQuickReference from "../../components/terminal/TerminalQuickReference";
import TerminalSessionSection from "../../components/terminal/TerminalSessionSection";
import useDeviceRecord from "../../hooks/useDeviceRecord";
import useFullscreenBehavior from "../../hooks/useFullscreenBehavior";
import useTerminalInstance from "../../hooks/useTerminalInstance";
import useTerminalSessionEvents from "../../hooks/useTerminalSessionEvents";
import type { TerminalMode } from "./terminal.types";

const TerminalPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const { device, error, isLoading } = useDeviceRecord(id);

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

  const [selectedPanel, setSelectedPanel] = useState<TerminalMode>(id ? "remote" : "local");
  const [activeTerminal, setActiveTerminal] = useState<TerminalMode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const remoteSessionIdRef = useRef<string | null>(null);
  const localSessionIdRef = useRef<string | null>(null);
  const activeTerminalRef = useRef<TerminalMode | null>(null);
  const hasUserSelectedPanelRef = useRef(false);

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
    if (activeTerminal) {
      setSelectedPanel(activeTerminal);
      hasUserSelectedPanelRef.current = false;
      return;
    }

    if (!hasUserSelectedPanelRef.current) {
      setSelectedPanel(id ? "remote" : "local");
    }
  }, [activeTerminal, id]);

  useEffect(() => {
    hasUserSelectedPanelRef.current = false;
  }, [id]);

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
  }, [activeTerminal]);

  const handleExitFullscreen = useCallback(() => setIsFullscreen(false), []);

  useFullscreenBehavior(isFullscreen, handleExitFullscreen);

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
  }, [isFullscreen]);

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

  const sshCommand = useMemo(() => {
    const username = device?.username?.trim() || "{username}";
    const ipAddress = device?.ip?.trim() || "{ip-address}";
    const base = `ssh -k ${username}@${ipAddress}`;

    if (device?.port && device.port !== 22) {
      return `${base} -p ${device.port}`;
    }

    return base;
  }, [device]);

  const deviceLabel = useMemo(
    () => device?.alias ?? device?.hostname ?? device?.ip ?? "your device",
    [device],
  );

  const isTerminalAvailable = Boolean(window.terminal?.startSession);
  const isLocalTerminalAvailable = Boolean(window.terminal?.startLocalSession);

  const handleStartRemoteSession = useCallback(async () => {
    if (!device?.id || !window.terminal?.startSession || !terminalRef.current) {
      setRemoteError("You need to open this page from the Electron application to start an SSH session.");
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
      terminalRef.current.reset();
      terminalRef.current.writeln(`\x1b[32mInitializing connection to ${deviceLabel}...\x1b[0m\r\n`);
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
  }, [device?.id, deviceLabel, stopLocalSession, terminalRef]);

  const handleStopRemoteSession = useCallback(async () => {
    await stopRemoteSession();
  }, [stopRemoteSession]);

  const handleStartLocalSession = useCallback(async () => {
    if (!window.terminal?.startLocalSession || !terminalRef.current) {
      setLocalError("You need to open this page from the Electron application to start a local terminal session.");
      return;
    }

    if (remoteSessionIdRef.current) {
      await stopRemoteSession({ silent: true });
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
  }, [stopRemoteSession, terminalRef]);

  const handleStopLocalSession = useCallback(async () => {
    await stopLocalSession();
  }, [stopLocalSession]);

  const handleSelectPanel = useCallback((mode: TerminalMode) => {
    hasUserSelectedPanelRef.current = true;
    setSelectedPanel(mode);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((current) => !current);
  }, []);

  const currentStatus = selectedPanel === "remote" ? remoteStatus : localStatus;
  const currentError = selectedPanel === "remote" ? remoteError : localError;

  const sessionIsActive =
    selectedPanel === "remote" ? Boolean(activeRemoteSessionId) : Boolean(activeLocalSessionId);
  const isStartingSession = selectedPanel === "remote" ? isStartingRemote : isStartingLocal;
  const isStoppingSession = selectedPanel === "remote" ? isStoppingRemote : isStoppingLocal;

  const terminalWrapperClasses = isFullscreen
    ? "fixed inset-0 z-50 flex flex-col bg-[#030712]"
    : "mt-5 overflow-hidden rounded-2xl border border-slate-800/80 bg-[#050b19] shadow-[0_30px_60px_-30px_rgba(16,185,129,0.45)]";

  const terminalHeaderClasses = isFullscreen
    ? "flex items-center justify-between border-b border-slate-800/70 bg-[#0f1a2b] px-6 py-4"
    : "flex items-center justify-between border-b border-slate-800/70 bg-[#0f1a2b]/80 px-5 py-3";

  const terminalBodyClasses = isFullscreen
    ? "relative flex-1 bg-[#030712]"
    : "relative h-[380px] bg-[#030712]/95";

  const mainClasses = isFullscreen
    ? "flex-1 min-h-screen bg-[#050815] py-[4em] px-4 overflow-hidden"
    : "flex-1 min-h-screen bg-[#050815] py-[4em] px-4 overflow-y-scroll";

  const title =
    deviceLabel === "your device" ? "Connect from your terminal" : `SSH into ${deviceLabel}`;
  const subtitle = id
    ? "Open an interactive shell session without leaving the app or switch to the built-in local terminal."
    : "Launch a session on this device or select a registered device to generate a ready-to-run SSH command.";

  return (
    <main className={mainClasses}>
      <section className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 rounded-3xl border border-slate-800/70 bg-gradient-to-br from-[#0a0f1f] via-[#050815] to-[#0a0f1f] p-8 shadow-[0_0_60px_rgba(16,185,129,0.08)]">
          <TerminalHeader title={title} subtitle={subtitle} onNavigateBack={() => navigate("/registered-devices")} />

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
              canSelectRemote={Boolean(id)}
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
