type ScanControlsProps = {
  isScanning: boolean;
  lastScan: Date | null;
  onRunScan: () => void;
  canScan: boolean;
};

const ScanControls = ({ isScanning, lastScan, onRunScan, canScan }: ScanControlsProps) => {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-3xl font-semibold text-slate-100">Network Scan</p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Discover SSH-ready devices connected to your local network.
        </p>
        <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
          Last scan{' '}
          <span className="font-semibold text-slate-300">
            {lastScan ? lastScan.toLocaleString() : 'Not yet run'}
          </span>
        </p>
      </div>

      <button
        type="button"
        onClick={onRunScan}
        disabled={isScanning || !canScan}
        className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          isScanning
            ? 'cursor-wait bg-emerald-600/60 text-emerald-100'
            : 'bg-emerald-600 text-emerald-50 hover:bg-emerald-500'
        } ${canScan ? '' : 'cursor-not-allowed opacity-60'}`}
      >
        {isScanning && (
          <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-emerald-100 border-t-transparent" />
        )}
        {isScanning ? 'Scanning network…' : 'Run scan'}
      </button>
    </header>
  );
};

export default ScanControls;
