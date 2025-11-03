import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { RegisteredDevice } from "../../types/device";

const TerminalPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<RegisteredDevice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(id));

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

  const sshCommand = useMemo(() => {
    const username = device?.username?.trim() || "{username}";
    const ipAddress = device?.ip?.trim() || "{ip-address}";
    const base = `ssh -k ${username}@${ipAddress}`;

    if (device?.port && device.port !== 22) {
      return `${base} -p ${device.port}`;
    }

    return base;
  }, [device]);

  return (
    <article className="min-h-screen bg-slate-950 py-12">
      <main className="mx-auto flex max-w-5xl flex-1 flex-col px-4">
        <section className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-xl">
            <header className="flex flex-col gap-2 text-center md:text-left">
              <p className="text-sm uppercase tracking-widest text-emerald-400">SSH Connection</p>
              <h1 className="text-3xl font-semibold text-white">
                {device?.alias ?? device?.hostname ?? device?.ip ?? "Connect from your terminal"}
              </h1>
              <p className="text-sm text-slate-400">
                {id
                  ? "Follow the steps below to launch a native terminal window and establish an SSH session."
                  : "Select a registered device to generate a ready-to-run SSH command."}
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

            {error ? (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
            ) : null}

            {isLoading ? (
              <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                Loading device details...
              </p>
            ) : null}

            {!isLoading ? (
              <div className="flex flex-1 flex-col gap-6">
                <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                  <h2 className="text-lg font-semibold text-white">Connect using your operating system</h2>
                  <p className="mt-3 text-sm text-slate-300">
                    Open your preferred terminal application (Command Prompt, PowerShell, macOS Terminal, or a Linux shell) and run the SSH command below. Replace any placeholder values with the appropriate credentials for your environment.
                  </p>
                  <div className="mt-4 rounded-xl border border-slate-700 bg-black/70 p-4 font-mono text-sm text-emerald-100">
                    <code>{sshCommand}</code>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                  <h3 className="text-base font-semibold text-white">Quick reference</h3>
                  <dl className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">IP Address</dt>
                      <dd className="text-sm font-medium text-slate-100">{device?.ip ?? "Add a device to populate"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Username</dt>
                      <dd className="text-sm font-medium text-slate-100">{device?.username ?? "Update the device to set a username"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">SSH Port</dt>
                      <dd className="text-sm font-medium text-slate-100">{device?.port ?? 22}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Password</dt>
                      <dd className="text-sm font-medium text-slate-100">{device?.password ? "Stored securely" : "Not stored"}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-xs text-slate-400">
                    Tip: If your SSH server uses private key authentication, include the <code className="rounded bg-slate-800 px-1">-i /path/to/private-key</code> flag when running the command.
                  </p>
                </section>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </article>
  );
};

export default TerminalPage;
