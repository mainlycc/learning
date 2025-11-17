import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Link,
} from '@react-email/components'

interface InviteEmailProps {
  inviteUrl: string
  fullName?: string
  role: 'user' | 'admin' | 'super_admin'
  inviterName?: string
}

export function InviteEmail({
  inviteUrl,
  fullName,
  role,
  inviterName,
}: InviteEmailProps) {
  const roleLabel = {
    user: 'Użytkownik',
    admin: 'Administrator',
    super_admin: 'Super Administrator',
  }[role]

  return (
    <Html lang="pl">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={title}>AIRSET - Ochrona Lotnictwa Cywilnego</Text>
          </Section>

          <Section style={content}>
            {fullName ? (
              <Text style={text}>Witaj {fullName}!</Text>
            ) : (
              <Text style={text}>Witaj!</Text>
            )}

            <Text style={text}>
              {inviterName
                ? `${inviterName} zaprosił Cię do platformy szkoleniowej AIRSET.`
                : 'Zostałeś zaproszony do platformy szkoleniowej AIRSET.'}
            </Text>

            <Text style={text}>
              Twoja rola w systemie: <strong>{roleLabel}</strong>
            </Text>

            <Text style={text}>
              Aby rozpocząć korzystanie z platformy, kliknij poniższy przycisk i
              ustaw swoje hasło:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={inviteUrl}>
                Akceptuj zaproszenie
              </Button>
            </Section>

            <Text style={smallText}>
              Lub skopiuj i wklej poniższy link do przeglądarki:
            </Text>
            <Text style={linkText}>{inviteUrl}</Text>

            <Hr style={hr} />

            <Text style={footer}>
              Jeśli nie spodziewałeś się tego zaproszenia, możesz zignorować tę
              wiadomość.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  padding: '32px 24px',
  backgroundColor: '#1e293b',
  borderRadius: '8px 8px 0 0',
}

const title = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0',
}

const content = {
  padding: '24px',
}

const text = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const smallText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '24px 0 8px',
}

const linkText = {
  color: '#3b82f6',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
  margin: '0 0 24px',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '24px 0',
}

const footer = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
}

