# Avaliação e plano de melhorias

> **Status:** proposta para avaliação. Itens marcados com ✅ já estão implementados.
> Objetivo do projeto: **um app web prático para aprender inglês de forma simples e grátis.**

## 1. Avaliação geral

### 1.1 O app atende ao objetivo de aprendizado?

| Etapa do aprendizado        | Situação atual                                                                                                               | Nota                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **Material no nível certo** | ✅ Criar textos (diálogo, mergulho no tema, por nível), métrica de legibilidade que avisa quando o texto saiu acima do nível | Bom                  |
| **Ouvir (listening)**       | ✅ Leitura frase a frase com destaque, voz diferente por pessoa nos diálogos, MP3 para ouvir fora do app                     | Bom                  |
| **Vocabulário**             | Flashcards com pronúncia; revisão espaçada **por arquivo**                                                                   | Regular              |
| **Entender o significado**  | ❌ Não há tradução nem definição: o aluno vê “WINDOW”, mas não sabe o que é                                                  | **Lacuna principal** |
| **Lembrar ativamente**      | ❌ O flashcard só mostra a palavra por alguns segundos (estudo passivo)                                                      | Lacuna               |
| **Falar (pronúncia)**       | ❌ Sem prática de fala                                                                                                       | Lacuna               |
| **Exercícios**              | ❌ Sem ditado, lacunas ou perguntas de compreensão                                                                           | Lacuna               |
| **Constância**              | Dias seguidos e agenda de revisões                                                                                           | Regular              |

**Conclusão:** o app é forte em **exposição** ao inglês (ler e ouvir no nível certo) e em **organização** (PDFs revisáveis, agenda). Para ser um app completo de **aprendizado**, faltam: significado das palavras, recordação ativa com revisão espaçada por palavra e exercícios — todos possíveis sem servidor (Fase A abaixo).

### 1.2 O app é prático como app web?

| Aspecto                                        | Situação                                                                                                                                                          | Avaliação                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Abrir e usar                                   | Abre direto no navegador, instalável (PWA), funciona offline                                                                                                      | ✅ Muito bom                             |
| Celular                                        | Layout responsivo testado em 390 px, sem rolagem lateral                                                                                                          | ✅ Bom                                   |
| Flashcards, leitura com voz, PDFs              | Instantâneos, sem cadastro, usam a voz do aparelho                                                                                                                | ✅ Muito bom                             |
| **Mergulhar no tema** e **Por nível** (sem IA) | Wikipédia: resultado em ~1 s, em qualquer aparelho                                                                                                                | ✅ Muito bom                             |
| **Diálogos** e adaptação de nível              | Precisam de IA. Opção online (Gemini, chave gratuita): segundos, qualquer aparelho, mas exige criar a chave uma vez                                               | ⚠️ Bom, com uma etapa de configuração    |
| IA no navegador (WebLLM)                       | Testada de verdade: download de 0,9–2,3 GB, só em computadores com WebGPU, **1 a 6 minutos por texto**; o modelo de 1B escreveu com erros e às vezes em português | ⚠️ Viável só como opção avançada/offline |
| **MP3 com Kokoro** (grátis)                    | Testado: texto de 1 página (≈ 4 min de áudio) levou **7 min com placa de vídeo** e **14 min só com processador**; listas de palavras são rápidas                  | ⚠️ Lento para textos longos              |

**Decisão tomada nesta versão:** como o app precisa ser prático, a IA **online (Gemini)** passou a ser a opção padrão — grátis, rápida e funciona no celular — e a IA **no navegador** ficou como alternativa para quem quer total independência/offline. Mergulho e texto por nível funcionam **sem IA nenhuma**, direto da Wikipédia.

Alternativas avaliadas e descartadas:

- **IA online gratuita sem chave** (serviço anônimo): testada — respostas de 30–37 s, falhas intermitentes e formato de resposta instável. Não é confiável para um app.
- **Só IA no navegador**: independente, mas impraticável para a maioria dos usuários (celulares não rodam; downloads de GB; minutos por texto).

## 2. Funcionalidades propostas

Esforço: **P** (até 1 dia), **M** (2–4 dias), **G** (1–2 semanas).

### Fase A — Fechar as lacunas de aprendizado (maior impacto)

| #   | Proposta                                                                                     | Como (grátis e sem servidor)                                                          | Esforço |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------- |
| A1  | **Tradução e significado** (toque na palavra no leitor; verso do flashcard)                  | API de tradução embutida do Chrome/Edge (`Translator`, offline) → Gemini → Wiktionary | M       |
| A2  | **Flashcards “Sei / Não sei”** com revisão espaçada **por palavra** (SM-2/FSRS, como o Anki) | Nova tela “Revisar vocabulário”                                                       | G       |
| A3  | **Ignorar palavras muito comuns** (“the”, “a”, “to”) e destacar as difíceis                  | Lista de frequência NGSL (CC BY-SA) embutida                                          | P       |
| A4  | **Ditado**: ouve a frase, digita, vê as diferenças                                           | Web Speech + comparação de texto                                                      | M       |
| A5  | **Exercícios** a partir dos textos: lacunas, perguntas de compreensão                        | Lacunas sem IA; perguntas com IA                                                      | M       |
| A6  | **Prática de pronúncia** com nota                                                            | `SpeechRecognition` (Chrome/Edge/Safari)                                              | M       |
| A7  | **Glossário automático** dos textos criados                                                  | A1 + A3                                                                               | P       |

### Fase B — Praticidade e retenção

| #   | Proposta                                                                                                                           | Esforço |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------- |
| B1  | **Biblioteca** de textos criados/salvos (sem precisar de PDF), com filtros por nível                                               | M       |
| B2  | **MP3 mais rápido**: gerar em paralelo/por lotes e mostrar o áudio enquanto é gerado; avaliar TTS do Gemini (chave já configurada) | M       |
| B3  | Meta diária e lembrete (notificação do PWA)                                                                                        | M       |
| B4  | Tela inicial com “continuar de onde parou” e palavras do dia                                                                       | P       |
| B5  | Interface também em inglês (imersão)                                                                                               | M       |
| B6  | Sincronização opcional entre aparelhos (arquivo ou Google Drive do usuário)                                                        | G       |

## 3. Qualidade de código e engenharia (padrões de mercado)

| #   | Proposta                                                                                                  | Por quê                                                             | Esforço    |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| C1  | **Tipagem**: JSDoc + `tsc --checkJs` e migração gradual para **TypeScript**                               | Contratos garantidos (ex.: pacote do PDF, preferências)             | M → G      |
| C2  | **Build com Vite** + deploy pelo **GitHub Actions** no Pages                                              | Minificação, arquivos com hash, sem lista manual no `sw.js`         | M          |
| C3  | **Service worker gerado** (Workbox / `vite-plugin-pwa`)                                                   | Fim do controle manual de versão e de arquivos                      | P (com C2) |
| C4  | **Dependências pelo npm** (jsPDF, PDF.js, WebLLM, Kokoro, lamejs) em vez de CDN                           | Versões auditadas pelo Dependabot, offline garantido                | M (com C2) |
| C5  | **Testes E2E com Playwright** no CI (os fluxos que verifiquei manualmente)                                | Pega regressões de interface antes do merge                         | M          |
| C6  | **Acessibilidade (axe-core)** e **Lighthouse CI**                                                         | Nota mínima de acessibilidade/PWA por PR                            | P          |
| C7  | Dividir telas grandes (`StudyScreen` ~800 linhas) em componentes; avaliar **Lit** ou **Preact + Signals** | Menos código manual de eventos                                      | G          |
| C8  | Persistência em **IndexedDB**                                                                             | O localStorage é limitado (~5 MB) e síncrono; necessário para A2/B1 | M          |
| C9  | **Conventional Commits** + **release-please**                                                             | CHANGELOG e versões automáticos                                     | P          |
| C10 | **Proteção da branch `main`** exigindo CI verde                                                           | Evita publicar algo quebrado                                        | P          |
| C11 | **Content-Security-Policy** e **Subresource Integrity**                                                   | Segurança contra scripts injetados/CDN comprometida                 | P          |

## 4. Ordem sugerida

1. **Sprint 1:** A3, A1, C10, C9.
2. **Sprint 2:** A2 (+ C8), A7.
3. **Sprint 3:** C2 + C3 + C4 + C5 (fundação de engenharia de uma vez).
4. **Sprint 4:** A4, A5, A6, B2.
5. Depois: Fase B, C1 gradual, C7.

## 5. Limitações conhecidas (versão atual)

- **Gemini**: exige criar uma chave gratuita no Google AI Studio (conta Google). O plano gratuito tem limite de pedidos por minuto/dia; o app avisa quando ele é atingido.
- **IA no navegador**: exige WebGPU e download de 0,9 a 2,3 GB; leva minutos por texto. O modelo “Leve” (1B) tem qualidade baixa — use “Equilibrado” ou “Qualidade”.
- Modelos pequenos às vezes escrevem acima do nível pedido; o app tenta simplificar uma vez e a métrica de legibilidade avisa quando ainda ficou difícil.
- **Wikipédia** como fonte de nível: a Simple English nem sempre é simples em temas técnicos (a métrica mostra isso). Em temas de situação (“pedir comida”), artigos genéricos desviam o diálogo — por isso a Wikipédia vem desligada por padrão no modo Diálogo.
- **Kokoro** (MP3 grátis) fala apenas inglês e é lento para textos longos; para outros idiomas ou mais rapidez, há a opção OpenAI com chave própria.
