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

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification</Preview>
    <Body style={main}>
      <Container style={card}>
        <Text style={logo}>RepairPro</Text>
        <Hr style={hr} />
        <Heading style={h1}>Confirmez votre identité</Heading>
        <Text style={text}>Utilisez le code ci-dessous pour confirmer votre identité :</Text>
        <Text style={codeStyle}>{token}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Ce code expirera sous peu. Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email en toute sécurité.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: 'hsl(210, 20%, 98%)',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  padding: '40px 0',
}
const card = {
  backgroundColor: '#ffffff',
  border: '1px solid hsl(214, 32%, 91%)',
  borderRadius: '0.625rem',
  padding: '32px 28px',
  maxWidth: '480px',
  margin: '0 auto',
}
const logo = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: 'hsl(217, 91%, 40%)',
  margin: '0 0 16px',
}
const hr = { borderColor: 'hsl(214, 32%, 91%)', margin: '20px 0' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 15%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215, 16%, 47%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(217, 91%, 40%)',
  letterSpacing: '4px',
  margin: '0 0 24px',
}
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 47%)', margin: '0' }
