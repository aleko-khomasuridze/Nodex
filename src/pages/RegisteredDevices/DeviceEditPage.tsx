import type { ChangeEvent, FormEventHandler } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FormInput from "../../components/form/FormInput";
import type {
  DeviceRegistrationPayload,
  RegisteredDevice,
} from "../../types/device";

const DeviceEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<RegisteredDevice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState({
    isSubmitting: false,
    error: null as string | null,
    success: false,
  });
  const canPersist = useMemo(
    () => Boolean(window.devices?.get && window.devices?.update),
    []
  );
  const [formState, setFormState] = useState({
    alias: "",
    ip: "",
    port: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    const loadDevice = async () => {
      if (!id) {
        setStatus({
          isSubmitting: false,
          error: "No device identifier was provided.",
          success: false,
        });
        setIsLoading(false);
        return;
      }
      if (!window.devices?.get) {
        setStatus({
          isSubmitting: false,
          error:
            "Device editing is only available in the Electron application.",
          success: false,
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setStatus({ isSubmitting: false, error: null, success: false });
      try {
        const record = await window.devices.get(id);
        setDevice(record);
        setFormState({
          alias: record.alias ?? "",
          ip: record.ip,
          port: record.port ? String(record.port) : "",
          username: record.username ?? "",
          password: "",
        });
      } catch (loadError) {
        setStatus({
          isSubmitting: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the requested device.",
          success: false,
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadDevice();
  }, [id]);

  const handleChange = useCallback(
    (field: keyof typeof formState) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        setFormState((previous) => ({
          ...previous,
          [field]: value,
        }));
      },
    []
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    if (!id || !window.devices?.update) {
      setStatus({
        isSubmitting: false,
        error: "Device editing is only available in the Electron application.",
        success: false,
      });
      return;
    }

    const ip = formState.ip.trim();
    if (!ip) {
      setStatus({
        isSubmitting: false,
        error: "Please provide the device IP address.",
        success: false,
      });
      return;
    }

    const alias = formState.alias.trim();
    const username = formState.username.trim();
    const password = formState.password.trim();
    const portValue = formState.port.trim();

    const updates: Partial<DeviceRegistrationPayload> = {
      ip,
    };

    updates.alias = alias.length > 0 ? alias : null;
    updates.username = username.length > 0 ? username : null;
    updates.password = password.length > 0 ? password : null;

    if (portValue) {
      const numericPort = Number(portValue);
      if (
        !Number.isInteger(numericPort) ||
        numericPort < 1 ||
        numericPort > 65535
      ) {
        setStatus({
          isSubmitting: false,
          error: "Port must be an integer between 1 and 65535.",
          success: false,
        });
        return;
      }
      updates.port = numericPort;
    } else {
      updates.port = null;
    }

    setStatus({ isSubmitting: true, error: null, success: false });

    try {
      await window.devices.update(id, updates);
      setStatus({ isSubmitting: false, error: null, success: true });
      setTimeout(() => {
        navigate(`/registered-devices/${id}`);
      }, 500);
    } catch (error: unknown) {
      setStatus({
        isSubmitting: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to save the device details.",
        success: false,
      });
    }
  };

  return (
    <main className="flex-1 overflow-y-scroll min-h-screen bg-slate-950 py-[4em]">
      <section className="flex flex-1 flex-col justify-center">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-xl">
          <header className="mb-8 flex flex-col gap-2 text-center">
            <p className="text-sm uppercase tracking-widest text-emerald-400">
              Edit Device
            </p>
            <h1 className="text-3xl font-semibold text-white">
              {device?.alias ?? device?.hostname ?? device?.ip ?? "Device"}
            </h1>
            <p className="text-sm text-slate-400">
              Update the saved SSH credentials for this device.
            </p>
          </header>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
            <FormInput
              id="alias"
              label="Device Alias (optional)"
              placeHolder="eg: my-server-node-01"
              value={formState.alias}
              onChange={handleChange("alias")}
              helperText="A friendly name that helps you identify this device."
            />
            <FormInput
              id="ip-address"
              label="Device IP Address"
              placeHolder="eg: 192.168.0.120"
              value={formState.ip}
              onChange={handleChange("ip")}
              helperText="Auto-filled from the saved device."
            />
            <FormInput
              id="port"
              type="number"
              label="Port (optional)"
              placeHolder="Default: 22"
              value={formState.port}
              onChange={handleChange("port")}
              helperText="Specify a custom SSH or service port if required."
            />
            <FormInput
              id="username"
              label="Device Username"
              placeHolder="Device Username"
              value={formState.username}
              onChange={handleChange("username")}
            />
            <FormInput
              id="password"
              type="password"
              label="Device Password"
              placeHolder="Device Password"
              value={formState.password}
              onChange={handleChange("password")}
            />
            {status.error ? (
              <p className="md:col-span-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {status.error}
              </p>
            ) : null}
            {status.success ? (
              <p className="md:col-span-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                Device updated successfully.
              </p>
            ) : null}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={status.isSubmitting || !canPersist}
                className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status.isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
            <div className="md:col-span-2">
              <Link
                to={id ? `/registered-devices/${id}` : "/registered-devices"}
                className="flex w-full items-center justify-center rounded-lg bg-slate-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-500"
              >
                Cancel
              </Link>
            </div>
          </form>
          {isLoading ? (
            <p className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
              Loading device details...
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
};

export default DeviceEditPage;
