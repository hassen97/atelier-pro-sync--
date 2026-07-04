/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SubscriptionBonusProps {
  shopName?: string
  months: number
  newExpiryLabel?: string | null
  customMessage?: string
}

export const SubscriptionBonusEmail = ({
  shopName,
  months,
  newExpiryLabel,
  customMessage,
}: SubscriptionBonusProps) => {
  const isRemoval = months < 0
  const abs = Math.abs(months)
  const monthLabel = `${abs} mois`

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        {isRemoval
          ? 'Mise à jour de votre abonnement RepairPro'
          : `🎁 ${monthLabel} offert(s) sur votre abonnement RepairPro`}
      </Preview>
      <Body style={main}>
        <Container style={card}>
          <Text style={logo}>RepairPro</Text>
          <Hr style={hr} />
          <Heading style={h1}>
            {isRemoval ? 'Votre abonnement a été mis à jour' : '🎁 Bonus d\'abonnement offert !'}
          </Heading>

          <Text style={text}>
            {shopName ? <>Bonjour <b>{shopName}</b>, </> : 'Bonjour, '}
            {isRemoval
              ? `la durée de votre abonnement a été ajustée de ${monthLabel}.`
              : `bonne nouvelle — notre équipe vous offre ${monthLabel} sur votre abonnement !`}
          </Text>

          {!isRemoval && (
            <div style={giftBox}>
              <Text style={giftTitle}>Cadeau</Text>
              <Text style={giftAmount}>+{monthLabel} offert(s)</Text>
              {newExpiryLabel && (
                <Text style={giftSubtitle}>
                  Votre abonnement est désormais valable jusqu'au {newExpiryLabel}.
                </Text>
              )}
            </div>
          )}

          {isRemoval && newExpiryLabel && (
            <Text style={text}>
              Votre abonnement est désormais valable jusqu'au <b>{newExpiryLabel}</b>.
            </Text>
          )}

          {customMessage && <Text style={text}>{customMessage}</Text>}

          <Text style={text}>
            Merci de votre confiance et bonne continuation avec RepairPro.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Cet email vous a été envoyé par l'équipe RepairPro concernant votre abonnement.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SubscriptionBonusEmail

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
const footer = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
}
