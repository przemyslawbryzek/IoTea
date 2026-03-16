# Kubernetes
Ten katalog opisuje aktualny, lokalny deployment IoTea na Kubernetes z użyciem Kustomize.
Konfiguracja jest przygotowana pod środowisko developerskie.

## Struktura katalogów

- `addons/traefik/` - kontroler Ingress Traefik (NodePort: `30080`, dashboard: `30081`)
- `addons/emqx/` - broker MQTT EMQX (StatefulSet, 2 repliki)
- `addons/redis/` - Redis (1 replika)
- `base/` - wspólne zasoby aplikacyjne:
	- `iotea-frontend` (Deployment + Service)
	- `iotea-backend` (Deployment + Service)
	- `iotea-worker-mqtt` (Deployment)
	- `postgres` (Deployment + PVC + Service)
	- Ingress hosta `iotea.local`
- `overlays/dev/` - nakładka DEV (sekrety i tagi obrazów)

## Routing (Ingress)

Ingress działa na hoście `iotea.local`:

- `/` -> `iotea-frontend:80`
- `/api` -> `iotea-backend:3000`

Traefik jest wystawiony jako NodePort:

- `http://iotea.local:30080` - aplikacja
- `http://localhost:30081/dashboard/` - dashboard Traefika

## MQTT przez Traefik (TCP LB)

Traefik ma skonfigurowany entrypoint TCP `mqtt` i load balancing do serwisu `emqx:1883`
przez zasób `IngressRouteTCP`.

Ekspozycja MQTT z hosta lokalnego:

- `iotea.local:31883` -> Traefik -> `emqx:1883`

Szybki test portu:

```bash
nc -vz 127.0.0.1 31883
```

## Wymagania

- działający klaster Kubernetes (np. Docker Desktop)
- `kubectl`
- `docker`

## Budowanie obrazów lokalnych

Overlay DEV zakłada lokalne obrazy:

- `iotea-frontend:latest` - aplikacja webowa React
- `iotea-backend:latest` - API NestJS
- `iotea-worker-mqtt:latest` - worker MQTT

Zbuduj je z katalogu głównego repo:

```bash
docker build -t iotea-frontend:latest ./frontend
docker build -t iotea-backend:latest ./backend
docker build -t iotea-worker-mqtt:latest -f ./backend/Dockerfile.worker ./backend
```

Lub wszystkie naraz:

```bash
docker build -t iotea-frontend:latest ./frontend && \
docker build -t iotea-backend:latest ./backend && \
docker build -t iotea-worker-mqtt:latest -f ./backend/Dockerfile.worker ./backend
```

## Wdrożenie

1. Addony infrastrukturalne:

```bash
kubectl apply -k k8s/addons/traefik
kubectl apply -k k8s/addons/emqx
kubectl apply -k k8s/addons/redis
```

2. Aplikacja (overlay DEV):

```bash
kubectl apply -k k8s/overlays/dev
```

## Automatyzacja rebuild + deploy + rollback

Do szybkiego lokalnego wdrożenia po zmianach w kodzie użyj skryptu:

```bash
./scripts/rebuild-deploy-dev.sh
```

Skrypt:

- buduje obrazy `iotea-frontend`, `iotea-backend`, `iotea-worker-mqtt`
- wykonuje `kubectl apply -k k8s/overlays/dev`
- restartuje deploymenty aplikacyjne
- czeka na rollout
- przy błędzie robi `rollout undo` dla deploymentów aplikacji

Dostępne opcje:

```bash
./scripts/rebuild-deploy-dev.sh --skip-build
./scripts/rebuild-deploy-dev.sh --skip-apply
./scripts/rebuild-deploy-dev.sh --help
```

## Szybka weryfikacja

Sprawdzenie zasobów:

```bash
kubectl -n iotea get deploy,sts,svc,ingress
```

Sprawdzenie routingu:

```bash
curl -H 'Host: iotea.local' http://127.0.0.1:30080/
curl -H 'Host: iotea.local' http://127.0.0.1:30080/api
nc -vz 127.0.0.1 31883
```