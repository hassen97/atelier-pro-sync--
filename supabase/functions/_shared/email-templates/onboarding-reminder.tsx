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

interface OnboardingReminderProps {
  recipientName: string
  setupUrl: string
  unsubscribeUrl: string
}

export const OnboardingReminderEmail = ({
  recipientName,
  setupUrl,
  unsubscribeUrl,
}: OnboardingReminderProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Terminez la configuration de votre boutique RepairPro</Preview>
    <Body style={main}>
      <Container style={card}>
        <Text style={logo}>RepairPro</Text>
        <Hr style={hr} />
        <Heading style={h1}>Votre boutique est presque prête 🚀</Heading>
        <Text style={text}>
          Bonjour {recipientName || 'cher utilisateur'},
        </Text>
        <Text style={text}>
          Votre compte RepairPro est <b>actif</b>, mais votre atelier
          n'est pas encore configuré. Sans configuration, vos clients
          verront une page de suivi sans logo, sans adresse et sans
          contact — ce qui nuit à votre image professionnelle.
        </Text>
        <Text style={text}>
          Il vous reste seulement <b>2 minutes</b> pour ajouter :
        </Text>
        <Text style={list}>
          ✅ Le nom et le logo de votre boutique<br />
          ✅ Vos numéros de téléphone et WhatsApp<br />
          ✅ Votre adresse et vos horaires d'ouverture
        </Text>
        <Button href={setupUrl} style={button}>
          Compléter ma boutique maintenant
        </Button>
        <Text style={textSmall}>
          Ou copiez ce lien dans votre navigateur :<br />
          <Link href={setupUrl} style={link}>{setupUrl}</Link>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Vous recevez cet email car votre compte RepairPro n'est pas
          encore configuré. <Link href={unsubscribeUrl} style={linkMuted}>Se désabonner</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default OnboardingReminderEmail

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
