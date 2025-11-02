import { useCallback, useEffect, useMemo, useState } from 'react';

type NetworkDevice = {
  ip: string;
  hostname?: string | null;
};

const navigationItems = [
  {
    id: 'network-scan',
    label: 'Network Scan',
    description: 'Discover SSH-ready devices connected to your local network.'
  }
];

function App() {
  const [activeSection, setActiveSection] = useState(navigationItems[0].id);
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  const activeNavigation = useMemo(
    () => navigationItems.find((item) => item.id === activeSection) ?? navigationItems[0],
    [activeSection]
  );

  const runScan = useCallback(async () => {
    if (!window.networkScan?.scan) {
      setError('Network scanning is not available in this environment.');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const results = await window.networkScan.scan();
      setDevices(results);
      setLastScan(new Date());
    } catch (scanError) {
      console.error('Network scan failed', scanError);
      setDevices([]);
      setError(scanError instanceof Error ? scanError.message : 'Unable to complete the network scan.');
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    void runScan();
  }, [runScan]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-900/60">
        <div className="px-6 pb-6 pt-8">
          <h1 className="text-xl font-semibold">Nodex Toolkit</h1>
          <p className="mt-1 text-sm text-slate-400">Network utilities for your local workspace.</p>
        </div>

        <nav className="flex-1 space-y-1 px-4 pb-6">
          {navigationItems.map((item) => {
            const isActive = item.id === activeSection;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800/70 text-slate-100 ring-1 ring-slate-700'
                    : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-100'
                }`}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="mt-1 block text-xs font-normal text-slate-400">{item.description}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-6 pb-8 text-xs text-slate-500">
          <p>Last scan</p>
          <p className="mt-0.5 font-medium text-slate-300">{lastScan ? lastScan.toLocaleString() : 'Not yet run'}</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">{activeNavigation.label}</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-100">Network Scan</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">{activeNavigation.description}</p>
            </div>

            <button
              type="button"
              onClick={() => void runScan()}
              disabled={isScanning || !window.networkScan?.scan}
              className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                isScanning
                  ? 'cursor-wait bg-emerald-600/60 text-emerald-100'
                  : 'bg-emerald-600 text-emerald-50 hover:bg-emerald-500'
              } ${window.networkScan?.scan ? '' : 'cursor-not-allowed opacity-60'}`}
            >
              {isScanning && (
                <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-emerald-100 border-t-transparent" />
              )}
              {isScanning ? 'Scanning network…' : 'Run scan'}
            </button>
          </header>

          {error && (
            <div className="rounded-lg border border-rose-600/50 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">{error}</div>
          )}

          {!error && isScanning && (
            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              Scanning for SSH-enabled devices on your local network…
            </div>
          )}

          {!error && !isScanning && devices.length === 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-6 py-10 text-center text-sm text-slate-400">
              No SSH-enabled devices were detected during the last scan.
            </div>
          )}

          {devices.length > 0 && (
            <section className="space-y-4">
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
                      <span className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 sm:self-auto">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" /> SSH available
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
