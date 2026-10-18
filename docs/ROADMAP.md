# Avaliação e plano de melhorias

> **Status:** proposta para avaliação. Itens marcados com ✅ já estão implementados.
>
> **Visão do projeto:** um app web simples e grátis que **gera material de estudo de inglês** — textos no nível certo, **PDFs** e **MP3** — para a pessoa estudar por conta própria, onde e quando quiser. O app ajuda a criar e revisar os arquivos; o estudo acontece com eles.

## 1. Avaliação geral

### 1.1 O app cumpre a visão?

| Etapa                                     | Situação atual                                                                                                         | Nota                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **Conseguir material no nível certo**     | ✅ Criar textos (diálogo, mergulho no tema, por nível) com métrica de legibilidade                                     | Bom                  |
| **Levar o material para estudar sozinho** | ✅ PDF limpo para ler/imprimir e MP3 com voz natural (uma voz por pessoa nos diálogos; repetições e pausas nas listas) | Bom                  |
| **Entender o que está lendo/ouvindo**     | ❌ Nem o PDF nem o app mostram o significado das palavras — quem estuda sozinho fica sem apoio                         | **Lacuna principal** |
| **Praticar com o material**               | ❌ O PDF não traz exercícios (lacunas, perguntas) para fazer sem o app                                                 | Lacuna               |
| **Revisar no tempo certo**                | ✅ Cada PDF guarda a data da próxima revisão; ao reabri-lo no app, a revisão avança (1 → 3 → 7 → 14 → 30 → 60 dias)    | Bom                  |
| **Facilidade de uso**                     | Telas claras, mas várias opções antes de começar                                                                       | Regular              |

**Conclusão:** o app já gera um material bom. O passo que mais aumenta o valor dos arquivos para quem estuda **sozinho** é deixá-los **autossuficientes**: com o significado das palavras e com exercícios.

### 1.2 Praticidade como app web

| Aspecto                                        | Situação                                                                                                                                         | Avaliação                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Abrir e usar                                   | Abre direto no navegador, instalável (PWA), funciona offline                                                                                     | ✅ Muito bom                          |
| Celular                                        | Layout responsivo testado em 390 px, sem rolagem lateral                                                                                         | ✅ Bom                                |
| **Mergulhar no tema** e **Por nível** (sem IA) | Wikipédia: resultado em ~1 s, em qualquer aparelho                                                                                               | ✅ Muito bom                          |
| **Diálogos** e adaptação de nível              | Google Gemini com chave gratuita: segundos, qualquer aparelho; exige criar a chave uma vez                                                       | ⚠️ Bom, com uma etapa de configuração |
| **MP3 com Kokoro** (grátis)                    | Testado: texto de 1 página (≈ 4 min de áudio) levou **7 min com placa de vídeo** e **14 min só com processador**; listas de palavras são rápidas | ⚠️ Lento para textos longos           |

### 1.3 Simplificação já feita (versão 3.2)

- ✅ **Removida a IA no navegador (WebLLM):** exigia download de 0,9–2,3 GB, só rodava em computadores com WebGPU e levava 1–6 minutos por texto. A IA agora é só o Gemini.
- ✅ **Removido o MP3 pela OpenAI:** era pago e pouco usado. O MP3 agora é só o Kokoro, grátis.
- ✅ **Removido o passo de tradução do tema** (feito para modelos pequenos): o Gemini entende temas em português, e assim cada texto usa um pedido a menos da cota gratuita.
- ✅ Configurações reduzidas a: idioma, tema, chave do Gemini e vozes do MP3. Chaves antigas da OpenAI são apagadas do navegador automaticamente.
- ✅ Mantido: sem frameworks e sem banco de dados no navegador (IndexedDB) — não compensam no tamanho atual do app.

Alternativa avaliada e descartada: **IA online gratuita sem chave** (serviço anônimo) — respostas de 30–37 s, falhas intermitentes e formato instável.

## 2. Avaliação de uso

**Veredito:** é um bom app — bonito, rápido, grátis, funciona no celular e offline, e o ciclo “criar texto → ouvir → gerar PDF/MP3” é útil de verdade. Pontos de atrito:

| #   | Atrito observado                                                                                             | Impacto     |
| --- | ------------------------------------------------------------------------------------------------------------ | ----------- |
| U1  | **Os arquivos não explicam as palavras.** Quem estuda com o PDF/MP3 longe do app não tem a tradução          | Alto        |
| U2  | **O PDF não tem atividades.** Só leitura; nada para praticar                                                 | Alto        |
| U3  | **Muitas opções antes de começar.** A configuração do flashcard tem 8 controles; “Criar textos” tem 6 campos | Médio       |
| U4  | **Listas de palavras incluem palavras inúteis** (“a”, “to”, “her”) — ocupam o PDF e o MP3                    | Médio       |
| U5  | **PDF e MP3 são gerados separadamente** (dois cliques, dois fluxos)                                          | Baixo/Médio |
| U6  | MP3 de textos longos é lento (minutos)                                                                       | Baixo/Médio |

## 3. Propostas de funcionalidade (focadas nos arquivos de estudo)

Esforço: **P** (até 1 dia), **M** (2–4 dias), **G** (1–2 semanas).

| #   | Proposta                                                                                                                                                                                                          | Resolve | Esforço |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- |
| K1  | ✅ **Glossário no PDF**: lista das palavras-chave do texto com a tradução em português (e, nas listas de palavras, a tradução ao lado de cada uma). Tradução pelo Gemini ou pelo tradutor embutido do Chrome/Edge | U1      | M       |
| K2  | **Exercícios no PDF, com gabarito no final**: lacunas (sem IA) e perguntas de compreensão (com Gemini)                                                                                                            | U2      | M       |
| K3  | ✅ **Filtrar palavras muito comuns** nas listas (lista de frequência embutida)                                                                                                                                    | U4      | P       |
| K4  | ✅ **“Baixar kit de estudo”**: PDF + MP3 com um clique, com nomes de arquivo combinando                                                                                                                           | U5      | P       |
| K5  | **MP3 alinhado ao PDF**: opção de falar o número do item (“número 3: window”) para acompanhar no papel                                                                                                            | U1      | P       |
| K6  | **Começar em 1 clique**: padrões inteligentes e “Mais opções” recolhido no flashcard e no Criar textos                                                                                                            | U3      | P       |
| K7  | **MP3 mais rápido em textos longos**: começar a mostrar/ouvir o áudio enquanto é gerado                                                                                                                           | U6      | M       |

**Sobre a “biblioteca dentro do app”** (proposta anterior): fazia sentido se o estudo acontecesse dentro do app. Como a ideia é estudar com os arquivos, ela foi **descartada** — o fluxo atual (gerar o PDF, estudar com ele e reabri-lo em “Revisar arquivo” no dia marcado) já atende e é mais simples.

## 4. Propostas de código (sem perder a simplicidade)

O formato atual — arquivos estáticos, ES modules nativos, **sem etapa de build** — é o mais simples para um app web no GitHub Pages e deve ser mantido.

| #   | Proposta                                                                                                                                   | Por quê                                            | Esforço |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------- |
| C1  | ✅ **Unificar exportações**: a lógica de “gerar PDF + registrar + agendar revisão” está repetida em 4 telas; um único `exportarMaterial()` | Menos código duplicado; base para o K4             | P       |
| C2  | **Tipos com JSDoc + `tsc --checkJs` no CI** (sem migrar para TypeScript, sem build)                                                        | Pega erros de contrato com custo zero no navegador | M       |
| C3  | **Dividir telas grandes** (`StudyScreen` 864 linhas, `TextScreen` 630) em partes menores                                                   | Manutenção                                         | M       |
| C4  | **Teste de fumaça no navegador (Playwright) no CI**, formalizando os fluxos que verifiquei manualmente                                     | Pega regressões visuais e de fluxo antes do merge  | M       |
| C5  | **Proteção da branch `main`** exigindo CI verde                                                                                            | Evita publicar algo quebrado                       | P       |
| C6  | **Content-Security-Policy** via `<meta>`                                                                                                   | Protege a chave do Gemini guardada no navegador    | P       |

## 5. Ordem sugerida

1. ✅ **K3, K4 + C1** (v3.3.0) — falta só o **C5**, que é configurado no GitHub.
2. ✅ **K1** (glossário com tradução, v3.3.0).
3. **K2** (exercícios com gabarito) e **K5**.
4. **K6, K7** e **C2, C3, C4, C6**.

## 6. Limitações conhecidas (versão atual)

- **Gemini**: exige criar uma chave gratuita no Google AI Studio (conta Google). O plano gratuito tem limite de pedidos por minuto/dia; o app avisa quando ele é atingido. Sem chave, “Mergulhar no tema” e “Por nível” funcionam só com a Wikipédia.
- A IA às vezes escreve acima do nível pedido; o app tenta simplificar uma vez e a métrica de legibilidade avisa quando ainda ficou difícil.
- **Wikipédia** como fonte de nível: a Simple English nem sempre é simples em temas técnicos (a métrica mostra isso). Em temas de situação (“pedir comida”), artigos genéricos desviam o diálogo — por isso a Wikipédia vem desligada por padrão no modo Diálogo.
- **Kokoro** (MP3) fala apenas inglês e é lento para textos longos.
- **Tradutor do Chrome/Edge** traduz palavra por palavra, sem contexto (ex.: “square” → “quadrado”, não “praça”); o Gemini traduz no contexto. Na primeira vez o navegador baixa o pacote do idioma — se demorar mais de 45 s, o PDF sai sem tradução e o app pede para tentar de novo.
- O filtro de palavras muito comuns existe só para inglês.
