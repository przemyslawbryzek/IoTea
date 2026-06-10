# IoTea RPi daemon (systemd)

## 1) Copy service file
```bash
sudo cp /path/to/IoTea/RPi/iotea.service /etc/systemd/system/iotea.service
```

## 2) Adjust paths and user
Edit the service file if your repo path or user is different:
- User
- WorkingDirectory
- ExecStart

```bash
sudo systemctl edit --full iotea.service
```

## 3) Enable and start
```bash
sudo systemctl daemon-reload
sudo systemctl enable iotea.service
sudo systemctl start iotea.service
```

`enable` włącza autostart przy bootowaniu, a `start` uruchamia usługę od razu w bieżącej sesji.
Jeśli chcesz tylko sprawdzić, czy usługa wystartuje po restarcie, wystarczy samo `enable`.

## 4) Check status and logs
```bash
systemctl status iotea.service
journalctl -u iotea.service -f
```

## 5) Stop / restart
```bash
sudo systemctl stop iotea.service
sudo systemctl restart iotea.service
```
