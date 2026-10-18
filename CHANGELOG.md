# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

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
