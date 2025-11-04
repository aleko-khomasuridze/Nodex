import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { Terminal as XtermTerminal } from "@xterm/xterm";

import type { TerminalMode } from "../pages/Terminal/terminal.types";

interface UseTerminalSessionEventsParams {
  activeTerminalRef: MutableRefObject<TerminalMode | null>;
  localSessionIdRef: MutableRefObject<string | null>;
  remoteSessionIdRef: MutableRefObject<string | null>;
  terminalRef: MutableRefObject<XtermTerminal | null>;
  setActiveLocalSessionId: (value: string | null) => void;
  setActiveRemoteSessionId: (value: string | null) => void;
  setActiveTerminal: (value: TerminalMode | null) => void;
  setIsStoppingLocal: (value: boolean) => void;
  setIsStoppingRemote: (value: boolean) => void;
  setLocalError: (value: string | null) => void;
  setLocalStatus: (value: string) => void;
  setRemoteError: (value: string | null) => void;
  setRemoteStatus: (value: string) => void;
}

const useTerminalSessionEvents = ({
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
}: UseTerminalSessionEventsParams) => {
  useEffect(() => {
    if (!window.terminal) {
      return;
    }

    const unsubscribeData = window.terminal.onData?.(({ sessionId, data }) => {
      if (sessionId !== remoteSessionIdRef.current) {
        return;
      }
      terminalRef.current?.write(data);
    });

    const unsubscribeError = window.terminal.onError?.(({ sessionId, message }) => {
      if (sessionId !== remoteSessionIdRef.current) {
        return;
      }
      setRemoteError(message);
      setRemoteStatus("Error");
      terminalRef.current?.writeln(`\r\n\x1b[31m${message}\x1b[0m`);
    });

    const unsubscribeClosed = window.terminal.onClosed?.(({ sessionId, code, signal }) => {
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
  }, [
    activeTerminalRef,
    localSessionIdRef,
    remoteSessionIdRef,
    setActiveLocalSessionId,
    setActiveRemoteSessionId,
    setActiveTerminal,
    setIsStoppingLocal,
    setIsStoppingRemote,
    setLocalError,
    setLocalStatus,
    setRemoteError,
    setRemoteStatus,
    terminalRef,
  ]);
};

export default useTerminalSessionEvents;
