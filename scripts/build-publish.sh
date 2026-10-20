#!/usr/bin/env bash
set -euo pipefail

# Default image prefix: registry.onmida.lt
# For GKE (matches k8s/helm/signature/values-gke*.yaml):
#   ./scripts/build-publish.sh --gke
# Override registry: REGISTRY=... ./scripts/build-publish.sh
# Authenticate to Artifact Registry once: gcloud auth configure-docker europe-north2-docker.pkg.dev
#
# Optional build-args:
#   VITE_OIDC_ISSUER_URL=... VITE_OIDC_CLIENT_ID=... ./scripts/build-publish.sh --gke

USE_GKE=0

usage() {
    echo "Usage: $0 [--gke] [TAG]"
    echo ""
    echo "  --gke     Push to europe-north2 Artifact Registry (GKE Helm values)."
    echo "  TAG       Docker image tag (default: latest)"
    echo ""
    echo "Env: REGISTRY (overrides default), TAG (default latest)."
    echo "     VITE_OIDC_ISSUER_URL, VITE_OIDC_CLIENT_ID (optional build-args)."
    echo ""
    echo "Examples:"
    echo "  $0                          # build & push to registry.onmida.lt"
    echo "  $0 --gke                    # build & push to Artifact Registry"
    echo "  $0 v1.2.3                   # custom tag"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --gke)
            USE_GKE=1
            shift
            ;;
        -h|--help)
            usage
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            break
            ;;
    esac
done

if [[ -z "${REGISTRY:-}" ]]; then
    if [[ "$USE_GKE" -eq 1 ]]; then
        REGISTRY="europe-north2-docker.pkg.dev/project-bcfa376f-0637-457a-ae0/k8s-registry"
    else
        REGISTRY="registry.onmida.lt"
    fi
fi

TAG="${1:-latest}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

IMAGE="${REGISTRY}/signature:${TAG}"

BUILD_ARGS=()
if [[ -n "${VITE_OIDC_ISSUER_URL:-}" ]]; then
    BUILD_ARGS+=(--build-arg "VITE_OIDC_ISSUER_URL=${VITE_OIDC_ISSUER_URL}")
fi
if [[ -n "${VITE_OIDC_CLIENT_ID:-}" ]]; then
    BUILD_ARGS+=(--build-arg "VITE_OIDC_CLIENT_ID=${VITE_OIDC_CLIENT_ID}")
fi

cd "${PROJECT_ROOT}"

echo "Building ${IMAGE}"
# ${arr[@]+"${arr[@]}"} is required: macOS bash 3.2 + set -u treats empty "${arr[@]}" as unbound.
docker build --platform linux/amd64 -f dockerfile/Dockerfile ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} -t "${IMAGE}" .

echo "Pushing ${IMAGE}"
docker push "${IMAGE}"

echo "Done (registry: ${REGISTRY}, tag: ${TAG})"
