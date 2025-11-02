import { Link } from "react-router-dom";

export type NetworkDevice = {
  ip: string;
  hostname?: string | null;
};

type DeviceListProps = {
  devices: NetworkDevice[];
};

const DeviceList = ({ devices }: DeviceListProps) => {
  if (devices.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200">
        {devices.length} device{devices.length === 1 ? '' : 's'} ready for SSH
      </h3>
      <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
        {devices.map((device, index) => {
          const primaryLabel = device.hostname && device.hostname !== device.ip ? device.hostname : device.ip;

          return (
            <li key={device.ip} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-medium text-slate-100">{primaryLabel}</p>
                <p className="text-sm text-slate-400">
                  {device.ip}
                  {device.hostname && device.hostname !== device.ip ? ` • ${device.hostname}` : ''}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 sm:self-auto">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> SSH available
              </span>
              <Link to={`/ssh-config/${index}`} className="focus:outline-none text-white bg-gray-700 hover:bg-emerald-600 font-medium rounded-lg text-sm px-4 py-2 ">
                Connect
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default DeviceList;
