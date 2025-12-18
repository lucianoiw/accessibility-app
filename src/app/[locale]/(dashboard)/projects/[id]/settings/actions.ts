'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AuthConfig, DiscoveryMethod, DiscoveryConfig } from '@/types'

// Helper para verificar ownership
async function verifyOwnership(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single() as { data: { user_id: string } | null }

  if (!project || project.user_id !== user.id) {
    throw new Error('Acesso negado')
  }

  return { supabase, userId: user.id }
}

// ============================================
// General Settings Actions
// ============================================

export async function updateGeneralSettings(
  projectId: string,
  formData: FormData
) {
  const { supabase } = await verifyOwnership(projectId)

  const name = formData.get('name') as string
  const baseUrl = formData.get('base_url') as string
  const description = formData.get('description') as string

  if (!name?.trim()) {
    return { error: 'Nome é obrigatório' }
  }

  if (!baseUrl?.trim()) {
    return { error: 'URL é obrigatória' }
  }

  // Validar URL
  try {
    new URL(baseUrl)
  } catch {
    return { error: 'URL inválida' }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      name: name.trim(),
      base_url: baseUrl.trim(),
      description: description?.trim() || null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', projectId)

  if (error) {
    console.error('Error updating project:', error)
    return { error: 'Erro ao salvar configurações' }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/settings`)

  return { success: true }
}

export async function deleteProject(projectId: string) {
  const { supabase } = await verifyOwnership(projectId)

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    console.error('Error deleting project:', error)
    return { error: 'Erro ao excluir projeto' }
  }

  redirect('/projects')
}

// ============================================
// Auth Settings Actions
// ============================================

export async function updateAuthSettings(
  projectId: string,
  formData: FormData
) {
  const { supabase } = await verifyOwnership(projectId)

  const authType = formData.get('auth_type') as string
  const token = formData.get('token') as string
  const cookies = formData.get('cookies') as string

  let authConfig: AuthConfig | null = null

  if (authType === 'bearer') {
    if (!token?.trim()) {
      return { error: 'Token é obrigatório para autenticação Bearer' }
    }
    authConfig = { type: 'bearer', token: token.trim() }
  } else if (authType === 'cookie') {
    if (!cookies?.trim()) {
      return { error: 'Cookies são obrigatórios para autenticação por Cookie' }
    }
    authConfig = { type: 'cookie', cookies: cookies.trim() }
  } else {
    authConfig = { type: 'none' }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      auth_config: authConfig,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', projectId)

  if (error) {
    console.error('Error updating auth config:', error)
    return { error: 'Erro ao salvar configurações' }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/settings/auth`)

  return { success: true }
}

// ============================================
// Audit Defaults Settings Actions
// ============================================

export async function updateAuditDefaults(
  projectId: string,
  formData: FormData
) {
  const { supabase } = await verifyOwnership(projectId)

  const wcagA = formData.get('wcag_a') === 'on'
  const wcagAA = formData.get('wcag_aa') === 'on'
  const wcagAAA = formData.get('wcag_aaa') === 'on'
  const includeAbnt = formData.get('include_abnt') === 'on'
  const includeEmag = formData.get('include_emag') === 'on'
  const includeCoga = formData.get('include_coga') === 'on'

  // Construir array de WCAG levels
  const wcagLevels: string[] = []
  if (wcagA) wcagLevels.push('A')
  if (wcagAA) wcagLevels.push('AA')
  if (wcagAAA) wcagLevels.push('AAA')

  if (wcagLevels.length === 0) {
    return { error: 'Selecione pelo menos um nível WCAG' }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      default_wcag_levels: wcagLevels,
      default_include_abnt: includeAbnt,
      default_include_emag: includeEmag,
      default_include_coga: includeCoga,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', projectId)

  if (error) {
    console.error('Error updating audit defaults:', error)
    return { error: 'Erro ao salvar configurações' }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/settings/defaults`)

  return { success: true }
}

// ============================================
// Discovery Settings Actions
// ============================================

export async function updateDiscoverySettings(
  projectId: string,
  data: {
    discoveryMethod: DiscoveryMethod
    discoveryConfig: DiscoveryConfig
  }
) {
  const { supabase } = await verifyOwnership(projectId)

  // Validar config baseado no método
  const { discoveryMethod, discoveryConfig } = data

  if (discoveryMethod === 'manual') {
    const config = discoveryConfig as { urls?: string[] }
    if (!config.urls || config.urls.length === 0) {
      return { error: 'Pelo menos uma URL é obrigatória' }
    }
    // Validar cada URL
    for (const url of config.urls) {
      try {
        new URL(url)
      } catch {
        return { error: `URL inválida: ${url}` }
      }
    }
  } else if (discoveryMethod === 'sitemap') {
    const config = discoveryConfig as { sitemapUrl?: string; maxPages?: number }
    if (!config.sitemapUrl) {
      return { error: 'URL do sitemap é obrigatória' }
    }
    try {
      new URL(config.sitemapUrl)
    } catch {
      return { error: 'URL do sitemap inválida' }
    }
    if (!config.maxPages || config.maxPages < 1 || config.maxPages > 500) {
      return { error: 'Limite de páginas deve ser entre 1 e 500' }
    }
  } else if (discoveryMethod === 'crawler') {
    const config = discoveryConfig as { startUrl?: string; depth?: number; maxPages?: number }
    if (!config.startUrl) {
      return { error: 'URL de início é obrigatória' }
    }
    try {
      new URL(config.startUrl)
    } catch {
      return { error: 'URL de início inválida' }
    }
    if (!config.depth || config.depth < 1 || config.depth > 3) {
      return { error: 'Profundidade deve ser 1, 2 ou 3' }
    }
    if (!config.maxPages || config.maxPages < 1 || config.maxPages > 500) {
      return { error: 'Limite de páginas deve ser entre 1 e 500' }
    }
  } else {
    return { error: 'Método de descoberta inválido' }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      discovery_method: discoveryMethod,
      discovery_config: discoveryConfig,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', projectId)

  if (error) {
    console.error('Error updating discovery settings:', error)
    return { error: 'Erro ao salvar configurações' }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/settings/discovery`)

  return { success: true }
}
