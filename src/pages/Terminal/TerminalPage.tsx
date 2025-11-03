import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { RegisteredDevice } from "../../types/device";

const formatTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString();
};

const TerminalPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<RegisteredDevice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const username = useMemo(() => {
    if (!device?.username) {
      return "{{username}}";
    }
    return device.username;
  }, [device?.username]);

  const host = useMemo(() => {
    if (!device?.ip) {
      return "{{ipaddress}}";
    }
    return device.ip;
  }, [device?.ip]);

  const baseCommand = useMemo(() => `ssh -k ${username}@${host}`, [username, host]);

  const portCommand = useMemo(() => {
    if (!device?.port || device.port === 22) {
      return null;
    }
    return `${baseCommand} -p ${device.port}`;
  }, [baseCommand, device?.port]);

  const handleCopy = useCallback(async () => {
    if (!navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(portCommand ?? baseCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.error("Failed to copy SSH command", copyError);
    }
  }, [baseCommand, portCommand]);

  return (
    <article className="min-h-screen bg-slate-950 py-12">
      <main className="mx-auto flex max-w-4xl flex-1 flex-col px-4">
        <section className="flex flex-1 flex-col">
          <div className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-xl">
            <header className="flex flex-col gap-2 text-center md:text-left">
              <p className="text-sm uppercase tracking-widest text-emerald-400">SSH Instructions</p>
              <h1 className="text-3xl font-semibold text-white">
                {device?.alias ?? device?.hostname ?? device?.ip ?? "Select a device"}
              </h1>
              <p className="text-sm text-slate-400">
                Open your preferred terminal application and run the SSH command below to connect.
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
            </div>

            {isLoading ? (
              <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                Loading device details...
              </p>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
            ) : null}

            {!isLoading && !error && !device ? (
              <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                Select a device from the Available Devices page to view connection instructions.
              </p>
            ) : null}

            {!isLoading && !error && device ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Primary command</p>
                  <code className="rounded-xl border border-slate-700 bg-black/70 px-4 py-3 font-mono text-sm text-emerald-100">
                    {baseCommand}
                  </code>
                </div>

                {portCommand ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Use this if the device listens on a non-standard port</p>
                    <code className="rounded-xl border border-slate-700 bg-black/70 px-4 py-3 font-mono text-sm text-emerald-100">
                      {portCommand}
                    </code>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleCopy}
                  className="self-start rounded-lg border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed"
                  disabled={!navigator.clipboard}
                >
                  {copied ? "Copied" : "Copy command"}
                </button>

                <div className="grid gap-3 border-t border-slate-800 pt-4 text-sm text-slate-300 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Username</p>
                    <p className="font-medium text-white">{device.username ?? "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">IP Address</p>
                    <p className="font-medium text-white">{device.ip}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Port</p>
                    <p className="font-medium text-white">{device.port ?? 22}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Last updated</p>
                    <p className="font-medium text-white">{formatTimestamp(device.updatedAt)}</p>
                  </div>
                </div>

                {!device.username ? (
                  <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-100">
                    Replace <span className="font-mono">{"{{username}}"}</span> with the SSH username before executing the command.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </article>
  );
};

export default TerminalPage;
