import type { DeviceStatus, DeviceSummary } from '../interfaces/device.interface';

type Props = {
  devices: DeviceSummary[];
  selectedDeviceId: number | null;
  status: DeviceStatus | null;
  loading: boolean;
  onSelect: (deviceId: number) => void;
  authenticated: boolean;
};

export function DevicePanel({
  devices,
  selectedDeviceId,
  status,
  loading,
  onSelect,
  authenticated,
}: Props) {
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? null;
  const powerState = status?.online ?? selectedDevice?.online ?? false;
  const temperature = status?.currentTemp ?? selectedDevice?.currentTemp;
  const deviceStatus = status?.status ?? (powerState ? 'Online' : 'Offline');

  return (
    <section>
      <div className="flex flex-col gap-4 p-5">
        {authenticated ? (
          <label className="flex flex-row gap-2 text-sm font-medium justify-between">
            <span>Device</span>
            <select
              className="border border-black/25 px-4 py-3 outline-none"
              value={selectedDeviceId ?? ''}
              onChange={(event) => onSelect(Number(event.target.value))}
            >
              <option value="">Select Device</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="border border-black/25 px-4 py-3 text-sm">
            Log in to view devices
          </div>
        )}
      </div>

      <div className="py-2 px-5">
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">Device Status</p>

        <div className="mt-4 flex flex-row gap-3">
          <div className="flex items-center justify-between border rounded-full border-black/25 px-4 py-3 w-full">
            <span className="text-sm">On/Off:</span>
            <span className="text-sm font-medium">{powerState ? 'On' : 'Off'}</span>
          </div>
          <div className="flex items-center justify-between border rounded-full border-black/25 px-4 py-3 w-full">
            <span className="text-sm">Temperature:</span>
            <span className="text-sm font-medium">{temperature ?? '—'}°C</span>
          </div>
          <div className="flex items-center justify-between border rounded-full border-black/25 px-4 py-3 w-full">
            <span className="text-sm">Status:</span>
            <span className="text-sm font-medium">{deviceStatus}</span>
          </div>
        </div>

        {loading ? <p className="mt-4 text-sm text-black/60">Loading status...</p> : null}
      </div>
    </section>
  );
}