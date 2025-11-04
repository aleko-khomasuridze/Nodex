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
        setError(
          "Device lookup is only available in the Electron application."
        );
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

  const deviceLabel = useMemo(
    () => device?.alias ?? device?.hostname ?? device?.ip ?? "your device",
    [device]
  );

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
                ? "Follow the steps below to launch a native terminal window and establish an SSH session."
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

          {!isLoading ? (
            <div className="flex flex-1 flex-col gap-6">
              <section className="rounded-2xl border border-slate-800/70 bg-[#070d1a]/70 p-6 backdrop-blur">
                <h2 className="text-lg font-semibold text-white">
                  Launch your session
                </h2>
                <p className="mt-3 text-sm text-slate-300">
                  Open your preferred terminal application (Command Prompt,
                  PowerShell, macOS Terminal, or a Linux shell) and run the SSH
                  command below. Replace any placeholder values with the
                  appropriate credentials for your environment.
                </p>
                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800/80 bg-[#050b19] shadow-[0_30px_60px_-30px_rgba(16,185,129,0.45)]">
                  <div className="flex items-center justify-between border-b border-slate-800/70 bg-[#0f1a2b]/80 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-red-500/80" />
                      <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                      <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                      Terminal
                    </p>
                    <span className="text-[10px] font-mono uppercase tracking-wide text-slate-500">
                      bash
                    </span>
                  </div>
                  <div className="space-y-3 bg-[#030712]/95 px-5 py-6 font-mono text-sm text-slate-100">
                    <p className="flex flex-wrap items-center gap-x-2">
                      <span className="text-slate-500">➜</span>
                      <span className="text-emerald-400"> nodex</span>
                      <span className="text-slate-500"> %</span>
                      <span className="text-emerald-300"> {sshCommand}</span>
                    </p>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-600">
                      press enter ↵
                    </p>
                    <p className="text-emerald-400/90">
                      {`Connecting to ${deviceLabel}...`}
                    </p>
                    <p className="text-slate-400">
                      {device
                        ? `Device ready on port ${device.port ?? 22}. Username ${device.username ?? "{username}"}.`
                        : "Use the Registered Devices view to choose a device and auto-fill this command."}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800/70 bg-[#070d1a]/70 p-6 backdrop-blur">
                <h3 className="text-base font-semibold text-white">
                  Quick reference
                </h3>
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
                      {device?.username ??
                        "Update the device to set a username"}
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
                  Tip: If your SSH server uses private key authentication,
                  include the{" "}
                  <code className="rounded bg-slate-800 px-1">-i /path/to/private-key</code>{" "}
                  flag when running the command.
                </p>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
};

export default TerminalPage;
