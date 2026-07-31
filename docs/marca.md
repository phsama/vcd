# Marca — Você conhece Deus?

> Fundação de marca v1 (31/jul/2026). Sistema: "Dois mundos, uma chama".
> Disciplina visual: Hallmark (OKLCH, acento ≤ 3% do viewport, pareamento 2+1).

## 1. O conceito

**A marca é a pergunta.** O nome não afirma, convida. Nenhum símbolo confessional
(cruz, pomba, lótus, estrela) pode ancorar a marca: excluiria quatro das cinco trilhas.
O único símbolo que todas as tradições do app reconhecem como seu é a **luz que a
pessoa carrega**: a vela católica, o fogo do Espírito evangélico, a luz espírita,
a lamparina do filósofo, a aurora do buscador. E o produto já tem essa palavra dentro
de si: a "chama interior" do streak.

### O símbolo: a Chama-Pergunta

Um ponto de interrogação desenhado em um único traço contínuo, onde a curva superior
é uma chama serena. O ponto de baixo não é ponto: é um **círculo pleno**, a pessoa,
o ponto de luz. Leitura em camadas: a busca (pergunta), o espírito (chama),
o indivíduo inteiro (círculo). Funciona em 24px (ícone de app) e em 240px (splash).

### Os dois mundos

O produto vive em dois momentos rituais: manhã e noite. A marca assume isso:

- **Mundo do Dia (Papel)**: creme quente, luz de manhã sobre papel de caderno.
  Superfície padrão do app e da LP.
- **Mundo da Noite (Hora Azul)**: azul-noite profundo, o céu antes da aurora,
  o tempo liminar da oração e do sonho em todas as tradições. Rotina noturna,
  caderno de sonhos, conteúdo de sono.
- **A Chama (âmbar)** é a constante que atravessa os dois mundos. Único acento.

### Registros psicológicos (o porquê de cada escolha)

- **Âmbar de vela, não dourado de igreja**: luz quente ativa o registro de
  segurança e acolhimento (fogo doméstico, lareira, vigília). Dourado saturado
  ativaria opulência e "teologia da prosperidade". Chroma contido (0.14).
- **Azul-noite, não preto nem roxo**: o escuro azulado é interioridade e silêncio
  (a "hora azul" é o horário real das liturgias de madrugada). Preto puro é luto e
  vazio. Roxo é o clichê new-age e o clichê de IA, dupla razão para banir.
- **Creme de papel, não branco clínico**: o caderno íntimo é o coração privado do
  produto. Papel quente evoca diário, carta, livro de cabeceira. Branco puro evoca
  hospital e formulário.
- **A pergunta como logotipo**: não impõe doutrina, espelha o usuário
  (o app pergunta, quem responde é a pessoa). Coerente com a bandeira de marca
  de abertura entre trilhas.

## 2. Cores (tokens OKLCH)

```css
:root {
  /* Mundo do Dia */
  --papel:          oklch(96.5% 0.013 85);
  --papel-2:        oklch(93%   0.015 85);
  --regua:          oklch(84%   0.012 85);
  --neutro:         oklch(52%   0.010 80);
  --tinta:          oklch(21%   0.012 70);

  /* Mundo da Noite */
  --noite:          oklch(15%   0.012 265);
  --noite-2:        oklch(19%   0.014 265);  /* superfícies elevadas: mais claras */
  --regua-noite:    oklch(30%   0.012 265);
  --neutro-noite:   oklch(62%   0.010 265);
  --tinta-noite:    oklch(93.5% 0.007 85);   /* texto claro com tinta quente: papel à luz de vela */

  /* A Chama (único acento; ≤ 3% de qualquer tela) */
  --chama:          oklch(71% 0.14 60);      /* sobre a Noite */
  --chama-profunda: oklch(52% 0.13 50);      /* texto e links sobre o Papel */
  --foco:           oklch(60% 0.17 55);      /* focus ring */
}
```

### Cores das trilhas (marcações discretas, nunca fundo)

Mesma luminosidade e chroma, só o matiz gira: irmandade sem hierarquia.

```css
:root {
  --trilha-catolica:   oklch(66% 0.09 85);   /* ouro suave    */
  --trilha-evangelica: oklch(66% 0.09 40);   /* terracota     */
  --trilha-espirita:   oklch(66% 0.09 245);  /* azul sereno   */
  --trilha-filosofica: oklch(66% 0.09 140);  /* verde-sálvia  */
  --trilha-buscador:   oklch(66% 0.09 20);   /* rosa-aurora   */
}
```

Uso: chip da trilha no perfil, filete no card da reflexão, nada além.

### Proibições (herdadas do Hallmark e da leitura da marca)

Roxo em qualquer papel de destaque. Gradiente roxo-rosa ou roxo-ciano. Preto #000 e
branco #fff puros. Dourado saturado em área grande. Acento como fundo de seção.

## 3. Tipografia (regra 2+1)

| Papel | Fonte | Razão psicológica |
|---|---|---|
| **Display e marca** | **Fraunces** (Google, variável, eixo óptico) | Serifa quente e levemente irregular: lê-se como coisa feita à mão, luz de vela. Anticorpo direto contra a frieza de "app de IA". |
| **Leitura** (reflexões, caderno) | **Newsreader** (Google, optical size) | Desenhada para leitura longa em tela. Ritmo calmo de livro bem composto: a reflexão diária é um rito de leitura, não um feed. |
| **UI** (botões, labels, navegação) | **Switzer** (Fontshare, grátis comercial) | Neutra e silenciosa. A interface recua para o conteúdo aparecer: contenção como reverência. Não é Inter, não é Roboto. |

```css
:root {
  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-leitura: "Newsreader", ui-serif, Georgia, serif;
  --font-ui:      "Switzer", ui-sans-serif, system-ui, sans-serif;
}
```

Regras: pesos em contraste real (leitura 400, display 600; nada de 500 contra 400).
Títulos sempre romanos, nunca itálico. Medida de leitura 45 a 75 caracteres.
No Flutter: Fraunces e Newsreader via google_fonts; Switzer embarcada como asset.

### Logotipo (wordmark)

"Você conhece Deus?" composto em **Fraunces SemiBold**, tracking -0.015em,
com o "?" final substituído pelo símbolo da Chama-Pergunta. Uma família, um símbolo,
zero decoração. Versão curta para ícone e avatar: só o símbolo.

## 4. Pipeline de produção do símbolo

1. Ph gera explorações no GPT com os prompts abaixo (raster, serve como conceito).
2. Escolhemos a direção vencedora na mesa.
3. Claude redesenha o símbolo final em **SVG limpo** (traço, grid, versões:
   símbolo, wordmark, ícone iOS/Android adaptive, favicon, monocromática).
   Modelo de imagem não entrega vetor confiável: ele inspira, não fecha.

### Prompts para o GPT (colar como estão, um por vez)

**P1, o símbolo (direção principal):**
> Minimal flat vector logo mark: a question mark drawn as one single continuous
> stroke, where the upper curve becomes a small calm flame, and the dot below is
> a plain filled circle. Warm amber color #E2A253 on a deep night-blue background
> #131521. No gradients, no purple, no 3D, no shadows, no text. Generous negative
> space, geometric but soft, rounded stroke terminals. Style: modern spiritual
> brand, quiet and warm, like candlelight. Centered, lots of margin.

**P2, ícone de app:**
> iOS app icon, flat design: a single continuous-stroke question mark whose upper
> curve is a serene flame, dot rendered as a full circle, warm amber #E2A253
> centered on deep blue-black night background #131521 with a very subtle darker
> vignette. No text, no border, no gloss, no gradient hero. Soft rounded square
> canvas. Must stay readable at 48 pixels.

**P3, variação clara (para o Mundo do Dia):**
> Same minimal flame-question-mark logo concept: single continuous stroke, flame
> curve, circle dot. Deep warm brown-black ink #2B241C on warm cream paper
> background #F8F2E7. Flat vector style, no gradients, no texture, no text.
> Quiet, editorial, printed-on-paper feeling.

**P4, direção alternativa (para termos contraste na escolha):**
> Minimal flat vector logo mark: a thin horizon line inside a circle, with a
> small sun-glow rising exactly at the center of the horizon, suggesting dawn.
> One continuous stroke, warm amber #E2A253 on deep night-blue #131521.
> No gradients except a barely visible glow, no purple, no text, no stars.
> Style: contemplative, liminal, the blue hour before sunrise.

**P5, textura de fundo para a futura LP (não é logo):**
> Wide abstract background texture: the blue hour sky just before dawn, deep
> blue-black #131521 gradually warming to a thin amber #E2A253 glow at the very
> bottom edge, with extremely subtle film grain. No clouds, no stars, no objects,
> no text. Minimal, atmospheric, almost flat. 16:9.

## 5. Voz da marca (nota curta, expandir depois)

Fala como quem pergunta, nunca como quem prega. Frases curtas. Segunda pessoa.
Sem jargão devocional de nenhuma trilha específica na camada comum do app.
Exemplos de registro: "O que hoje pede de você?", "Sua chama continua acesa",
"Guardado só para você" (caderno). Nunca: "Deus quer que você...", culpa por
streak perdido, urgência de marketing.
