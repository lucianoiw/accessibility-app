/**
 * Template do Relatorio Executivo
 * Destinado a gestores, stakeholders e decisores
 */

import { renderToStaticMarkup } from 'react-dom/server'
import type { ReportData } from '../types'
import { BASE_STYLES, COLORS } from './styles'
import {
  PieChart,
  DonutChart,
  HorizontalBarChart,
  severityToPieData,
  principlesToBarData,
} from './charts'

interface ExecutiveReportProps {
  data: ReportData
}

function ExecutiveReport({ data }: ExecutiveReportProps) {
  const { metrics, summary, byPrinciple, abntMappings, brazilianRules } = data

  // Formatar data
  const auditDate = new Date(data.auditDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // Calcular status geral
  const getOverallStatus = () => {
    if (metrics.bySeverity.critical > 0) return { label: 'Critico', color: COLORS.critical.border }
    if (metrics.bySeverity.serious > 0) return { label: 'Atencao', color: COLORS.serious.border }
    if (metrics.bySeverity.moderate > 0) return { label: 'Moderado', color: COLORS.moderate.border }
    if (metrics.bySeverity.minor > 0) return { label: 'Bom', color: COLORS.minor.border }
    return { label: 'Excelente', color: COLORS.pass.border }
  }

  const overallStatus = getOverallStatus()

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <title>Relatorio de Acessibilidade - {data.projectName}</title>
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
            <h1>Relatorio de Acessibilidade</h1>
            <p className="url">{data.projectUrl}</p>
            <p className="date">{auditDate}</p>
            <div style={{ marginTop: '48px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '8px 24px',
                  background: overallStatus.color,
                  color: COLORS.white,
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Status: {overallStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* Pagina 2: Sumario Executivo */}
        <div className="page">
          <h2 className="section-title">Sumario Executivo</h2>

          {/* Compliance */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <DonutChart
                value={metrics.wcagCompliancePercent}
                size={140}
                color={
                  metrics.wcagCompliancePercent >= 90
                    ? COLORS.pass.border
                    : metrics.wcagCompliancePercent >= 70
                      ? COLORS.moderate.border
                      : COLORS.critical.border
                }
                label="Conformidade"
              />
              <div style={{ flex: 1 }}>
                <h3 style={{ marginBottom: '8px' }}>Conformidade WCAG 2.2</h3>
                <p style={{ color: COLORS.gray500, marginBottom: '12px' }}>
                  Niveis testados: {data.wcagLevels.join(', ')}
                </p>
                <p style={{ fontSize: '13px', color: COLORS.gray700 }}>
                  {metrics.wcagCompliancePercent >= 90
                    ? 'O site apresenta boa conformidade com as diretrizes de acessibilidade. Continue monitorando e corrigindo os problemas restantes.'
                    : metrics.wcagCompliancePercent >= 70
                      ? 'O site apresenta conformidade moderada. Recomendamos priorizar a correcao dos problemas criticos e serios.'
                      : 'O site apresenta baixa conformidade. E necessario um esforco significativo para melhorar a acessibilidade.'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{metrics.totalViolations}</div>
              <div className="stat-label">Total de Problemas</div>
            </div>
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

          {/* Paginas */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: COLORS.gray900 }}>
                  {metrics.pagesAudited}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.gray500 }}>Paginas Auditadas</div>
              </div>
              <div
                style={{
                  width: '1px',
                  background: COLORS.gray200,
                  margin: '0 24px',
                }}
              />
              <div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: COLORS.serious.text }}>
                  {metrics.pagesWithViolations}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.gray500 }}>Com Problemas</div>
              </div>
              <div
                style={{
                  width: '1px',
                  background: COLORS.gray200,
                  margin: '0 24px',
                }}
              />
              <div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: COLORS.pass.text }}>
                  {metrics.pagesAudited - metrics.pagesWithViolations}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.gray500 }}>Sem Problemas</div>
              </div>
            </div>
          </div>

          {/* Distribuicao por Severidade */}
          <div className="section" style={{ marginTop: '24px' }}>
            <h3>Distribuicao por Severidade</h3>
            <div className="chart-container">
              <PieChart data={severityToPieData(metrics.bySeverity)} size={180} />
            </div>
          </div>
        </div>

        {/* Pagina 3: Top Problemas e Por Principio */}
        <div className="page">
          {/* Top Problemas */}
          <div className="section">
            <h2 className="section-title">Principais Problemas</h2>
            <div className="top-violations">
              {metrics.topViolations.slice(0, 5).map((v, i) => (
                <div key={i} className="top-violation">
                  <div className="top-violation-content">
                    <div className="top-violation-title">{v.ruleLabel}</div>
                    <div className="top-violation-meta">
                      <span className={`badge badge-${v.impact}`}>{v.impactLabel}</span>
                      <span style={{ marginLeft: '8px' }}>
                        {v.occurrences} ocorrencias em {v.pageCount} paginas
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Por Principio WCAG */}
          <div className="section" style={{ marginTop: '32px' }}>
            <h2 className="section-title">Problemas por Principio WCAG</h2>
            <p style={{ marginBottom: '16px', color: COLORS.gray500, fontSize: '13px' }}>
              Os 4 principios das WCAG 2.2 definem a base da acessibilidade web.
            </p>
            <HorizontalBarChart
              data={principlesToBarData(metrics.byPrinciple)}
              showValues={true}
            />
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: COLORS.gray50,
                borderRadius: '8px',
                fontSize: '12px',
                color: COLORS.gray700,
              }}
            >
              <strong>Legenda:</strong>
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li>
                  <strong>Perceptivel:</strong> Conteudo deve ser apresentado de formas que os
                  usuarios possam perceber
                </li>
                <li>
                  <strong>Operavel:</strong> Componentes de interface devem ser operaveis
                </li>
                <li>
                  <strong>Compreensivel:</strong> Informacao e operacao da interface devem ser
                  compreensiveis
                </li>
                <li>
                  <strong>Robusto:</strong> Conteudo deve ser interpretavel por tecnologias
                  assistivas
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pagina 4: Mapeamento ABNT (se incluido) */}
        {data.includeAbnt && abntMappings.length > 0 && (
          <div className="page">
            <h2 className="section-title">Conformidade ABNT NBR 17060</h2>
            <p style={{ marginBottom: '16px', color: COLORS.gray500, fontSize: '13px' }}>
              Mapeamento dos criterios WCAG 2.2 para a norma brasileira ABNT NBR 17060.
            </p>

            {/* Resumo ABNT */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
              <div className="stat-card">
                <div className="stat-value" style={{ color: COLORS.pass.text }}>
                  {abntMappings.filter((m) => m.status === 'pass').length}
                </div>
                <div className="stat-label">Conformes</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: COLORS.fail.text }}>
                  {abntMappings.filter((m) => m.status === 'fail').length}
                </div>
                <div className="stat-label">Nao Conformes</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: COLORS.notTested.text }}>
                  {abntMappings.filter((m) => m.status === 'not_tested').length}
                </div>
                <div className="stat-label">Nao Testados</div>
              </div>
            </div>

            {/* Tabela ABNT */}
            <table>
              <thead>
                <tr>
                  <th>WCAG</th>
                  <th>ABNT</th>
                  <th>Status</th>
                  <th>Violacoes</th>
                </tr>
              </thead>
              <tbody>
                {abntMappings.slice(0, 25).map((m, i) => (
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
                        {m.status === 'pass'
                          ? 'Conforme'
                          : m.status === 'fail'
                            ? 'Falha'
                            : 'N/T'}
                      </span>
                    </td>
                    <td>{m.violationCount || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {abntMappings.length > 25 && (
              <p style={{ fontSize: '12px', color: COLORS.gray500, marginTop: '8px' }}>
                Mostrando 25 de {abntMappings.length} criterios. Veja o relatorio tecnico para
                lista completa.
              </p>
            )}
          </div>
        )}

        {/* Pagina 5: Regras Brasileiras (se houver) */}
        {brazilianRules.length > 0 && (
          <div className="page">
            <h2 className="section-title">Regras Brasileiras</h2>
            <p style={{ marginBottom: '16px', color: COLORS.gray500, fontSize: '13px' }}>
              Alem das regras WCAG internacionais, verificamos regras especificas para o contexto
              brasileiro.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {brazilianRules.map((rule, i) => (
                <div
                  key={i}
                  style={{
                    padding: '16px',
                    background: '#EDE9FE',
                    borderRadius: '8px',
                    borderLeft: '4px solid #7C3AED',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#5B21B6' }}>{rule.label}</span>
                    <span className="badge badge-br">{rule.occurrences}x</span>
                  </div>
                  <p style={{ fontSize: '13px', color: COLORS.gray700, margin: 0 }}>
                    {rule.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagina Final: Proximos Passos */}
        <div className="page">
          <h2 className="section-title">Proximos Passos</h2>

          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Recomendacoes Priorizadas</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {metrics.bySeverity.critical > 0 && (
                <div
                  style={{
                    padding: '16px',
                    background: COLORS.critical.bg,
                    borderRadius: '8px',
                    borderLeft: `4px solid ${COLORS.critical.border}`,
                  }}
                >
                  <div style={{ fontWeight: 600, color: COLORS.critical.text, marginBottom: '4px' }}>
                    1. Corrigir problemas criticos ({metrics.bySeverity.critical})
                  </div>
                  <p style={{ fontSize: '13px', color: COLORS.gray700, margin: 0 }}>
                    Problemas criticos impedem completamente o acesso para alguns usuarios.
                    Prioridade maxima.
                  </p>
                </div>
              )}

              {metrics.bySeverity.serious > 0 && (
                <div
                  style={{
                    padding: '16px',
                    background: COLORS.serious.bg,
                    borderRadius: '8px',
                    borderLeft: `4px solid ${COLORS.serious.border}`,
                  }}
                >
                  <div style={{ fontWeight: 600, color: COLORS.serious.text, marginBottom: '4px' }}>
                    {metrics.bySeverity.critical > 0 ? '2' : '1'}. Corrigir problemas serios (
                    {metrics.bySeverity.serious})
                  </div>
                  <p style={{ fontSize: '13px', color: COLORS.gray700, margin: 0 }}>
                    Problemas serios causam grande dificuldade para usuarios com deficiencia.
                  </p>
                </div>
              )}

              <div
                style={{
                  padding: '16px',
                  background: COLORS.gray50,
                  borderRadius: '8px',
                  borderLeft: `4px solid ${COLORS.primary}`,
                }}
              >
                <div style={{ fontWeight: 600, color: COLORS.primary, marginBottom: '4px' }}>
                  Consulte o Relatorio Tecnico
                </div>
                <p style={{ fontSize: '13px', color: COLORS.gray700, margin: 0 }}>
                  O relatorio tecnico contem detalhes de cada problema, incluindo codigo HTML
                  afetado e sugestoes de correcao.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Sobre Este Relatorio</h3>
            <div style={{ fontSize: '13px', color: COLORS.gray700 }}>
              <p>
                <strong>Escopo:</strong> {metrics.pagesAudited} paginas auditadas em{' '}
                {new Date(data.generatedAt).toLocaleDateString('pt-BR')}.
              </p>
              <p>
                <strong>Niveis WCAG:</strong> {data.wcagLevels.join(', ')}
              </p>
              <p>
                <strong>Limitacoes:</strong> Testes automatizados detectam cerca de 30-40% dos
                problemas de acessibilidade. Recomendamos complementar com testes manuais e com
                usuarios reais.
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: '48px',
              textAlign: 'center',
              color: COLORS.gray500,
              fontSize: '12px',
            }}
          >
            <p>Relatorio gerado automaticamente em {new Date(data.generatedAt).toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </body>
    </html>
  )
}

/**
 * Renderiza o template executivo para HTML string
 */
export function renderExecutiveReport(data: ReportData): string {
  return '<!DOCTYPE html>' + renderToStaticMarkup(<ExecutiveReport data={data} />)
}
