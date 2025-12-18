import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { ErrorBoundary } from '@/components/error-boundary'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  // Validar locale
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  // Habilitar renderizacao estatica
  setRequestLocale(locale)

  // Carregar mensagens
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </NextIntlClientProvider>
  )
}
