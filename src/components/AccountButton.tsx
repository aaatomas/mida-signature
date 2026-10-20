import { useCallback, useState } from 'react'
import {
  Avatar,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PersonIcon from '@mui/icons-material/Person'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import { isLocalOauthBypass, oauth2SignInUrl, oidcAccountUrl, redirectToOAuth2Login } from '../api/config'
import { DEV_LOGOUT_KEY, useSession } from '../context/SessionContext'
import { LANGUAGE_NAMES, LOCALES, useLocale } from '../locale'
import { useThemeMode, type ThemeChoice } from '../themeMode'

const THEME_CHOICES: { id: ThemeChoice; label: 'themeSystem' | 'themeLight' | 'themeDark' }[] = [
  { id: 'system', label: 'themeSystem' },
  { id: 'light', label: 'themeLight' },
  { id: 'dark', label: 'themeDark' },
]

export default function AccountButton() {
  const { session, logout, refreshSession } = useSession()
  const { t, locale, setLocale } = useLocale()
  const { mode, setMode } = useThemeMode()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => setAnchorEl(null)

  const handleSignOut = () => {
    handleMenuClose()
    void logout()
  }

  const handleSignIn = () => {
    handleMenuClose()
    if (isLocalOauthBypass()) {
      void refreshSession()
      return
    }
    if (!redirectToOAuth2Login('/')) {
      window.location.href = oauth2SignInUrl('/')
    }
  }

  const handleOpenAccount = () => {
    handleMenuClose()
    window.location.href = oidcAccountUrl(window.location.origin)
  }

  const handleDevLogin = () => {
    void refreshSession()
    setAnchorEl(null)
  }

  const firstName = session?.user?.firstName?.trim() || ''
  const lastName = session?.user?.lastName?.trim() || ''
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') ||
    session?.user?.name ||
    session?.user?.email?.split('@')[0] ||
    ''
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : ''

  const hasUser = Boolean(session?.user?.authenticated)
  const avatarSize = 36

  const showDevLogin =
    import.meta.env.DEV &&
    !hasUser &&
    typeof localStorage !== 'undefined' &&
    localStorage.getItem(DEV_LOGOUT_KEY)

  const handleImageError = useCallback(() => {
    console.warn('[AccountButton] User picture failed to load')
  }, [])

  return (
    <>
      <IconButton color="inherit" onClick={handleMenuOpen} aria-label={t('accountMenu')}>
        {hasUser ? (
          <Avatar
            variant="rounded"
            alt={displayName}
            src={session?.user?.image ?? undefined}
            sx={{
              width: avatarSize,
              height: avatarSize,
              bgcolor: 'grey.600',
              fontSize: '1rem',
            }}
            slotProps={{
              img: { onError: handleImageError },
            }}
          >
            {initials || '?'}
          </Avatar>
        ) : (
          <PersonIcon />
        )}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 240 } } }}
      >
        {hasUser && (
          <MenuItem onClick={handleOpenAccount} sx={{ py: 1.5 }}>
            <Avatar variant="rounded" sx={{ width: 32, height: 32, mr: 1.5, bgcolor: 'grey.600' }}>
              {initials || '?'}
            </Avatar>
            <ListItemText
              primary={displayName || session?.user?.email}
              secondary={session?.user?.email && displayName ? session.user.email : undefined}
            />
            <OpenInNewIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
          </MenuItem>
        )}
        {hasUser && <Divider />}
        <ListSubheader>{t('theme')}</ListSubheader>
        {THEME_CHOICES.map((choice) => (
          <MenuItem
            key={choice.id}
            selected={mode === choice.id}
            onClick={() => {
              setMode(choice.id)
              handleMenuClose()
            }}
          >
            <ListItemIcon>{themeIcon(choice.id)}</ListItemIcon>
            <ListItemText primary={t(choice.label)} />
            {mode === choice.id && <CheckIcon fontSize="small" />}
          </MenuItem>
        ))}
        <Divider />
        <ListSubheader>{t('language')}</ListSubheader>
        {LOCALES.map((code) => (
          <MenuItem
            key={code}
            selected={locale === code}
            onClick={() => {
              setLocale(code)
              handleMenuClose()
            }}
          >
            <ListItemText primary={LANGUAGE_NAMES[code]} inset />
            {locale === code && <CheckIcon fontSize="small" />}
          </MenuItem>
        ))}
        <Divider />
        {showDevLogin && (
          <MenuItem onClick={handleDevLogin}>
            <ListItemIcon>
              <LoginIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('loginDev')} />
          </MenuItem>
        )}
        {hasUser ? (
          <MenuItem onClick={handleSignOut}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('signOut')} />
          </MenuItem>
        ) : (
          <MenuItem onClick={handleSignIn}>
            <ListItemIcon>
              <LoginIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('signIn')} />
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

function themeIcon(choice: ThemeChoice) {
  if (choice === 'light') return <LightModeOutlinedIcon fontSize="small" />
  if (choice === 'dark') return <DarkModeOutlinedIcon fontSize="small" />
  return <SettingsBrightnessIcon fontSize="small" />
}
