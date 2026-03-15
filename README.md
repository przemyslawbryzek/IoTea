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
    Worker --> PG
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