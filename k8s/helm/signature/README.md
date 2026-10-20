# Signature Helm chart

Deploys the MIDA email signature builder SPA (`signature.onmida.lt`).

## Install (local Traefik + central oauth2-proxy)

```bash
helm upgrade --install signature . -n signature -f values.yaml
```

## GKE (authorizer owns oauth)

```bash
./scripts/build-publish.sh --gke
helm upgrade --install signature . -n signature -f values-gke-gateway.yaml
```

Register `signature.onmida.lt` on the authorizer oauth2-proxy upstream list and allow
`https://signature.onmida.lt/oauth2/callback` on the Keycloak `oauth2-proxy` client.
