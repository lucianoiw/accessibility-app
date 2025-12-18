import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pt-BR', 'en', 'es'],
  defaultLocale: 'pt-BR',
  // 'as-needed' - URLs sem prefixo para locale default (pt-BR)
  // Rewrite handling via next.config.ts (workaround para Next.js 16)
  localePrefix: 'as-needed'
})
