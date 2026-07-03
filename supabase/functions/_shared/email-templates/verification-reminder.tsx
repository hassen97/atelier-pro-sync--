/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface VerificationReminderProps {
  recipientName: string
  verifyUrl: string
  unsubscribeUrl: string
  hoursLeft: number | null
}

export const VerificationReminderEmail = ({
  recipientName,
  verifyUrl,
  unsubscribeUrl,
  hoursLeft,
}: VerificationReminderProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Vérifiez votre compte RepairPro avant qu'il ne soit suspendu</Preview>
    <Body style={main}>
      <Container style={card}>
        <Text style={logo}>RepairPro</Text>
        <Hr style={hr} />
        <Heading style={h1}>⏰ Vérifiez votre compte</Heading>
        <Text style={text}>
          Bonjour {recipientName || 'cher utilisateur'},
        </Text>
        <Text style={text}>
          Votre inscription sur <b>RepairPro</b> est presque terminée, mais
          il vous reste une étape critique : <b>la vérification de votre identité</b>.
        </Text>
        {hoursLeft !== null && hoursLeft > 0 && (
          <Text style={alert}>
            ⚠️ Il vous reste environ <b>{Math.max(1, Math.round(hoursLeft))}h</b> pour
            valider votre compte avant qu'il ne soit automatiquement suspendu.
          </Text>
        )}
        <Text style={text}>
          La vérification prend moins de <b>2 minutes</b> et garantit la
          sécurité de la plateforme pour vous et vos clients.
        </Text>
        <Text style={list}>
          ✅ Confirmez votre nom et le nom de votre boutique<br />
          ✅ Renseignez votre adresse et votre téléphone<br />
          ✅ Débloquez l'accès complet à RepairPro
        </Text>
        <Button href={verifyUrl} style={button}>
          Vérifier mon compte maintenant
        </Button>
        <Text style={textSmall}>
          Ou copiez ce lien dans votre navigateur :<br />
          <Link href={verifyUrl} style={link}>{verifyUrl}</Link>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Vous recevez cet email car votre compte RepairPro est en attente
          de vérification. <Link href={unsubscribeUrl} style={linkMuted}>Se désabonner</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default VerificationReminderEmail

const main = {
  backgroundColor: '#0b1120',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  padding: '40px 0',
}
const card = {
  backgroundColor: '#101827',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '32px',
  margin: '0 auto',
  maxWidth: '560px',
}
const logo = {
  color: '#00D4FF',
  fontSize: '22px',
  fontWeight: 700 as const,
  margin: '0 0 8px',
  letterSpacing: '-0.5px',
}
const hr = { borderColor: 'rgba(255,255,255,0.08)', margin: '20px 0' }
const h1 = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 600 as const,
  margin: '0 0 16px',
  lineHeight: '1.3',
}
const text = {
  color: '#cbd5e1',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const alert = {
  color: '#fbbf24',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
  padding: '12px 14px',
  borderRadius: '8px',
  backgroundColor: 'rgba(251,191,36,0.08)',
  border: '1px solid rgba(251,191,36,0.25)',
}
const list = {
  color: '#cbd5e1',
  fontSize: '15px',
  lineHeight: '2',
  margin: '0 0 24px',
  paddingLeft: '8px',
}
const button = {
  backgroundColor: '#00D4FF',
  color: '#0b1120',
  borderRadius: '8px',
  padding: '14px 24px',
  fontSize: '15px',
  fontWeight: 600 as const,
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 24px',
}
const textSmall = {
  color: '#94a3b8',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0 0 16px',
}
const link = { color: '#00D4FF', textDecoration: 'underline', wordBreak: 'break-all' as const }
const linkMuted = { color: '#94a3b8', textDecoration: 'underline' }
const footer = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
}
