import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Collapse,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { SessionUser } from '../context/SessionContext'
import { useLocale } from '../locale'
import {
  buildSignatureHtml,
  copyHtmlToClipboard,
  emptyBanner,
  fileToBannerDataUrl,
  type BannerState,
  type SignatureFields,
} from '../signature'

type Props = {
  user: SessionUser
}

function fieldsFromUser(user: SessionUser): SignatureFields {
  return {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    jobTitle: user.jobTitle || '',
    phone: user.phone?.trim() ? user.phone : '+370 ',
    email: user.email || '',
  }
}

export default function SignatureForm({ user }: Props) {
  const { t, locale } = useLocale()
  const [fields, setFields] = useState<SignatureFields>(() => fieldsFromUser(user))
  const [banner, setBanner] = useState<BannerState>(emptyBanner)
  const [bannerOpen, setBannerOpen] = useState(false)
  const [bannerFileName, setBannerFileName] = useState('')
  const [done, setDone] = useState(false)
  const [sigHtml, setSigHtml] = useState('')
  const [clipFlash, setClipFlash] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fill empty fields as profile claims arrive (oauth2 userinfo first, then Keycloak whoami).
  // Do not overwrite values the user already typed.
  useEffect(() => {
    setFields((prev) => {
      const phoneFromUser = user.phone?.trim() || ''
      const next: SignatureFields = {
        firstName: prev.firstName.trim() ? prev.firstName : user.firstName || '',
        lastName: prev.lastName.trim() ? prev.lastName : user.lastName || '',
        jobTitle: prev.jobTitle.trim() ? prev.jobTitle : user.jobTitle || '',
        phone:
          prev.phone.trim() && prev.phone.trim() !== '+370'
            ? prev.phone
            : phoneFromUser || '+370 ',
        email: prev.email.trim() ? prev.email : user.email || '',
      }
      if (
        next.firstName === prev.firstName &&
        next.lastName === prev.lastName &&
        next.jobTitle === prev.jobTitle &&
        next.phone === prev.phone &&
        next.email === prev.email
      ) {
        return prev
      }
      return next
    })
  }, [user])

  useEffect(() => {
    if (!done) return
    setSigHtml(buildSignatureHtml(fields, t('sigGreeting'), banner))
  }, [locale, done, fields, banner, t])

  const setField = (key: keyof SignatureFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const clearBanner = () => {
    setBanner((prev) => ({ ...prev, fileDataUrl: '', fileWidth: 480, url: '' }))
    setBannerFileName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onFileChange = async (file: File | undefined) => {
    if (!file) return
    try {
      const { dataUrl, width } = await fileToBannerDataUrl(file)
      setBanner((prev) => ({ ...prev, fileDataUrl: dataUrl, fileWidth: width, url: '' }))
      setBannerFileName(file.name)
    } catch {
      clearBanner()
      alert(t('bannerFileError'))
    }
  }

  const create = async () => {
    const { firstName, lastName, jobTitle, phone, email } = fields
    if (!firstName.trim() || !lastName.trim() || !jobTitle.trim() || !phone.trim() || !email.trim()) {
      alert(t('fillAllFields'))
      return
    }
    const html = buildSignatureHtml(fields, t('sigGreeting'), banner)
    setSigHtml(html)
    const ok = await copyHtmlToClipboard(html)
    if (!ok) alert(t('copyFailed'))
    setDone(true)
  }

  const copyAgain = async () => {
    if (!sigHtml) return
    const ok = await copyHtmlToClipboard(sigHtml)
    if (!ok) {
      alert(t('copyFailed'))
      return
    }
    setClipFlash(true)
    window.setTimeout(() => setClipFlash(false), 3000)
  }

  const reset = () => {
    setDone(false)
    setSigHtml('')
    setFields(fieldsFromUser(user))
    setBanner(emptyBanner())
    setBannerFileName('')
    setBannerOpen(false)
    setClipFlash(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const thumbSrc = banner.url.trim() || banner.fileDataUrl

  if (done) {
    return (
      <Stack spacing={2}>
        <Alert icon={<CheckCircleOutlineIcon fontSize="inherit" />} severity="success">
          {t('successBar')}
        </Alert>

        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              px: 1.5,
              py: 0.75,
              bgcolor: 'action.hover',
              borderBottom: 1,
              borderColor: 'divider',
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {t('previewLabel')}
          </Typography>
          <Box
            className="sig-preview"
            sx={{ p: 1, bgcolor: 'background.paper' }}
            dangerouslySetInnerHTML={{ __html: sigHtml }}
          />
        </Box>

        <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={() => void copyAgain()}>
          {t('copyAgainBtn')}
        </Button>
        {clipFlash && (
          <Alert severity="success" sx={{ py: 0.5 }}>
            {t('clipMsg')}
          </Alert>
        )}

        <Typography variant="subtitle1" sx={{ fontWeight: 600, pt: 1 }}>
          {t('instrTitle')}
        </Typography>
        {[t('step1'), t('step2'), t('step3'), t('step4'), t('step5')].map((text, i) => (
          <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mt: 0.25,
              }}
            >
              {i + 1}
            </Box>
            <Typography variant="body2">{text}</Typography>
          </Stack>
        ))}

        <Button variant="outlined" onClick={reset} sx={{ alignSelf: 'center', mt: 1 }}>
          {t('backBtn')}
        </Button>
      </Stack>
    )
  }

  return (
    <Stack spacing={2}>
      <TextField
        label={t('firstName')}
        value={fields.firstName}
        onChange={(e) => setField('firstName', e.target.value)}
        autoComplete="given-name"
        fullWidth
        size="small"
      />
      <TextField
        label={t('lastName')}
        value={fields.lastName}
        onChange={(e) => setField('lastName', e.target.value)}
        autoComplete="family-name"
        fullWidth
        size="small"
      />
      <TextField
        label={t('jobTitle')}
        value={fields.jobTitle}
        onChange={(e) => setField('jobTitle', e.target.value)}
        fullWidth
        size="small"
      />
      <TextField
        label={t('phone')}
        value={fields.phone}
        onChange={(e) => setField('phone', e.target.value)}
        autoComplete="tel"
        fullWidth
        size="small"
      />
      <TextField
        label={t('email')}
        value={fields.email}
        onChange={(e) => setField('email', e.target.value)}
        autoComplete="email"
        fullWidth
        size="small"
      />

      <Box>
        <Button
          onClick={() => setBannerOpen((o) => !o)}
          endIcon={
            <ExpandMoreIcon
              sx={{
                transform: bannerOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s',
              }}
            />
          }
          sx={{ px: 0, justifyContent: 'flex-start' }}
        >
          {t('bannerSection')}
        </Button>
        <Collapse in={bannerOpen}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label={t('banner')}
              placeholder={t('bannerUrlPlaceholder')}
              value={banner.url}
              onChange={(e) => {
                const url = e.target.value
                setBanner((prev) => ({
                  ...prev,
                  url,
                  fileDataUrl: url.trim() ? '' : prev.fileDataUrl,
                  fileWidth: url.trim() ? 480 : prev.fileWidth,
                }))
                if (url.trim()) {
                  setBannerFileName('')
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }
              }}
              fullWidth
              size="small"
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="outlined" size="small" component="label">
                {t('bannerChooseFile')}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => void onFileChange(e.target.files?.[0])}
                />
              </Button>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
                {bannerFileName}
              </Typography>
              {(banner.fileDataUrl || banner.url.trim()) && (
                <IconButton size="small" aria-label={t('bannerClear')} onClick={clearBanner}>
                  ×
                </IconButton>
              )}
            </Stack>
            {thumbSrc && (
              <Box
                component="img"
                src={thumbSrc}
                alt=""
                sx={{ maxWidth: 1, maxHeight: 88, border: 1, borderColor: 'divider', borderRadius: 1 }}
              />
            )}
            <TextField
              label={t('bannerLink')}
              placeholder={t('bannerLinkPlaceholder')}
              value={banner.link}
              onChange={(e) => setBanner((prev) => ({ ...prev, link: e.target.value }))}
              fullWidth
              size="small"
            />
          </Stack>
        </Collapse>
      </Box>

      <Button variant="contained" size="large" onClick={() => void create()}>
        {t('createBtn')}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
        {t('formNote')}
      </Typography>
    </Stack>
  )
}
