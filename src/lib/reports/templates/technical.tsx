/**
 * Template do Relatorio Tecnico
 * Destinado a desenvolvedores e QA
 */

import { renderToStaticMarkup } from 'react-dom/server'
import type { ReportData, ViolationForReport } from '../types'
import { BASE_STYLES, COLORS, getViolationCardClass } from './styles'
import { DonutChart, HorizontalBarChart, principlesToBarData } from './charts'

interface TechnicalReportProps {
  data: ReportData
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function truncateHtml(html: string, maxLength: number = 300): string {
  if (html.length <= maxLength) return html
  return html.substring(0, maxLength) + '...'
}

function ViolationCard({ violation }: { violation: ViolationForReport }) {
  return (
    <div className={getViolationCardClass(violation.impact)}>
      {/* Header */}
      <div className="card-header">
        <span className={`badge badge-${violation.impact}`}>{violation.impactLabel}</span>
        {violation.wcagLevel && <span className="badge badge-wcag">WCAG {violation.wcagLevel}</span>}
        {violation.abntSection && <span className="badge badge-abnt">{violation.abntSection}</span>}
        {violation.isCustomRule && <span className="badge badge-br">BR</span>}
      </div>

      {/* Titulo */}
      <h4 className="violation-title">{violation.ruleLabel}</h4>

      {/* Help */}
      <p className="violation-help">{violation.help}</p>

      {/* Descricao */}
      <p style={{ fontSize: '13px', color: COLORS.gray500, marginBottom: '12px' }}>
        {violation.description}
      </p>

      {/* Meta */}
      <div className="violation-meta">
        <span>
          <strong>{violation.occurrences}</strong> ocorrencias
        </span>
        <span>
          <strong>{violation.pageCount}</strong> paginas
        </span>
        <span>
          Prioridade: <strong>{violation.priority}</strong>
        </span>
        <code style={{ fontSize: '10px' }}>{violation.ruleId}</code>
      </div>

      {/* Codigo HTML */}
      <div className="code-block">
        <div className="code-label">HTML Problematico</div>
        <pre>{escapeHtml(truncateHtml(violation.sampleHtml))}</pre>
      </div>

      {/* Seletor */}
      <div style={{ marginTop: '8px' }}>
        <div className="code-label">Seletor CSS</div>
        <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
          {truncateHtml(violation.sampleSelector, 150)}
        </code>
      </div>

      {/* Sugestao IA */}
      {violation.aiSuggestion && (
        <div className="ai-suggestion">
          <div className="ai-suggestion-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Sugestao de Correcao (IA)
          </div>
          <p style={{ fontSize: '13px', color: COLORS.gray700, marginBottom: '8px' }}>
            {violation.aiSuggestion}
          </p>
          {violation.aiSuggestedHtml && (
            <div>
              <div className="code-label">Codigo Sugerido</div>
              <pre style={{ background: '#1E3A5F' }}>
                {escapeHtml(truncateHtml(violation.aiSuggestedHtml, 400))}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Link */}
      {violation.helpUrl && (
        <div style={{ marginTop: '12px' }}>
          <a
            href={violation.helpUrl}
            style={{ fontSize: '12px', color: COLORS.primary }}
          >
            Saiba mais sobre esta regra →
          </a>
        </div>
      )}
    </div>
  )
}

function TechnicalReport({ data }: TechnicalReportProps) {
  const { metrics, violations, byPrinciple, brazilianRules, abntMappings } = data

  // Formatar data
  const auditDate = new Date(data.auditDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // Agrupar violacoes por severidade
  const violationsBySeverity = {
    critical: violations.filter((v) => v.impact === 'critical'),
    serious: violations.filter((v) => v.impact === 'serious'),
    moderate: violations.filter((v) => v.impact === 'moderate'),
    minor: violations.filter((v) => v.impact === 'minor'),
  }

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <title>Relatorio Tecnico de Acessibilidade - {data.projectName}</title>
        <style dangerouslySetInnerHTML={{ __html: BASE_STYLES }} />
      </head>
      <body>
        {/* Pagina 1: Capa */}
        <div className="page">
          <div className="cover">
            <div className="logo">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="38" stroke={COLORS.primary} strokeWidth="4" />
                <path
                  d="M25 45C25 45 32 35 40 35C48 35 55 45 55 45"
                  stroke={COLORS.primary}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="40" cy="30" r="8" fill={COLORS.primary} />
              </svg>
            </div>
            <h1>Relatorio Tecnico</h1>
            <p style={{ fontSize: '18px', color: COLORS.gray500, marginBottom: '16px' }}>
              Auditoria de Acessibilidade
            </p>
            <p className="url">{data.projectUrl}</p>
            <p className="date">{auditDate}</p>
          </div>
        </div>

        {/* Pagina 2: Sumario Tecnico */}
        <div className="page">
          <h2 className="section-title">Sumario Tecnico</h2>

          {/* Metricas */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}>
              <DonutChart
                value={metrics.wcagCompliancePercent}
                size={120}
                color={
                  metrics.wcagCompliancePercent >= 90
                    ? COLORS.pass.border
                    : metrics.wcagCompliancePercent >= 70
                      ? COLORS.moderate.border
                      : COLORS.critical.border
                }
                label="Conformidade"
              />
            </div>
            <div style={{ flex: 2 }}>
              <table style={{ margin: 0 }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Total de Violacoes</td>
                    <td>{metrics.totalViolations}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Tipos Unicos</td>
                    <td>{metrics.uniqueViolationTypes}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Paginas Auditadas</td>
                    <td>{metrics.pagesAudited}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Paginas com Problemas</td>
                    <td>{metrics.pagesWithViolations}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Niveis WCAG</td>
                    <td>{data.wcagLevels.join(', ')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats por Severidade */}
          <div className="stats-grid">
            <div className="stat-card stat-critical">
              <div className="stat-value">{metrics.bySeverity.critical}</div>
              <div className="stat-label">Criticos</div>
            </div>
            <div className="stat-card stat-serious">
              <div className="stat-value">{metrics.bySeverity.serious}</div>
              <div className="stat-label">Serios</div>
            </div>
            <div className="stat-card stat-moderate">
              <div className="stat-value">{metrics.bySeverity.moderate}</div>
              <div className="stat-label">Moderados</div>
            </div>
            <div className="stat-card stat-minor">
              <div className="stat-value">{metrics.bySeverity.minor}</div>
              <div className="stat-label">Menores</div>
            </div>
          </div>

          {/* Por Principio */}
          <div className="section" style={{ marginTop: '24px' }}>
            <h3>Por Principio WCAG</h3>
            <HorizontalBarChart data={principlesToBarData(metrics.byPrinciple)} />
          </div>

        </div>

        {/* Violacoes Criticas */}
        {violationsBySeverity.critical.length > 0 && (
          <div className="page">
            <h2 className="section-title" style={{ color: COLORS.critical.text }}>
              Violacoes Criticas ({violationsBySeverity.critical.length})
            </h2>
            <p style={{ marginBottom: '16px', color: COLORS.gray500, fontSize: '13px' }}>
              Problemas que impedem completamente o acesso para alguns usuarios. Prioridade maxima.
            </p>
            {violationsBySeverity.critical.map((v, i) => (
              <ViolationCard key={i} violation={v} />
            ))}
          </div>
        )}

        {/* Violacoes Serias */}
        {violationsBySeverity.serious.length > 0 && (
          <div className="page">
            <h2 className="section-title" style={{ color: COLORS.serious.text }}>
              Violacoes Serias ({violationsBySeverity.serious.length})
            </h2>
            <p style={{ marginBottom: '16px', color: COLORS.gray500, fontSize: '13px' }}>
              Problemas que causam grande dificuldade para usuarios com deficiencia.
            </p>
            {violationsBySeverity.serious.map((v, i) => (
              <ViolationCard key={i} violation={v} />
            ))}
          </div>
        )}

        {/* Violacoes Moderadas */}
        {violationsBySeverity.moderate.length > 0 && (
          <div className="page">
            <h2 className="section-title" style={{ color: COLORS.moderate.text }}>
              Violacoes Moderadas ({violationsBySeverity.moderate.length})
            </h2>
            <p style={{ marginBottom: '16px', color: COLORS.gray500, fontSize: '13px' }}>
              Problemas que causam dificuldade moderada.
            </p>
            {violationsBySeverity.moderate.map((v, i) => (
              <ViolationCard key={i} violation={v} />
            ))}
          </div>
        )}

        {/* Violacoes Menores */}
        {violationsBySeverity.minor.length > 0 && (
          <div className="page">
            <h2 className="section-title" style={{ color: COLORS.minor.text }}>
              Violacoes Menores ({violationsBySeverity.minor.length})
            </h2>
            <p style={{ marginBottom: '16px', color: COLORS.gray500, fontSize: '13px' }}>
              Problemas de menor impacto, mas ainda importantes para corrigir.
            </p>
            {violationsBySeverity.minor.map((v, i) => (
              <ViolationCard key={i} violation={v} />
            ))}
          </div>
        )}

        {/* Mapeamento ABNT Completo */}
        {data.includeAbnt && abntMappings.length > 0 && (
          <div className="page">
            <h2 className="section-title">Mapeamento ABNT NBR 17060</h2>
            <table style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>WCAG</th>
                  <th>ABNT</th>
                  <th>Status</th>
                  <th>Violacoes</th>
                </tr>
              </thead>
              <tbody>
                {abntMappings.map((m, i) => (
                  <tr key={i}>
                    <td>{m.wcagCriterion}</td>
                    <td>{m.abntSection}</td>
                    <td>
                      <span
                        className={`badge ${
                          m.status === 'pass'
                            ? 'badge-pass'
                            : m.status === 'fail'
                              ? 'badge-fail'
                              : 'badge-not-tested'
                        }`}
                      >
                        {m.status === 'pass' ? 'OK' : m.status === 'fail' ? 'Falha' : 'N/T'}
                      </span>
                    </td>
                    <td>{m.violationCount || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Apendice: Regras Brasileiras */}
        {brazilianRules.length > 0 && (
          <div className="page">
            <h2 className="section-title">Apendice: Regras Brasileiras</h2>
            <p style={{ marginBottom: '16px', color: COLORS.gray500, fontSize: '13px' }}>
              Regras customizadas desenvolvidas para o contexto brasileiro de acessibilidade.
            </p>

            <table>
              <thead>
                <tr>
                  <th>Regra</th>
                  <th>Descricao</th>
                  <th>Ocorrencias</th>
                </tr>
              </thead>
              <tbody>
                {brazilianRules.map((rule, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{rule.label}</td>
                    <td style={{ fontSize: '12px' }}>{rule.description}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-br">{rule.occurrences}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              className="card"
              style={{ marginTop: '24px', background: '#EDE9FE', border: '1px solid #C4B5FD' }}
            >
              <h4 style={{ color: '#5B21B6', marginBottom: '12px' }}>
                Sobre as Regras Brasileiras
              </h4>
              <ul style={{ paddingLeft: '20px', fontSize: '13px', color: COLORS.gray700 }}>
                <li>
                  <strong>link-texto-generico:</strong> Detecta links com textos nao descritivos
                </li>
                <li>
                  <strong>link-nova-aba-sem-aviso:</strong> Links target="_blank" sem aviso
                </li>
                <li>
                  <strong>imagem-alt-nome-arquivo:</strong> Alts que parecem nomes de arquivo
                </li>
                <li>
                  <strong>texto-justificado:</strong> text-align: justify dificulta leitura
                </li>
                <li>
                  <strong>texto-maiusculo-css:</strong> text-transform: uppercase em blocos
                </li>
                <li>
                  <strong>br-excessivo-layout:</strong> Multiplos br para espacamento
                </li>
                <li>
                  <strong>atributo-title-redundante:</strong> title duplica texto visivel
                </li>
                <li>
                  <strong>rotulo-ambiguo:</strong> Botoes/links com 1-2 caracteres
                </li>
                <li>
                  <strong>fonte-muito-pequena:</strong> font-size menor que 12px
                </li>
                <li>
                  <strong>sem-plugin-libras:</strong> Ausencia de VLibras ou Hand Talk
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Rodape */}
        <div className="page">
          <div
            style={{
              textAlign: 'center',
              color: COLORS.gray500,
              fontSize: '12px',
              paddingTop: '100px',
            }}
          >
            <p>
              Relatorio gerado automaticamente em{' '}
              {new Date(data.generatedAt).toLocaleString('pt-BR')}
            </p>
            <p style={{ marginTop: '16px' }}>
              <strong>Projeto:</strong> {data.projectName}
            </p>
            <p>
              <strong>URL:</strong> {data.projectUrl}
            </p>
            <p>
              <strong>Audit ID:</strong> {data.auditId}
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}

/**
 * Renderiza o template tecnico para HTML string
 */
export function renderTechnicalReport(data: ReportData): string {
  return '<!DOCTYPE html>' + renderToStaticMarkup(<TechnicalReport data={data} />)
}
