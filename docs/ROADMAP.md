# Avaliação e plano de melhorias

> **Status:** itens marcados com ✅ já estão implementados.
>
> **Visão do projeto:** um app web simples e grátis que **gera material de estudo de inglês** — textos no nível certo, **PDFs** e **MP3** — para a pessoa estudar por conta própria, onde e quando quiser. O app ajuda a criar e revisar os arquivos; o estudo acontece com eles.

## 1. Avaliação geral

### 1.1 O app cumpre a visão?

| Etapa                                     | Situação atual                                                                                                      | Nota      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------- |
| **Conseguir material no nível certo**     | ✅ Criar textos (diálogo, mergulho no tema, por nível) com métrica de legibilidade                                  | Bom       |
| **Levar o material para estudar sozinho** | ✅ Kit de estudo (PDF + MP3 com o mesmo nome); MP3 com voz natural, numeração alinhada ao PDF, repetições e pausas  | Muito bom |
| **Textos que valem a pena estudar**       | ✅ Tamanho mínimo de 700 palavras (iniciante), 1.200 (intermediário) e 2.000 (fluente), com seções e títulos no PDF | Bom       |
| **Revisar no tempo certo**                | ✅ Cada PDF guarda a data da próxima revisão; ao reabri-lo no app, a revisão avança (1 → 3 → 7 → 14 → 30 → 60 dias) | Bom       |
| **Facilidade de uso**                     | ✅ Telas começam só com o essencial; voz, tempo, repetições, tamanho etc. ficam em “Mais opções”                    | Bom       |

Exercícios no PDF (lacunas, perguntas com gabarito) foram avaliados e **descartados**: não são necessários para o objetivo do app.

### 1.2 Praticidade como app web

| Aspecto                                        | Situação                                                                                                  | Avaliação                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Abrir e usar                                   | Abre direto no navegador, instalável (PWA), funciona offline                                              | ✅ Muito bom                          |
| Celular                                        | Layout responsivo testado em 390 px, sem rolagem lateral                                                  | ✅ Bom                                |
| **Mergulhar no tema** e **Por nível** (sem IA) | Wikipédia: resultado em ~1 s, em qualquer aparelho                                                        | ✅ Muito bom                          |
| **Diálogos** e adaptação de nível              | Google Gemini com chave gratuita: segundos, qualquer aparelho; exige criar a chave uma vez                | ⚠️ Bom, com uma etapa de configuração |
| **MP3 com Kokoro** (grátis)                    | Listas: segundos a poucos minutos. Textos longos: minutos (ver 1.4). “Ouvir enquanto gera” evita a espera | ⚠️ Lento para textos longos           |

### 1.3 Simplificação já feita (versão 3.2)

- ✅ **Removida a IA no navegador (WebLLM):** exigia download de 0,9–2,3 GB, só rodava em computadores com WebGPU e levava 1–6 minutos por texto. A IA agora é só o Gemini.
- ✅ **Removido o MP3 pela OpenAI:** era pago e pouco usado. O MP3 agora é só o Kokoro, grátis.
- ✅ Configurações reduzidas a: idioma, tema, chave do Gemini e vozes do MP3.
- ✅ Mantido: sem frameworks e sem banco de dados no navegador (IndexedDB) — não compensam no tamanho atual do app.

### 1.4 Áudio: qualidade e velocidade (versão 3.4)

Medições feitas com o Kokoro real no Edge (Windows):

- **Volume:** o Kokoro começa cada frase forte (≈ −16 dB) e termina bem mais baixo (−30 a −38 dB numa frase longa); ouvido em sequência, isso soa como “trechos baixos e rompantes”. Não havia saturação nem defeito da compressão MP3 (o MP3 decodificado é igual ao original). ✅ Agora cada trecho é **nivelado** (ganho suavizado em janelas de 50 ms, sem amplificar silêncio, com limitador suave) e as emendas têm entrada/saída suaves. Variação de volume ao longo das frases: de 5,9 dB para 4,0 dB.
- **Velocidade:** cada chamada à voz tem um custo fixo de ≈ 1,5 s, além do tempo proporcional ao áudio. ✅ O número do item vai no mesmo trecho da palavra, frases curtas do mesmo parágrafo são agrupadas, a voz é carregada enquanto o PDF do kit é gerado e o áudio já sintetizado é reaproveitado ao gerar de novo na mesma visita. Lista de 8 palavras numeradas: de 42,6 s para 27,9 s (−35%).
- O tempo restante é da própria síntese neural (≈ 1,6× a duração do áudio com placa de vídeo, ≈ 3,5× só com processador) e não tem como cair muito sem trocar de voz. Para não esperar, há o **“Ouvir enquanto gera”**.

## 2. Avaliação de uso

**Veredito:** é um bom app — bonito, rápido, grátis, funciona no celular e offline, e o ciclo “criar texto → kit de estudo → revisar no dia certo” é útil de verdade.

| #   | Atrito observado                                                | Situação                                    |
| --- | --------------------------------------------------------------- | ------------------------------------------- |
| U2  | Textos gerados eram curtos (½ a 1 página)                       | ✅ Resolvido (K10)                          |
| U3  | Muitas opções antes de começar                                  | ✅ Resolvido (K6)                           |
| U4  | Listas de palavras incluíam palavras inúteis (“a”, “to”, “her”) | ✅ Resolvido (K3)                           |
| U5  | PDF e MP3 eram gerados separadamente                            | ✅ Resolvido (K4)                           |
| U6  | MP3 de textos longos é lento (minutos)                          | ⚠️ Melhorado (K7, seção 1.4); limite da voz |
| U7  | Áudio com trechos baixos e “rompantes”                          | ✅ Resolvido (nivelamento, seção 1.4)       |

## 3. Funcionalidades

| #   | Proposta                                                                                                           | Situação                                        |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| K1  | Tradução no PDF (por item ou glossário)                                                                            | Removida na v3.6 (o PDF fica só com o conteúdo) |
| K2  | Exercícios no PDF com gabarito                                                                                     | Descartado                                      |
| K3  | **Filtrar palavras muito comuns** nas listas                                                                       | ✅ v3.3                                         |
| K4  | **Kit de estudo**: PDF + MP3 com um clique e o mesmo nome                                                          | ✅ v3.3                                         |
| K5  | **MP3 numerado** (“Number 3… window”), alinhado ao PDF                                                             | ✅ v3.3                                         |
| K6  | **Começar em 1 clique**: “Mais opções” recolhido no flashcard e no Criar textos                                    | ✅ v3.4                                         |
| K7  | **Ouvir enquanto gera** o MP3                                                                                      | ✅ v3.4                                         |
| K8  | Tradução nos flashcards e falada no MP3                                                                            | Removida na v3.6                                |
| K10 | **Tamanho pelo nível**: 700 / 1.200 / 2.000 palavras no mínimo, com continuação pela IA e complemento da Wikipédia | ✅ v3.6                                         |

**Biblioteca dentro do app:** descartada — o estudo acontece com os arquivos, e o fluxo “gerar o PDF → estudar → reabrir em Revisar arquivo” já atende.

**Login com Google (no lugar da chave do Gemini):** avaliado e **descartado** por enquanto:

- Para usar a API do Gemini com login, o projeto precisaria de um projeto no Google Cloud com tela de consentimento OAuth **verificada pelo Google** (o escopo da API de IA é sensível), domínio próprio verificado e política de privacidade.
- A cota gratuita passaria a ser **do projeto do app, dividida entre todos os usuários** — com poucos usuários ativos, o limite gratuito acabaria rápido e o custo ficaria com o dono do projeto. Com a chave própria, cada pessoa tem a sua cota grátis.
- Sem servidor, o login no navegador também não guarda sessão por muito tempo (o token expira em 1 hora).
- ✅ Alternativa adotada (v3.5): **passo a passo ilustrado** no painel da IA, botão **Colar**, limpeza da chave colada e mensagens de erro junto do campo.

## 4. Código (sem perder a simplicidade)

O formato atual — arquivos estáticos, ES modules nativos, **sem etapa de build** — é o mais simples para um app web no GitHub Pages e deve ser mantido.

| #   | Proposta                                                                        | Situação |
| --- | ------------------------------------------------------------------------------- | -------- |
| C1  | **Unificar exportações** em um serviço (`js/services/export.js`)                | ✅ v3.3  |
| C2  | Tipos com JSDoc + `tsc --checkJs` no CI (sem migrar para TypeScript, sem build) | Proposta |
| C3  | Dividir telas grandes (`StudyScreen`, `TextScreen`) em partes menores           | Proposta |
| C4  | Teste de fumaça no navegador (Playwright) no CI                                 | Proposta |
| C5  | **Proteção da branch `main`** exigindo CI verde (configuração no GitHub)        | Pendente |
| C6  | **Content-Security-Policy** via `<meta>` (protege a chave do Gemini)            | ✅ v3.4  |

## 5. Limitações conhecidas (versão atual)

- **Gemini**: exige criar uma chave gratuita no Google AI Studio (conta Google). O plano gratuito tem limite de pedidos por minuto/dia; o app avisa quando ele é atingido. Sem chave, “Mergulhar no tema” e “Por nível” funcionam só com a Wikipédia.
- A IA às vezes escreve acima do nível pedido; o app tenta simplificar uma vez e a métrica de legibilidade avisa quando ainda ficou difícil.
- **Wikipédia** como fonte de nível: a Simple English nem sempre é simples em temas técnicos (a métrica mostra isso). Em temas de situação (“pedir comida”), artigos genéricos desviam o diálogo — por isso a Wikipédia vem desligada por padrão no modo Diálogo.
- **Kokoro** (MP3) fala apenas inglês e é lento para textos longos (seção 1.4).
- **Textos longos sem IA (iniciante):** a Simple English costuma ter 200–1.300 palavras por artigo; o restante vem da Wikipédia em inglês normal, que é mais difícil (o app avisa). Com o Gemini, o texto todo sai no nível.
- **MP3 de textos longos:** um texto fluente (2.000 palavras ≈ 13 min de áudio) leva vários minutos para gerar; o “Ouvir enquanto gera” evita a espera.
- O filtro de palavras muito comuns existe só para inglês.
- PDFs “impressos como PDF” ou salvos por outros programas podem perder o pacote de dados; nesse caso o app reconstrói o conteúdo pelo texto, sem a data de revisão.
