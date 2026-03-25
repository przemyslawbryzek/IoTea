import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Droplets, Thermometer, Power } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export function DeviceStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    temperature: 25,
    waterLevel: 85,
    isPoweredOn: false,
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    // Symulacja połączenia
    setTimeout(() => {
      setIsConnected(true);
      setIsConnecting(false);
      setDeviceInfo({
        temperature: 25,
        waterLevel: 85,
        isPoweredOn: true,
      });
      toast.success('Połączono z czajnikiem IoTea');
    }, 2000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setDeviceInfo({
      temperature: 0,
      waterLevel: 0,
      isPoweredOn: false,
    });
    toast.info('Rozłączono z czajnikiem');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Wifi className="w-5 h-5 text-green-500" />
                </motion.div>
                Smart Czajnik
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-muted-foreground" />
                Smart Czajnik
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isConnected ? 'Połączony' : 'Nie połączony'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? 'Łączenie...' : 'Połącz z czajnikiem'}
            </Button>
          ) : (
            <>
              <div className="space-y-3">
                {/* Status zasilania */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Power className={`w-4 h-4 ${deviceInfo.isPoweredOn ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className="text-sm">Zasilanie</span>
                  </div>
                  <span className="text-sm font-medium">
                    {deviceInfo.isPoweredOn ? 'Włączony' : 'Wyłączony'}
                  </span>
                </div>

                {/* Temperatura */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">Temperatura wody</span>
                  </div>
                  <span className="text-sm font-medium">{deviceInfo.temperature}°C</span>
                </div>

                {/* Poziom wody */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Poziom wody</span>
                  </div>
                  <span className="text-sm font-medium">{deviceInfo.waterLevel}%</span>
                </div>
              </div>

              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="w-full"
              >
                Rozłącz
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Informacje o urządzeniu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informacje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Model:</span>
            <span className="font-medium">IoTea Smart Kettle Pro</span>
          </div>
          <div className="flex justify-between">
            <span>Wersja firmware:</span>
            <span className="font-medium">v2.1.5</span>
          </div>
          <div className="flex justify-between">
            <span>Adres MAC:</span>
            <span className="font-medium">A4:CF:12:B3:45:67</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
