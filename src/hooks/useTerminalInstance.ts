import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XtermTerminal } from "@xterm/xterm";

import type { MutableRefObject } from "react";

import type { TerminalMode } from "../pages/Terminal/terminal.types";

interface UseTerminalInstanceParams {
  activeTerminalRef: MutableRefObject<TerminalMode | null>;
  localSessionIdRef: MutableRefObject<string | null>;
  remoteSessionIdRef: MutableRefObject<string | null>;
}

const useTerminalInstance = ({
  activeTerminalRef,
  localSessionIdRef,
  remoteSessionIdRef,
}: UseTerminalInstanceParams) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

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
        // selection: "#1f2937",
      },
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
  }, [activeTerminalRef, localSessionIdRef, remoteSessionIdRef]);

  return { containerRef, terminalRef, fitAddonRef };
};

export default useTerminalInstance;
