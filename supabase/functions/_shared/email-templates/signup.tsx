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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre email pour {siteName}</Preview>
    <Body style={main}>
      <Container style={card}>
        <Text style={logo}>RepairPro</Text>
        <Hr style={hr} />
        <Heading style={h1}>Confirmez votre email</Heading>
        <Text style={text}>
          Merci de vous être inscrit sur{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          {' '}!
        </Text>
        <Text style={text}>
          Veuillez confirmer votre adresse email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) en cliquant sur le bouton ci-dessous :
        </Text>
        <Button style={button} href={confirmationUrl}>
          Vérifier mon email
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          Si vous n'avez pas créé de compte, vous pouvez ignorer cet email en toute sécurité.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: 'hsl(217, 91%, 40%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(217, 91%, 40%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '0.625rem',
  padding: '13px 24px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 47%)', margin: '0' }
