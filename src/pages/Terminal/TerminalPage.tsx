import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import type { RegisteredDevice } from "../../types/device";

type TerminalMode = "remote" | "local";

const TerminalPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<RegisteredDevice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(id));
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!id) {
      setDevice(null);
      setIsLoading(false);
      return;
    }

    const loadDevice = async () => {
      if (!window.devices?.get) {
        setError("Device lookup is only available in the Electron application.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const record = await window.devices.get(id);
        setDevice(record);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the requested device."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadDevice();
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
    if (!containerRef.current || terminalRef.current) {
      return;
    }

    const terminal = new XtermTerminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      fontSize: 13,
      theme: {
        background: "#030712",
        cursor: "#34d399",
        foreground: "#f8fafc",
        selection: "#1f2937"
      }
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    const syncLocalResize = () => {
      const sessionId = localSessionIdRef.current;
      if (sessionId && window.terminal?.resizeLocalSession) {
        window.terminal.resizeLocalSession(sessionId, terminal.cols, terminal.rows);
      }
    };

    const handleResize = () => {
      fitAddon.fit();
      syncLocalResize();
    };

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      syncLocalResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", handleResize);

    terminal.focus();
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const disposable = terminal.onData((data) => {
      const mode = activeTerminalRef.current;
      if (!mode) {
        return;
      }

      if (mode === "remote") {
        const sessionId = remoteSessionIdRef.current;
        if (sessionId && window.terminal?.sendInput) {
          window.terminal.sendInput(sessionId, data);
        }
        return;
      }

      if (mode === "local") {
        const sessionId = localSessionIdRef.current;
        if (sessionId && window.terminal?.sendLocalInput) {
          window.terminal.sendLocalInput(sessionId, data);
        }
      }
    });

    return () => {
      disposable.dispose();
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
      fitAddon.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!window.terminal) {
      return;
    }

    const unsubscribeData = window.terminal.onData(({ sessionId, data }) => {
      if (sessionId !== remoteSessionIdRef.current) {
        return;
      }
      terminalRef.current?.write(data);
    });

    const unsubscribeError = window.terminal.onError(({ sessionId, message }) => {
      if (sessionId !== remoteSessionIdRef.current) {
        return;
      }
      setRemoteError(message);
      setRemoteStatus("Error");
      terminalRef.current?.writeln(`\r\n\x1b[31m${message}\x1b[0m`);
    });

    const unsubscribeClosed = window.terminal.onClosed(({ sessionId, code, signal }) => {
      if (sessionId !== remoteSessionIdRef.current) {
        return;
      }
      remoteSessionIdRef.current = null;
      setActiveRemoteSessionId(null);
      setRemoteStatus("Session ended");
      setIsStoppingRemote(false);
      if (activeTerminalRef.current === "remote") {
        const fallback = localSessionIdRef.current ? "local" : null;
        activeTerminalRef.current = fallback;
        setActiveTerminal(fallback);
      }
      const reason =
        code !== null
          ? `Process exited with code ${code}.`
          : signal
            ? `Session terminated by signal ${signal}.`
            : "Session closed.";
      terminalRef.current?.writeln(`\r\n\x1b[33m${reason}\x1b[0m`);
    });

    const unsubscribeLocalData = window.terminal.onLocalData?.(({ sessionId, data }) => {
      if (sessionId !== localSessionIdRef.current) {
        return;
      }
      terminalRef.current?.write(data);
    });

    const unsubscribeLocalError = window.terminal.onLocalError?.(({ sessionId, message }) => {
      if (sessionId !== localSessionIdRef.current) {
        return;
      }
      setLocalError(message);
      setLocalStatus("Error");
      terminalRef.current?.writeln(`\r\n\x1b[31m${message}\x1b[0m`);
    });

    const unsubscribeLocalClosed = window.terminal.onLocalClosed?.(({ sessionId, code, signal }) => {
      if (sessionId !== localSessionIdRef.current) {
        return;
      }
      localSessionIdRef.current = null;
      setActiveLocalSessionId(null);
      setLocalStatus("Session ended");
      setIsStoppingLocal(false);
      if (activeTerminalRef.current === "local") {
        const fallback = remoteSessionIdRef.current ? "remote" : null;
        activeTerminalRef.current = fallback;
        setActiveTerminal(fallback);
      }
      const reason =
        code !== null
          ? `Process exited with code ${code}.`
          : signal
            ? `Session terminated by signal ${signal}.`
            : "Session closed.";
      terminalRef.current?.writeln(`\r\n\x1b[33m${reason}\x1b[0m`);
    });

    return () => {
      unsubscribeData?.();
      unsubscribeError?.();
      unsubscribeClosed?.();
      unsubscribeLocalData?.();
      unsubscribeLocalError?.();
      unsubscribeLocalClosed?.();
    };
  }, []);

  useEffect(() => {
    if (!activeTerminal) {
      if (id) {
        setSelectedPanel("remote");
      } else {
        setSelectedPanel("local");
      }
      return;
    }
    setSelectedPanel(activeTerminal);
  }, [activeTerminal, id]);

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

  useEffect(() => {
    if (!isFullscreen) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

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
    []
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
    []
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
    [device]
  );

  const isTerminalAvailable = Boolean(window.terminal?.startSession);
  const isLocalTerminalAvailable = Boolean(window.terminal?.startLocalSession);

  const handleStartRemoteSession = useCallback(async () => {
    if (!device?.id || !window.terminal?.startSession || !terminalRef.current) {
      setRemoteError(
        "You need to open this page from the Electron application to start an SSH session."
      );
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
      terminalRef.current.writeln(
        `\x1b[32mInitializing connection to ${deviceLabel}...\x1b[0m\r\n`
      );
      const { sessionId } = await window.terminal.startSession(device.id);
      remoteSessionIdRef.current = sessionId;
      setActiveRemoteSessionId(sessionId);
      setRemoteStatus("Connected");
      terminalRef.current.focus();
    } catch (sessionError) {
      const message =
        sessionError instanceof Error
          ? sessionError.message
          : "Unable to start the SSH session.";
      setRemoteError(message);
      setRemoteStatus("Session idle");
      terminalRef.current.writeln(`\x1b[31m${message}\x1b[0m`);
      activeTerminalRef.current = null;
      setActiveTerminal(null);
    } finally {
      setIsStartingRemote(false);
    }
  }, [device?.id, deviceLabel, stopLocalSession]);

  const handleStopRemoteSession = useCallback(async () => {
    await stopRemoteSession();
  }, [stopRemoteSession]);

  const handleStartLocalSession = useCallback(async () => {
    if (!window.terminal?.startLocalSession || !terminalRef.current) {
      setLocalError(
        "You need to open this page from the Electron application to start a local terminal session."
      );
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
      terminalRef.current.writeln(
        "\x1b[32mLaunching local shell on this device...\x1b[0m\r\n"
      );
      const { sessionId } = await window.terminal.startLocalSession();
      localSessionIdRef.current = sessionId;
      setActiveLocalSessionId(sessionId);
      setLocalStatus("Connected");
      terminalRef.current.focus();
      if (window.terminal.resizeLocalSession) {
        window.terminal.resizeLocalSession(
          sessionId,
          terminalRef.current.cols,
          terminalRef.current.rows
        );
      }
    } catch (sessionError) {
      const message =
        sessionError instanceof Error
          ? sessionError.message
          : "Unable to start the local terminal session.";
      setLocalError(message);
      setLocalStatus("Session idle");
      terminalRef.current.writeln(`\x1b[31m${message}\x1b[0m`);
      activeTerminalRef.current = null;
      setActiveTerminal(null);
    } finally {
      setIsStartingLocal(false);
    }
  }, [stopRemoteSession]);

  const handleStopLocalSession = useCallback(async () => {
    await stopLocalSession();
  }, [stopLocalSession]);

  const currentStatus = selectedPanel === "remote" ? remoteStatus : localStatus;
  const currentError = selectedPanel === "remote" ? remoteError : localError;
  const sessionIsActive =
    selectedPanel === "remote"
      ? Boolean(activeRemoteSessionId)
      : Boolean(activeLocalSessionId);
  const isStartingSession =
    selectedPanel === "remote" ? isStartingRemote : isStartingLocal;
  const isStoppingSession =
    selectedPanel === "remote" ? isStoppingRemote : isStoppingLocal;

  const terminalWrapperClasses = isFullscreen
    ? "fixed inset-0 z-50 flex flex-col bg-[#030712]"
    : "mt-5 overflow-hidden rounded-2xl border border-slate-800/80 bg-[#050b19] shadow-[0_30px_60px_-30px_rgba(16,185,129,0.45)]";
  const terminalHeaderClasses = isFullscreen
    ? "flex items-center justify-between border-b border-slate-800/70 bg-[#0f1a2b] px-6 py-4"
    : "flex items-center justify-between border-b border-slate-800/70 bg-[#0f1a2b]/80 px-5 py-3";
  const terminalBodyClasses = isFullscreen
    ? "relative flex-1 bg-[#030712]"
    : "relative h-[380px] bg-[#030712]/95";

  return (
    <main className="flex-1 overflow-y-scroll min-h-screen bg-[#050815] py-[4em] px-4">
      <section className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 rounded-3xl border border-slate-800/70 bg-gradient-to-br from-[#0a0f1f] via-[#050815] to-[#0a0f1f] p-8 shadow-[0_0_60px_rgba(16,185,129,0.08)]">
          <header className="flex flex-col gap-2 text-center md:text-left">
            <p className="text-sm uppercase tracking-[0.45em] text-emerald-400/80">
              Terminal
            </p>
            <h1 className="text-3xl font-semibold text-white">
              {deviceLabel === "your device"
                ? "Connect from your terminal"
                : `SSH into ${deviceLabel}`}
            </h1>
            <p className="text-sm text-slate-400">
              {id
                ? "Open an interactive shell session without leaving the app or switch to the built-in local terminal."
                : "Launch a session on this device or select a registered device to generate a ready-to-run SSH command."}
            </p>
          </header>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:text-white"
              onClick={() => navigate("/registered-devices")}
            >
              Back to registered devices
            </button>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
              Loading device details...
            </p>
          ) : null}

          <div className="flex flex-1 flex-col gap-6">
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
                      onClick={() => setSelectedPanel("remote")}
                      disabled={!id}
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
                      onClick={() => setSelectedPanel("local")}
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
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {currentStatus}
                  </span>
                  {sessionIsActive ? (
                    <button
                      type="button"
                      onClick={() =>
                        selectedPanel === "remote"
                          ? void handleStopRemoteSession()
                          : void handleStopLocalSession()
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
                          ? void handleStartRemoteSession()
                          : void handleStartLocalSession()
                      }
                      disabled={
                        selectedPanel === "remote"
                          ? !id || !isTerminalAvailable || isStartingSession
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
                    onClick={() => setIsFullscreen((current) => !current)}
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
                <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {currentError}
                </p>
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
                  <span className="text-[10px] font-mono uppercase tracking-wide text-slate-500">
                    xterm
                  </span>
                </div>
                <div className={terminalBodyClasses}>
                  <div ref={containerRef} className="absolute inset-0" />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800/70 bg-[#070d1a]/70 p-6 backdrop-blur">
              <h3 className="text-base font-semibold text-white">Quick reference</h3>
              <dl className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    IP Address
                  </dt>
                  <dd className="text-sm font-medium text-slate-100">
                    {device?.ip ?? "Add a device to populate"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    Username
                  </dt>
                  <dd className="text-sm font-medium text-slate-100">
                    {device?.username ?? "Update the device to set a username"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    SSH Port
                  </dt>
                  <dd className="text-sm font-medium text-slate-100">
                    {device?.port ?? 22}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    Password
                  </dt>
                  <dd className="text-sm font-medium text-slate-100">
                    {device?.password ? "Stored securely" : "Not stored"}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-slate-400">
                Tip: If your SSH server uses private key authentication, include the
                <code className="rounded bg-slate-800 px-1">-i /path/to/private-key</code> flag when running the command.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-800/70 bg-[#070d1a]/70 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white">Manual command</h2>
              <p className="mt-2 text-sm text-slate-300">
                Prefer to launch the connection yourself? Copy and paste the SSH command into any external terminal.
              </p>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
                <pre className="bg-[#030712] px-4 py-3 font-mono text-sm text-emerald-300">
                  {sshCommand}
                </pre>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
};

export default TerminalPage;
