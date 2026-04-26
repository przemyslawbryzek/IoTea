import { useEffect, useState } from 'react';
import { isAuthenticated } from '../services/auth';
import { getBrews, getDeviceStatus, getDevices, getTeas } from '../services/api';
import type { BrewSummary } from '../interfaces/brew.interface';
import type { DeviceStatus, DeviceSummary } from '../interfaces/device.interface';
import type { Tea } from '../interfaces/tea.interface';
import { DevicePanel } from '../components/DevicePanel';
import { TeaGrid } from '../components/TeaGrid';

export function HomePage() {
  const authenticated = isAuthenticated();
  const [teas, setTeas] = useState<Tea[]>([]);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [brews, setBrews] = useState<BrewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const teaData = await getTeas();

        if (!active) return;

        setTeas(teaData);
        setError('');

        if (authenticated) {
          const [deviceData, brewsData] = await Promise.all([getDevices(), getBrews()]);
          if (!active) return;

          setDevices(deviceData);
          setBrews(brewsData);

          if (deviceData.length > 0) {
            const firstDeviceId = deviceData[0].id;
            setSelectedDeviceId(firstDeviceId);
            setDeviceLoading(true);
            const status = await getDeviceStatus(firstDeviceId);
            if (!active) return;
            setDeviceStatus(status);
            setDeviceLoading(false);
          }
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [authenticated]);

  const handleSelectDevice = async (deviceId: number) => {
    setSelectedDeviceId(deviceId);
    setDeviceLoading(true);

    try {
      const status = await getDeviceStatus(deviceId);
      setDeviceStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDeviceLoading(false);
    }
  };

  return (
    <main className="min-h-app">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-5 py-5 lg:px-8">
        <DevicePanel
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        status={deviceStatus}
        loading={deviceLoading}
        onSelect={handleSelectDevice}
        authenticated={authenticated}
        />
        {error ? <p className="mt-5 border border-black px-4 py-3 text-sm">{error}</p> : null}

        <div className="mt-2">
          <TeaGrid teas={teas} loading={loading} continueBrews={brews} />
        </div>
      </div>
    </main>
  );
}