/**
 * Estudo com flashcards (palavras ou frases), em quatro etapas:
 * 1. texto de origem → 2. configuração → 3. estudo → 4. resultado/exportação.
 *
 * Também recebe itens prontos vindos da tela "Revisar arquivo" ou "Texto".
 */

import { IDIOMAS, LIMITES, TEMPO_MAXIMO, TEMPO_MINIMO, TIPOS, nomeTipo } from '../config.js';
import { $, criarEscopoEventos, html, lerTextoDoArquivo, render } from '../core/dom.js';
import { ROTAS, navegar } from '../core/nav.js';
import {
  amostra,
  embaralhar,
  esperar,
  formatarDataBR,
  formatarDuracao,
  limitar,
} from '../core/utils.js';
import { speaker } from '../audio/index.js';
import { criarPacote, criarRevisao, proximaRevisao, statusRevisao } from '../pdf/format.js';
import { exportarPdf } from '../pdf/exporter.js';
import { progresso } from '../services/progress.js';
import { settings } from '../services/settings.js';
import { ESTADOS_SESSAO, StudySession } from '../study/session.js';
import { extrairFrases, extrairPalavras } from '../text/extract.js';
import {
  alternador,
  cabecalhoTela,
  conectarSeletorVoz,
  conectarVelocidade,
  controleVelocidade,
  etapas,
  segmentado,
  seletorIdioma,
  seletorRevisao,
  seletorVoz,
  seloRevisao,
  valorSegmentado,
} from '../ui/components.js';
import { escolher } from '../ui/dialog.js';
import { abrirExportacaoMp3 } from '../ui/mp3Dialog.js';
import { toast } from '../ui/toast.js';

const ETAPAS = ['Texto', 'Configurar', 'Estudar', 'Resultado'];

const EXEMPLOS = {
  [TIPOS.PALAVRAS]:
    'The early morning light filled the quiet kitchen. Maria opened the window, made a cup of coffee and started to read her favorite book.',
  [TIPOS.FRASES]:
    'Good morning! How are you today? I would like a cup of coffee, please. Where is the train station? Thank you very much for your help.',
};

export class StudyScreen {
  /**
   * @param {'palavras'|'frases'} tipo
   * @param {object} [parametros]
   * @param {string[]} [parametros.itens] itens prontos para estudar
   * @param {object} [parametros.material] pacote de origem (para manter id e revisão)
   * @param {string} [parametros.texto] texto para preencher a primeira etapa
   */
  constructor(tipo, parametros = {}) {
    this.tipo = tipo;
    this.material = parametros.material || null;
    this.texto = parametros.texto || '';
    this.itensDisponiveis = parametros.itens?.length ? [...parametros.itens] : [];
    this.etapa = this.itensDisponiveis.length ? 1 : 0;

    const prefs = settings.carregar();
    this.config = {
      idioma: this.material?.idioma || parametros.idioma || prefs.idioma,
      audioAutomatico: prefs.audioAutomatico,
      repeticoes: prefs.repeticoes,
      velocidade: prefs.velocidadeFala,
      tempo: settings.getTempo(tipo),
      quantidade: 0,
      embaralhar: prefs.embaralhar,
    };
    this.titulo = this.material?.titulo || '';
    this.sessao = null;
    this.sessaoRegistrada = false;
    this.eventos = criarEscopoEventos();
    this.seletorVoz = null;
  }

  get nome() {
    return nomeTipo(this.tipo);
  }

  get nomeSingular() {
    return nomeTipo(this.tipo, { plural: false });
  }

  extrair(texto) {
    const opcoes = { idioma: this.config.idioma };
    return this.tipo === TIPOS.FRASES
      ? extrairFrases(texto, opcoes)
      : extrairPalavras(texto, opcoes);
  }

  montar(raiz) {
    this.raiz = raiz;
    this.desenhar();
  }

  desmontar() {
    this.sessao?.encerrar();
    speaker.cancelar();
    this.eventos.limpar();
    this.seletorVoz?.destruir();
  }

  async podeSair() {
    const s = this.sessao;
    if (this.etapa !== 2 || !s || this.sessaoRegistrada || s.vistos.size === 0) return true;
    const estavaRodando = s.estado === ESTADOS_SESSAO.RODANDO;
    s.pausar();
    const escolha = await escolher({
      titulo: 'Sair do estudo?',
      mensagem: `Você estudou ${s.vistos.size} de ${s.total} ${this.nome}. Deseja salvar esse progresso?`,
      botoes: [
        { valor: 'continuar', rotulo: 'Continuar estudando', estilo: 'fantasma' },
        { valor: 'descartar', rotulo: 'Sair sem salvar', estilo: 'secundario' },
        { valor: 'salvar', rotulo: 'Salvar e sair', estilo: 'primario' },
      ],
    });
    if (escolha === 'salvar') {
      this.registrarSessao();
      return true;
    }
    if (escolha === 'descartar') return true;
    if (estavaRodando) s.retomar();
    return false;
  }

  desenhar() {
    this.eventos.limpar();
    this.seletorVoz?.destruir();
    this.seletorVoz = null;

    const conteudo = [this.htmlTexto, this.htmlConfiguracao, this.htmlEstudo, this.htmlResultado][
      this.etapa
    ].call(this);
    const subtitulo =
      this.tipo === TIPOS.FRASES
        ? 'Pratique frases completas ouvindo a pronúncia de cada uma.'
        : 'Pratique palavras em flashcards com pronúncia.';
    render(
      this.raiz,
      html`
        <section class="tela">
          <div class="cartao">
            ${cabecalhoTela({
              icone: this.tipo === TIPOS.FRASES ? '💬' : '📖',
              titulo: `Estudar ${this.nome}`,
              subtitulo,
            })}
            ${etapas(ETAPAS, this.etapa)}
          </div>
          ${conteudo}
        </section>
      `
    );
    [this.ligarTexto, this.ligarConfiguracao, this.ligarEstudo, this.ligarResultado][
      this.etapa
    ].call(this);
  }

  irPara(etapa) {
    this.etapa = etapa;
    this.desenhar();
  }

  // ---------------------------------------------------------------- Etapa 1: texto

  htmlTexto() {
    return html`
      <div class="cartao">
        <div class="campo">
          <label class="campo__rotulo" for="textoEntrada">Cole ou digite o texto</label>
          <textarea
            id="textoEntrada"
            class="input input--area"
            rows="10"
            placeholder="${
              this.tipo === TIPOS.FRASES
                ? 'As frases são separadas por ponto final, exclamação, interrogação ou quebra de linha.'
                : 'Todas as palavras do texto serão extraídas (sem repetições).'
            }"
          >
${this.texto}</textarea
          >
          <p class="campo__ajuda" id="contagemItens" aria-live="polite"></p>
        </div>
        <div class="acoes acoes--entre">
          <div class="acoes">
            <label class="btn btn--fantasma">
              📎 Abrir arquivo .txt
              <input type="file" id="arquivoTexto" accept=".txt,.md,text/plain" hidden />
            </label>
            <button type="button" class="btn btn--fantasma" id="btnExemplo">✨ Usar exemplo</button>
          </div>
          <button type="button" class="btn btn--primario btn--grande" id="btnContinuar" disabled>
            Continuar →
          </button>
        </div>
        <p class="texto-suave texto-pequeno">
          Tem um PDF exportado pelo app? Use <a href="#/${ROTAS.REVISAR}">Revisar arquivo</a> para
          retomar o estudo.
        </p>
      </div>
    `;
  }

  ligarTexto() {
    const area = $('#textoEntrada', this.raiz);
    const contagem = $('#contagemItens', this.raiz);
    const continuar = $('#btnContinuar', this.raiz);

    const atualizar = () => {
      this.texto = area.value;
      const total = this.extrair(this.texto).length;
      continuar.disabled = total === 0;
      contagem.textContent = this.texto.trim()
        ? total
          ? `${total} ${total === 1 ? this.nomeSingular : this.nome} encontrada(s), sem repetições.`
          : `Nenhuma ${this.nomeSingular} encontrada.`
        : '';
    };
    let espera;
    area.addEventListener('input', () => {
      clearTimeout(espera);
      espera = setTimeout(atualizar, 150);
    });
    atualizar();
    area.focus();

    $('#btnExemplo', this.raiz).addEventListener('click', () => {
      area.value = EXEMPLOS[this.tipo];
      this.config.idioma = 'en-US';
      atualizar();
    });

    $('#arquivoTexto', this.raiz).addEventListener('change', async (e) => {
      const arquivo = e.target.files?.[0];
      if (!arquivo) return;
      area.value = await lerTextoDoArquivo(arquivo);
      atualizar();
    });

    continuar.addEventListener('click', () => {
      this.itensDisponiveis = this.extrair(this.texto);
      if (!this.itensDisponiveis.length) return;
      this.config.quantidade = 0;
      this.irPara(1);
    });
  }

  // ---------------------------------------------------------- Etapa 2: configuração

  htmlConfiguracao() {
    const total = this.itensDisponiveis.length;
    const padrao = Math.min(total, LIMITES[this.tipo]);
    if (!this.config.quantidade || this.config.quantidade > total) this.config.quantidade = padrao;
    const c = this.config;

    return html`
      ${this.material ? this.htmlOrigemMaterial() : ''}
      <div class="grade-2">
        <div class="cartao">
          <h3 class="secao__titulo">🔊 Áudio</h3>
          ${seletorIdioma({ id: 'cfgIdioma', valor: c.idioma })} ${seletorVoz({ id: 'cfgVoz' })}
          ${alternador({
            id: 'cfgAudio',
            rotulo: `Falar cada ${this.nomeSingular} automaticamente`,
            ajuda: 'Você também pode ouvir a qualquer momento pelo botão 🔊.',
            marcado: c.audioAutomatico,
          })}
          ${segmentado({
            nome: 'cfgRepeticoes',
            rotulo: 'Repetir a pronúncia',
            valor: c.repeticoes,
            opcoes: [
              { valor: 1, rotulo: '1×' },
              { valor: 2, rotulo: '2×' },
              { valor: 3, rotulo: '3×' },
            ],
          })}
          ${controleVelocidade({ id: 'cfgVelocidade', valor: c.velocidade })}
        </div>

        <div class="cartao">
          <h3 class="secao__titulo">⏱️ Sessão</h3>
          <div class="campo">
            <label class="campo__rotulo" for="cfgTempo">Pausa entre ${this.nome} (segundos)</label>
            <div class="campo__linha">
              <input
                type="number"
                id="cfgTempo"
                class="input input--curto"
                min="${TEMPO_MINIMO}"
                max="${TEMPO_MAXIMO}"
                step="0.5"
                value="${c.tempo}"
                inputmode="decimal"
              />
              <div class="chips">
                ${[1, 2, 3, 5].map(
                  (s) => html`<button type="button" class="chip" data-tempo="${s}">${s}s</button>`
                )}
              </div>
            </div>
            <p class="campo__ajuda">
              Com o áudio ligado, a pausa começa depois que a pronúncia termina.
            </p>
          </div>
          <div class="campo">
            <label class="campo__rotulo" for="cfgQuantidade"
              >Quantidade: <strong id="cfgQuantidadeValor">${c.quantidade}</strong> de
              ${total}</label
            >
            <input
              type="range"
              id="cfgQuantidade"
              class="faixa"
              min="1"
              max="${total}"
              step="1"
              value="${c.quantidade}"
              ${total === 1 ? html`disabled` : ''}
            />
          </div>
          ${alternador({
            id: 'cfgEmbaralhar',
            rotulo: 'Ordem aleatória',
            ajuda: 'Embaralhar ajuda a memorizar sem depender da sequência.',
            marcado: c.embaralhar,
          })}
          <div class="resumo-sessao" id="resumoSessao"></div>
        </div>
      </div>

      <div class="cartao acoes acoes--entre">
        <button type="button" class="btn btn--fantasma" id="btnVoltarTexto">
          ← ${this.material ? 'Voltar' : 'Editar texto'}
        </button>
        <button type="button" class="btn btn--sucesso btn--grande" id="btnIniciar">
          ▶ Iniciar estudo
        </button>
      </div>
    `;
  }

  htmlOrigemMaterial() {
    const status = statusRevisao(this.material.revisao);
    return html`
      <div class="cartao cartao--info">
        <p>
          <strong>📄 ${this.material.titulo}</strong> — ${this.itensDisponiveis.length} ${this.nome}
        </p>
        ${this.material.revisao ? html`<p>${seloRevisao(status)}</p>` : ''}
      </div>
    `;
  }

  ligarConfiguracao() {
    const r = this.raiz;
    const c = this.config;
    const total = this.itensDisponiveis.length;

    const resumo = () => {
      const segundosPorItem =
        c.tempo +
        (c.audioAutomatico
          ? ((this.tipo === TIPOS.FRASES ? 2.5 : 1) * c.repeticoes) / c.velocidade
          : 0);
      $('#resumoSessao', r).textContent =
        `≈ ${formatarDuracao(c.quantidade * segundosPorItem)} para ${c.quantidade} ${this.nome}`;
    };

    $('#cfgIdioma', r).addEventListener('change', (e) => {
      c.idioma = e.target.value;
      settings.set('idioma', c.idioma);
      this.seletorVoz.atualizar();
    });
    this.seletorVoz = conectarSeletorVoz(
      r,
      'cfgVoz',
      () => c.idioma,
      () => c.velocidade
    );

    $('#cfgAudio', r).addEventListener('change', (e) => {
      c.audioAutomatico = e.target.checked;
      settings.set('audioAutomatico', c.audioAutomatico);
      resumo();
    });
    r.querySelectorAll('input[name="cfgRepeticoes"]').forEach((input) =>
      input.addEventListener('change', () => {
        c.repeticoes = Number(valorSegmentado(r, 'cfgRepeticoes')) || 1;
        settings.set('repeticoes', c.repeticoes);
        resumo();
      })
    );
    conectarVelocidade(r, 'cfgVelocidade', (v) => {
      c.velocidade = v;
      settings.set('velocidadeFala', v);
      resumo();
    });

    const tempo = $('#cfgTempo', r);
    const definirTempo = (valor) => {
      const v = limitar(Number(valor), TEMPO_MINIMO, TEMPO_MAXIMO);
      if (!Number.isFinite(v)) return;
      c.tempo = v;
      tempo.value = String(v);
      settings.setTempo(this.tipo, v);
      resumo();
    };
    tempo.addEventListener('change', () => definirTempo(tempo.value || this.config.tempo));
    r.querySelectorAll('[data-tempo]').forEach((chip) =>
      chip.addEventListener('click', () => definirTempo(chip.dataset.tempo))
    );

    const quantidade = $('#cfgQuantidade', r);
    quantidade.addEventListener('input', () => {
      c.quantidade = limitar(Number(quantidade.value), 1, total);
      $('#cfgQuantidadeValor', r).textContent = String(c.quantidade);
      resumo();
    });

    $('#cfgEmbaralhar', r).addEventListener('change', (e) => {
      c.embaralhar = e.target.checked;
      settings.set('embaralhar', c.embaralhar);
    });

    $('#btnVoltarTexto', r).addEventListener('click', () => {
      if (this.material) navegar(ROTAS.REVISAR);
      else this.irPara(0);
    });
    $('#btnIniciar', r).addEventListener('click', () => {
      speaker.desbloquear();
      this.iniciarSessao();
    });
    resumo();
  }

  // ------------------------------------------------------------- Etapa 3: estudo

  iniciarSessao(itens) {
    const c = this.config;
    let lista = itens;
    if (!lista) {
      lista = c.embaralhar
        ? amostra(this.itensDisponiveis, c.quantidade)
        : this.itensDisponiveis.slice(0, c.quantidade);
      if (c.embaralhar) lista = embaralhar(lista);
    }

    this.sessaoRegistrada = false;
    this.sessao = new StudySession({
      itens: lista,
      intervaloMs: c.tempo * 1000,
      falar: (item, signal) =>
        c.audioAutomatico ? this.pronunciar(item, signal) : Promise.resolve(),
      aoMostrar: (item, indice, total) => this.mostrarItem(item, indice, total),
      aoMudarEstado: (estado) => this.atualizarEstado(estado),
      aoConcluir: () => {
        this.registrarSessao();
        this.irPara(3);
      },
    });
    this.irPara(2);
    this.sessao.iniciar();
  }

  async pronunciar(item, signal) {
    const c = this.config;
    for (let i = 0; i < c.repeticoes; i++) {
      if (signal?.aborted) return;
      await speaker.falar(item, { idioma: c.idioma, velocidade: c.velocidade, signal });
      if (i < c.repeticoes - 1 && !(await esperar(450, signal))) return;
    }
  }

  htmlEstudo() {
    const s = this.sessao;
    return html`
      <div class="cartao estudo">
        <div class="estudo__topo">
          <span id="estudoContador" class="estudo__contador"
            >${this.nomeSingular} 1 de ${s.total}</span
          >
          <span id="estudoEstado" class="selo selo--neutro">Preparando…</span>
        </div>
        <div
          class="barra"
          role="progressbar"
          aria-label="Progresso do estudo"
          aria-valuemin="0"
          aria-valuemax="${s.total}"
          id="estudoBarra"
        >
          <div class="barra__preenchimento" id="estudoBarraValor"></div>
        </div>

        <div class="flashcard ${this.tipo === TIPOS.FRASES ? 'flashcard--frase' : ''}">
          <p class="flashcard__texto" id="flashcardTexto" aria-live="polite"></p>
          <button type="button" class="btn btn--claro" id="btnOuvir" title="Ouvir (Enter)">
            🔊 Ouvir ${IDIOMAS[this.config.idioma]?.bandeira || ''}
          </button>
        </div>

        <div class="controles" role="group" aria-label="Controles do estudo">
          <button
            type="button"
            class="btn btn--secundario btn--redondo"
            id="btnAnterior"
            title="Anterior (←)"
            aria-label="Anterior"
          >
            ⏮
          </button>
          <button
            type="button"
            class="btn btn--primario btn--redondo btn--grande"
            id="btnPausar"
            title="Pausar (Espaço)"
            aria-label="Pausar"
          >
            ⏸
          </button>
          <button
            type="button"
            class="btn btn--secundario btn--redondo"
            id="btnProximo"
            title="Próximo (→)"
            aria-label="Próximo"
          >
            ⏭
          </button>
          <button
            type="button"
            class="btn btn--perigo-suave btn--redondo"
            id="btnEncerrar"
            title="Encerrar (Esc)"
            aria-label="Encerrar"
          >
            ⏹
          </button>
        </div>

        <div class="estudo__ajustes">
          ${controleVelocidade({ id: 'estVelocidade', valor: this.config.velocidade })}
          ${alternador({
            id: 'estAudio',
            rotulo: 'Áudio automático',
            marcado: this.config.audioAutomatico,
          })}
        </div>
        <p class="atalhos" aria-hidden="true">
          <kbd>Espaço</kbd> pausar · <kbd>←</kbd> <kbd>→</kbd> navegar · <kbd>Enter</kbd> ouvir ·
          <kbd>Esc</kbd> encerrar
        </p>
      </div>
    `;
  }

  ligarEstudo() {
    const r = this.raiz;
    const s = this.sessao;
    $('#btnAnterior', r).addEventListener('click', () => s.anterior());
    $('#btnProximo', r).addEventListener('click', () => s.proximo());
    $('#btnPausar', r).addEventListener('click', () => s.alternar());
    $('#btnEncerrar', r).addEventListener('click', () => this.encerrarSessao());
    $('#btnOuvir', r).addEventListener('click', () => {
      speaker.desbloquear();
      this.pronunciar(s.itemAtual);
    });
    conectarVelocidade(r, 'estVelocidade', (v) => {
      this.config.velocidade = v;
      settings.set('velocidadeFala', v);
    });
    $('#estAudio', r).addEventListener('change', (e) => {
      this.config.audioAutomatico = e.target.checked;
      settings.set('audioAutomatico', e.target.checked);
      if (!e.target.checked) speaker.cancelar();
    });

    this.eventos.on(document, 'keydown', (e) => {
      if (e.target.closest?.('input, textarea, select') || e.altKey || e.ctrlKey || e.metaKey)
        return;
      const acoes = {
        ' ': () => s.alternar(),
        ArrowRight: () => s.proximo(),
        ArrowLeft: () => s.anterior(),
        Enter: () => this.pronunciar(s.itemAtual),
        Escape: () => this.encerrarSessao(),
      };
      const acao = acoes[e.key];
      if (acao && !(e.key === 'Enter' && e.target.closest?.('button'))) {
        e.preventDefault();
        acao();
      }
    });

    if (s.vistos.size) this.mostrarItem(s.itemAtual, s.indice, s.total);
    this.atualizarEstado(s.estado);
  }

  mostrarItem(item, indice, total) {
    const texto = $('#flashcardTexto', this.raiz);
    if (!texto) return;
    texto.textContent =
      this.tipo === TIPOS.PALAVRAS ? item.toLocaleUpperCase(this.config.idioma) : item;
    texto.dataset.tamanho =
      item.length > 120 ? 'pp' : item.length > 60 ? 'p' : item.length > 14 ? 'm' : 'g';
    texto.classList.remove('flashcard__texto--entrada');
    void texto.offsetWidth; // reinicia a animação
    texto.classList.add('flashcard__texto--entrada');

    $('#estudoContador', this.raiz).textContent =
      `${this.nomeSingular.replace(/^./, (l) => l.toUpperCase())} ${indice + 1} de ${total}`;
    const vistos = this.sessao.vistos.size;
    $('#estudoBarraValor', this.raiz).style.width = `${(vistos / total) * 100}%`;
    $('#estudoBarra', this.raiz).setAttribute('aria-valuenow', String(vistos));
    $('#btnAnterior', this.raiz).disabled = indice === 0;
  }

  atualizarEstado(estado) {
    const selo = $('#estudoEstado', this.raiz);
    const pausar = $('#btnPausar', this.raiz);
    if (!selo || !pausar) return;
    const rodando = estado === ESTADOS_SESSAO.RODANDO;
    selo.textContent = rodando
      ? 'Estudando'
      : estado === ESTADOS_SESSAO.PAUSADA
        ? 'Pausado'
        : 'Pronto';
    selo.className = `selo ${rodando ? 'selo--sucesso' : 'selo--aviso'}`;
    pausar.textContent = rodando ? '⏸' : '▶';
    pausar.title = rodando ? 'Pausar (Espaço)' : 'Continuar (Espaço)';
    pausar.setAttribute('aria-label', rodando ? 'Pausar' : 'Continuar');
  }

  encerrarSessao() {
    const s = this.sessao;
    if (!s) return;
    s.encerrar();
    speaker.cancelar();
    if (s.vistos.size) this.registrarSessao();
    this.irPara(3);
  }

  registrarSessao() {
    const s = this.sessao;
    if (!s || this.sessaoRegistrada || !s.vistos.size) return;
    this.sessaoRegistrada = true;
    progresso().registrarSessao({
      tipo: this.tipo,
      itens: s.itensVistos,
      segundos: s.segundosAtivos,
      idioma: this.config.idioma,
      titulo: this.material?.titulo,
    });
    // Revisar um material conta como uma revisão concluída: agenda a próxima (uma vez por abertura).
    if (this.material && s.estado === ESTADOS_SESSAO.CONCLUIDA && !this.revisaoAvancada) {
      this.revisaoAvancada = true;
      this.material = { ...this.material, revisao: proximaRevisao(this.material.revisao) };
      progresso().salvarMaterial(this.material);
    }
  }

  // ---------------------------------------------------------- Etapa 4: resultado

  htmlResultado() {
    const s = this.sessao;
    const completo = s.estado === ESTADOS_SESSAO.CONCLUIDA;
    const vistos = s.itensVistos;
    const etapaSugerida = this.material?.revisao?.etapa ?? 0;
    const tituloPadrao =
      this.titulo || `${nomeTipo(this.tipo, { maiuscula: true })} de ${formatarDataBR(new Date())}`;

    return html`
      <div class="cartao resultado">
        <div class="resultado__emoji" aria-hidden="true">${completo ? '🎉' : '👏'}</div>
        <h3 class="resultado__titulo">${completo ? 'Estudo concluído!' : 'Sessão encerrada'}</h3>
        <div class="estatisticas">
          <div class="estatistica">
            <span class="estatistica__valor">${vistos.length}</span
            ><span class="estatistica__rotulo">${this.nome} estudadas</span>
          </div>
          <div class="estatistica">
            <span class="estatistica__valor">${formatarDuracao(s.segundosAtivos)}</span
            ><span class="estatistica__rotulo">de estudo</span>
          </div>
          <div class="estatistica">
            <span class="estatistica__valor">${IDIOMAS[this.config.idioma]?.bandeira || '🌐'}</span
            ><span class="estatistica__rotulo">${IDIOMAS[this.config.idioma]?.nome || ''}</span>
          </div>
        </div>
        ${
          this.material?.revisao && completo
            ? html`<p class="texto-centro">
              Próxima revisão agendada:
              <strong>${formatarDataBR(this.material.revisao.revisarEm)}</strong>
            </p>`
            : ''
        }
      </div>

      <div class="cartao">
        <h3 class="secao__titulo">📄 Exportar para revisar depois</h3>
        <p class="texto-suave">
          O PDF guarda as ${this.nome}, o idioma e a data de revisão. Para revisar, abra-o em
          “Revisar arquivo”.
        </p>
        <div class="grade-2 grade-2--compacta">
          <div class="campo">
            <label class="campo__rotulo" for="pdfTitulo">Título</label>
            <input id="pdfTitulo" class="input" maxlength="120" value="${tituloPadrao}" />
          </div>
          ${seletorRevisao({ id: 'pdfRevisao', etapaSugerida })}
        </div>
        <div class="campo">
          <span class="campo__rotulo">Incluir no PDF</span>
          <div class="segmentado">
            <label class="segmentado__opcao"
              ><input type="radio" name="pdfItens" value="vistos" checked /><span
                >Estudadas (${vistos.length})</span
              ></label
            >
            <label class="segmentado__opcao"
              ><input type="radio" name="pdfItens" value="todos" /><span
                >Todas (${this.itensDisponiveis.length})</span
              ></label
            >
          </div>
        </div>
        <div class="acoes">
          <button type="button" class="btn btn--primario" id="btnExportar">📄 Exportar PDF</button>
          <button type="button" class="btn btn--secundario" id="btnExportarMp3">🎵 Exportar MP3 (pronúncia)</button>
        </div>
      </div>

      <div class="cartao">
        <div class="acoes acoes--centro">
          <button type="button" class="btn btn--sucesso" id="btnDeNovo">🔄 Estudar de novo</button>
          <button
            type="button"
            class="btn btn--secundario"
            id="btnLista"
            aria-expanded="false"
            aria-controls="listaItens"
          >
            📋 Ver ${this.nome}
          </button>
          <button type="button" class="btn btn--secundario" id="btnNovo">✨ Novo estudo</button>
          <a class="btn btn--fantasma" href="#/">🏠 Início</a>
        </div>
        <ol class="lista-itens" id="listaItens" hidden>
          ${vistos.map(
            (item, i) => html`
              <li class="lista-itens__item">
                <span class="lista-itens__numero">${i + 1}</span>
                <span class="lista-itens__texto">${item}</span>
                <button
                  type="button"
                  class="btn btn--fantasma btn--icone btn--pequeno"
                  data-ouvir="${i}"
                  aria-label="Ouvir ${item}"
                >
                  🔊
                </button>
              </li>
            `
          )}
        </ol>
      </div>
    `;
  }

  ligarResultado() {
    const r = this.raiz;
    const vistos = this.sessao.itensVistos;

    $('#btnDeNovo', r).addEventListener('click', () => {
      speaker.desbloquear();
      this.iniciarSessao(embaralhar(this.sessao.itens));
    });
    $('#btnNovo', r).addEventListener('click', () => {
      this.material = null;
      this.titulo = '';
      this.itensDisponiveis = [];
      this.irPara(0);
    });

    const botaoLista = $('#btnLista', r);
    const lista = $('#listaItens', r);
    botaoLista.addEventListener('click', () => {
      lista.hidden = !lista.hidden;
      botaoLista.setAttribute('aria-expanded', String(!lista.hidden));
      botaoLista.textContent = `${lista.hidden ? '📋 Ver' : '📋 Ocultar'} ${this.nome}`;
    });
    lista.addEventListener('click', (e) => {
      const botao = e.target.closest('[data-ouvir]');
      if (botao) this.pronunciar(vistos[Number(botao.dataset.ouvir)]);
    });

    $('#btnExportarMp3', r).addEventListener('click', () => {
      const todos = valorSegmentado(r, 'pdfItens') === 'todos';
      abrirExportacaoMp3({
        tipo: this.tipo,
        titulo: $('#pdfTitulo', r).value.trim() || nomeTipo(this.tipo, { maiuscula: true }),
        idioma: this.config.idioma,
        itens: todos ? this.itensDisponiveis : vistos,
      });
    });

    $('#btnExportar', r).addEventListener('click', async (e) => {
      const botao = e.currentTarget;
      const dias = Number($('#pdfRevisao', r).value);
      const itens = valorSegmentado(r, 'pdfItens') === 'todos' ? this.itensDisponiveis : vistos;
      const titulo = $('#pdfTitulo', r).value.trim();
      const etapa = this.material?.revisao?.etapa ?? 0;
      const revisao = dias
        ? criarRevisao({ etapa, intervaloDias: dias, historico: this.material?.revisao?.historico })
        : null;

      const pacote = criarPacote({
        tipo: this.tipo,
        titulo,
        idioma: this.config.idioma,
        itens,
        revisao,
        id: this.material?.id,
      });
      await this.exportar(botao, pacote);
    });
  }

  async exportar(botao, pacote) {
    const rotulo = botao.innerHTML;
    botao.disabled = true;
    render(botao, html`<span class="carregando" aria-hidden="true"></span> Gerando PDF…`);
    try {
      const nome = await exportarPdf(pacote);
      progresso().registrarArquivo('exportados', {
        nome,
        tipo: pacote.tipo,
        quantidade: pacote.itens.length,
      });
      if (pacote.revisao) progresso().salvarMaterial(pacote);
      this.material = pacote;
      this.titulo = pacote.titulo;
      toast.sucesso(`PDF gerado: ${nome}`);
    } catch (erro) {
      console.error(erro);
      toast.erro(`Não foi possível gerar o PDF. ${erro.message || ''}`);
    } finally {
      botao.disabled = false;
      botao.innerHTML = rotulo;
    }
  }
}
