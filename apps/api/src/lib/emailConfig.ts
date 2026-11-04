export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export type EmailConfigurationErrorCode = 'missing' | 'invalid';

export class EmailConfigurationError extends Error {
  constructor(
    public readonly code: EmailConfigurationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'EmailConfigurationError';
  }
}

export function getSmtpConfig(
  env: NodeJS.ProcessEnv = process.env,
): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim() || '';
  const portValue = env.SMTP_PORT?.trim() || '';
  const secureValue = env.SMTP_SECURE?.trim().toLowerCase() || '';
  const user = env.SMTP_USER?.trim() || '';
  const pass = env.SMTP_PASS?.trim() || '';
  const hasAnySetting = Boolean(host || portValue || secureValue || user || pass);

  if (!hasAnySetting) return null;

  const missingSettings = [
    !host && 'SMTP_HOST',
    !user && 'SMTP_USER',
    !pass && 'SMTP_PASS',
  ].filter(Boolean);

  if (missingSettings.length > 0) {
    throw new EmailConfigurationError(
      'missing',
      `Missing required SMTP settings: ${missingSettings.join(', ')}.`,
    );
  }

  if (/\s|:\/\/|[\/@]/.test(host)) {
    throw new EmailConfigurationError('invalid', 'SMTP_HOST must be a hostname.');
  }

  const port = portValue ? Number(portValue) : 587;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new EmailConfigurationError('invalid', 'SMTP_PORT must be an integer from 1 to 65535.');
  }

  if (secureValue && secureValue !== 'true' && secureValue !== 'false') {
    throw new EmailConfigurationError('invalid', 'SMTP_SECURE must be true or false.');
  }

  const secure = secureValue ? secureValue === 'true' : port === 465;
  if (host.toLowerCase() === 'smtp.gmail.com' && (port !== 587 || secure)) {
    throw new EmailConfigurationError(
      'invalid',
      'Gmail SMTP requires SMTP_PORT=587 and SMTP_SECURE=false for STARTTLS.',
    );
  }

  const configuredFrom = env.EMAIL_FROM?.trim();
  const from = configuredFrom || (
    host.toLowerCase() === 'smtp.gmail.com'
      ? `Eventora <${user}>`
      : 'Eventora <noreply@eventora.com>'
  );
  if (host.toLowerCase() === 'smtp.gmail.com') {
    const fromAddress = /<([^<>]+)>/.exec(from)?.[1]?.trim() || from;
    if (fromAddress.toLowerCase() !== user.toLowerCase()) {
      throw new EmailConfigurationError(
        'invalid',
        'For Gmail SMTP, EMAIL_FROM must use the same address as SMTP_USER.',
      );
    }
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
}
