/**
 * Mapeamento WCAG 2.x → ABNT NBR 17060
 */
export const ABNT_MAP: Record<string, string> = {
  // Princípio 1: Perceptível
  '1.1.1': 'ABNT 5.2.6',    // Conteúdo não textual
  '1.2.1': 'ABNT 5.4.1',    // Apenas áudio e apenas vídeo (pré-gravado)
  '1.2.2': 'ABNT 5.4.2',    // Legendas (pré-gravadas)
  '1.2.3': 'ABNT 5.4.3',    // Audiodescrição ou mídia alternativa (pré-gravado)
  '1.2.4': 'ABNT 5.4.4',    // Legendas (ao vivo)
  '1.2.5': 'ABNT 5.4.5',    // Audiodescrição (pré-gravada)
  '1.2.6': 'ABNT 5.4.6',    // Língua de sinais (pré-gravada)
  '1.2.7': 'ABNT 5.4.7',    // Audiodescrição estendida
  '1.2.8': 'ABNT 5.4.8',    // Mídia alternativa (pré-gravada)
  '1.2.9': 'ABNT 5.4.9',    // Apenas áudio (ao vivo)
  '1.3.1': 'ABNT 5.3.1',    // Informações e relações
  '1.3.2': 'ABNT 5.3.2',    // Sequência significativa
  '1.3.3': 'ABNT 5.3.3',    // Características sensoriais
  '1.3.4': 'ABNT 5.3.4',    // Orientação
  '1.3.5': 'ABNT 5.3.5',    // Identificar finalidade da entrada
  '1.3.6': 'ABNT 5.3.6',    // Identificar propósito
  '1.4.1': 'ABNT 5.11.1',   // Uso de cor
  '1.4.2': 'ABNT 5.11.2',   // Controle de áudio
  '1.4.3': 'ABNT 5.11.3',   // Contraste (mínimo)
  '1.4.4': 'ABNT 5.11.5',   // Redimensionar texto
  '1.4.5': 'ABNT 5.11.6',   // Imagens de texto
  '1.4.6': 'ABNT 5.11.4',   // Contraste (melhorado)
  '1.4.7': 'ABNT 5.11.8',   // Som baixo ou sem som de fundo
  '1.4.8': 'ABNT 5.11.7',   // Apresentação visual
  '1.4.9': 'ABNT 5.11.9',   // Imagens de texto (sem exceção)
  '1.4.10': 'ABNT 5.11.10', // Refluxo
  '1.4.11': 'ABNT 5.11.11', // Contraste não textual
  '1.4.12': 'ABNT 5.11.12', // Espaçamento de texto
  '1.4.13': 'ABNT 5.11.13', // Conteúdo em hover ou focus

  // Princípio 2: Operável
  '2.1.1': 'ABNT 5.5.1',    // Teclado
  '2.1.2': 'ABNT 5.5.2',    // Sem bloqueio de teclado
  '2.1.3': 'ABNT 5.5.3',    // Teclado (sem exceção)
  '2.1.4': 'ABNT 5.5.4',    // Atalhos de teclado
  '2.2.1': 'ABNT 5.6.1',    // Tempo ajustável
  '2.2.2': 'ABNT 5.6.2',    // Pausar, parar, ocultar
  '2.2.3': 'ABNT 5.6.3',    // Sem tempo
  '2.2.4': 'ABNT 5.6.4',    // Interrupções
  '2.2.5': 'ABNT 5.6.5',    // Nova autenticação
  '2.2.6': 'ABNT 5.6.6',    // Tempos limite
  '2.3.1': 'ABNT 5.10.1',   // Três flashes ou abaixo do limite
  '2.3.2': 'ABNT 5.10.2',   // Três flashes
  '2.3.3': 'ABNT 5.10.3',   // Animação de interações
  '2.4.1': 'ABNT 5.7.1',    // Ignorar blocos
  '2.4.2': 'ABNT 5.7.2',    // Título da página
  '2.4.3': 'ABNT 5.7.3',    // Ordem do foco
  '2.4.4': 'ABNT 5.7.10',   // Finalidade do link (em contexto)
  '2.4.5': 'ABNT 5.7.5',    // Múltiplas formas
  '2.4.6': 'ABNT 5.7.6',    // Cabeçalhos e rótulos
  '2.4.7': 'ABNT 5.7.7',    // Foco visível
  '2.4.8': 'ABNT 5.7.8',    // Localização
  '2.4.9': 'ABNT 5.7.9',    // Finalidade do link (apenas link)
  '2.4.10': 'ABNT 5.7.4',   // Cabeçalhos de seção
  '2.4.11': 'ABNT 5.7.11',  // Aparência do foco
  '2.4.12': 'ABNT 5.7.12',  // Foco não obscurecido
  '2.4.13': 'ABNT 5.7.13',  // Foco não obscurecido (melhorado)
  '2.5.1': 'ABNT 5.9.1',    // Gestos de ponteiro
  '2.5.2': 'ABNT 5.9.2',    // Cancelamento de ponteiro
  '2.5.3': 'ABNT 5.9.3',    // Rótulo no nome
  '2.5.4': 'ABNT 5.9.4',    // Atuação de movimento
  '2.5.5': 'ABNT 5.9.5',    // Tamanho do alvo
  '2.5.6': 'ABNT 5.9.6',    // Mecanismos de entrada simultâneos
  '2.5.7': 'ABNT 5.9.7',    // Movimentos de arrasto
  '2.5.8': 'ABNT 5.9.8',    // Tamanho do alvo (mínimo)

  // Princípio 3: Compreensível
  '3.1.1': 'ABNT 5.13.2',   // Idioma da página
  '3.1.2': 'ABNT 5.13.3',   // Idioma de partes
  '3.1.3': 'ABNT 5.13.4',   // Palavras incomuns
  '3.1.4': 'ABNT 5.13.5',   // Abreviações
  '3.1.5': 'ABNT 5.13.6',   // Nível de leitura
  '3.1.6': 'ABNT 5.13.7',   // Pronúncia
  '3.2.1': 'ABNT 5.12.1',   // Em foco
  '3.2.2': 'ABNT 5.12.2',   // Em entrada
  '3.2.3': 'ABNT 5.12.3',   // Navegação consistente
  '3.2.4': 'ABNT 5.12.4',   // Identificação consistente
  '3.2.5': 'ABNT 5.12.5',   // Mudança a pedido
  '3.2.6': 'ABNT 5.12.6',   // Ajuda consistente
  '3.3.1': 'ABNT 5.14.1',   // Identificação de erro
  '3.3.2': 'ABNT 5.14.2',   // Rótulos ou instruções
  '3.3.3': 'ABNT 5.14.3',   // Sugestão de erro
  '3.3.4': 'ABNT 5.14.4',   // Prevenção de erro (legal, financeiro, dados)
  '3.3.5': 'ABNT 5.14.5',   // Ajuda
  '3.3.6': 'ABNT 5.14.6',   // Prevenção de erro (todos)
  '3.3.7': 'ABNT 5.14.7',   // Entrada redundante
  '3.3.8': 'ABNT 5.14.8',   // Autenticação acessível
  '3.3.9': 'ABNT 5.14.9',   // Autenticação acessível (sem exceção)

  // Princípio 4: Robusto
  '4.1.1': 'ABNT 5.13.11',  // Análise
  '4.1.2': 'ABNT 5.13.13',  // Nome, função, valor
  '4.1.3': 'ABNT 5.13.14',  // Mensagens de status
}
