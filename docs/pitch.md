# Pitch: Plataforma de Auditoria de Acessibilidade Digital

## O Problema

**No Brasil, 45 milhões de pessoas têm algum tipo de deficiência** - e a maioria dos sites e aplicativos simplesmente não funciona para elas.

- 🏛️ **Lei Brasileira de Inclusão (LBI)** exige acessibilidade digital desde 2016
- 📋 **eMAG 3.1** é obrigatório para sites governamentais
- 💰 **Multas e processos** estão crescendo exponencialmente
- 🌍 **Concorrentes internacionais** (Siteimprove, Deque, Level Access) **não entendem o contexto brasileiro**

## A Solução

Uma **plataforma completa de conformidade de acessibilidade** focada no mercado brasileiro, que combina:

### 1\. Auditoria Automatizada Inteligente

- **Varredura profunda** de sites usando Playwright + axe-core
- **Descoberta automática** de páginas (sitemap + crawling)
- **5 workers paralelos** para auditorias rápidas
- **Detecção de SPAs** (React, Vue, Angular)

### 2\. Regras Brasileiras Exclusivas (27 regras customizadas)

| O que detectamos               | Por que importa                 |
| ------------------------------ | ------------------------------- |
| VLibras/Hand Talk ausente      | Requisito de Libras para gov.br |
| Barra de acessibilidade gov.br | Padrão obrigatório              |
| Links "clique aqui"            | Problema #1 em sites BR         |
| Legibilidade em português      | Fórmula Flesch-PT adaptada      |
| Texto justificado/maiúsculo    | AAA mas comum em BR             |
| PDFs sem alternativa           | Muito usado em gov.br           |

### 3\. Conformidade com Padrões Brasileiros

| Padrão             | Cobertura         | Status                |
| ------------------ | ----------------- | --------------------- |
| **eMAG 3.1**       | 46 recomendações  | ✅ Completo           |
| **WCAG 2.2**       | Níveis A, AA, AAA | ✅ Completo           |
| **ABNT NBR 17060** | Apps mobile       | 🔄 Em desenvolvimento |

### 4\. Monitoramento Contínuo

- ⏰ **Auditorias agendadas** (diária, semanal, mensal)
- 📊 **Dashboard de evolução** com tendências
- 📧 **Alertas por email** quando score cai
- 🔄 **Comparação entre auditorias** (novas vs corrigidas)

### 5\. Relatórios Profissionais

- 📄 **Relatório eMAG** para conformidade governamental
- 📊 **Dashboard executivo** para gestores
- 🔧 **Relatório técnico** para desenvolvedores
- 📋 **VPATs/ACRs** para licitações (roadmap)

## Diferenciais Competitivos

### Por que somos únicos?

| Feature                | Nós   | Siteimprove | Deque    | Level Access |
| ---------------------- | ----- | ----------- | -------- | ------------ |
| **eMAG 3.1 completo**  | ✅    | ❌          | ❌       | ❌           |
| **Regras brasileiras** | ✅ 27 | ❌          | ❌       | ❌           |
| **Detecção VLibras**   | ✅    | ❌          | ❌       | ❌           |
| **Legibilidade PT-BR** | ✅    | ❌ só EN    | ❌ só EN | ❌ só EN     |
| **Barra gov.br**       | ✅    | ❌          | ❌       | ❌           |
| **Preço acessível**    | ✅    | $$$$        | $$$$     | $$$$         |

### Acessibilidade Cognitiva (COGA)

**Nenhum concorrente faz isso bem** - temos 6 regras específicas:

- Texto complexo (Flesch < 50)
- Siglas sem expansão
- Idioma inconsistente
- Timeout sem aviso
- CAPTCHA sem alternativa
- Animação infinita

## Como Funciona

```
1\. Cadastre seu projeto (URL base)
           ↓
2. Configure agendamento (diário/semanal/mensal)
           ↓
3. Plataforma descobre páginas automaticamente
           ↓
4. Auditoria em background (5 páginas paralelas)
           ↓
5. Dashboard com score de saúde (0-100%)
           ↓
6. Lista priorizada de correções
           ↓
7. Sugestões de código com IA
           ↓
8. Verificação se corrigiu
           ↓
9. Relatório de conformidade eMAG

```

## Métricas de Valor

### Score de Saúde da Acessibilidade

```
90-100% → Excelente (verde)
70-89%  → Bom (amarelo)
50-69%  → Regular (laranja)
0-49%   → Crítico (vermelho)

```

**Fórmula ponderada por impacto:**

- Crítico: peso 10x
- Sério: peso 5x
- Moderado: peso 2x
- Menor: peso 1x

## Público-Alvo

### 1\. Órgãos Governamentais

- Obrigação legal (eMAG)
- Risco de processos
- Relatórios para TCU/CGU

### 2\. Grandes Empresas

- Conformidade com LBI
- ESG e reputação
- Licitações públicas

### 3\. Agências Digitais

- Entregar sites acessíveis
- Diferenciar da concorrência
- White-label (roadmap)

### 4\. Startups e PMEs

- Preço acessível
- Evitar dívida técnica
- Alcançar mais usuários

## Modelo de Negócio (Proposta)

| Plano          | Preço        | Projetos  | Auditorias/mês |
| -------------- | ------------ | --------- | -------------- |
| **Starter**    | R$ 99/mês    | 1         | 10             |
| **Pro**        | R$ 299/mês   | 5         | 50             |
| **Business**   | R$ 799/mês   | 20        | 200            |
| **Enterprise** | Sob consulta | Ilimitado | Ilimitado      |

## Roadmap

### ✅ Hoje (MVP)

- Auditoria automatizada
- 27 regras brasileiras
- eMAG 3.1 completo
- Agendamento automático
- Comparação de auditorias

### 🔄 Próximos 3 meses

- API pública + GitHub Action
- Extensão Chrome
- Notificações por email
- VPATs/ACRs

### 🔮 6-12 meses

- Multi-tenancy (times)
- Simulador de daltonismo
- Assistente IA (chatbot)
- ABNT NBR 17060 completo

## Por Que Agora?

1.  **Fiscalização aumentando** - MPF e Procon mais ativos
2.  **Multas crescentes** - Até R$ 50 milhões (LBI)
3.  **Mercado em expansão** - PIB da pessoa com deficiência = R$ 22 bilhões
4.  **Concorrência cara** - Siteimprove custa $10.000+/ano
5.  **Lacuna de mercado** - Ninguém foca no Brasil
