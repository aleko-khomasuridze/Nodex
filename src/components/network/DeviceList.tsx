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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200">
        {devices.length} device{devices.length === 1 ? '' : 's'} ready for SSH
      </h3>
      <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
        {devices.map((device) => {
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
              <div>
                <span className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-500/10 px-3 py-1 lg:me-[8em] me-[4em] text-xs font-semibold uppercase tracking-wide text-emerald-300 sm:self-auto">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> ssh Available
                </span>
                <Link to={`/device-registration/${device.ip}`} className="focus:outline-none text-emerald-400 bg-transparent border border-emerald-600 hover:bg-emerald-600/20 font-medium rounded-lg text-sm px-3 py-1.5 ">
                  Register
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DeviceList;
