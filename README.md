# MIDA Signature

Email signature builder for MIDA. Vite + React + MUI, with Keycloak login via oauth2-proxy (same pattern as `apps` / `production-manager`).

Signed-in user profile fills first name, last name, email, and (when present in the token) phone and job title.

## Develop

```bash
npm install
npm run dev
```

Optional: proxy `/oauth2` to a deployed instance:

```bash
cp .env.example .env
# VITE_DEV_OAUTH_PROXY_TARGET=https://signature.onmida.lt
```

## Build & publish

```bash
./scripts/build-publish.sh          # registry.onmida.lt/signature
./scripts/build-publish.sh --gke    # Artifact Registry (GKE values)
```

## Helm

```bash
helm upgrade --install signature k8s/helm/signature -n signature -f k8s/helm/signature/values.yaml
# GKE via authorizer oauth2-proxy:
helm upgrade --install signature k8s/helm/signature -n signature -f k8s/helm/signature/values-gke-gateway.yaml
```
