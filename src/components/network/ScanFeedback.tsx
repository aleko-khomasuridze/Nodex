import type { NetworkDevice } from './DeviceList';

type ScanFeedbackProps = {
  devices: NetworkDevice[];
  error: string | null;
  isScanning: boolean;
};

const ScanFeedback = ({ devices, error, isScanning }: ScanFeedbackProps) => {
  if (error) {
    return (
      <div className="rounded-lg border border-rose-600/50 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (isScanning) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        Scanning for SSH-enabled devices on your local network…
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-6 py-10 text-center text-sm text-slate-400">
        No SSH-enabled devices were detected during the last scan.
      </div>
    );
  }

  return null;
};

export default ScanFeedback;
