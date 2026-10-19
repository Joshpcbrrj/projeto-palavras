/**
 * Leitura de textos com áudio: o texto é lido frase a frase, com destaque
 * da frase atual, controle de velocidade, repetição e exportação para PDF.
 */

import { TIPOS } from '../config.js';
import { $, criarEscopoEventos, html, lerTextoDoArquivo, render } from '../core/dom.js';
import { ROTAS, navegar } from '../core/nav.js';
import { formatarDataBR, formatarDuracao } from '../core/utils.js';
import { speaker, vozes } from '../audio/index.js';
import { ehDialogo, separarFalante } from '../audio/export/plan.js';
import { ESTADOS_LEITOR, TextReader } from '../audio/reader.js';
import { criarRevisao, proximaRevisao, statusRevisao, tituloPadrao } from '../pdf/format.js';
import { progresso, revisaoEfetiva } from '../services/progress.js';
import { settings } from '../services/settings.js';
import { storage } from '../services/storage.js';
import { contarPalavras, extrairFrases, extrairPalavras } from '../text/extract.js';
import {
  alternador,
  cabecalhoTela,
  conectarSeletorVoz,
  conectarVelocidade,
  controleVelocidade,
  segmentado,
  seletorIdioma,
  seletorRevisao,
  seletorVoz,
  seloRevisao,
  valorSegmentado,
} from '../ui/components.js';
import {
  abrirKit,
  alternadorTraducao,
  atualizarAlternadorTraducao,
  exportarPdfComBotao,
  ligarAlternadorTraducao,
} from '../ui/exportActions.js';
import { abrirExportacaoMp3 } from '../ui/mp3Dialog.js';
import { toast } from '../ui/toast.js';

const CHAVE_RASCUNHO = 'ap_rascunho_texto';

export class TextScreen {
  /** @param {{material?: object}} [parametros] material do tipo texto vindo da revisão */
  constructor(parametros = {}) {
    const material = parametros.material || null;
    const rascunho = material ? null : storage.lerJSON(CHAVE_RASCUNHO);
    this.material = material ? { ...material, revisao: revisaoEfetiva(material) } : null;
    this.titulo = material?.titulo || rascunho?.titulo || '';
    this.texto = material?.texto || rascunho?.texto || '';
    this.idioma = material?.idioma || rascunho?.idioma || settings.get('idioma');
    this.modo = material ? 'ouvir' : 'editar';
    this.fonte = material?.fonte || null;
    this.nivel = material?.nivel;
    this.dialogo = false;
    this.vozesDialogo = new Map();
    this.velocidade = settings.get('velocidadeFala');
    this.sessaoRegistrada = false;
    this.eventos = criarEscopoEventos();
    this.seletorVoz = null;
    this.leitor = new TextReader(speaker, { aoMudar: (info) => this.aoMudarLeitor(info) });
    this.leitor.velocidade = this.velocidade;
    this.leitor.preparar = (trecho) => this.prepararTrecho(trecho);
  }

  /** Em diálogos ("Anna: ..."), não lê o nome e usa uma voz diferente para cada pessoa. */
  prepararTrecho(trecho) {
    const fala = this.dialogo ? separarFalante(trecho.texto) : null;
    if (!fala) return { texto: trecho.texto };
    const chave = fala.falante.toLowerCase();
    if (!this.vozesDialogo.has(chave)) this.vozesDialogo.set(chave, this.vozesDialogo.size % 2);
    const principal = vozes.escolher(this.idioma);
    const segunda = vozes.listar(this.idioma).find((v) => v !== principal) || principal;
    const voz = this.vozesDialogo.get(chave) === 1 ? segunda : principal;
    return { texto: fala.fala, voz: voz || undefined };
  }

  montar(raiz) {
    this.raiz = raiz;
    this.desenhar();
  }

  desmontar() {
    this.registrarSessao();
    this.leitor.destruir();
    speaker.cancelar();
    this.eventos.limpar();
    this.seletorVoz?.destruir();
  }

  salvarRascunho() {
    if (this.material) return;
    storage.salvarJSON(CHAVE_RASCUNHO, {
      titulo: this.titulo,
      texto: this.texto,
      idioma: this.idioma,
    });
  }

  desenhar() {
    this.eventos.limpar();
    this.seletorVoz?.destruir();

    render(
      this.raiz,
      html`
        <section class="tela">
          <div class="cartao">
            ${cabecalhoTela({
              icone: '🎧',
              titulo: 'Ler e ouvir um texto',
              subtitulo:
                'Escute frase a frase, ajuste a velocidade e exporte em PDF para revisar depois.',
            })}
            ${
              this.fonte
                ? html`<p class="cartao__nota texto-pequeno">Fonte: <a href="${this.fonte.url}" target="_blank" rel="noopener">${this.fonte.nome} — ${this.fonte.titulo}</a> (${this.fonte.licenca})</p>`
                : ''
            }
            ${
              this.material?.revisao
                ? html`<p class="cartao__nota">
                  📄 ${this.material.titulo} · ${seloRevisao(statusRevisao(this.material.revisao))}
                </p>`
                : ''
            }
            <div class="abas" role="tablist">
              <button
                role="tab"
                class="abas__aba"
                id="abaEditar"
                aria-selected="${this.modo === 'editar'}"
              >
                ✏️ Editar
              </button>
              <button
                role="tab"
                class="abas__aba"
                id="abaOuvir"
                aria-selected="${this.modo === 'ouvir'}"
              >
                🎧 Ouvir
              </button>
            </div>
          </div>
          ${this.modo === 'editar' ? this.htmlEditor() : this.htmlLeitor()} ${this.htmlExportar()}
        </section>
      `
    );

    $('#abaEditar', this.raiz).addEventListener('click', () => this.trocarModo('editar'));
    $('#abaOuvir', this.raiz).addEventListener('click', () => this.trocarModo('ouvir'));
    if (this.modo === 'editar') this.ligarEditor();
    else this.ligarLeitor();
    this.ligarExportar();
  }

  trocarModo(modo) {
    if (modo === this.modo) return;
    if (modo === 'ouvir' && !this.texto.trim()) {
      toast.aviso('Digite ou cole um texto antes de ouvir.');
      $('#textoConteudo', this.raiz)?.focus();
      return;
    }
    this.leitor.parar();
    this.modo = modo;
    this.desenhar();
  }

  // ------------------------------------------------------------------ Editor

  htmlEditor() {
    return html`
      <div class="cartao">
        <div class="grade-2 grade-2--compacta">
          <div class="campo">
            <label class="campo__rotulo" for="textoTitulo">Título</label>
            <input
              id="textoTitulo"
              class="input"
              maxlength="120"
              placeholder="Ex.: Viagem a Lisboa"
              value="${this.titulo}"
            />
          </div>
          ${seletorIdioma({ id: 'textoIdioma', valor: this.idioma, rotulo: 'Idioma do texto' })}
        </div>
        <div class="campo">
          <label class="campo__rotulo" for="textoConteudo">Texto</label>
          <textarea
            id="textoConteudo"
            class="input input--area"
            rows="12"
            placeholder="Cole aqui o texto que você quer ouvir e estudar…"
          >
${this.texto}</textarea
          >
          <p class="campo__ajuda" id="textoEstatisticas" aria-live="polite"></p>
        </div>
        <div class="acoes acoes--entre">
          <div class="acoes">
            <label class="btn btn--fantasma">
              📎 Abrir arquivo .txt
              <input type="file" id="textoArquivo" accept=".txt,.md,text/plain" hidden />
            </label>
            <button type="button" class="btn btn--fantasma" id="btnLimpar">🧹 Limpar</button>
          </div>
          <button type="button" class="btn btn--primario btn--grande" id="btnIrOuvir">
            🎧 Ouvir texto
          </button>
        </div>
      </div>
    `;
  }

  ligarEditor() {
    const r = this.raiz;
    const area = $('#textoConteudo', r);
    const estatisticas = () => {
      const palavras = contarPalavras(this.texto);
      const frases = extrairFrases(this.texto, { removerDuplicadas: false }).length;
      const minutos = palavras / (150 * this.velocidade);
      $('#textoEstatisticas', r).textContent = palavras
        ? `${palavras} palavras · ${frases} frases · ≈ ${formatarDuracao(minutos * 60)} de leitura`
        : '';
    };
    area.addEventListener('input', () => {
      this.texto = area.value;
      this.salvarRascunho();
      estatisticas();
    });
    $('#textoTitulo', r).addEventListener('input', (e) => {
      this.titulo = e.target.value;
      this.salvarRascunho();
    });
    $('#textoIdioma', r).addEventListener('change', (e) => {
      this.idioma = e.target.value;
      settings.set('idioma', this.idioma);
      atualizarAlternadorTraducao(r, this.idioma);
      this.salvarRascunho();
    });
    $('#textoArquivo', r).addEventListener('change', async (e) => {
      const arquivo = e.target.files?.[0];
      if (!arquivo) return;
      this.texto = await lerTextoDoArquivo(arquivo);
      area.value = this.texto;
      if (!this.titulo) {
        this.titulo = arquivo.name.replace(/\.[^.]+$/, '');
        $('#textoTitulo', r).value = this.titulo;
      }
      this.salvarRascunho();
      estatisticas();
    });
    $('#btnLimpar', r).addEventListener('click', () => {
      this.texto = '';
      this.titulo = '';
      this.material = null;
      this.fonte = null;
      this.nivel = undefined;
      area.value = '';
      $('#textoTitulo', r).value = '';
      this.salvarRascunho();
      estatisticas();
      area.focus();
    });
    $('#btnIrOuvir', r).addEventListener('click', () => {
      speaker.desbloquear();
      this.trocarModo('ouvir');
    });
    estatisticas();
  }

  // ------------------------------------------------------------------ Leitor

  htmlLeitor() {
    const trechos = this.leitor.carregar(this.texto, { idioma: this.idioma });
    this.dialogo = ehDialogo(this.texto);
    this.vozesDialogo = new Map();
    let cursor = 0;
    const partes = [];
    trechos.forEach((t, i) => {
      if (t.inicio > cursor) partes.push(this.texto.slice(cursor, t.inicio));
      const trecho = this.texto.slice(t.inicio, t.fim);
      partes.push(html`<span class="leitor__trecho" data-trecho="${i}">${trecho}</span>`);
      cursor = t.fim;
    });
    partes.push(this.texto.slice(cursor));

    return html`
      <div class="cartao leitor">
        <div class="grade-2 grade-2--compacta">
          ${seletorIdioma({ id: 'leitorIdioma', valor: this.idioma, rotulo: 'Idioma da leitura' })}
          ${seletorVoz({ id: 'leitorVoz' })}
        </div>

        <div class="leitor__topo">
          <span id="leitorPosicao" class="estudo__contador">Frase 1 de ${trechos.length}</span>
          <span id="leitorEstado" class="selo selo--neutro">Pronto para ouvir</span>
        </div>
        <div class="barra"><div class="barra__preenchimento" id="leitorBarra"></div></div>

        <!-- Sem espaços em volta do conteúdo: o texto usa white-space: pre-wrap. -->
        <div class="leitor__texto" id="leitorTexto" tabindex="0"
          aria-label="Texto. Clique em uma frase para ouvir a partir dela.">${partes}</div>

        <div class="controles" role="group" aria-label="Controles de leitura">
          <button
            type="button"
            class="btn btn--secundario btn--redondo"
            id="btnInicio"
            title="Voltar ao início"
            aria-label="Voltar ao início"
          >
            ⏮
          </button>
          <button
            type="button"
            class="btn btn--secundario btn--redondo"
            id="btnFraseAnterior"
            title="Frase anterior (←)"
            aria-label="Frase anterior"
          >
            ◀
          </button>
          <button
            type="button"
            class="btn btn--primario btn--redondo btn--grande"
            id="btnTocar"
            title="Ouvir (Espaço)"
            aria-label="Ouvir"
          >
            ▶
          </button>
          <button
            type="button"
            class="btn btn--secundario btn--redondo"
            id="btnFraseProxima"
            title="Próxima frase (→)"
            aria-label="Próxima frase"
          >
            ▶▶
          </button>
          <button
            type="button"
            class="btn btn--perigo-suave btn--redondo"
            id="btnParar"
            title="Parar (Esc)"
            aria-label="Parar"
          >
            ⏹
          </button>
        </div>

        <div class="estudo__ajustes">
          ${controleVelocidade({ id: 'leitorVelocidade', valor: this.velocidade })}
          ${segmentado({
            nome: 'leitorPausa',
            rotulo: 'Pausa entre frases',
            valor: this.leitor.pausaEntreTrechosMs,
            opcoes: [
              { valor: 0, rotulo: '0 s' },
              { valor: 1000, rotulo: '1 s' },
              { valor: 2500, rotulo: '2,5 s' },
              { valor: 5000, rotulo: '5 s' },
            ],
          })}
          ${alternador({
            id: 'leitorRepetir',
            rotulo: 'Repetir a frase atual',
            ajuda: 'Ótimo para treinar a pronúncia.',
            marcado: this.leitor.repetirTrecho,
          })}
        </div>
        <p class="atalhos" aria-hidden="true">
          <kbd>Espaço</kbd> ouvir/pausar · <kbd>←</kbd> <kbd>→</kbd> frase anterior/próxima ·
          <kbd>Esc</kbd> parar
        </p>
      </div>
    `;
  }

  ligarLeitor() {
    const r = this.raiz;
    const leitor = this.leitor;

    $('#leitorIdioma', r).addEventListener('change', (e) => {
      this.idioma = e.target.value;
      settings.set('idioma', this.idioma);
      leitor.setIdioma(this.idioma);
      this.seletorVoz.atualizar();
      atualizarAlternadorTraducao(r, this.idioma);
      this.salvarRascunho();
    });
    this.seletorVoz = conectarSeletorVoz(
      r,
      'leitorVoz',
      () => this.idioma,
      () => this.velocidade
    );

    $('#btnTocar', r).addEventListener('click', () => {
      speaker.desbloquear();
      leitor.alternar();
    });
    $('#btnInicio', r).addEventListener('click', () => leitor.reiniciar());
    $('#btnFraseAnterior', r).addEventListener('click', () => leitor.anterior());
    $('#btnFraseProxima', r).addEventListener('click', () => leitor.proximo());
    $('#btnParar', r).addEventListener('click', () => leitor.parar());
    $('#leitorTexto', r).addEventListener('click', (e) => {
      const trecho = e.target.closest('[data-trecho]');
      if (!trecho) return;
      speaker.desbloquear();
      leitor.tocar(Number(trecho.dataset.trecho));
    });

    conectarVelocidade(r, 'leitorVelocidade', (v) => {
      this.velocidade = v;
      settings.set('velocidadeFala', v);
      leitor.setVelocidade(v);
    });
    r.querySelectorAll('input[name="leitorPausa"]').forEach((input) =>
      input.addEventListener('change', () => {
        leitor.pausaEntreTrechosMs = Number(valorSegmentado(r, 'leitorPausa')) || 0;
      })
    );
    $('#leitorRepetir', r).addEventListener('change', (e) => {
      leitor.repetirTrecho = e.target.checked;
    });

    this.eventos.on(document, 'keydown', (e) => {
      if (
        e.target.closest?.('input, textarea, select, button') ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey
      )
        return;
      const acoes = {
        ' ': () => leitor.alternar(),
        ArrowRight: () => leitor.proximo(),
        ArrowLeft: () => leitor.anterior(),
        Escape: () => leitor.parar(),
      };
      if (acoes[e.key]) {
        e.preventDefault();
        acoes[e.key]();
      }
    });
    this.aoMudarLeitor({ estado: leitor.estado, indice: leitor.indice, total: leitor.total });
  }

  aoMudarLeitor({ estado, indice, total }) {
    const r = this.raiz;
    if (!r || this.modo !== 'ouvir') return;
    const botao = $('#btnTocar', r);
    if (!botao) return;

    r.querySelectorAll('.leitor__trecho--atual').forEach((el) =>
      el.classList.remove('leitor__trecho--atual')
    );
    const atual = r.querySelector(`[data-trecho="${indice}"]`);
    if (atual && estado !== ESTADOS_LEITOR.PARADO) {
      atual.classList.add('leitor__trecho--atual');
      const caixa = $('#leitorTexto', r);
      const topo = atual.offsetTop - caixa.offsetTop;
      if (topo < caixa.scrollTop || topo > caixa.scrollTop + caixa.clientHeight - 40) {
        caixa.scrollTo({ top: Math.max(0, topo - caixa.clientHeight / 3), behavior: 'smooth' });
      }
    }

    const tocando = estado === ESTADOS_LEITOR.TOCANDO;
    botao.textContent = tocando ? '⏸' : '▶';
    botao.setAttribute('aria-label', tocando ? 'Pausar' : 'Ouvir');
    $('#leitorPosicao', r).textContent = `Frase ${Math.min(indice + 1, total || 1)} de ${total}`;
    $('#leitorBarra', r).style.width = total
      ? `${((estado === ESTADOS_LEITOR.CONCLUIDO ? total : indice) / total) * 100}%`
      : '0';

    const selo = $('#leitorEstado', r);
    const rotulos = {
      [ESTADOS_LEITOR.PARADO]: ['Pronto para ouvir', 'selo--neutro'],
      [ESTADOS_LEITOR.TOCANDO]: ['Lendo…', 'selo--sucesso'],
      [ESTADOS_LEITOR.PAUSADO]: ['Pausado', 'selo--aviso'],
      [ESTADOS_LEITOR.CONCLUIDO]: ['Leitura concluída', 'selo--sucesso'],
      [ESTADOS_LEITOR.ERRO]: ['Não foi possível reproduzir o áudio', 'selo--perigo'],
    };
    const [texto, classe] = rotulos[estado];
    selo.textContent = texto;
    selo.className = `selo ${classe}`;

    if (estado === ESTADOS_LEITOR.CONCLUIDO) this.aoConcluirLeitura();
    if (estado === ESTADOS_LEITOR.ERRO) {
      toast.erro(
        'O navegador não conseguiu reproduzir a voz. Verifique se há vozes instaladas para este idioma.'
      );
    }
  }

  aoConcluirLeitura() {
    this.registrarSessao(true);
  }

  registrarSessao(concluida = false) {
    if (this.sessaoRegistrada || this.leitor.segundosOuvidos < 15) return;
    this.sessaoRegistrada = true;
    progresso().registrarSessao({
      tipo: TIPOS.TEXTO,
      quantidade: contarPalavras(this.texto),
      segundos: this.leitor.segundosOuvidos,
      idioma: this.idioma,
      titulo: this.titulo,
    });
    if (concluida && this.material?.revisao) {
      this.material = { ...this.material, revisao: proximaRevisao(this.material.revisao) };
      progresso().salvarMaterial(this.material);
      toast.sucesso(
        `Leitura concluída! Próxima revisão: ${formatarDataBR(this.material.revisao.revisarEm)}.`
      );
    }
  }

  // ---------------------------------------------------------------- Exportar

  htmlExportar() {
    return html`
      <div class="cartao">
        <h3 class="secao__titulo">📄 Exportar e estudar</h3>
        <p class="texto-suave">
          O PDF guarda o texto completo, o idioma e a data de revisão. Abra-o depois em “Revisar
          arquivo”.
        </p>
        <div class="grade-2 grade-2--compacta">
          ${seletorRevisao({
            id: 'textoRevisao',
            etapaSugerida: this.material?.revisao?.etapa ?? 0,
          })}
        </div>
        ${alternadorTraducao(this.idioma)}
        <div class="acoes">
          <button type="button" class="btn btn--primario" id="btnKit">📦 Kit de estudo (PDF + MP3)</button>
          <button type="button" class="btn btn--secundario" id="btnExportarTexto">📄 Só o PDF</button>
          <button type="button" class="btn btn--secundario" id="btnExportarMp3">🎵 Só o MP3</button>
        </div>
        <div class="separador"></div>
        <p class="texto-suave">Transforme este texto em flashcards:</p>
        <div class="acoes">
          <button type="button" class="btn btn--secundario" id="btnEstudarPalavras">
            📖 Estudar as palavras
          </button>
          <button type="button" class="btn btn--secundario" id="btnEstudarFrases">
            💬 Estudar as frases
          </button>
        </div>
      </div>
    `;
  }

  ligarExportar() {
    const r = this.raiz;
    const exigirTexto = () => {
      if (this.texto.trim()) return true;
      toast.aviso('Digite ou cole um texto primeiro.');
      return false;
    };

    ligarAlternadorTraducao(r);

    const dadosExportacao = () => {
      const dias = Number($('#textoRevisao', r).value);
      const anterior = this.material?.revisao;
      return {
        tipo: TIPOS.TEXTO,
        titulo: this.titulo.trim() || tituloPadrao(TIPOS.TEXTO),
        idioma: this.idioma,
        texto: this.texto,
        id: this.material?.id,
        fonte: this.fonte,
        nivel: this.nivel,
        // Texto reaberto e não alterado: reaproveita o glossário (não traduz de novo).
        glossario: this.texto === this.material?.texto ? this.material?.glossario : undefined,
        revisao: dias
          ? criarRevisao({
              etapa: anterior?.etapa ?? 0,
              intervaloDias: dias,
              historico: anterior?.historico,
            })
          : null,
      };
    };

    $('#btnExportarMp3', r).addEventListener('click', () => {
      if (exigirTexto()) abrirExportacaoMp3(dadosExportacao());
    });
    $('#btnKit', r).addEventListener('click', () => {
      if (exigirTexto()) abrirKit(dadosExportacao());
    });
    $('#btnExportarTexto', r).addEventListener('click', (e) => {
      if (exigirTexto()) exportarPdfComBotao(e.currentTarget, dadosExportacao());
    });

    const estudar = (tipo) => {
      if (!exigirTexto()) return;
      const opcoes = { idioma: this.idioma };
      const itens =
        tipo === TIPOS.FRASES
          ? extrairFrases(this.texto, opcoes)
          : extrairPalavras(this.texto, {
              ...opcoes,
              ignorarComuns: settings.get('ignorarComuns'),
            });
      if (!itens.length) {
        toast.aviso(`Nenhuma ${tipo === TIPOS.FRASES ? 'frase' : 'palavra'} encontrada no texto.`);
        return;
      }
      navegar(tipo === TIPOS.FRASES ? ROTAS.FRASES : ROTAS.PALAVRAS, {
        itens,
        idioma: this.idioma,
        texto: this.texto,
        glossario: this.material?.glossario,
      });
    };
    $('#btnEstudarPalavras', r).addEventListener('click', () => estudar(TIPOS.PALAVRAS));
    $('#btnEstudarFrases', r).addEventListener('click', () => estudar(TIPOS.FRASES));
  }
}
