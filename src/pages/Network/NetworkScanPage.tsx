import { useCallback, useEffect, useState } from 'react';
import DeviceList, { NetworkDevice } from '../../components/network/DeviceList';
import ScanControls from '../../components/network/ScanControls';
import ScanFeedback from '../../components/network/ScanFeedback';

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
    } catch (scanError) {
      console.error('Network scan failed', scanError);
      setDevices([]);
      setError(
        scanError instanceof Error ? scanError.message : 'Unable to complete the network scan.'
      );
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    void runScan();
  }, [runScan]);

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <ScanControls
        isScanning={isScanning}
        lastScan={lastScan}
        onRunScan={() => void runScan()}
        canScan={Boolean(window.networkScan?.scan)}
      />

      <ScanFeedback devices={devices} error={error} isScanning={isScanning} />

      <DeviceList devices={devices} />
    </div>
  );
};

export default NetworkScanPage;
