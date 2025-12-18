# Plano de Implementacao: Sistema de Geracao de Relatorios

## Resumo

Implementar sistema de geracao de relatorios de acessibilidade que seja **superior aos concorrentes** (Equalweb/IAAP), com relatorios consolidados, sumario executivo visual, codigo de correcao sugerido por IA, e mapeamento completo ABNT NBR 17060.

---

## Analise dos Concorrentes (Fraquezas a Superar)

| Aspecto | Concorrente | Nossa Solucao |
|---------|-------------|---------------|
| Escopo | 1 PDF por pagina | Relatorio consolidado |
| Sumario | No final, basico | No inicio com graficos |
| Agregacao | Nenhuma | Por tipo de violacao |
| Correcoes | Texto generico | Codigo HTML sugerido (IA) |
| ABNT | Apenas C.1.1 | Mapeamento completo |
| Audiencia | Muito tecnico | Executivo + Tecnico |
| Priorizacao | Nenhuma | Score 0-100 |
| Evidencias | Screenshots basicos | Seletores + contexto |
| Metricas | Score proprietario | WCAG compliance % |
| Historico | Nenhum | Comparacao entre auditorias |

---

## Arquitetura Tecnica

### Stack Escolhida

- **Geracao PDF**: Playwright (ja instalado) - HTML para PDF
- **Templates**: React Server Components para HTML
- **Armazenamento**: Supabase Storage
- **Processamento**: Trigger.dev (background task)
- **Graficos**: Chartist.js ou SVG inline (leve, sem JS)

### Estrutura de Arquivos

```
src/
├── lib/
│   └── reports/
│       ├── index.ts              # Exports
│       ├── types.ts              # Tipos do relatorio
│       ├── data-builder.ts       # Construtor de dados para relatorio
│       ├── pdf-generator.ts      # Playwright HTML -> PDF
│       ├── csv-generator.ts      # Geracao CSV/Excel
│       ├── json-generator.ts     # Geracao JSON
│       └── templates/
│           ├── executive.tsx     # Template executivo
│           ├── technical.tsx     # Template tecnico
│           ├── styles.ts         # CSS inline para PDF
│           └── charts.tsx        # Componentes de grafico SVG
├── app/
│   └── api/
│       └── reports/
│           ├── route.ts          # POST: iniciar geracao
│           └── [reportId]/
│               └── route.ts      # GET: baixar relatorio
├── trigger/
│   └── report.ts                 # Task de geracao em background
└── components/
    └── reports/
        └── export-button.tsx     # Botao de exportacao na UI
```

---

## Tipos de Relatorio

### 1. Relatorio Executivo (PDF)

**Audiencia**: Gestores, stakeholders, decisores

**Conteudo**:
1. **Capa**
   - Logo da plataforma
   - Nome do projeto/site
   - Data da auditoria
   - URL auditada

2. **Sumario Executivo** (1 pagina)
   - Score de conformidade WCAG (%)
   - Grafico pizza: distribuicao por severidade
   - Numero total de problemas
   - Paginas auditadas vs com problemas
   - Top 3 problemas mais criticos
   - Recomendacao geral (texto simples)

3. **Conformidade por Principio WCAG** (1 pagina)
   - Perceptivel: X problemas
   - Operavel: X problemas
   - Compreensivel: X problemas
   - Robusto: X problemas
   - Grafico de barras horizontal

4. **Mapeamento ABNT NBR 17060** (1-2 paginas)
   - Tabela: Criterio WCAG | Secao ABNT | Status | Qtd
   - Compliance por secao ABNT

5. **Proximos Passos**
   - Lista priorizada de acoes
   - Estimativa de esforco (baixo/medio/alto)
   - Impacto esperado

### 2. Relatorio Tecnico (PDF)

**Audiencia**: Desenvolvedores, QA

**Conteudo**:
1. **Capa** (igual executivo)

2. **Sumario Tecnico**
   - Metricas detalhadas
   - Metodologia de teste
   - Ferramentas utilizadas (axe-core + regras BR)

3. **Violacoes por Severidade** (N paginas)
   Para cada violacao agregada:
   - Severidade (badge colorido)
   - Regra (ID + label PT-BR)
   - Criterio WCAG + Secao ABNT
   - Descricao do problema
   - Numero de ocorrencias
   - Paginas afetadas (lista ou "X paginas")
   - Exemplo de HTML problematico (code block)
   - Seletor CSS/XPath
   - **Sugestao de codigo corrigido** (se disponivel via IA)
   - Link "Saiba mais"

4. **Violacoes por Pagina** (opcional/anexo)
   - Lista de paginas com problemas
   - Contagem por pagina

5. **Apendice: Regras Brasileiras**
   - Lista das 11 regras customizadas
   - Explicacao de cada uma

### 3. Exportacao CSV/Excel

**Colunas**:
- ID da Violacao
- Regra
- Severidade
- Nivel WCAG
- Secao ABNT
- Ocorrencias
- Paginas Afetadas
- Descricao
- Seletor
- HTML
- Sugestao IA
- Status

### 4. Exportacao JSON

**Estrutura**:
```json
{
  "metadata": {
    "generated_at": "...",
    "project": "...",
    "audit_id": "...",
    "wcag_levels": ["A", "AA"],
    "pages_audited": 50
  },
  "summary": {
    "total": 150,
    "critical": 10,
    "serious": 30,
    "moderate": 60,
    "minor": 50,
    "wcag_compliance_percent": 78.5
  },
  "violations": [...]
}
```

---

## Implementacao por Fase

### Fase 1: Infraestrutura Base

**Arquivos a criar:**

1. `src/lib/reports/types.ts`
   - ReportType enum
   - ReportData interface
   - ReportMetadata interface
   - ViolationForReport interface

2. `src/lib/reports/data-builder.ts`
   - Funcao para buscar todos os dados necessarios
   - Calcular metricas derivadas (compliance %, distribuicao)
   - Formatar dados para templates

3. `src/trigger/report.ts`
   - Task Trigger.dev para geracao em background
   - Atualizar status no banco
   - Upload para Supabase Storage

4. Migracao SQL:
   - Tabela `reports` (id, audit_id, type, status, file_url, created_at)

### Fase 2: Templates HTML/PDF

**Arquivos a criar:**

1. `src/lib/reports/templates/styles.ts`
   - CSS inline otimizado para PDF
   - Variaveis de cores por severidade
   - Tipografia profissional

2. `src/lib/reports/templates/charts.tsx`
   - PieChart SVG (severidade)
   - BarChart SVG (principios WCAG)
   - ProgressBar SVG (compliance)

3. `src/lib/reports/templates/executive.tsx`
   - Componente React renderizado no servidor
   - Usa dados do data-builder
   - Retorna HTML string

4. `src/lib/reports/templates/technical.tsx`
   - Componente React renderizado no servidor
   - Secoes colapsaveis de violacoes
   - Code blocks estilizados

5. `src/lib/reports/pdf-generator.ts`
   - Inicializar Playwright
   - Carregar HTML em pagina
   - Gerar PDF com opcoes (tamanho, margem)
   - Retornar Buffer

### Fase 3: API e UI

**Arquivos a criar:**

1. `src/app/api/reports/route.ts`
   ```
   POST /api/reports
   Body: { auditId, type: 'executive' | 'technical' | 'csv' | 'json' }
   Response: { reportId, status: 'generating' }
   ```

2. `src/app/api/reports/[reportId]/route.ts`
   ```
   GET /api/reports/:reportId
   Response: file download ou { status: 'generating' }
   ```

3. `src/components/reports/export-button.tsx`
   - Dropdown com opcoes de exportacao
   - Loading state durante geracao
   - Download automatico quando pronto

4. Modificar `src/app/(dashboard)/projects/[id]/audits/[auditId]/page.tsx`
   - Adicionar ExportButton no header

### Fase 4: CSV e JSON

1. `src/lib/reports/csv-generator.ts`
   - Formatar violacoes como CSV
   - Incluir headers em PT-BR
   - Opcao de delimitador

2. `src/lib/reports/json-generator.ts`
   - Estrutura JSON documentada
   - Pretty print opcional

---

## Detalhes de Implementacao

### Calculo de Compliance WCAG

```typescript
function calculateWcagCompliance(violations: AggregatedViolation[], auditedCriteria: string[]): number {
  const failedCriteria = new Set(violations.flatMap(v => v.wcag_criteria))
  const passedCount = auditedCriteria.length - failedCriteria.size
  return (passedCount / auditedCriteria.length) * 100
}
```

### Organizacao por Principio WCAG

```typescript
const WCAG_PRINCIPLES = {
  '1': { name: 'Perceptivel', criteria: ['1.1.1', '1.2.1', ...] },
  '2': { name: 'Operavel', criteria: ['2.1.1', '2.2.1', ...] },
  '3': { name: 'Compreensivel', criteria: ['3.1.1', '3.2.1', ...] },
  '4': { name: 'Robusto', criteria: ['4.1.1', '4.1.2', ...] },
}
```

### Template PDF com Playwright

```typescript
async function generatePdf(html: string): Promise<Buffer> {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.setContent(html, { waitUntil: 'networkidle' })

  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:10px;text-align:center;width:100%;">Relatorio de Acessibilidade</div>',
    footerTemplate: '<div style="font-size:10px;text-align:center;width:100%;">Pagina <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
  })

  await browser.close()
  return pdf
}
```

---

## Migracao SQL

```sql
-- Tabela de relatorios gerados
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'executive_pdf', 'technical_pdf', 'csv', 'json'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  file_url TEXT, -- URL no Supabase Storage
  file_size INTEGER, -- Tamanho em bytes
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index para buscar relatorios de uma auditoria
CREATE INDEX idx_reports_audit_id ON reports(audit_id);

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports of their audits"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audits a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = reports.audit_id
      AND p.user_id = auth.uid()
    )
  );
```

---

## Checklist de Tarefas

### Infraestrutura
- [ ] Criar migracao SQL para tabela `reports`
- [ ] Criar bucket no Supabase Storage para relatorios
- [ ] Criar `src/lib/reports/types.ts`
- [ ] Criar `src/lib/reports/data-builder.ts`

### Geracao PDF
- [ ] Criar `src/lib/reports/templates/styles.ts`
- [ ] Criar `src/lib/reports/templates/charts.tsx`
- [ ] Criar `src/lib/reports/templates/executive.tsx`
- [ ] Criar `src/lib/reports/templates/technical.tsx`
- [ ] Criar `src/lib/reports/pdf-generator.ts`
- [ ] Criar `src/trigger/report.ts`

### API
- [ ] Criar `src/app/api/reports/route.ts`
- [ ] Criar `src/app/api/reports/[reportId]/route.ts`

### UI
- [ ] Criar `src/components/reports/export-button.tsx`
- [ ] Integrar ExportButton na pagina de resultados

### Exportacoes Adicionais
- [ ] Criar `src/lib/reports/csv-generator.ts`
- [ ] Criar `src/lib/reports/json-generator.ts`

### Testes e Polish
- [ ] Testar geracao com auditoria real
- [ ] Ajustar layout e cores
- [ ] Adicionar loading states
- [ ] Tratamento de erros

---

## Estimativa de Complexidade

| Fase | Arquivos | Complexidade |
|------|----------|--------------|
| 1. Infraestrutura | 4 | Media |
| 2. Templates PDF | 5 | Alta |
| 3. API e UI | 4 | Media |
| 4. CSV/JSON | 2 | Baixa |

**Dependencias**: Nenhuma nova (Playwright ja instalado)

---

## Exemplo Visual do Relatorio Executivo

```
+----------------------------------+
|         [LOGO]                   |
|                                  |
|   RELATORIO DE ACESSIBILIDADE    |
|   exemplo.com.br                 |
|   11 de Dezembro de 2025         |
+----------------------------------+

+----------------------------------+
|   SUMARIO EXECUTIVO              |
+----------------------------------+
|                                  |
|   [===78%===    ] Conformidade   |
|                                  |
|   +--------+  Problemas:         |
|   |   PIE  |  - 10 Criticos      |
|   | CHART  |  - 30 Serios        |
|   +--------+  - 60 Moderados     |
|               - 50 Menores       |
|                                  |
|   50 paginas auditadas           |
|   32 com problemas               |
|                                  |
|   TOP 3 PROBLEMAS:               |
|   1. Imagens sem alt (45x)       |
|   2. Contraste insuficiente (38x)|
|   3. Links sem nome (22x)        |
+----------------------------------+
```

---

## Proximos Passos Apos Aprovacao

1. Comecar pela Fase 1 (infraestrutura)
2. Criar um template visual minimo funcional
3. Testar com dados reais de uma auditoria existente
4. Iterar no design baseado em feedback
