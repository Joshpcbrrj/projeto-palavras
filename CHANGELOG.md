# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

## [3.3.0] - 2026-10-18

Arquivos de estudo mais completos para quem estuda sozinho.

### Adicionado

- **Kit de estudo (PDF + MP3)** com um clique no fim do estudo, na tela de texto e em Criar textos; os dois arquivos têm o mesmo nome.
- **Tradução para o português no PDF**: abaixo de cada palavra/frase ou, nos textos, numa seção “Glossário”. Usa o Gemini (se configurado) ou o tradutor embutido do Chrome/Edge; sem tradutor, o PDF sai sem tradução e o app avisa. Campo opcional `glossario` no pacote do PDF.
- **MP3 numerado**: nas listas, o áudio fala o número de cada item (“Number 3… window”) para acompanhar no PDF (pode ser desligado).
- **Ignorar palavras muito comuns** (“the”, “to”, “is”…) ao extrair palavras em inglês (ligado por padrão, com opção para desligar).

### Alterado

- Exportação de PDF unificada num só serviço (`js/services/export.js`), usado por todas as telas.
- PDFs combinados em “Revisar arquivo” mantêm as traduções dos arquivos originais.

### Corrigido

- Na tela de texto, a opção de tradução agora aparece ou some quando o idioma é trocado.

## [3.2.0] - 2026-10-18

Versão de simplificação: o app passa a ter uma única IA (Gemini) e um único motor de MP3 (Kokoro), ambos grátis.

### Removido

- **IA no navegador (WebLLM)**: exigia download de 0,9–2,3 GB, placa de vídeo compatível e levava minutos por texto.
- **MP3 pela OpenAI** (pago). Chaves da OpenAI salvas por versões anteriores são apagadas do navegador automaticamente.
- Passo extra de tradução do tema antes de criar textos (desnecessário com o Gemini; economiza um pedido da cota gratuita).
- Sugestões “Não era esse o assunto?” na criação de textos, que mostravam resultados sem relação.

### Alterado

- Configurações simplificadas: idioma, tema, chave do Gemini e vozes do MP3.
- Roadmap reescrito com a visão do app como gerador de material de estudo (PDF e MP3) e novas propostas.

### Corrigido

- Textos da Wikipédia não trazem mais a nota de navegação do topo (“For the American sport, see…”).
- Documentação atualizada (README, SECURITY, formato do PDF, arquitetura, guia de contribuição, modelo de issue) e capturas de tela novas.

## [3.1.0] - 2026-10-18

### Adicionado

- **Criar textos** (novo modo em destaque no menu), grátis:
  - **Diálogo** sobre um tema, com uma voz diferente para cada pessoa;
  - **Mergulhar no tema**: conteúdo explicativo de ½ a 2 páginas a partir da Wikipédia (Simple English para iniciantes), sem precisar de IA; opcionalmente adaptado ao nível;
  - **Texto por nível** (iniciante, intermediário, fluente), com métrica de legibilidade que mostra se o texto ficou no nível pedido. Sem IA, usa a Wikipédia do nível mais próximo.
  - Duas opções de IA: **online** (Google Gemini com chave gratuita — rápida e funciona no celular) e **no navegador** (WebLLM/WebGPU — offline e independente, para computadores com placa de vídeo).
  - Tema pode ser digitado em português: ele é traduzido antes, o texto sai no idioma de estudo e é conferido (com nova tentativa se vier no idioma errado); textos acima do nível pedido são simplificados automaticamente.
- **Exportar MP3** de textos, palavras e frases: voz neural Kokoro no navegador (grátis) ou OpenAI com chave própria; repetições e pausas configuráveis.
- Tela de **Configurações** (idioma de estudo, tema, modelo de IA, vozes do MP3).
- Atribuição da fonte (Wikipédia, CC BY-SA 4.0) no app e no PDF.
- [Roadmap](docs/ROADMAP.md) com avaliação do app e plano de melhorias.

### Alterado

- Idioma de estudo padrão para novos usuários: **inglês** (antes, português ou o idioma do navegador).
- No leitor de textos, diálogos não leem o nome do falante e usam duas vozes.
- Notificações não bloqueiam mais cliques (antes podiam cobrir botões de ação); no computador, aparecem no canto superior.

### Corrigido

- “Não agendar” a revisão ao exportar um PDF ainda agendava a revisão padrão.

## [3.0.0] - 2026-10-18

Reescrita completa do app.

### Adicionado

- **PDFs revisáveis:** cada PDF guarda um pacote com os dados exatos do estudo (itens, idioma, título e agenda de revisão), relido com fidelidade total na tela “Revisar arquivo”.
- **Revisão espaçada** (1 → 3 → 7 → 14 → 30 → 60 dias), agenda de revisões e aviso de revisões pendentes na tela inicial.
- Tela única **“Revisar arquivo”**: detecta sozinha PDFs de palavras, frases e textos (novos e antigos), TXT e JSON; permite combinar vários arquivos.
- **Leitor de textos frase a frase** com destaque, clique para pular, repetir frase, pausa entre frases e voltar/avançar.
- **Escolha de voz** por idioma com teste, priorização automática de vozes naturais e aviso quando não há voz instalada.
- Repetição da pronúncia (1×–3×) e velocidade da fala ajustável durante o estudo.
- Navegação no flashcard (anterior/próximo/ouvir) e **atalhos de teclado**.
- Transformar um texto em flashcards de palavras ou frases.
- PDFs com escrita não latina (russo, japonês, chinês, coreano).
- Estatísticas novas: dias seguidos, tempo por tipo de estudo, histórico com títulos.
- Rascunho do texto salvo automaticamente.
- Diálogos próprios (no lugar de `confirm()`), notificações acessíveis e tema que segue o sistema.
- Testes reais (Vitest) cobrindo extração, áudio, sessão, progresso, telas e ida e volta de PDFs; CI com lint e formatação; Dependabot; templates de issue e PR.

### Alterado

- Código migrado para **ES modules nativos**, sem variáveis globais e sem etapa de build.
- Interface redesenhada com CSS próprio (o Tailwind via CDN foi removido): carrega mais rápido, funciona offline e o tema escuro não depende mais de regras `!important`.
- Bibliotecas de PDF carregadas apenas quando usadas (jsPDF atualizado para 3.0.1).
- Dados de progresso e preferências da versão 2.x migrados automaticamente.

### Corrigido

- Modo **Frases** não abria (referência a `CONFIG` inexistente).
- **“Verificar estudo”** não abria (classe `AppAnalisador` inexistente) e nunca contava os itens dos arquivos.
- Palavras com menos de 5 letras (“casa”, “sol”, “the”) eram descartadas do estudo.
- Pausar não parava o temporizador; retomar e “Revisar série” criavam temporizadores paralelos; itens eram mostrados/falados em dobro.
- Sessões registradas duas vezes no progresso.
- “Ver palavras” quebrava ao ocultar a lista e com itens contendo apóstrofo (injeção de HTML).
- Textos do usuário e de arquivos importados agora são sempre escapados.
- Regras do tema escuro vazavam para o tema claro (texto escuro sobre o flashcard roxo).
- Botão flutuante “Voltar ao início” cobria o conteúdo no celular.
- PWA no GitHub Pages: caminhos absolutos, ícones ausentes do repositório e falha na instalação do service worker.
- Bandeiras dos idiomas apareciam como letras (“US”, “BR”) no Windows.
- Tabela de sessões da tela de progresso com HTML quebrado.

### Removido

- Tailwind via CDN, arquivos de rascunho e o relatório `eslint-report.json` versionado.
- Testes que testavam cópias do código em vez dos arquivos reais.

## [2.0.0] - 2026-07-09

- Texto personalizado com leitura em voz alta e exportação em PDF.
- Revisão de textos exportados.
- Tema escuro.
