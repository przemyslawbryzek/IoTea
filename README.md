# IoTea
## Architektura
```mermaid
flowchart TB

subgraph Device["Device Layer"]
    RPi[Raspberry Pi]
    Sensors[DS18B20 Sensor]
    Heater[Heater 12V]
    Pump[Pump 12V]
    Valve[Servo / Valve]
    LocalDB[(SQLite<br>offline buffer)]

    RPi --- Sensors & Heater & Pump & Valve
    RPi <--> LocalDB
end

subgraph K8s["Kubernetes Cluster  -  self-hosted  -  Docker"]

    Traefik["Traefik<br>Ingress / Load Balancer"]

    subgraph Backend["Backend"]
        direction LR
        API["NestJS API<br>× N replicas"]
        Worker["MQTT Worker<br>× N replicas"]
    end

    subgraph Messaging["MQTT Broker Cluster  -  EMQX"]
        direction LR
        MQTT1["EMQX Node 1"]
        MQTT2["EMQX Node 2"]
        MQTT3["EMQX Node 3"]
        MQTT1 <--> MQTT2
        MQTT2 <--> MQTT3
        MQTT1 <--> MQTT3
    end

    subgraph DataLayer["Data Layer"]
        PG[(PostgreSQL<br>+ TimescaleDB)]
        Redis[(Redis<br>Cache / Sessions)]
    end

    subgraph Observability["Observability"]
        direction LR
        Prometheus[Prometheus] --> Grafana[Grafana]
    end

    Traefik -->|HTTP| API
    Traefik -->|TCP :1883 LB| MQTT1 & MQTT2 & MQTT3
    API --> PG & Redis
    Worker --> PG & Redis
    MQTT1 & MQTT2 & MQTT3 -->|subscribe| Worker
    API -->|publish command| Traefik
end

subgraph Clients["Client Layer"]
    Mobile[React Native<br>Mobile App]
    Web[React<br>Web Dashboard]
end

RPi -->|MQTT :1883| Traefik
Traefik -->|MQTT commands| RPi
Mobile & Web -->|HTTPS REST| Traefik
```

## Stos technologiczny

- Urządzenia IoT: Raspberry Pi, czujniki DS18B20, elementy wykonawcze 12V (grzałka, pompa) i 5V(zawór/serwo), lokalny bufor danych SQLite.
- Komunikacja: MQTT (EMQX cluster), HTTP/REST, HTTPS, Ingress i load balancing przez Traefik.
- Backend: NestJS API, worker(y) MQTT, uruchamiane jako replikowane usługi.
- Frontend: React (panel webowy), React Native (aplikacja mobilna).
- Dane: PostgreSQL + TimescaleDB (dane czasowe), Redis (cache/sesje), SQLite na warstwie edge/offline.
- Infrastruktura i deployment: Kubernetes (self-hosted), kontenery Docker.
- Observability: Prometheus, Grafana.

## Struktura repo

- [backend](backend) - NestJS API + MQTT worker + Prisma ORM
- [frontend](frontend) - React + Vite + Tailwind
- [mobile](mobile) - React Native (Expo + TypeScript)
- [k8s](k8s) - manifesty Kubernetes (base, addons, overlays)
- [RPi](RPi) - pliki Raspberry Pi
- [scripts](scripts) - skrypty automatyzujące

## Wymagania

- Node.js 22+
- npm
- Docker
- kubectl
- lokalny klaster Kubernetes (np. Docker Desktop)

## Uruchomienie lokalne (bez K8)

### Mobile (React Native)

```bash
cd mobile
npm install
npm run ios
# lub
npm run android
```

### Raspberry Pi

Work in Progress

## Kubernetes (DEV)

Szczegółowy opis deploymentu jest w [k8s/README.md](k8s/README.md).

Szybki start:

1. Dodaj host lokalny (opcjonalne):

```bash
echo "127.0.0.1 iotea.local" | sudo tee -a /etc/hosts
```
2. Budowanie obrazów lokalnych:

```bash
docker build -t iotea-frontend:latest ./frontend
docker build -t iotea-backend:latest ./backend
docker build -t iotea-worker-mqtt:latest -f ./backend/Dockerfile.worker ./backend
```

3. Zastosuj addony:

```bash
kubectl apply -k k8s/addons/traefik
kubectl apply -k k8s/addons/emqx
kubectl apply -k k8s/addons/redis
```

4. Zastosuj aplikację:

```bash
kubectl apply -k k8s/overlays/dev
```

## Automatyzacja deployu

Użyj skryptu [scripts/rebuild-deploy-dev.sh](scripts/rebuild-deploy-dev.sh):

```bash
./scripts/rebuild-deploy-dev.sh
```

Skrypt:

- buduje obrazy `iotea-frontend`, `iotea-backend`, `iotea-worker-mqtt`
- aplikuje overlay `k8s/overlays/dev`
- restartuje deploymenty
- czeka na rollout
- przy błędzie robi rollback deploymentów

Opcje:

```bash
./scripts/rebuild-deploy-dev.sh --help
./scripts/rebuild-deploy-dev.sh --skip-build
./scripts/rebuild-deploy-dev.sh --skip-apply
```

## Endpointy w środowisku K8 DEV

- Web: `http://iotea.local:30080/`
- API: `http://iotea.local:30080/api`
- Swagger: `http://iotea.local:30080/api/docs`
- API health: `http://iotea.local:30080/api/health`
- MQTT TCP: `iotea.local:31883`

## Uwagi

- Konfiguracja w [k8s/overlays/dev/secret.yaml](k8s/overlays/dev/secret.yaml) jest tylko do developmentu lokalnego.
- Sekrety DEV są jawne i nie nadają się do środowiska produkcyjnego.