import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface HealthCheck {
  timestamp: string
  uptime: number
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: {
    supabase: 'healthy' | 'unhealthy' | 'unknown'
  }
}

/**
 * GET /api/health
 * Health check endpoint para monitoramento
 */
export async function GET() {
  const checks: HealthCheck = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: 'healthy',
    checks: {
      supabase: 'unknown',
    },
  }

  try {
    // Testar conexão com Supabase (query simples)
    const supabase = await createClient()
    const { error } = await supabase
      .from('projects')
      .select('id')
      .limit(1)

    checks.checks.supabase = error ? 'unhealthy' : 'healthy'
  } catch (error) {
    console.error('[Health] Supabase check failed:', error)
    checks.checks.supabase = 'unhealthy'
  }

  // Determinar status geral
  const isHealthy = checks.checks.supabase === 'healthy'
  checks.status = isHealthy ? 'healthy' : 'degraded'

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
