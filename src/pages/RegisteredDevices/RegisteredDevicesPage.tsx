import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { RegisteredDevice } from "../../types/device";

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString();
};

const RegisteredDevicesPage = () => {
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const loadDevices = useCallback(async () => {
    if (!window.devices?.list) {
      setError(
        "Stored devices are only available in the Electron application."
      );
      setIsLoading(false);
      setDevices([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const records = await window.devices.list();
      setDevices(records);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load registered devices."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const handleRemove = useCallback(
    async (id: string) => {
      if (!window.devices?.remove) {
        return;
      }
      setRemovingId(id);
      try {
        await window.devices.remove(id);
        await loadDevices();
      } catch (removeError) {
        setError(
          removeError instanceof Error
            ? removeError.message
            : "Unable to delete the device."
        );
      } finally {
        setRemovingId(null);
      }
    },
    [loadDevices]
  );

  const handleOpenInstructions = useCallback(
    (id: string) => {
      navigate(`/terminal/${id}`);
    },
    [navigate]
  );

  return (
    <main className="flex-1 overflow-y-scroll min-h-screen bg-slate-950 py-[4em]">
      <section className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-xl">
          <header className="flex flex-col gap-2 text-center md:text-left">
            <p className="text-sm uppercase tracking-widest text-emerald-400">
              Registered SSH Devices
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Manage saved connections
            </h1>
            <p className="text-sm text-slate-400">
              Review your stored SSH endpoints and prune any that are no longer
              needed.
            </p>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:text-white"
              onClick={() => void loadDevices()}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh list"}
            </button>
            <Link
              to="/network-scan"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Discover new devices
            </Link>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-12">
              <p className="text-sm text-slate-400">
                Loading registered devices...
              </p>
            </div>
          ) : null}

          {!isLoading && devices.length === 0 && !error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
              <p className="text-lg font-medium text-white">
                No devices registered yet
              </p>
              <p className="max-w-md text-sm text-slate-400">
                Run a network scan and register a device to keep its SSH
                credentials handy.
              </p>
              <Link
                to="/network-scan"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
              >
                Start scanning
              </Link>
            </div>
          ) : null}

          {!isLoading && devices.length > 0 ? (
            <ul className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              {devices.map((device) => {
                const label = device.alias ?? device.hostname ?? device.ip;
                return (
                  <li
                    key={device.id}
                    className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-base font-semibold text-slate-100">
                        {label}
                      </p>
                      <p className="text-sm text-slate-400">
                        {device.ip}
                        {device.hostname && device.hostname !== label
                          ? ` • ${device.hostname}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Last updated {formatTimestamp(device.updatedAt)}
                      </p>
                      {device.username ? (
                        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                          <span className="font-semibold text-slate-100">
                            User:
                          </span>
                          {device.username}
                          {device.port ? ` • Port ${device.port}` : ""}
                        </p>
                      ) : device.port ? (
                        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                          Port {device.port}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                      <Link
                        to={`/registered-devices/${device.id}`}
                        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:text-white"
                      >
                        View
                      </Link>
                      <Link
                        to={`/registered-devices/${device.id}/edit`}
                        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:text-white"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleOpenInstructions(device.id)}
                        className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10"
                      >
                        Connection steps
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemove(device.id)}
                        disabled={removingId === device.id}
                        className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingId === device.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </section>
    </main>
  );
};

export default RegisteredDevicesPage;
