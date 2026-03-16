#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE="${NAMESPACE:-iotea}"
OVERLAY_PATH="${OVERLAY_PATH:-$ROOT_DIR/k8s/overlays/dev}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-120s}"

DEPLOYMENTS=(
  "iotea-backend"
  "iotea-worker-mqtt"
  "iotea-frontend"
)

usage() {
  cat <<'EOF'
Usage: ./scripts/rebuild-deploy-dev.sh [--skip-build] [--skip-apply] [--help]

Options:
  --skip-build   Skip Docker image builds and only apply/restart Kubernetes resources.
  --skip-apply   Skip kubectl apply and rollout restart steps.
  --help         Show this help message.

Environment variables:
  NAMESPACE        Kubernetes namespace. Default: iotea
  OVERLAY_PATH     Kustomize overlay path. Default: k8s/overlays/dev
  ROLLOUT_TIMEOUT  Rollout wait timeout. Default: 120s
EOF
}

log() {
  printf '[deploy-dev] %s\n' "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

SKIP_BUILD=false
SKIP_APPLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)
      SKIP_BUILD=true
      ;;
    --skip-apply)
      SKIP_APPLY=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

require_cmd docker
require_cmd kubectl

rollback() {
  log 'Deployment failed. Rolling back Kubernetes deployments.'

  for deployment in "${DEPLOYMENTS[@]}"; do
    if kubectl -n "$NAMESPACE" get deployment "$deployment" >/dev/null 2>&1; then
      kubectl -n "$NAMESPACE" rollout undo "deployment/$deployment" || true
    fi
  done

  for deployment in "${DEPLOYMENTS[@]}"; do
    if kubectl -n "$NAMESPACE" get deployment "$deployment" >/dev/null 2>&1; then
      kubectl -n "$NAMESPACE" rollout status "deployment/$deployment" --timeout="$ROLLOUT_TIMEOUT" || true
    fi
  done
}

on_error() {
  local exit_code=$?
  rollback
  exit "$exit_code"
}

trap on_error ERR

build_images() {
  log 'Building frontend image.'
  docker build -t iotea-frontend:latest "$ROOT_DIR/frontend"

  log 'Building backend API image.'
  docker build -t iotea-backend:latest -f "$ROOT_DIR/backend/Dockerfile" "$ROOT_DIR/backend"

  log 'Building MQTT worker image.'
  docker build -t iotea-worker-mqtt:latest -f "$ROOT_DIR/backend/Dockerfile.worker" "$ROOT_DIR/backend"
}

deploy_k8s() {
  log "Applying overlay: $OVERLAY_PATH"
  kubectl apply -k "$OVERLAY_PATH"

  log 'Restarting deployments so local latest images are picked up.'
  kubectl -n "$NAMESPACE" rollout restart deployment/iotea-backend
  kubectl -n "$NAMESPACE" rollout restart deployment/iotea-worker-mqtt
  kubectl -n "$NAMESPACE" rollout restart deployment/iotea-frontend

  log 'Waiting for rollouts to complete.'
  for deployment in "${DEPLOYMENTS[@]}"; do
    kubectl -n "$NAMESPACE" rollout status "deployment/$deployment" --timeout="$ROLLOUT_TIMEOUT"
  done
}

main() {
  log "Namespace: $NAMESPACE"

  if [[ "$SKIP_BUILD" == false ]]; then
    build_images
  else
    log 'Skipping image builds.'
  fi

  if [[ "$SKIP_APPLY" == false ]]; then
    deploy_k8s
  else
    log 'Skipping Kubernetes apply/restart.'
  fi

  trap - ERR
  log 'Done.'
}

main