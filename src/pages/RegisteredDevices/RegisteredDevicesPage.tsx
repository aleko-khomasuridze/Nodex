import { useCallback, useEffect, useRef, useState } from "react";
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
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
      setOpenMenuId(null);
    },
    [navigate]
  );

  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    const handleClickAway = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const container = menuRefs.current.get(openMenuId);
      if (container && target && !container.contains(target)) {
        setOpenMenuId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuId]);

  const toggleMenu = useCallback((id: string) => {
    setOpenMenuId((current) => (current === id ? null : id));
  }, []);

  const closeMenu = useCallback(() => {
    setOpenMenuId(null);
  }, []);

  return (
    <main className="flex-1 overflow-y-scroll min-h-screen bg-slate-950 pt-[4em] pb-[12rem]">
      <section className="flex flex-1 flex-col mx-4">
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
            <ul className="divide-y divide-slate-800 overflow-visible rounded-2xl border border-slate-800 bg-slate-900/60">
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

                    {/* Context menu */}
                    <div
                      className="relative self-start md:self-auto"
                      ref={(node) => {
                        if (node) {
                          menuRefs.current.set(device.id, node);
                        } else {
                          menuRefs.current.delete(device.id);
                        }
                      }}
                    >
                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === device.id}
                        onClick={() => toggleMenu(device.id)}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/70 h-[36px] w-[36px] text-slate-300 transition hover:border-emerald-500 hover:text-white"
                      >
                        <span className="sr-only">Open actions</span>
                        <i className="ri-list-unordered"></i>
                      </button>

                      {openMenuId === device.id ? (
                        <div
                          role="menu"
                          aria-label={`${label} actions`}
                          className="absolute right-0 z-20 mt-2 w-52 origin-top-right overflow-hidden rounded-lg border border-slate-800 bg-slate-950/95 shadow-xl backdrop-blur"
                        >
                          <Link
                            to={`/registered-devices/${device.id}`}
                            onClick={closeMenu}
                            role="menuitem"
                            className="flex px-4 gap-3 py-3 text-sm text-slate-200 transition hover:bg-slate-900 hover:text-white"
                          >
                            <i className="ri-eye-line"></i>
                            View details
                          </Link>
                          <Link
                            to={`/registered-devices/${device.id}/edit`}
                            onClick={closeMenu}
                            role="menuitem"
                            className="flex px-4 gap-3 py-3 text-sm text-slate-200 transition hover:bg-slate-900 hover:text-white"
                          >
                            <i className="ri-edit-2-line"></i>
                            Edit device
                          </Link>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleOpenInstructions(device.id)}
                            className="flex gap-3 w-full px-4 py-3 text-left text-sm text-emerald-300 transition hover:bg-slate-900 hover:text-emerald-200"
                          >
                            <i className="ri-link"></i>
                            Connect
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              void handleRemove(device.id);
                              closeMenu();
                            }}
                            disabled={removingId === device.id}
                            className="flex gap-3 w-full px-4 py-3 text-left text-sm text-red-300 transition hover:bg-slate-900 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <i className="ri-delete-bin-5-line"></i>
                            {removingId === device.id ? "Removing..." : "Remove"}
                          </button>
                        </div>
                      ) : null}
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
