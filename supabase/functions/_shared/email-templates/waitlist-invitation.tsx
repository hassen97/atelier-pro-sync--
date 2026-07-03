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

interface WaitlistInvitationProps {
  signupUrl: string
  unsubscribeUrl: string
}

export const WaitlistInvitationEmail = ({
  signupUrl,
  unsubscribeUrl,
}: WaitlistInvitationProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre place est confirmée — 3 jours d'essai Pro offerts 🎁</Preview>
    <Body style={main}>
      <Container style={card}>
        <Text style={logo}>RepairPro</Text>
        <Hr style={hr} />
        <Heading style={h1}>🎉 Votre place est confirmée !</Heading>
        <Text style={text}>
          Bonne nouvelle : <b>RepairPro est officiellement lancé</b> et
          votre place sur la liste d'attente est confirmée.
        </Text>

        <div style={giftBox}>
          <Text style={giftTitle}>🎁 Cadeau de bienvenue</Text>
          <Text style={giftAmount}>3 jours d'essai du plan Pro</Text>
          <Text style={giftSubtitle}>
            Activé automatiquement à la création de votre compte —
            aucune carte bancaire requise.
          </Text>
        </div>

        <Text style={text}>
          Pourquoi vous allez adorer RepairPro :
        </Text>
        <Text style={list}>
          ✅ Gestion complète de vos réparations (suivi client, historique)<br />
          ✅ Inventaire et point de vente intégrés<br />
          ✅ Facturation, dépenses et statistiques en temps réel<br />
          ✅ Page de suivi publique pour vos clients
        </Text>

        <Button href={signupUrl} style={button}>
          Créer mon compte maintenant
        </Button>

        <Text style={textSmall}>
          Ou copiez ce lien dans votre navigateur :<br />
          <Link href={signupUrl} style={link}>{signupUrl}</Link>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Vous recevez cet email car vous vous êtes inscrit sur la liste
          d'attente de RepairPro. <Link href={unsubscribeUrl} style={linkMuted}>Se désabonner</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WaitlistInvitationEmail

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
  fontSize: '24px',
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
const giftBox = {
  background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(168,85,247,0.12))',
  border: '1px solid rgba(0,212,255,0.3)',
  borderRadius: '12px',
  padding: '20px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}
const giftTitle = {
  color: '#94a3b8',
  fontSize: '13px',
  fontWeight: 600 as const,
  margin: '0 0 6px',
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
}
const giftAmount = {
  color: '#00D4FF',
  fontSize: '22px',
  fontWeight: 700 as const,
  margin: '0 0 8px',
}
const giftSubtitle = {
  color: '#94a3b8',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0',
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
  padding: '14px 28px',
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
