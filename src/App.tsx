import {
  AppBar,
  Box,
  CircularProgress,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material'
import AccountButton from './components/AccountButton'
import SignatureForm from './components/SignatureForm'
import { useSession } from './context/SessionContext'
import { useLocale } from './locale'

export default function App() {
  const { t } = useLocale()
  const { session } = useSession()
  const user = session?.user
  const loading = session === null

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.appBar }}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              flex: 1,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {t('appTitle')}
          </Typography>
          <AccountButton />
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          p: 3,
        }}
      >
        <Toolbar />

        {loading ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : !user?.authenticated ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="h5">{t('signInRequired')}</Typography>
            <Typography color="text.secondary">{t('signInHint')}</Typography>
          </Box>
        ) : (
          <Paper
            elevation={0}
            sx={{
              maxWidth: 520,
              width: '100%',
              mx: 'auto',
              p: { xs: 2, sm: 3 },
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <SignatureForm user={user} />
          </Paper>
        )}
      </Box>
    </Box>
  )
}
