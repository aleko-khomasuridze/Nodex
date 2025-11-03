import { useEffect, useState } from "react";
import { NetworkDevice } from "../../components/network/DeviceList";
import FormInput from "../../components/form/FormInput";

const LOCAL_STORAGE_KEY = "cachedDevices";

const DeviceRegistration = () => {
  const [device, setDevice] = useState<NetworkDevice>();

  const currentUrl = new URL(window.location.href);
  const targetIp =
    currentUrl.pathname.split("/register/")[1] ??
    currentUrl.pathname.split("/").filter(Boolean).pop();

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!stored || !targetIp) {
      return;
    }

    try {
      const result = JSON.parse(stored);
      const targetDevice = result.devices?.find(
        (dev: NetworkDevice) => dev.ip === targetIp
      );

      if (targetDevice) {
        setDevice(targetDevice);
      }
    } catch (error) {
      console.log("Error: ", error);
    }
  }, [targetIp]);

  return (
    <article className="min-h-screen bg-slate-950 py-12">
      <main className="mx-auto flex max-w-4xl flex-1 flex-col px-4">
        <section className="flex flex-1 flex-col justify-center">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-xl">
            <header className="mb-8 flex flex-col gap-2 text-center">
              <p className="text-sm uppercase tracking-widest text-emerald-400">Device Registration</p>
              <h1 className="text-3xl font-semibold text-white">
                {device?.hostname ?? "New Device"}
              </h1>
              <p className="text-sm text-slate-400">
                Provide the connection details for {device?.ip ?? "your device"} to finish registration.
              </p>
            </header>
            <form className="grid gap-5 md:grid-cols-2">
              <FormInput
                id="alias"
                label="Device Alias (optional)"
                placeHolder="eg: my-server-node-01"
                helperText="A friendly name that helps you identify this device."
              />
              <FormInput
                id="ip-address"
                label="Device IP Address"
                placeHolder="eg: 192.168.0.120"
                value={device?.ip}
                helperText="Auto-filled from the network scan."
              />
              <FormInput
                id="port"
                type="number"
                label="Port (optional)"
                placeHolder="Default: 22"
                helperText="Specify a custom SSH or service port if required."
              />
              <FormInput
                id="username"
                label="Device Username"
                placeHolder="Device Username"
              />
              <FormInput
                id="password"
                type="password"
                label="Device Password"
                placeHolder="Device Password"
              />
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/40"
                >
                  Complete Registration
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </article>
  );
};

export default DeviceRegistration;
