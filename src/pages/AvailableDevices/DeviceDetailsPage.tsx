import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { RegisteredDevice } from "../../types/device";

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString();
};

const DeviceDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<RegisteredDevice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDevice = async () => {
      if (!id) {
        setError("No device identifier was provided.");
        setIsLoading(false);
        return;
      }
      if (!window.devices?.get) {
        setError(
          "Device details are only available in the Electron application."
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

  return (
    <main className="mx-auto my-[4em] flex max-w-4xl flex-1 flex-col px-4 overflow-y-auto">
      <section className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-xl">
          <header className="flex flex-col gap-2 text-center md:text-left">
            <p className="text-sm uppercase tracking-widest text-emerald-400">
              Device Details
            </p>
            <h1 className="text-3xl font-semibold text-white">
              {device?.alias ?? device?.hostname ?? device?.ip ?? "Device"}
            </h1>
            <p className="text-sm text-slate-400">
              Review the saved SSH configuration for this device.
            </p>
          </header>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:text-white"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
            {device ? (
              <>
                <Link
                  to={`/available-devices/${device.id}/edit`}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:text-white"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10"
                  onClick={() => navigate(`/terminal/${device.id}`)}
                >
                  Connection steps
                </button>
              </>
            ) : null}
          </div>

          {isLoading ? (
            <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
              Loading device details...
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          {!isLoading && !error && device ? (
            <dl className="grid gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  IP Address
                </dt>
                <dd className="text-base font-medium text-white">
                  {device.ip}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  Hostname
                </dt>
                <dd className="text-base font-medium text-white">
                  {device.hostname ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  Alias
                </dt>
                <dd className="text-base font-medium text-white">
                  {device.alias ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  Port
                </dt>
                <dd className="text-base font-medium text-white">
                  {device.port ?? 22}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  Username
                </dt>
                <dd className="text-base font-medium text-white">
                  {device.username ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  Password
                </dt>
                <dd className="text-base font-medium text-white">
                  {device.password ? "••••••••" : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  Created
                </dt>
                <dd className="text-base font-medium text-white">
                  {formatTimestamp(device.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  Updated
                </dt>
                <dd className="text-base font-medium text-white">
                  {formatTimestamp(device.updatedAt)}
                </dd>
              </div>
            </dl>
          ) : null}

          {!isLoading && !error && !device ? (
            <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
              Device not found.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
};

export default DeviceDetailsPage;
