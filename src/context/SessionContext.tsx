/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  isLocalOauthBypass,
  keycloakUserinfoUrl,
  oauth2AuthUrl,
  oauth2UserinfoUrl,
  profileWhoamiUrl,
  redirectToOAuth2Logout,
} from '../api/config'

export const FALLBACK_USER = {
  name: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  jobTitle: '',
  image: null as string | null,
  authenticated: false,
  groups: [] as string[],
}

export type SessionUser = {
  name: string
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  image: string | null
  authenticated: boolean
  groups: string[]
}

export type Session = { user: SessionUser }

export const DEV_LOGOUT_KEY = 'dev_logged_out'

type Oauth2Userinfo = {
  user?: string
  email?: string
  name?: string
  given_name?: string
  givenName?: string
  family_name?: string
  familyName?: string
  preferredUsername?: string
  preferred_username?: string
  picture?: string
  phone_number?: string
  phone?: string
  mobile?: string
  telephoneNumber?: string
  title?: string
  job_title?: string
  jobTitle?: string
  groups?: string[] | string
  roles?: string[] | string
  additionalClaims?: {
    name?: string
    given_name?: string
    givenName?: string
    family_name?: string
    familyName?: string
    phone_number?: string
    phone?: string
    mobile?: string
    title?: string
    job_title?: string
    jobTitle?: string
  }
}

function claim(
  raw: Oauth2Userinfo,
  ...keys: Array<keyof Oauth2Userinfo | keyof NonNullable<Oauth2Userinfo['additionalClaims']>>
): string {
  const extra = raw.additionalClaims
  for (const key of keys) {
    const top = raw[key as keyof Oauth2Userinfo]
    if (typeof top === 'string' && top.trim()) return top.trim()
    const nested = extra?.[key as keyof NonNullable<Oauth2Userinfo['additionalClaims']>]
    if (typeof nested === 'string' && nested.trim()) return nested.trim()
  }
  return ''
}

function splitGivenFamily(full: string): { given: string; family: string } {
  const parts = full.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return { given: parts[0] ?? '', family: '' }
  return { given: parts[0], family: parts.slice(1).join(' ') }
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,;\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function mapUserinfo(raw: Oauth2Userinfo): SessionUser {
  const email = raw.email?.trim() ?? ''
  let given = claim(raw, 'given_name', 'givenName')
  let family = claim(raw, 'family_name', 'familyName')
  const name =
    claim(raw, 'name') ||
    [given, family].filter(Boolean).join(' ') ||
    claim(raw, 'preferredUsername', 'preferred_username', 'user') ||
    (email ? email.split('@')[0] : '')
  if (!given && !family && /\s/.test(name)) {
    const split = splitGivenFamily(name)
    given = split.given
    family = split.family
  }
  const phone = claim(raw, 'phone_number', 'phone', 'mobile', 'telephoneNumber')
  const jobTitle = claim(raw, 'title', 'job_title', 'jobTitle')
  const groups = asStringList(raw.groups).concat(asStringList(raw.roles))
  return {
    name,
    firstName: given,
    lastName: family,
    email,
    phone,
    jobTitle,
    image: raw.picture?.trim() || null,
    authenticated: Boolean(name || email),
    groups,
  }
}

function mergeProfile(base: SessionUser, extra: SessionUser): SessionUser {
  const firstName = extra.firstName || base.firstName
  const lastName = extra.lastName || base.lastName
  const name =
    [firstName, lastName].filter(Boolean).join(' ') ||
    extra.name ||
    base.name
  return {
    ...base,
    name,
    firstName,
    lastName,
    email: base.email || extra.email,
    phone: extra.phone || base.phone,
    jobTitle: extra.jobTitle || base.jobTitle,
    image: base.image || extra.image,
    authenticated: Boolean(name || base.email || extra.email || base.authenticated),
  }
}

async function readAccessTokenFromOauth2Auth(): Promise<string> {
  try {
    const response = await fetch(oauth2AuthUrl(), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      redirect: 'manual',
    })
    if (!(response.status === 202 || response.ok)) return ''
    return (
      response.headers.get('X-Auth-Request-Access-Token') ||
      response.headers.get('x-auth-request-access-token') ||
      ''
    ).trim()
  } catch {
    return ''
  }
}

async function fetchJsonProfile(url: string, headers?: HeadersInit): Promise<Oauth2Userinfo | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers,
    })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('json')) return null
    return (await response.json()) as Oauth2Userinfo
  } catch {
    return null
  }
}

/**
 * /oauth2/userinfo lacks given_name / family_name / phone.
 * Prefer Keycloak userinfo via access token (from /oauth2/auth or upstream /api/whoami).
 */
async function enrichFromKeycloakProfile(user: SessionUser): Promise<SessionUser> {
  const token = await readAccessTokenFromOauth2Auth()

  let data: Oauth2Userinfo | null = null
  if (token) {
    data =
      (await fetchJsonProfile(profileWhoamiUrl(), { Authorization: `Bearer ${token}` })) ||
      (await fetchJsonProfile(keycloakUserinfoUrl(), { Authorization: `Bearer ${token}` }))
  }
  if (!data) {
    // Fallback: nginx maps X-Forwarded-Access-Token from oauth2-proxy → Keycloak.
    data = await fetchJsonProfile(profileWhoamiUrl())
  }
  if (!data) return user
  if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
    console.info('[signature] keycloak userinfo keys', Object.keys(data), {
      given_name: data.given_name,
      family_name: data.family_name,
      phone_number: data.phone_number,
      name: data.name,
      email: data.email,
    })
  }
  return mergeProfile(user, mapUserinfo(data))
}

type SessionContextValue = {
  session: Session | null
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)

  const logout = useCallback(async () => {
    if (import.meta.env.DEV) {
      localStorage.setItem(DEV_LOGOUT_KEY, '1')
    }
    setSession({ user: { ...FALLBACK_USER } })
    if (!redirectToOAuth2Logout()) {
      // Local bypass: stay on page as signed out
    }
  }, [])

  const loadUserinfo = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(oauth2UserinfoUrl(), {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        redirect: 'manual',
      })
      if (response.status === 401 || response.type === 'opaqueredirect') {
        return false
      }
      if (!response.ok) return false
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('json')) return false
      const data = (await response.json()) as Oauth2Userinfo
      const user = await enrichFromKeycloakProfile(mapUserinfo(data))
      if (user.authenticated) {
        setSession({ user })
        return true
      }
    } catch (error) {
      console.error('Error fetching oauth2 userinfo:', error)
    }
    return false
  }, [])

  const refreshSession = useCallback(async () => {
    localStorage.removeItem(DEV_LOGOUT_KEY)
    if (await loadUserinfo()) return
    if (isLocalOauthBypass()) {
      setSession({
        user: {
          name: 'Dev User',
          firstName: 'Dev',
          lastName: 'User',
          email: 'dev@mida.lt',
          phone: '+370 ',
          jobTitle: '',
          image: null,
          authenticated: true,
          groups: [],
        },
      })
      return
    }
    setSession({ user: { ...FALLBACK_USER } })
  }, [loadUserinfo])

  useEffect(() => {
    const boot = async () => {
      if (isLocalOauthBypass() && localStorage.getItem(DEV_LOGOUT_KEY)) {
        setSession({ user: { ...FALLBACK_USER } })
        return
      }
      if (await loadUserinfo()) return
      if (isLocalOauthBypass()) {
        setSession({
          user: {
            name: 'Dev User',
            firstName: 'Dev',
            lastName: 'User',
            email: 'dev@mida.lt',
            phone: '+370 ',
            jobTitle: '',
            image: null,
            authenticated: true,
            groups: [],
          },
        })
        return
      }
      // Do not auto-redirect when the proxy is missing — sign-in is via AccountButton.
      setSession({ user: { ...FALLBACK_USER } })
    }
    void boot()
  }, [loadUserinfo])

  const value = useMemo(
    () => ({ session, logout, refreshSession }),
    [session, logout, refreshSession],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
