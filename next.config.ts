import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const securityHeaders = [
  {
    // Previne clickjacking - não permite que o site seja carregado em iframe
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // Previne MIME type sniffing
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Controla informações de referrer
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // Desabilita funcionalidades do browser que não são necessárias
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    // Força HTTPS (em produção)
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    // Content Security Policy - restritiva mas permite o necessário
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://cloud.trigger.dev",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Aplicar a todas as rotas
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  // Workaround para Next.js 16: proxy.ts/middleware.ts não funciona corretamente
  // com rewrites (bug conhecido: https://github.com/vercel/next.js/issues/86122)
  // Usando config rewrites para redirecionar URLs sem prefixo para locale default
  async rewrites() {
    return {
      beforeFiles: [
        // /login -> /pt-BR/login (internamente, URL não muda)
        // /projects -> /pt-BR/projects
        // Exclui: locales existentes, api, _next, _vercel, auth, arquivos estáticos
        {
          source: '/:path((?!pt-BR|en|es|api|_next|_vercel|auth).*)',
          destination: '/pt-BR/:path',
        },
      ],
    };
  },
};

export default withNextIntl(nextConfig);
