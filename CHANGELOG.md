# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

## [3.10.0] - 2026-10-19

Criação de textos bem mais rápida.

### Alterado

- **Textos escritos em partes ao mesmo tempo**: 2 a 4 partes de ≈ 450 palavras, todas pedidas juntas, cada uma com um trecho do roteiro (no “Mergulhar no tema”, um trecho seguido do artigo da Wikipédia). Em teste com um Gemini simulado, o intermediário caiu de ~25 s para ~8 s e o fluente de ~25 s para ~9 s, já com o tamanho completo.
- **Raciocínio baixo** no Gemini (resposta mais rápida); se o modelo não aceitar o ajuste, o app segue sem ele.
- Só as partes que ficarem difíceis demais para o nível são simplificadas (antes, o texto inteiro era reescrito).
- No máximo 2 pedidos para continuar um texto curto (antes, 3).
- Wikipédia: buscas em inglês e em português em paralelo; artigo guardado durante a visita (“Gerar de novo” não busca de novo).

### Adicionado

- **Barra de progresso** em Criar textos: porcentagem, palavras escritas, tempo e partes prontas.
- **Preferência da IA** em Configurações: **Qualidade (Gemini Flash)** ou **Rapidez (Flash-Lite)**, ambos grátis; se o Flash-Lite não estiver disponível para a chave, o app usa o Flash.

## [3.9.1] - 2026-10-19

### Corrigido

- **Tela vazia depois de uma atualização.** O service worker montava a versão nova com arquivos vindos do cache HTTP do navegador (o GitHub Pages permite guardar cada arquivo por 10 minutos), então podia misturar arquivos de versões diferentes — por exemplo, um `main.js` novo importando algo de um arquivo antigo —, e o app não abria. Agora a instalação busca os arquivos direto do servidor (`cache: 'reload'`).

### Adicionado

- Se o app não abrir em 6 segundos, aparece o aviso “O app não carregou” com o botão **Atualizar o app**, que limpa o cache do modo offline e recarrega (o progresso e o modelo de voz do MP3 são mantidos).

## [3.9.0] - 2026-10-19

Revisão geral do app e da documentação.

### Adicionado

- **Número da versão no rodapé**, bem pequeno, à direita (vem de `js/config.js`; um teste garante que é igual ao `package.json` e ao service worker). O modelo de relato de problema pede essa versão.

### Alterado

- Capturas de tela da documentação refeitas com o app atual (inclui a página de tradução do PDF).
- Documentação revisada: README (tamanho por nível, tradução, compatibilidade da tradução, testes, publicação), ARQUITETURA (arquivos da exportação de áudio), FORMATO-PDF (ordem do layout), ROADMAP, CONTRIBUTING e descrição do PWA.

### Corrigido

- O aviso “a parte final veio da Wikipédia normal, que é mais difícil” aparecia também no nível intermediário; agora só no iniciante.
- Em textos da Wikipédia sem IA, a dica “gere de novo” (que traria o mesmo artigo) foi trocada por uma explicação sobre adaptar o nível com a IA.
- Estilo CSS sem uso removido.

## [3.8.0] - 2026-10-19

### Adicionado

- **Contadores de materiais criados** em “Meu progresso”: textos criados, PDFs gerados, MP3 gerados e kits de estudo (também no backup).
- **Importar backup juntando**: ao importar, escolha **Juntar** (soma o progresso do arquivo ao deste navegador) ou **Substituir**. Cada navegador tem uma identificação e guarda os próprios contadores; ao juntar, os contadores de cada origem são combinados pelo maior valor, então importar o mesmo arquivo de novo, ou juntar computador e celular nos dois sentidos, não conta nada em dobro. Sessões, histórico e agenda são unidos sem repetição (a revisão mais adiantada prevalece).
- **Lembrete de backup** discreto na tela inicial quando há progresso e o último backup tem mais de 14 dias; a data do último backup aparece em “Meu progresso”.

### Alterado

- Nome do arquivo de backup: `progresso-aprendendo-palavras_AAAA-MM-DD.json`.
- O total de PDFs exportados não fica mais limitado aos 100 últimos do histórico.

## [3.7.0] - 2026-10-19

### Adicionado

- **Tradução no fim do PDF**, numa página própria, para revisar rápido: nas listas de palavras e frases, cada item traduzido com o mesmo número da lista; nos textos, o texto inteiro com os mesmos parágrafos e títulos. Opção “Incluir a tradução no final do PDF” (ligada por padrão) no fim do estudo, na tela de texto e em Criar textos.
- Tradução pelo Gemini (se houver chave) ou pelo tradutor embutido do Chrome/Edge; sem tradutor, o PDF sai sem ela e o app avisa. Campo opcional `traducao` no pacote do PDF.
- A tradução fica guardada no PDF e é reaproveitada ao exportar de novo e ao combinar listas (só o que falta é traduzido).

## [3.6.0] - 2026-10-19

Textos maiores, arquivos mais simples.

### Alterado

- **O nível define o tamanho do texto**: iniciante 700, intermediário 1.200 e fluente 2.000 palavras, no mínimo (antes: 150 a 1.000, conforme “Tamanho”). O campo “Tamanho” saiu de Criar textos.
- Com o Gemini, se o texto sair curto, a IA continua (até 3 vezes) sem repetir o que já escreveu; textos longos vêm divididos em seções.
- Sem IA, artigos curtos da Simple English Wikipedia são completados com as seções do mesmo artigo na Wikipédia em inglês (o app avisa que essa parte é mais difícil).
- No PDF, os títulos de seção dos textos aparecem em destaque.
- Limite de resposta do Gemini maior (textos de 2.000 palavras não são cortados).
- Contagem de palavras e detecção de títulos unificadas (`text/extract.js`).

### Removido

- **Tradução e glossário**: o PDF, o MP3 e os flashcards ficam só com o conteúdo (texto, frases ou palavras). PDFs antigos com tradução continuam abrindo normalmente.

### Corrigido

- O corte do artigo da Wikipédia podia pular um parágrafo longo e pegar parágrafos das seções seguintes, deixando buracos no texto.

## [3.5.0] - 2026-10-18

### Adicionado

- **Passo a passo ilustrado para criar a chave do Gemini** no painel da IA (Criar textos e Configurações): 4 passos com ilustrações que seguem o tema claro/escuro, dicas para os erros mais comuns e botão **📋 Colar**.

### Alterado

- O painel aceita a chave colada com sobras (aspas, espaços, `GEMINI_API_KEY=…`), avisa na hora quando o texto não parece uma chave (sem gastar um pedido ao Google) e, se o Google recusar, mostra o motivo junto do campo e mantém o que foi colado.

## [3.4.0] - 2026-10-18

Áudio melhor e mais rápido, tradução também no estudo e revisão mais robusta.

### Adicionado

- **Ouvir enquanto gera**: o MP3 começa a tocar assim que os primeiros trechos ficam prontos.
- **Tradução falada no MP3** (opcional, nas listas): “window… janela”.
- **Tradução nos flashcards**: ao estudar um PDF que tem tradução, ela aparece abaixo de cada item (pode ser ocultada).
- **“Mais opções”** recolhido no flashcard e em Criar textos: as telas começam só com o essencial.
- **Content-Security-Policy**: a página só carrega código do próprio site e das CDNs e só conversa com a Wikipédia, o Gemini e o Hugging Face (modelo da voz), protegendo a chave do Gemini.

### Alterado

- **Volume do MP3 nivelado**: o Kokoro termina as frases bem mais baixo do que começa, o que soava como “trechos baixos e rompantes”; agora cada trecho é nivelado e as emendas são suavizadas.
- **MP3 mais rápido**: número do item e palavra num trecho só, frases curtas agrupadas, voz carregada enquanto o PDF do kit é gerado e áudio reaproveitado ao gerar de novo na mesma visita (lista numerada: −35% de tempo).
- **Revisar arquivo**: combina só arquivos do mesmo tipo e idioma; mostra as traduções em “Ver” e um selo “com tradução”; MP3 selecionados junto com os PDFs do kit são ignorados (antes davam erro).
- Textos reabertos mantêm o glossário ao exportar de novo (sem traduzir outra vez), e as palavras/frases tiradas deles levam as traduções para os flashcards.

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
