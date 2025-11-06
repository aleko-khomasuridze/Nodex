import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "@xterm/xterm/css/xterm.css";

import useFullscreenBehavior from "../../hooks/useFullscreenBehavior";
import useTerminalInstance from "../../hooks/useTerminalInstance";
import useTerminalSessionEvents from "../../hooks/useTerminalSessionEvents";
import type { RegisteredDevice } from "../../types/device";
import type { TerminalMode } from "./terminal.types";

const LOCAL_TARGET_ID = "local";

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

  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [deviceListError, setDeviceListError] = useState<string | null>(null);

  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<string>("Session idle");
  const [isStartingRemote, setIsStartingRemote] = useState<boolean>(false);
  const [isStoppingRemote, setIsStoppingRemote] = useState<boolean>(false);
  const [activeRemoteSessionId, setActiveRemoteSessionIdState] = useState<string | null>(null);
  const [activeRemoteDeviceId, setActiveRemoteDeviceId] = useState<string | null>(null);

  const [localError, setLocalError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<string>("Session idle");
  const [isStartingLocal, setIsStartingLocal] = useState<boolean>(false);
  const [isStoppingLocal, setIsStoppingLocal] = useState<boolean>(false);
  const [activeLocalSessionId, setActiveLocalSessionId] = useState<string | null>(null);

  const [activeTerminal, setActiveTerminal] = useState<TerminalMode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(autoFullscreen);

  const [selectedTarget, setSelectedTarget] = useState<string>(id ?? LOCAL_TARGET_ID);
  const [hasManuallySelectedLocal, setHasManuallySelectedLocal] = useState<boolean>(autoStartLocal);

  const remoteSessionIdRef = useRef<string | null>(null);
  const localSessionIdRef = useRef<string | null>(null);
  const activeTerminalRef = useRef<TerminalMode | null>(null);

  const { containerRef, terminalRef, fitAddonRef } = useTerminalInstance({
    activeTerminalRef,
    localSessionIdRef,
    remoteSessionIdRef,
  });

  const setActiveRemoteSessionId = useCallback((sessionId: string | null) => {
    setActiveRemoteSessionIdState(sessionId);
    if (!sessionId) {
      setActiveRemoteDeviceId(null);
    }
  }, []);

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
    setSelectedTarget(id ?? LOCAL_TARGET_ID);
    setHasManuallySelectedLocal(autoStartLocal);
  }, [autoStartLocal, id]);

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

  const loadDevices = useCallback(async () => {
    if (!window.devices?.list) {
      setDevices([]);
      setDeviceListError("Stored devices are only available from the desktop application.");
      return;
    }

    setIsLoadingDevices(true);
    setDeviceListError(null);

    try {
      const records = await window.devices.list();
      setDevices(records);
    } catch (loadError) {
      setDeviceListError(
        loadError instanceof Error ? loadError.message : "Unable to load registered devices.",
      );
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

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

  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => getDeviceLabel(a).localeCompare(getDeviceLabel(b)));
  }, [devices, getDeviceLabel]);

  const selectedDevice = useMemo(() => {
    if (selectedTarget === LOCAL_TARGET_ID) {
      return null;
    }

    return sortedDevices.find((record) => record.id === selectedTarget) ?? null;
  }, [selectedTarget, sortedDevices]);

  const handleStartRemoteSession = useCallback(
    async (targetDevice: RegisteredDevice) => {
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
        const label = getDeviceLabel(targetDevice);
        terminalRef.current.reset();
        terminalRef.current.writeln(`\x1b[32mInitializing connection to ${label}...\x1b[0m\r\n`);
        const { sessionId } = await window.terminal.startSession(targetDevice.id);
        remoteSessionIdRef.current = sessionId;
        setActiveRemoteSessionId(sessionId);
        setActiveRemoteDeviceId(targetDevice.id);
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
    },
    [
      getDeviceLabel,
      setActiveRemoteSessionId,
      stopLocalSession,
      terminalRef,
    ],
  );

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
    if (selectedTarget === LOCAL_TARGET_ID) {
      setRemoteError(null);
      if (
        !autoStartLocal &&
        !hasManuallySelectedLocal &&
        !activeLocalSessionId &&
        !localSessionIdRef.current
      ) {
        return;
      }

      void handleStartLocalSession();
      return;
    }

    if (!selectedDevice) {
      if (!isLoadingDevices) {
        setRemoteError("Select a registered device to connect.");
        setRemoteStatus("Session idle");
      }
      return;
    }

    if (
      activeTerminal === "remote" &&
      activeRemoteDeviceId === selectedDevice.id &&
      activeRemoteSessionId
    ) {
      return;
    }

    void handleStartRemoteSession(selectedDevice);
  }, [
    activeLocalSessionId,
    activeRemoteDeviceId,
    activeRemoteSessionId,
    activeTerminal,
    autoStartLocal,
    hasManuallySelectedLocal,
    handleStartLocalSession,
    handleStartRemoteSession,
    isLoadingDevices,
    selectedDevice,
    selectedTarget,
  ]);

  const handleTargetChange = useCallback(
    (value: string) => {
      setSelectedTarget(value);
      setHasManuallySelectedLocal(value === LOCAL_TARGET_ID);

      if (!showBackButton) {
        return;
      }

      if (value === LOCAL_TARGET_ID) {
        navigate("/terminal");
        return;
      }

      navigate(`/terminal/${value}`);
    },
    [navigate, showBackButton],
  );

  const currentStatus = selectedTarget === LOCAL_TARGET_ID ? localStatus : remoteStatus;
  const currentError = selectedTarget === LOCAL_TARGET_ID ? localError : remoteError;
  const isBusy =
    selectedTarget === LOCAL_TARGET_ID
      ? isStartingLocal || isStoppingLocal
      : isStartingRemote || isStoppingRemote;

  const mainClasses = isFullscreen
    ? "flex min-h-screen flex-col bg-[#050815] px-4 py-6 overflow-hidden"
    : "flex-1 min-h-screen bg-[#050815] px-4 py-6 overflow-y-auto";

  const terminalWrapperClasses = isFullscreen
    ? "relative flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-[#030712]"
    : "relative h-[420px] overflow-hidden rounded-2xl border border-slate-800 bg-[#030712]/95";

  const statusLabel = selectedTarget === LOCAL_TARGET_ID ? "This device" : selectedDevice ? getDeviceLabel(selectedDevice) : "Remote";

  return (
    <main className={mainClasses}>
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {showBackButton ? (
            <button
              type="button"
              onClick={() => navigate("/registered-devices")}
              className="self-start rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:text-white"
            >
              Back to devices
            </button>
          ) : (
            <h1 className="text-lg font-semibold text-white">Terminal</h1>
          )}

          <div className="flex flex-col gap-2 text-left md:text-right">
            <label
              htmlFor="terminal-device"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400"
            >
              Device
            </label>
            <select
              id="terminal-device"
              value={selectedTarget}
              onChange={(event) => handleTargetChange(event.target.value)}
              disabled={isBusy}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-emerald-500 focus:text-white md:w-64"
            >
              <option value={LOCAL_TARGET_ID}>This device</option>
              {sortedDevices.map((record) => (
                <option key={record.id} value={record.id}>
                  {getDeviceLabel(record)}
                </option>
              ))}
            </select>
            {isLoadingDevices ? (
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Loading devices...</span>
            ) : null}
          </div>
        </div>

        {deviceListError ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {deviceListError}
          </p>
        ) : null}

        {currentError ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{currentError}</p>
        ) : null}

        <div className={terminalWrapperClasses}>
          <div ref={containerRef} className="absolute inset-0" />
        </div>

        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
          <span>{statusLabel}</span>
          <span>{currentStatus}</span>
        </div>
      </section>
    </main>
  );
};

export default TerminalPage;
