import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { RegisteredDevice } from "../../types/device";

interface TerminalMessage {
  sessionId: string;
  data: string;
}

const TerminalPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<RegisteredDevice | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "connecting" | "connected" | "closed" | "error"
  >(id ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string>("");
  const [command, setCommand] = useState<string>("");
  const outputRef = useRef<HTMLDivElement>(null);
  const terminalAvailable = useMemo(
    () => Boolean(window.terminal?.startSession),
    []
  );

  useEffect(() => {
    if (!id) {
      setStatus("idle");
      setDevice(null);
      return;
    }

    const loadDevice = async () => {
      if (!window.devices?.get) {
        setStatus("error");
        setError("Device lookup is only available in the Electron application.");
        return;
      }

      setStatus("loading");
      setError(null);
      try {
        const record = await window.devices.get(id);
        setDevice(record);
        setStatus("connecting");
      } catch (loadError) {
        setStatus("error");
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the requested device."
        );
      }
    };

    void loadDevice();
  }, [id]);

  useEffect(() => {
    if (!device || !id) {
      return;
    }
    if (!window.terminal?.startSession) {
      setStatus("error");
      setError("SSH sessions are only available in the Electron application.");
      return;
    }

    let isCancelled = false;

    const startSession = async () => {
      try {
        const response = await window.terminal!.startSession(device.id);
        if (isCancelled) {
          await window.terminal?.stopSession(response.sessionId);
          return;
        }
        setSessionId(response.sessionId);
        setStatus("connected");
        setOutput((previous) =>
          previous.length > 0
            ? `${previous}\nConnected to ${device.alias ?? device.ip}`
            : `Connected to ${device.alias ?? device.ip}`
        );
      } catch (startError) {
        setStatus("error");
        setError(
          startError instanceof Error
            ? startError.message
            : "Unable to start the SSH session."
        );
      }
    };

    setStatus("connecting");
    setError(null);
    void startSession();

    return () => {
      isCancelled = true;
    };
  }, [device, id]);

  useEffect(() => {
    if (!sessionId || !window.terminal) {
      return;
    }

    const unsubscribeData = window.terminal.onData((payload: TerminalMessage) => {
      if (payload.sessionId !== sessionId) {
        return;
      }
      setOutput((previous) => `${previous}${payload.data}`);
    });

    const unsubscribeClosed = window.terminal.onClosed(
      (payload: { sessionId: string; code: number | null; signal: string | null }) => {
        if (payload.sessionId !== sessionId) {
          return;
        }
        setStatus("closed");
        const closureDetails =
          payload.code !== null || payload.signal
            ? `Session closed (code: ${payload.code ?? "n/a"}, signal: ${
                payload.signal ?? "n/a"
              }).`
            : "Session closed.";
        setOutput((previous) => `${previous}\n${closureDetails}`);
      }
    );

    const unsubscribeError = window.terminal.onError(
      (payload: { sessionId: string; message: string }) => {
        if (payload.sessionId !== sessionId) {
          return;
        }
        setStatus("error");
        setError(payload.message);
        setOutput((previous) => `${previous}\nError: ${payload.message}`);
      }
    );

    return () => {
      unsubscribeData?.();
      unsubscribeClosed?.();
      unsubscribeError?.();
    };
  }, [sessionId]);

  useEffect(() => {
    const container = outputRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    return () => {
      if (sessionId && window.terminal?.stopSession) {
        void window.terminal.stopSession(sessionId);
      }
    };
  }, [sessionId]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!command.trim() || !sessionId) {
        return;
      }
      window.terminal?.sendInput(sessionId, `${command}\n`);
      setCommand("");
    },
    [command, sessionId]
  );

  const handleDisconnect = useCallback(() => {
    if (!sessionId) {
      return;
    }
    void window.terminal?.stopSession(sessionId);
    setStatus("closed");
  }, [sessionId]);

  return (
    <article className="min-h-screen bg-slate-950 py-12">
      <main className="mx-auto flex max-w-5xl flex-1 flex-col px-4">
        <section className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-xl">
            <header className="flex flex-col gap-2 text-center md:text-left">
              <p className="text-sm uppercase tracking-widest text-emerald-400">SSH Terminal</p>
              <h1 className="text-3xl font-semibold text-white">
                {device?.alias ?? device?.hostname ?? device?.ip ?? "Select a device"}
              </h1>
              <p className="text-sm text-slate-400">
                {id
                  ? "Interact with the remote host using a secure shell session."
                  : "Choose a registered device and execute it to open an SSH session."}
              </p>
            </header>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:text-white"
                onClick={() => navigate("/available-devices")}
              >
                Back to devices
              </button>
              {sessionId ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                >
                  Disconnect
                </button>
              ) : null}
            </div>

            {!terminalAvailable ? (
              <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                SSH terminal access is only available within the Electron desktop application.
              </p>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
            ) : null}

            {status === "loading" || status === "connecting" ? (
              <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                {status === "loading"
                  ? "Loading device details..."
                  : "Starting SSH session..."}
              </p>
            ) : null}

            <div className="flex flex-1 flex-col gap-3">
              <div
                ref={outputRef}
                className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-black/70 p-4 font-mono text-sm text-emerald-100"
              >
                <pre className="whitespace-pre-wrap break-words">{output || "Session output will appear here."}</pre>
              </div>
              <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSubmit}>
                <input
                  type="text"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                  placeholder={
                    sessionId
                      ? "Enter a command and press Enter"
                      : "Waiting for session..."
                  }
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  disabled={!sessionId || status !== "connected"}
                />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!sessionId || status !== "connected"}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </article>
  );
};

export default TerminalPage;
