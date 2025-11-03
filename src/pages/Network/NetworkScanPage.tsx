import { useCallback, useEffect, useState } from 'react';
import DeviceList, { NetworkDevice } from '../../components/network/DeviceList';
import ScanControls from '../../components/network/ScanControls';
import ScanFeedback from '../../components/network/ScanFeedback';

const LOCAL_STORAGE_KEY = 'cachedDevices';

const NetworkScanPage = () => {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);


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

      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          devices: results,
        })
      );
    } catch (scanError) {
      console.error('Network scan failed', scanError);
      setDevices([]);
      setError(
        scanError instanceof Error
          ? scanError.message
          : 'Unable to complete the network scan.'
      );
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.devices?.length) {
          setDevices(parsed.devices);
          setLastScan(new Date(parsed.timestamp));
          return; 
        }
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }

    void runScan();
  }, [runScan]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <article className="min-h-screen bg-slate-950 py-12">
      <main className="mx-auto flex max-w-5xl flex-1 flex-col px-4">
        <section className="flex flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-xl">
            <ScanControls
              isScanning={isScanning}
              lastScan={lastScan}
              onRunScan={() => void runScan()}
              canScan={Boolean(window.networkScan?.scan)}
            />
            <ScanFeedback devices={devices} error={error} isScanning={isScanning} />
            <DeviceList devices={devices} />
          </div>
        </section>
      </main>
    </article>
  );
};

export default NetworkScanPage;
