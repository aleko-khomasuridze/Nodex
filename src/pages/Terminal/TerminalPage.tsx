import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import type { RegisteredDevice } from "../../types/device";

const TerminalPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<RegisteredDevice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(id));
  const [terminalError, setTerminalError] = useState<string | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<string>("Session idle");
  const [isStartingSession, setIsStartingSession] = useState<boolean>(false);
  const [isStoppingSession, setIsStoppingSession] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
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

  const cleanupSession = useCallback(() => {
    const sessionId = sessionIdRef.current;
    if (sessionId && window.terminal?.stopSession) {
      setActiveSessionId(null);
      setTerminalStatus("Session ending...");
      void window.terminal.stopSession(sessionId);
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupSession();
    };
  }, [cleanupSession, id]);

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

    const handleResize = () => {
      fitAddon.fit();
    };

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });

    window.addEventListener("resize", handleResize);
    resizeObserver.observe(containerRef.current);

    terminal.focus();
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const disposable = terminal.onData((data) => {
      const sessionId = sessionIdRef.current;
      if (sessionId && window.terminal?.sendInput) {
        window.terminal.sendInput(sessionId, data);
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
      if (sessionId !== sessionIdRef.current) {
        return;
      }
      terminalRef.current?.write(data);
    });

    const unsubscribeError = window.terminal.onError(({ sessionId, message }) => {
      if (sessionId !== sessionIdRef.current) {
        return;
      }
      setTerminalError(message);
      terminalRef.current?.writeln(`\r\n\x1b[31m${message}\x1b[0m`);
      setTerminalStatus("Error");
    });

    const unsubscribeClosed = window.terminal.onClosed(({ sessionId, code, signal }) => {
      if (sessionId !== sessionIdRef.current) {
        return;
      }
      sessionIdRef.current = null;
      setActiveSessionId(null);
      setTerminalStatus("Session ended");
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
    };
  }, []);

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

  const handleStartSession = useCallback(async () => {
    if (!device?.id || !window.terminal?.startSession || !terminalRef.current) {
      setTerminalError(
        "You need to open this page from the Electron application to start an SSH session."
      );
      return;
    }

    setTerminalError(null);
    setTerminalStatus("Connecting...");
    setIsStartingSession(true);

    try {
      terminalRef.current.reset();
      terminalRef.current.writeln(
        `\x1b[32mInitializing connection to ${deviceLabel}...\x1b[0m\r\n`
      );
      const { sessionId } = await window.terminal.startSession(device.id);
      sessionIdRef.current = sessionId;
      setActiveSessionId(sessionId);
      setTerminalStatus("Connected");
      terminalRef.current.focus();
    } catch (sessionError) {
      const message =
        sessionError instanceof Error
          ? sessionError.message
          : "Unable to start the SSH session.";
      setTerminalError(message);
      setTerminalStatus("Session idle");
      terminalRef.current.writeln(`\x1b[31m${message}\x1b[0m`);
    } finally {
      setIsStartingSession(false);
    }
  }, [device?.id, deviceLabel]);

  const handleStopSession = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !window.terminal?.stopSession) {
      return;
    }
    setIsStoppingSession(true);
    try {
      await window.terminal.stopSession(sessionId);
    } finally {
      setIsStoppingSession(false);
    }
  }, []);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    const fitAddon = fitAddonRef.current;
    if (fitAddon) {
      fitAddon.fit();
    }
  }, [activeSessionId]);

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
                ? "Open an interactive shell session without leaving the app."
                : "Select a registered device to generate a ready-to-run SSH command."}
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
                <div>
                  <h2 className="text-lg font-semibold text-white">Embedded terminal</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Start a live SSH session directly from Nodex. Input and output are streamed in real time.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {terminalStatus}
                  </span>
                  {activeSessionId ? (
                    <button
                      type="button"
                      onClick={() => void handleStopSession()}
                      disabled={isStoppingSession}
                      className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isStoppingSession ? "Stopping..." : "End session"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleStartSession()}
                      disabled={!id || !isTerminalAvailable || isStartingSession}
                      className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isStartingSession ? "Connecting..." : "Start session"}
                    </button>
                  )}
                </div>
              </div>

              {!isTerminalAvailable ? (
                <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Launch Nodex through the Electron application to unlock the embedded terminal experience.
                </p>
              ) : null}

              {terminalError ? (
                <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {terminalError}
                </p>
              ) : null}

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800/80 bg-[#050b19] shadow-[0_30px_60px_-30px_rgba(16,185,129,0.45)]">
                <div className="flex items-center justify-between border-b border-slate-800/70 bg-[#0f1a2b]/80 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Shell
                  </p>
                  <span className="text-[10px] font-mono uppercase tracking-wide text-slate-500">
                    xterm
                  </span>
                </div>
                <div className="relative h-[380px] bg-[#030712]/95">
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
