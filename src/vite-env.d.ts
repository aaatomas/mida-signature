/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OIDC_ISSUER_URL?: string
  readonly VITE_OIDC_CLIENT_ID?: string
  readonly VITE_DEV_OAUTH_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
