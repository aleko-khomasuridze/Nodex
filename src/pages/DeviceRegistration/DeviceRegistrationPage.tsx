import type { ChangeEvent, FormEventHandler } from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NetworkDevice } from "../../components/network/DeviceList";
import FormInput from "../../components/form/FormInput";
import type { DeviceRegistrationPayload } from "../../types/device";

const LOCAL_STORAGE_KEY = "cachedDevices";

const DeviceRegistration = () => {
  const { ip: ipParam } = useParams<{ ip: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<NetworkDevice | null>(null);
  const [formState, setFormState] = useState({
    alias: "",
    ip: ipParam ?? "",
    port: "",
    username: "",
    password: "",
    authMethod: "password" as DeviceRegistrationPayload["authMethod"],
  });
  const [status, setStatus] = useState({
    isSubmitting: false,
    error: null as string | null,
    success: false,
  });
  const [generatedPublicKey, setGeneratedPublicKey] = useState<string | null>(
    null
  );

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!stored || !ipParam) {
      return;
    }

    try {
      const result = JSON.parse(stored);
      const targetDevice = result.devices?.find(
        (dev: NetworkDevice) => dev.ip === ipParam
      );

      if (targetDevice) {
        setDevice(targetDevice);
      }
    } catch (error) {
      console.error("Error reading cached devices", error);
    }
  }, [ipParam]);

  useEffect(() => {
    setFormState((previous) => {
      const trimmedAlias = previous.alias.trim();
      const nextAlias =
        trimmedAlias.length > 0
          ? previous.alias
          : device?.hostname ?? previous.alias;
      return {
        ...previous,
        ip: device?.ip ?? ipParam ?? previous.ip,
        alias: nextAlias,
      };
    });
  }, [device, ipParam]);

  const handleChange =
    (field: keyof typeof formState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setFormState((previous) => ({
        ...previous,
        [field]: value,
      }));
    };

  const handleAuthMethodChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { value } = event.target;
    if (value === "password" || value === "key") {
      setFormState((previous) => ({
        ...previous,
        authMethod: value,
        password: value === "password" ? previous.password : "",
      }));
      setGeneratedPublicKey(null);
    }
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    if (!window.devices?.register) {
      setStatus({
        isSubmitting: false,
        error:
          "Device registration is only available in the Electron application.",
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

    const payload: DeviceRegistrationPayload = {
      ip,
      hostname: device?.hostname ?? null,
      authMethod: formState.authMethod,
    };

    if (alias) {
      payload.alias = alias;
    }
    if (username) {
      payload.username = username;
    }
    if (formState.authMethod === "password") {
      if (!password) {
        setStatus({
          isSubmitting: false,
          error: "Please provide the SSH password.",
          success: false,
        });
        return;
      }
      payload.password = password;
    }
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
      payload.port = numericPort;
    }

    setGeneratedPublicKey(null);
    setStatus({ isSubmitting: true, error: null, success: false });

    try {
      const record = await window.devices.register(payload);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setStatus({ isSubmitting: false, error: null, success: true });
      if (record.authMethod === "key" && record.publicKey) {
        setGeneratedPublicKey(record.publicKey);
      } else {
        setTimeout(() => {
          navigate("/registered-devices");
        }, 500);
      }
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
      <section className="flex flex-1 flex-col justify-center items-center mx-4">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br lg:w-[45rem] from-slate-950 via-slate-900 to-slate-950 p-8 shadow-xl">
          <header className="mb-8 flex flex-col gap-2 text-center">
            <p className="text-sm uppercase tracking-widest text-emerald-400">
              Device Registration
            </p>
            <h1 className="text-3xl font-semibold text-white">
              {device?.hostname ?? "New Device"}
            </h1>
            <p className="text-sm text-slate-400">
              Provide the connection details for {device?.ip ?? "your device"}{" "}
              to finish registration.
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
              helperText="Auto-filled from the network scan."
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
            <div className="md:col-span-2">
              <fieldset className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4">
                <legend className="px-2 text-xs uppercase tracking-wide text-slate-400">
                  Authentication method
                </legend>
                <div className="mt-3 flex flex-col gap-3 md:flex-row">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <input
                      type="radio"
                      name="authentication-method"
                      value="password"
                      checked={formState.authMethod === "password"}
                      onChange={handleAuthMethodChange}
                      className="h-4 w-4 border border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    Password
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <input
                      type="radio"
                      name="authentication-method"
                      value="key"
                      checked={formState.authMethod === "key"}
                      onChange={handleAuthMethodChange}
                      className="h-4 w-4 border border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    SSH key pair
                  </label>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Choose whether to store an encrypted password or let Nodex
                  generate a dedicated SSH key pair for this device.
                </p>
              </fieldset>
            </div>
            {formState.authMethod === "password" ? (
              <FormInput
                id="password"
                type="password"
                label="Device Password"
                placeHolder="Device Password"
                value={formState.password}
                onChange={handleChange("password")}
                className="md:col-span-2"
              />
            ) : (
              <div className="md:col-span-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-200">
                Nodex will generate a secure SSH key pair and store the private
                key encrypted. Install the generated public key on the device to
                enable key-based authentication.
              </div>
            )}
            {status.error ? (
              <p className="md:col-span-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {status.error}
              </p>
            ) : null}
            {status.success ? (
              <p className="md:col-span-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {formState.authMethod === "key" && generatedPublicKey
                  ? "Device registered successfully. Install the generated public key on your device before attempting to connect."
                  : "Device registered successfully."}
              </p>
            ) : null}
            {generatedPublicKey ? (
              <div className="md:col-span-2 space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-emerald-200">
                    Generated public key
                  </p>
                  <p className="mt-1 text-xs text-emerald-100/80">
                    Copy this key to the device's
                    <code className="mx-1 rounded bg-emerald-500/10 px-1 text-[0.65rem]">
                      authorized_keys
                    </code>
                    file to finish setup.
                  </p>
                </div>
                <textarea
                  className="w-full rounded-lg border border-emerald-500/40 bg-slate-950/80 p-3 text-xs text-emerald-100"
                  rows={4}
                  readOnly
                  value={generatedPublicKey}
                />
              </div>
            ) : null}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={status.isSubmitting}
                className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status.isSubmitting ? "Saving..." : "Complete Registration"}
              </button>
            </div>
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => navigate("/network-scan")}
                className="w-full rounded-lg bg-slate-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-500 focus:outline-none focus:ring-4"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};

export default DeviceRegistration;
