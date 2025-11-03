import { useEffect, useState } from "react";
import { NetworkDevice } from "../../components/network/DeviceList";
import FormInput from "../../components/form/FormInput";

const LOCAL_STORAGE_KEY = "cachedDevices";

const DeviceRegistration = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [device, setDevice] = useState<NetworkDevice>();

  const url = window.location.href
  const targetIp = url.split('/').pop()
  console.log(targetIp)

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!stored) return;

    try {
      const result = JSON.parse(stored);
      const targetDevice = result.devices?.filter(
        (dev: NetworkDevice) => dev.ip == targetIp
      )[0];

      if (targetDevice) {
        setDevice(
          result.devices?.filter(
            (dev: NetworkDevice) => dev.ip == targetIp
          )[0]
        );
      }
    } catch (error) {
      console.log("Error: ", error);
    }
    setLoading(false);
  }, [loading]);

  return (
    <article>
      <main>
        <section>
          <div className="container mx-auto flex min-h-full max-w-4xl flex-col gap-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            <form className="w-80 bg-slate-900 border border-slate-800 rounded-lg p-5 m-5">
              <h1 className="font-bold text-2xl">{device?.hostname} registration</h1>
              <FormInput
                id="alias"
                label="Enter Device Alias (optional)"
                placeHolder="eg: my-server-node-01"
              />
              <FormInput
                id="ip-address"
                label="Enter Device IP-Address"
                placeHolder="eg: 192.168.XXX.XXX"
                value={device?.ip}
              />
              <FormInput
                id="username"
                label="Enter Device Username"
                placeHolder="Device Username"
              />
              <FormInput
                id="password"
                type="password"
                label="Enter Device Password"
                placeHolder="Device Password"
              />
              <button
                type="submit"
                className="text-white bg-emerald-700 hover:bg-emerald-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
              >
                Submit
              </button>
            </form>
          </div>
        </section>
      </main>
    </article>
  );
};

export default DeviceRegistration;
