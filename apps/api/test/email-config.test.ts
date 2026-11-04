import { describe, expect, it } from 'vitest';
import { EmailConfigurationError, getSmtpConfig } from '../src/lib/emailConfig';

describe('SMTP configuration', () => {
  it('reports absent SMTP settings without constructing a transport', () => {
    expect(getSmtpConfig({})).toBeNull();
  });

  it('names missing required settings when SMTP is partially configured', () => {
    try {
      getSmtpConfig({ SMTP_HOST: 'smtp.example.com' });
      throw new Error('Expected SMTP configuration to be rejected.');
    } catch (error) {
      expect(error).toBeInstanceOf(EmailConfigurationError);
      expect(error).toMatchObject({ code: 'missing' });
      expect((error as Error).message).toBe('Missing required SMTP settings: SMTP_USER, SMTP_PASS.');
    }
  });

  it('rejects invalid ports and TLS values', () => {
    const base = {
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'test-user',
      SMTP_PASS: 'test-password',
    };
    expect(() => getSmtpConfig({ ...base, SMTP_PORT: '587smtp' }))
      .toThrow('SMTP_PORT must be an integer from 1 to 65535.');
    expect(() => getSmtpConfig({ ...base, SMTP_SECURE: 'sometimes' }))
      .toThrow('SMTP_SECURE must be true or false.');
    expect(() => getSmtpConfig({ ...base, SMTP_HOST: 'https://smtp.example.com' }))
      .toThrow(EmailConfigurationError);
  });

  it('uses the conventional TLS default for port 465', () => {
    expect(getSmtpConfig({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '465',
      SMTP_USER: 'test-user',
      SMTP_PASS: 'test-password',
    })).toMatchObject({ port: 465, secure: true });
  });

  it('accepts Gmail STARTTLS and defaults the sender to the authenticated address', () => {
    expect(getSmtpConfig({
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_USER: 'sender@gmail.com',
      SMTP_PASS: 'test-app-password',
    })).toMatchObject({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      from: 'Eventora <sender@gmail.com>',
    });
  });

  it('rejects Gmail settings that use implicit TLS or a different sender address', () => {
    const gmail = {
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_USER: 'sender@gmail.com',
      SMTP_PASS: 'test-app-password',
    };
    expect(() => getSmtpConfig({ ...gmail, SMTP_PORT: '465', SMTP_SECURE: 'true' }))
      .toThrow('Gmail SMTP requires SMTP_PORT=587 and SMTP_SECURE=false for STARTTLS.');
    expect(() => getSmtpConfig({
      ...gmail,
      EMAIL_FROM: 'Eventora <noreply@example.com>',
    })).toThrow('For Gmail SMTP, EMAIL_FROM must use the same address as SMTP_USER.');
  });
});
