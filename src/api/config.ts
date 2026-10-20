/** Keycloak realm and client shared with apps / production-manager. */
export const DEFAULT_OIDC_ISSUER_URL = 'https://auth.onmida.lt/realms/mida'
export const DEFAULT_OIDC_CLIENT_ID = 'oauth2-proxy'

export function oauth2ProxyOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function oidcIssuerUrl(): string {
  return (import.meta.env.VITE_OIDC_ISSUER_URL || DEFAULT_OIDC_ISSUER_URL).replace(/\/$/, '')
}

export function oidcClientId(): string {
  return import.meta.env.VITE_OIDC_CLIENT_ID || DEFAULT_OIDC_CLIENT_ID
}

function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

/** True when this browser has no oauth2-proxy in front (plain `npm run dev`). */
export function isLocalOauthBypass(): boolean {
  if (typeof window === 'undefined') return false
  return isLocalhostHost(window.location.hostname) && !import.meta.env.VITE_DEV_OAUTH_PROXY_TARGET
}

/** Return path after login — never nest `/oauth2/*` (causes 414 redirect loops). */
export function safeOAuthReturnTo(returnTo?: string): string {
  if (typeof window === 'undefined') return '/'
  const raw = returnTo || `${window.location.pathname}${window.location.search}${window.location.hash}` || '/'
  try {
    const url = new URL(raw, window.location.origin)
    if (url.pathname.startsWith('/oauth2')) return '/'
    return `${url.pathname}${url.search}${url.hash}` || '/'
  } catch {
    return '/'
  }
}

export function oauth2SignInUrl(returnTo?: string): string {
  const o = oauth2ProxyOrigin().replace(/\/$/, '')
  const rd = safeOAuthReturnTo(returnTo)
  return `${o}/oauth2/start?rd=${encodeURIComponent(rd)}`
}

/** Keycloak account console, with referrer back to this app. */
export function oidcAccountUrl(origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const oidcIssuer = oidcIssuerUrl()
  const id = oidcClientId()
  const params = new URLSearchParams()
  if (id) params.set('referrer', id)
  if (base) params.set('referrer_uri', base)
  const qs = params.toString()
  return `${oidcIssuer}/account${qs ? `?${qs}` : ''}`
}

export function keycloakEndSessionUrl(postLogoutRedirectUri: string): string {
  const clientId = encodeURIComponent(oidcClientId())
  const redirect = encodeURIComponent(postLogoutRedirectUri)
  // Keep `{id_token}` literal; oauth2-proxy v7.15+ substitutes it on /oauth2/sign_out.
  return `${oidcIssuerUrl()}/protocol/openid-connect/logout?client_id=${clientId}&id_token_hint={id_token}&post_logout_redirect_uri=${redirect}`
}

export function oauth2SignOutUrl(postLogoutRedirectUri?: string): string {
  const o = oauth2ProxyOrigin().replace(/\/$/, '')
  const uiBase = postLogoutRedirectUri ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return `${o}/oauth2/sign_out?rd=${encodeURIComponent(keycloakEndSessionUrl(uiBase))}&_=${Date.now()}`
}

let oauthLoginRedirectStarted = false

/**
 * Navigate to oauth2-proxy login. Skips if already on `/oauth2/*` so a missing
 * proxy (SPA fallback) cannot nest `rd=` until the URL is 414 Request-URI Too Large.
 */
export function redirectToOAuth2Login(returnTo?: string): boolean {
  if (typeof window === 'undefined') return false
  if (isLocalOauthBypass()) return false
  if (window.location.pathname.startsWith('/oauth2')) return false
  if (oauthLoginRedirectStarted) return true
  oauthLoginRedirectStarted = true
  window.location.replace(oauth2SignInUrl(returnTo))
  return true
}

export function redirectToOAuth2Logout(postLogoutRedirectUri?: string): boolean {
  if (typeof window === 'undefined') return false
  if (isLocalOauthBypass()) return false
  window.location.replace(oauth2SignOutUrl(postLogoutRedirectUri))
  return true
}

export function oauth2UserinfoUrl(): string {
  const o = oauth2ProxyOrigin().replace(/\/$/, '')
  return `${o}/oauth2/userinfo`
}

/** oauth2-proxy auth-only endpoint; response may include X-Auth-Request-Access-Token. */
export function oauth2AuthUrl(): string {
  const o = oauth2ProxyOrigin().replace(/\/$/, '')
  return `${o}/oauth2/auth`
}

/**
 * Same-origin whoami: nginx proxies the Bearer token to Keycloak userinfo.
 * That response includes given_name / family_name / phone_number (unlike /oauth2/userinfo).
 */
export function profileWhoamiUrl(): string {
  return '/api/whoami'
}

/** Public Keycloak userinfo (used when we already have an access token in the browser). */
export function keycloakUserinfoUrl(): string {
  return `${oidcIssuerUrl()}/protocol/openid-connect/userinfo`
}
