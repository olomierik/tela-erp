import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "TELA-ERP"

interface ContactFormNotificationProps {
  name?: string
  email?: string
  company?: string
  message?: string
}

const ContactFormNotificationEmail = ({ name, email, company, message }: ContactFormNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New contact form submission from {name || 'a visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>📩 New Contact Form Message</Heading>
        </Section>
        <Hr style={hr} />
        <Section style={detailsSection}>
          <Text style={label}>From</Text>
          <Text style={value}>{name || 'Not provided'}</Text>

          <Text style={label}>Email</Text>
          <Text style={value}>{email || 'Not provided'}</Text>

          {company && (
            <>
              <Text style={label}>Company</Text>
              <Text style={value}>{company}</Text>
            </>
          )}

          <Text style={label}>Message</Text>
          <Text style={messageText}>{message || 'No message provided'}</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          This message was sent via the {SITE_NAME} contact form.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactFormNotificationEmail,
  subject: (data: Record<string, any>) => `New enquiry from ${data?.name || 'a visitor'} — ${SITE_NAME}`,
  displayName: 'Contact form notification',
  to: 'olomierik@gmail.com',
  previewData: { name: 'Jane Doe', email: 'jane@example.com', company: 'Acme Corp', message: 'I would like to learn more about TELA-ERP for my business.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { padding: '0 0 10px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1f36', margin: '0 0 5px' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const detailsSection = { padding: '0' }
const label = { fontSize: '11px', fontWeight: '600' as const, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 2px' }
const value = { fontSize: '15px', color: '#1a1f36', margin: '0 0 16px', lineHeight: '1.4' }
const messageText = { fontSize: '15px', color: '#1a1f36', margin: '0 0 16px', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const, backgroundColor: '#f9fafb', padding: '12px 16px', borderRadius: '8px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0' }
