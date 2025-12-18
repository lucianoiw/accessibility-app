# Prompt: Implementar Regras WCAG de Deteccao Parcial

## Contexto

Estou desenvolvendo uma plataforma de auditoria de acessibilidade web **internacional** com diferenciais para o contexto brasileiro. O sistema usa Playwright para automacao de browser e axe-core via `@axe-core/playwright` para deteccao de violacoes WCAG.

**IMPORTANTE - Internacionalizacao:**
- A plataforma suporta **3 idiomas** (pt-BR, en, es)
- Deve funcionar com sites em **qualquer idioma**
- Regras que dependem de deteccao de texto devem incluir termos em **pelo menos ingles e portugues**
- Mensagens de violacao devem usar o sistema de i18n (chaves de traducao, nao texto hardcoded)

Temos regras customizadas brasileiras em `src/lib/audit/custom-rules.ts` e `src/lib/audit/coga-rules.ts` que complementam o axe-core.

Atualmente, varios criterios WCAG estao marcados como "Precisa de verificacao manual" no nosso Resumo de Conformidade. O objetivo e criar regras que detectem PARCIALMENTE esses criterios - identificando os casos mais comuns programaticamente.

## Objetivo

Criar novas regras customizadas para detectar PARCIALMENTE criterios WCAG que atualmente estao marcados como "verificacao manual".

**IMPORTANTE**: O objetivo NAO e cobrir 100% do criterio, mas detectar os casos mais comuns que podem ser identificados programaticamente. Preferimos falsos negativos a falsos positivos.

## Arquivos de Referencia

Antes de comecar, leia estes arquivos para entender o padrao:

- `src/lib/audit/custom-rules.ts` - Regras customizadas existentes (21 regras)
- `src/lib/audit/coga-rules.ts` - Regras COGA existentes (6 regras)
- `src/lib/audit/rule-labels.ts` - Labels em PT-BR para cada regra
- `src/lib/audit/emag-map.ts` - Mapeamento eMAG
- `src/lib/audit/auditor.ts` - Como as regras sao executadas

## Padrao de Implementacao

Cada regra deve seguir este formato (baseado no padrao existente):

```typescript
export interface WcagPartialRule {
  id: string
  wcagSC: string // Ex: '1.3.5', '1.4.1'
  wcagLevel: 'A' | 'AA' | 'AAA'
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string  // Descricao interna (nao exibida ao usuario)
  check: (page: Page) => Promise<WcagPartialViolation[]>
}

export interface WcagPartialViolation {
  element: string                          // Seletor CSS ou descricao
  html: string                             // HTML do elemento (truncado se muito grande)
  xpath: string                            // XPath para localizacao precisa
  wcagSC: string                           // Criterio WCAG relacionado
  ruleId: string                           // ID da regra que gerou
  needsReview: true                        // Sempre true para essas regras parciais
  // i18n - NUNCA usar texto hardcoded
  messageKey: string                       // Chave i18n: "WcagPartial.{ruleId}.message"
  messageParams?: Record<string, string>   // Parametros para interpolacao
}
```

**IMPORTANTE**: Mensagens de violacao devem usar chaves i18n, nao texto hardcoded. Isso permite que as mensagens sejam traduzidas para todos os idiomas suportados (pt-BR, en, es).

## Regras para Implementar

### FASE 1: Alta Prioridade (Facil implementacao, alto impacto)

#### 1.1 `input-sem-autocomplete` (WCAG 1.3.5 - Nivel AA)

**O que detectar:**
- Inputs de dados pessoais sem atributo `autocomplete`
- Campos que pelo `type`, `name`, `id` ou `placeholder` sugerem dados pessoais

**Mapeamento de campos (MULTILINGUE - EN + PT-BR + ES):**
```typescript
const autocompleteMap = {
  // Nome (EN + PT + ES)
  name: ['name', 'nome', 'nombre', 'full-name', 'fullname', 'your-name', 'nome-completo'],
  givenName: ['first-name', 'firstname', 'fname', 'primeiro-nome', 'given-name', 'primer-nombre'],
  familyName: ['last-name', 'lastname', 'lname', 'sobrenome', 'surname', 'apellido', 'family-name'],

  // Contato (EN + PT + ES)
  email: ['email', 'e-mail', 'mail', 'correo', 'correo-electronico'],
  tel: ['phone', 'telefone', 'tel', 'celular', 'mobile', 'whatsapp', 'telephone',
        'cell', 'phone-number', 'telefono', 'movil'],

  // Endereco (EN + PT + ES)
  streetAddress: ['address', 'endereco', 'street', 'rua', 'logradouro', 'direccion',
                  'calle', 'street-address', 'address-line1'],
  postalCode: ['zip', 'cep', 'postal', 'zipcode', 'postal-code', 'postcode', 'codigo-postal'],
  city: ['city', 'cidade', 'locality', 'ciudad', 'town'],
  state: ['state', 'estado', 'region', 'uf', 'province', 'provincia'],
  country: ['country', 'pais', 'nation', 'country-name'],

  // Pagamento (universal - termos tecnicos)
  ccNumber: ['card-number', 'cc-number', 'cardnumber', 'numero-cartao', 'credit-card',
             'card', 'numero-tarjeta'],
  ccExp: ['expiry', 'exp-date', 'validade', 'cc-exp', 'expiration', 'exp-month', 'exp-year',
          'vencimiento', 'fecha-expiracion'],
  ccCsc: ['cvv', 'cvc', 'csc', 'security-code', 'codigo-seguranca', 'codigo-seguridad'],
  ccName: ['cc-name', 'cardholder', 'card-holder', 'nome-cartao', 'titular'],

  // Documentos BR (diferencial brasileiro - manter)
  cpf: ['cpf', 'tax-id', 'taxpayer-id'],
  cnpj: ['cnpj', 'company-tax-id', 'business-id'],
  rg: ['rg', 'identidade', 'identity-card'],

  // Outros (EN + PT + ES)
  bday: ['birthday', 'birth-date', 'nascimento', 'data-nascimento', 'dob', 'date-of-birth',
         'birthdate', 'fecha-nacimiento', 'cumpleanos'],
  username: ['username', 'user', 'usuario', 'login', 'user-name', 'account', 'cuenta'],
  newPassword: ['new-password', 'nova-senha', 'create-password', 'nueva-contrasena'],
  currentPassword: ['current-password', 'senha-atual', 'password', 'senha', 'old-password',
                    'contrasena', 'clave'],
  organization: ['organization', 'company', 'empresa', 'organizacao', 'org', 'compania'],
}
```

**Logica:**
1. Buscar todos os `<input>` (exceto hidden, submit, button, reset, image)
2. Para cada input, verificar se `name`, `id`, `placeholder`, `aria-label` contem palavras-chave
3. Se contem e NAO tem `autocomplete`, reportar
4. Ignorar inputs dentro de `[role="search"]` ou com `autocomplete="off"` explicito

**Mensagem:**
> "Este campo parece coletar {tipo_dado} mas nao possui atributo `autocomplete`. Adicionar `autocomplete=\"{valor_sugerido}\"` melhora a experiencia de usuarios com deficiencias cognitivas e motoras."

---

#### 1.2 `link-sem-underline-em-texto` (WCAG 1.4.1 - Nivel A)

**O que detectar:**
- Links dentro de blocos de texto (paragrafos, listas) que nao tem underline
- Links que dependem APENAS de cor para diferenciacao

**Logica:**
1. Buscar todos os `<a>` que estao dentro de `<p>`, `<li>`, `<td>`, `<dd>`, `<figcaption>`
2. Verificar `getComputedStyle`:
   - `textDecoration` nao contem 'underline'
   - E nao tem borda inferior visivel (border-bottom)
3. Ignorar:
   - Links que sao o unico conteudo do paragrafo
   - Links dentro de `<nav>`, `<header>`, `<footer>`, `[role="navigation"]`
   - Links com icones (tem `<svg>`, `<img>`, `::before`/`::after` com content)
   - Links que sao botoes estilizados (tem `role="button"` ou classe btn/button)

**Mensagem:**
> "Este link dentro de texto nao possui sublinhado e pode depender apenas de cor para diferenciacao. Usuarios com daltonismo podem nao identifica-lo como link. Considere adicionar `text-decoration: underline` ou outro indicador visual alem de cor."

---

#### 1.3 `video-sem-legendas` (WCAG 1.2.1, 1.2.2 - Nivel A)

**O que detectar:**
- Elementos `<video>` sem `<track kind="captions">` ou `<track kind="subtitles">`
- Iframes de YouTube/Vimeo (alerta para verificar se legendas estao ativas)

**Logica:**
1. Buscar todos os `<video>`:
   - Verificar se tem `<track>` filho com `kind="captions"` ou `kind="subtitles"`
   - Se nao tem, reportar
2. Buscar iframes com src contendo:
   - `youtube.com/embed`
   - `player.vimeo.com`
   - `dailymotion.com/embed`
   - Reportar como "verificar se legendas estao habilitadas"

**Mensagem (video nativo):**
> "Este video nao possui track de legendas (`<track kind=\"captions\">`). Se o video contem audio falado, legendas sao obrigatorias para usuarios surdos ou com deficiencia auditiva."

**Mensagem (iframe):**
> "Este video incorporado ({plataforma}) deve ter legendas habilitadas na plataforma de origem. Verifique se o video possui legendas disponiveis e se estao ativas por padrao ou facilmente ativaveis."

---

#### 1.4 `video-sem-audiodescricao` (WCAG 1.2.3, 1.2.5 - Nivel A/AA)

**O que detectar:**
- Elementos `<video>` sem `<track kind="descriptions">`

**Logica:**
1. Buscar todos os `<video>`:
   - Verificar se tem `<track>` filho com `kind="descriptions"`
   - Se nao tem, reportar

**Mensagem:**
> "Este video nao possui track de audiodescricao (`<track kind=\"descriptions\">`). Se o video contem informacoes visuais importantes nao descritas no audio, audiodescricao e necessaria para usuarios cegos."

---

#### 1.5 `select-onchange-navega` (WCAG 3.2.2 - Nivel A)

**O que detectar:**
- `<select>` com evento `onchange` que causa navegacao automatica

**Logica:**
1. Buscar todos os `<select>` com atributo `onchange`
2. Verificar se o valor contem padroes de navegacao:
   - `location.href`
   - `location.assign`
   - `location.replace`
   - `window.location`
   - `document.location`
   - `navigate(`
   - `router.push`
   - `router.replace`
   - `this.form.submit`
   - `submit()`
3. Tambem verificar event listeners via evaluate (mais complexo)

**Mensagem:**
> "Este select parece navegar automaticamente ao mudar a selecao. Isso pode desorientar usuarios de leitores de tela que navegam pelas opcoes. Considere adicionar um botao 'Ir' separado para confirmar a navegacao."

---

### FASE 2: Media Prioridade

#### 2.1 `tabindex-positivo` (WCAG 2.4.3 - Nivel A)

**O que detectar:**
- Elementos com `tabindex` maior que 0

**Logica:**
1. Buscar todos os elementos com `[tabindex]`
2. Filtrar onde `parseInt(tabindex) > 0`

**Mensagem:**
> "Este elemento possui `tabindex=\"{valor}\"`. Valores positivos de tabindex alteram a ordem natural de foco e podem confundir usuarios de teclado. Use `tabindex=\"0\"` para adicionar ao fluxo natural ou `tabindex=\"-1\"` para foco programatico apenas."

---

#### 2.2 `orientacao-bloqueada` (WCAG 1.3.4 - Nivel AA)

**O que detectar:**
- CSS que forca orientacao especifica

**Logica:**
1. Buscar todas as stylesheets (inline e externas)
2. Procurar por:
   - `@media (orientation: portrait)` com regras que escondem conteudo
   - `@media (orientation: landscape)` com regras que escondem conteudo
   - `screen and (orientation: ...)` com `display: none`, `visibility: hidden`
3. Verificar meta viewport com restricoes

**Mensagem:**
> "Esta pagina parece restringir a orientacao para {portrait/landscape}. Usuarios com dispositivos montados em posicao fixa (ex: cadeira de rodas) podem nao conseguir girar o dispositivo. A orientacao deve ser flexivel exceto quando essencial."

---

#### 2.3 `conteudo-hover-problematico` (WCAG 1.4.13 - Nivel AA)

**O que detectar:**
- Elementos que aparecem em hover mas podem ter problemas de acessibilidade

**Logica:**
1. Buscar elementos com CSS `:hover` que muda `display`, `visibility`, `opacity`
2. Verificar tooltips customizados (elementos com `role="tooltip"` ou classes comuns)
3. Verificar se:
   - Tem como dismissar (ESC handler)
   - O conteudo que aparece e hoverable
   - Nao desaparece imediatamente ao mover mouse

**Mensagem:**
> "Este conteudo aparece ao passar o mouse. Verifique se: (1) pode ser dispensado sem mover o mouse (ex: tecla ESC), (2) o ponteiro pode mover sobre o conteudo novo sem ele desaparecer, (3) permanece visivel ate ser dispensado ou perder relevancia."

---

#### 2.4 `modal-sem-focus-trap` (WCAG 2.1.2 - Nivel A)

**O que detectar:**
- Modais/dialogs que nao prendem o foco corretamente
- Ou que prendem mas nao tem como sair

**Logica:**
1. Buscar elementos com `role="dialog"` ou `role="alertdialog"` ou `<dialog>`
2. Verificar se:
   - Tem `aria-modal="true"`
   - Tem elementos focaveis dentro
   - Tem botao de fechar visivel
   - Tem handler para ESC (verificar via atributos ou heuristica)

**Mensagem:**
> "Este modal/dialog pode ter problemas de acessibilidade de teclado. Verifique se: (1) o foco fica preso dentro do modal enquanto aberto, (2) a tecla ESC fecha o modal, (3) ao fechar, o foco retorna ao elemento que abriu o modal."

---

#### 2.5 `animacao-longa-sem-pause` (WCAG 2.2.2 - Nivel A)

**O que detectar:**
- Animacoes CSS com duracao longa ou infinita
- GIFs animados
- Videos em autoplay loop

**Logica:**
1. Verificar CSS animations:
   - `animation-iteration-count: infinite`
   - `animation-duration` > 5s
2. Detectar GIFs (verificar src de imagens terminando em .gif)
3. Verificar `<video autoplay loop>`
4. Verificar se existe mecanismo de pause proximo:
   - Botao com texto/aria-label contendo "pause", "parar", "stop"
   - `prefers-reduced-motion` sendo respeitado

**Mensagem:**
> "Esta animacao/movimento dura mais de 5 segundos ou e infinita. Usuarios com deficiencias cognitivas ou vestibulares podem precisar pausar. Forneca um mecanismo para pausar, parar ou ocultar o conteudo em movimento."

---

### FASE 3: Baixa Prioridade (Mais complexo)

#### 3.1 `referencia-sensorial` (WCAG 1.3.3 - Nivel A)

**O que detectar:**
- Texto que usa referencias puramente sensoriais

**Palavras-chave para detectar (MULTILINGUE - EN + PT-BR + ES):**
```typescript
const sensorialTerms = {
  // Cores (EN + PT + ES)
  color: {
    en: ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'black', 'white',
         'colored button', 'green link', 'red text', 'highlighted in'],
    pt: ['vermelho', 'verde', 'azul', 'amarelo', 'laranja', 'roxo', 'rosa', 'preto', 'branco',
         'botao colorido', 'link verde', 'texto em vermelho', 'destacado em'],
    es: ['rojo', 'verde', 'azul', 'amarillo', 'naranja', 'morado', 'rosa', 'negro', 'blanco',
         'boton de color', 'enlace verde', 'texto en rojo'],
  },

  // Posicao (EN + PT + ES)
  position: {
    en: ['on the left', 'on the right', 'above', 'below', 'at the top', 'at the bottom',
         'in the corner', 'next to the', 'beside the', 'under the'],
    pt: ['a esquerda', 'a direita', 'acima', 'abaixo', 'no topo', 'embaixo',
         'no canto', 'ao lado do', 'junto ao', 'sob o'],
    es: ['a la izquierda', 'a la derecha', 'arriba', 'abajo', 'en la parte superior',
         'en la parte inferior', 'en la esquina', 'junto al'],
  },

  // Forma (EN + PT + ES)
  shape: {
    en: ['circular', 'square', 'round', 'triangular', 'rectangular', 'oval'],
    pt: ['circular', 'quadrado', 'redondo', 'triangular', 'retangular', 'oval'],
    es: ['circular', 'cuadrado', 'redondo', 'triangular', 'rectangular', 'ovalado'],
  },

  // Tamanho (EN + PT + ES)
  size: {
    en: ['large button', 'small icon', 'big', 'tiny', 'the larger', 'the smaller'],
    pt: ['botao grande', 'icone pequeno', 'grande', 'pequeno', 'o maior', 'o menor'],
    es: ['boton grande', 'icono pequeno', 'grande', 'pequeno', 'el mas grande', 'el mas pequeno'],
  },
}

// Flatten para busca (combina todos os idiomas)
const allSensorialTerms = Object.values(sensorialTerms)
  .flatMap(category => Object.values(category).flat())
```

**Contexto para buscar:**
- Instrucoes (`<p>` proximo a forms, `.instructions`, `.help-text`)
- Labels de erro
- Textos de ajuda
- Alt text de imagens

**Mensagem:**
> "Este texto usa referencia sensorial ('{termo_encontrado}'). Usuarios que nao podem ver {cor/posicao/forma} nao entenderao a instrucao. Adicione uma referencia nao-sensorial, como o nome do elemento ou sua funcao."

---

#### 3.2 `imagem-de-texto-provavel` (WCAG 1.4.5 - Nivel AA)

**O que detectar:**
- Imagens que provavelmente contem texto

**Heuristicas:**
1. Imagens com aspect ratio tipico de botoes/banners (muito largo e baixo)
2. Imagens pequenas (< 200x50) que nao sao icones
3. Alt text que parece ser transcricao do texto da imagem
4. Imagens com nomes sugestivos: `banner-*.png`, `button-*.png`, `*-text.png`
5. Imagens com tamanho de arquivo muito pequeno para foto (< 5KB para imagem grande)

**Mensagem:**
> "Esta imagem pode conter texto. Imagens de texto nao redimensionam bem e nao podem ser personalizadas pelo usuario. Se possivel, use texto real com CSS para estilizacao. Se for logo ou texto essencial em formato especifico, certifique-se que o alt text contem todo o texto da imagem."

---

#### 3.3 `form-erro-sem-sugestao` (WCAG 3.3.3 - Nivel AA)

**O que detectar:**
- Campos com validacao que mostram erro mas nao sugerem correcao

**Logica:**
1. Buscar inputs com `[aria-invalid="true"]` ou `.error`, `.invalid`, `.is-invalid`
2. Buscar mensagem de erro associada (`aria-describedby`, `.error-message`, adjacente)
3. Verificar se mensagem e generica demais (MULTILINGUE):
   ```typescript
   const genericErrorMessages = {
     en: ['invalid', 'error', 'required', 'wrong', 'incorrect', 'please fix',
          'not valid', 'field required', 'this field is required'],
     pt: ['invalido', 'erro', 'obrigatorio', 'incorreto', 'corrija', 'preencha',
          'campo invalido', 'campo obrigatorio', 'este campo e obrigatorio'],
     es: ['invalido', 'error', 'requerido', 'incorrecto', 'corrija',
          'campo invalido', 'campo requerido', 'este campo es requerido'],
   }
   ```
4. Verificar se input tem `pattern` mas mensagem nao explica o formato esperado

**Mensagem:**
> "Este campo mostra erro mas a mensagem nao sugere como corrigir. Mensagens de erro devem explicar o problema E como resolve-lo. Ex: em vez de 'Email invalido', use 'Email invalido. Use o formato nome@exemplo.com'."

---

## Entregaveis

### 1. Criar arquivo principal
`src/lib/audit/wcag-partial-rules.ts`

### 2. Atualizar labels (via i18n)

Os labels devem ser adicionados nos arquivos de mensagens i18n, NAO em `rule-labels.ts`:

**src/messages/pt-BR.json:**
```json
{
  "RuleLabels": {
    "input-sem-autocomplete": "Campo sem autocomplete apropriado",
    "link-sem-underline-em-texto": "Link em texto sem sublinhado",
    "video-sem-legendas": "Vídeo sem legendas",
    "video-sem-audiodescricao": "Vídeo sem audiodescrição",
    "select-onchange-navega": "Select que navega automaticamente",
    "tabindex-positivo": "Tabindex com valor positivo",
    "orientacao-bloqueada": "Orientação de tela bloqueada",
    "conteudo-hover-problematico": "Conteúdo em hover pode ser inacessível",
    "modal-sem-focus-trap": "Modal com possível problema de foco",
    "animacao-longa-sem-pause": "Animação longa sem controle de pause",
    "referencia-sensorial": "Instrução usa referência sensorial",
    "imagem-de-texto-provavel": "Imagem que provavelmente contém texto",
    "form-erro-sem-sugestao": "Erro de formulário sem sugestão de correção"
  }
}
```

**src/messages/en.json:**
```json
{
  "RuleLabels": {
    "input-sem-autocomplete": "Field missing autocomplete attribute",
    "link-sem-underline-em-texto": "Link in text without underline",
    "video-sem-legendas": "Video without captions",
    "video-sem-audiodescricao": "Video without audio description",
    "select-onchange-navega": "Select that auto-navigates on change",
    "tabindex-positivo": "Positive tabindex value",
    "orientacao-bloqueada": "Screen orientation locked",
    "conteudo-hover-problematico": "Hover content may be inaccessible",
    "modal-sem-focus-trap": "Modal with possible focus trap issue",
    "animacao-longa-sem-pause": "Long animation without pause control",
    "referencia-sensorial": "Instructions use sensory reference",
    "imagem-de-texto-provavel": "Image likely contains text",
    "form-erro-sem-sugestao": "Form error without correction suggestion"
  }
}
```

**src/messages/es.json:**
```json
{
  "RuleLabels": {
    "input-sem-autocomplete": "Campo sin atributo autocomplete",
    "link-sem-underline-em-texto": "Enlace en texto sin subrayado",
    "video-sem-legendas": "Video sin subtítulos",
    "video-sem-audiodescricao": "Video sin audiodescripción",
    "select-onchange-navega": "Select que navega automáticamente",
    "tabindex-positivo": "Valor de tabindex positivo",
    "orientacao-bloqueada": "Orientación de pantalla bloqueada",
    "conteudo-hover-problematico": "Contenido en hover puede ser inaccesible",
    "modal-sem-focus-trap": "Modal con posible problema de foco",
    "animacao-longa-sem-pause": "Animación larga sin control de pausa",
    "referencia-sensorial": "Instrucciones usan referencia sensorial",
    "imagem-de-texto-provavel": "Imagen que probablemente contiene texto",
    "form-erro-sem-sugestao": "Error de formulario sin sugerencia de corrección"
  }
}
```

### 3. Integrar no auditor
Atualizar `src/lib/audit/auditor.ts` para importar e executar as novas regras

### 4. Atualizar emag-map se aplicavel
Algumas regras mapeiam para eMAG:
- `video-sem-legendas` -> eMAG 5.1 (Alternativa para video)
- `video-sem-audiodescricao` -> eMAG 5.2 (Audiodescricao)
- `select-onchange-navega` -> eMAG 2.1 (Nao provocar mudanca automatica)

### 5. Criar testes
`__tests__/lib/audit/wcag-partial-rules.test.ts`

Testes devem incluir:
- HTML que DEVE ser detectado (em ingles E portugues)
- HTML que NAO deve ser detectado (falsos positivos a evitar)
- Edge cases
- **Testes multilingues**: Verificar que deteccao funciona com termos em EN, PT-BR e ES

Exemplo de estrutura de teste:
```typescript
describe('input-sem-autocomplete', () => {
  // Deve detectar em ingles
  it('should detect email field without autocomplete (EN)', async () => {
    const html = '<input type="text" name="email" placeholder="Your email">'
    // ...
  })

  // Deve detectar em portugues
  it('should detect email field without autocomplete (PT-BR)', async () => {
    const html = '<input type="text" name="email" placeholder="Seu email">'
    // ...
  })

  // Deve detectar em espanhol
  it('should detect email field without autocomplete (ES)', async () => {
    const html = '<input type="text" name="correo" placeholder="Tu correo">'
    // ...
  })

  // NAO deve detectar se autocomplete presente
  it('should NOT detect if autocomplete is present', async () => {
    const html = '<input type="text" name="email" autocomplete="email">'
    // ...
  })
})
```

## Observacoes Importantes

1. **Preferir falsos negativos**: E melhor nao detectar algo do que reportar falso positivo
2. **Mensagens educativas**: Explicar o problema E como resolver
3. **Flag needsReview**: Sempre `true` para indicar que precisa verificacao humana
4. **Performance**: Regras rodam em todas as paginas, evitar operacoes pesadas
5. **Deteccao multilingue**: Incluir termos em ingles E portugues (espanhol como bonus)
6. **Mensagens via i18n**: Usar chaves de traducao, nao texto hardcoded

## Regras Agnosticas de Idioma

Estas regras funcionam independente do idioma do site (analisam HTML/CSS, nao texto):

| Regra | Por que e agnostica |
|-------|---------------------|
| `link-sem-underline-em-texto` | Analisa CSS (`text-decoration`) |
| `video-sem-legendas` | Verifica `<track kind="captions">` |
| `video-sem-audiodescricao` | Verifica `<track kind="descriptions">` |
| `select-onchange-navega` | Analisa codigo JS (`location.href`) |
| `tabindex-positivo` | Verifica atributo numerico |
| `orientacao-bloqueada` | Analisa CSS media queries |
| `conteudo-hover-problematico` | Analisa CSS `:hover` |
| `modal-sem-focus-trap` | Verifica `role="dialog"`, `aria-modal` |
| `animacao-longa-sem-pause` | Analisa CSS animation, GIFs |
| `imagem-de-texto-provavel` | Heuristicas de tamanho/nome de arquivo |

## Regras que Requerem Deteccao Multilingue

Estas regras dependem de deteccao de texto e DEVEM incluir termos em multiplos idiomas:

| Regra | Termos a incluir |
|-------|------------------|
| `input-sem-autocomplete` | Nomes de campos (name, nome, nombre, etc.) |
| `referencia-sensorial` | Cores, posicoes, formas, tamanhos |
| `form-erro-sem-sugestao` | Mensagens de erro genericas |

## Sistema de i18n para Mensagens

As mensagens de violacao devem usar o sistema de i18n existente:

```typescript
// Em vez de hardcoded:
message: "Este campo parece coletar email mas nao possui autocomplete"

// Usar chave de traducao:
interface WcagPartialViolation {
  // ... outros campos
  messageKey: string           // Chave i18n: "WcagPartial.inputSemAutocomplete.message"
  messageParams?: Record<string, string>  // Parametros: { fieldType: "email", suggestedValue: "email" }
}
```

### Adicionar em arquivos de mensagens:

**src/messages/pt-BR.json:**
```json
{
  "WcagPartial": {
    "inputSemAutocomplete": {
      "message": "Este campo parece coletar {fieldType} mas nao possui atributo autocomplete. Adicionar autocomplete=\"{suggestedValue}\" melhora a experiencia."
    },
    "linkSemUnderline": {
      "message": "Este link dentro de texto nao possui sublinhado e pode depender apenas de cor para diferenciacao."
    },
    "videoSemLegendas": {
      "messageNativo": "Este video nao possui track de legendas. Se contem audio falado, legendas sao obrigatorias.",
      "messageIframe": "Este video incorporado ({platform}) deve ter legendas habilitadas na plataforma de origem."
    }
  }
}
```

**src/messages/en.json:**
```json
{
  "WcagPartial": {
    "inputSemAutocomplete": {
      "message": "This field appears to collect {fieldType} but lacks the autocomplete attribute. Adding autocomplete=\"{suggestedValue}\" improves the experience."
    },
    "linkSemUnderline": {
      "message": "This link within text has no underline and may rely only on color for differentiation."
    },
    "videoSemLegendas": {
      "messageNativo": "This video has no captions track. If it contains spoken audio, captions are required.",
      "messageIframe": "This embedded video ({platform}) should have captions enabled on the source platform."
    }
  }
}
```

**src/messages/es.json:**
```json
{
  "WcagPartial": {
    "inputSemAutocomplete": {
      "message": "Este campo parece recopilar {fieldType} pero no tiene el atributo autocomplete. Agregar autocomplete=\"{suggestedValue}\" mejora la experiencia."
    },
    "linkSemUnderline": {
      "message": "Este enlace dentro del texto no tiene subrayado y puede depender solo del color para diferenciarse."
    },
    "videoSemLegendas": {
      "messageNativo": "Este video no tiene pista de subtitulos. Si contiene audio hablado, los subtitulos son obligatorios.",
      "messageIframe": "Este video incrustado ({platform}) debe tener subtitulos habilitados en la plataforma de origen."
    }
  }
}
```

## Exemplo de Estrutura Final

```typescript
// src/lib/audit/wcag-partial-rules.ts

import type { Page } from 'playwright'

export interface WcagPartialViolation {
  element: string                          // Seletor CSS ou descricao
  html: string                             // HTML do elemento (truncado)
  xpath: string                            // XPath para localizacao precisa
  wcagSC: string                           // Ex: '1.3.5'
  ruleId: string                           // ID da regra que gerou
  needsReview: true                        // Sempre true (deteccao parcial)
  // i18n - usar chaves em vez de texto hardcoded
  messageKey: string                       // Chave i18n: "WcagPartial.inputSemAutocomplete.message"
  messageParams?: Record<string, string>   // Parametros: { fieldType: "email" }
}

export interface WcagPartialRule {
  id: string
  wcagSC: string
  wcagLevel: 'A' | 'AA' | 'AAA'
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string  // Descricao interna (nao exibida ao usuario)
  check: (page: Page) => Promise<WcagPartialViolation[]>
}

export const wcagPartialRules: WcagPartialRule[] = [
  {
    id: 'input-sem-autocomplete',
    wcagSC: '1.3.5',
    wcagLevel: 'AA',
    impact: 'serious',
    description: 'Detecta inputs de dados pessoais sem atributo autocomplete',
    check: async (page: Page) => {
      return await page.evaluate(() => {
        const violations: WcagPartialViolation[] = []
        // ... implementacao
        // Exemplo de violacao:
        // violations.push({
        //   element: 'input[name="email"]',
        //   html: '<input type="text" name="email" placeholder="Email">',
        //   xpath: '/html/body/form/input[2]',
        //   wcagSC: '1.3.5',
        //   ruleId: 'input-sem-autocomplete',
        //   needsReview: true,
        //   messageKey: 'WcagPartial.inputSemAutocomplete.message',
        //   messageParams: { fieldType: 'email', suggestedValue: 'email' }
        // })
        return violations
      })
    }
  },
  // ... outras regras
]

export async function runWcagPartialRules(page: Page): Promise<WcagPartialViolation[]> {
  const allViolations: WcagPartialViolation[] = []

  for (const rule of wcagPartialRules) {
    try {
      const violations = await rule.check(page)
      allViolations.push(...violations)
    } catch (error) {
      console.error(`[WCAG Partial] Error running rule ${rule.id}:`, error)
    }
  }

  return allViolations
}
```

## Criterio de Sucesso

Apos implementacao, os seguintes criterios devem mudar de "Precisa de verificacao manual" para "Atencao" (quando detectamos algo):

- 1.2.1 (Audio pre-gravado) - Parcial via `video-sem-legendas`
- 1.2.3 (Audiodescricao) - Parcial via `video-sem-audiodescricao`
- 1.3.3 (Caracteristicas sensoriais) - Parcial via `referencia-sensorial`
- 1.3.4 (Orientacao) - Parcial via `orientacao-bloqueada`
- 1.3.5 (Identificar proposito do input) - Parcial via `input-sem-autocomplete`
- 1.4.1 (Uso de cor) - Parcial via `link-sem-underline-em-texto`
- 1.4.5 (Imagens de texto) - Parcial via `imagem-de-texto-provavel`
- 1.4.13 (Conteudo em hover) - Parcial via `conteudo-hover-problematico`
- 2.1.2 (Sem bloqueio de teclado) - Parcial via `modal-sem-focus-trap`
- 2.2.2 (Pausar, parar, ocultar) - Parcial via `animacao-longa-sem-pause`
- 2.4.3 (Ordem de foco) - Parcial via `tabindex-positivo`
- 3.2.2 (Em entrada) - Parcial via `select-onchange-navega`
- 3.3.3 (Sugestao de erro) - Parcial via `form-erro-sem-sugestao`
