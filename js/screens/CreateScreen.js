/**
 * Criar textos: diálogo sobre um tema, mergulho no tema (estilo enciclopédia)
 * e texto por nível de compreensão. Tudo grátis: Wikipédia + Google Gemini (chave gratuita).
 */

import { IDIOMAS, NIVEIS, TIPOS } from '../config.js';
import { $, criarEscopoEventos, html, render } from '../core/dom.js';
import { ROTAS, navegar } from '../core/nav.js';
import { gerarId } from '../core/utils.js';
import { MODOS, criarTexto } from '../create/generator.js';
import { nomeNivel } from '../create/levels.js';
import { iaDisponivel, obterMotorIA } from '../create/engine.js';
import { settings } from '../services/settings.js';
import { extrairFrases, extrairPalavras } from '../text/extract.js';
import { montarPainelIA } from '../ui/aiPanel.js';
import {
  alternador,
  cabecalhoTela,
  segmentado,
  seletorIdioma,
  valorSegmentado,
} from '../ui/components.js';
import {
  abrirKit,
  alternadorTraducao,
  exportarPdfComBotao,
  ligarAlternadorTraducao,
} from '../ui/exportActions.js';
import { abrirExportacaoMp3 } from '../ui/mp3Dialog.js';
import { toast } from '../ui/toast.js';

const INFO_MODOS = {
  [MODOS.DIALOGO]: {
    aba: '💬 Diálogo',
    descricao:
      'Uma conversa entre duas pessoas sobre o tema — ótima para aprender expressões do dia a dia. Cada pessoa ganha uma voz diferente no áudio.',
    exemplo: 'Ex.: pedir comida num restaurante, entrevista de emprego, no aeroporto',
    precisaIA: true,
  },
  [MODOS.MERGULHO]: {
    aba: '🌍 Mergulhar no tema',
    descricao:
      'Um texto explicativo de meia a duas páginas, com origem e principais ideias do tema, baseado na Wikipédia. Iniciantes recebem a Simple English Wikipedia, escrita para quem está aprendendo inglês.',
    exemplo: 'Ex.: economia, história do futebol, inteligência artificial',
    precisaIA: false,
  },
  [MODOS.NIVEL]: {
    aba: '📶 Por nível',
    descricao:
      'Um texto sobre o tema escrito no seu nível: palavras, tamanho das frases e tempos verbais se ajustam ao que você escolher. Sem IA configurada, usa a Wikipédia do nível mais próximo (Simple English para iniciante e intermediário).',
    exemplo: 'Ex.: meio ambiente, viagens, tecnologia no trabalho',
    precisaIA: false,
    usaIA: true,
  },
};

const SUGESTOES = [
  'Restaurante',
  'Viagem de avião',
  'Entrevista de emprego',
  'Economia',
  'Saúde',
  'Tecnologia',
  'Futebol',
  'Meio ambiente',
];

const TAMANHOS_POR_MODO = {
  [MODOS.MERGULHO]: [
    { valor: 'curto', rotulo: '½ página' },
    { valor: 'medio', rotulo: '1 página' },
    { valor: 'longo', rotulo: '2 páginas' },
  ],
  padrao: [
    { valor: 'curto', rotulo: 'Curto' },
    { valor: 'medio', rotulo: 'Médio' },
    { valor: 'longo', rotulo: 'Longo' },
  ],
};

export class CreateScreen {
  constructor() {
    const prefs = settings.carregar();
    this.form = {
      modo: MODOS.DIALOGO,
      tema: '',
      idioma: prefs.idioma,
      nivel: prefs.nivelTexto,
      tamanho: 'medio',
      // No diálogo, artigos genéricos desviam a conversa da situação pedida (ex.: "fast food"
      // para "pedir comida num restaurante"); nos outros modos a Wikipédia ajuda com fatos.
      usarWikipedia: { [MODOS.DIALOGO]: false, [MODOS.NIVEL]: true },
      adaptarComIA: true,
    };
    this.resultado = null;
    this.controle = null;
    this.iaPronta = iaDisponivel();
    this.maisOpcoesAbertas = false;
    this.eventos = criarEscopoEventos();
  }

  montar(raiz) {
    this.raiz = raiz;
    this.desenhar();
  }

  desmontar() {
    this.controle?.abort();
    this.eventos.limpar();
  }

  desenhar() {
    const f = this.form;
    const info = INFO_MODOS[f.modo];
    render(
      this.raiz,
      html`
        <section class="tela">
          <div class="cartao">
            ${cabecalhoTela({
              icone: '✨',
              titulo: 'Criar textos',
              subtitulo: 'Gere material de estudo sobre qualquer tema, de graça.',
            })}
            <div class="abas" role="tablist">
              ${Object.entries(INFO_MODOS).map(
                ([modo, dados]) =>
                  html`<button role="tab" class="abas__aba" data-modo="${modo}" aria-selected="${modo === f.modo}">${dados.aba}</button>`
              )}
            </div>
            <p class="texto-suave criar__descricao">${info.descricao}</p>
          </div>

          <div class="cartao">
            <div class="campo">
              <label class="campo__rotulo" for="criarTema">Tema</label>
              <input id="criarTema" class="input" maxlength="120" placeholder="${info.exemplo}" value="${f.tema}" autocomplete="off" />
              <div class="chips criar__sugestoes">
                ${SUGESTOES.map((s) => html`<button type="button" class="chip" data-sugestao="${s}">${s}</button>`)}
              </div>
              <p class="campo__ajuda">Pode escrever o tema em português: o texto sai no idioma escolhido abaixo.</p>
            </div>

            <div class="grade-2 grade-2--compacta">
              ${seletorIdioma({ id: 'criarIdioma', valor: f.idioma, rotulo: 'Idioma do texto' })}
              ${segmentado({
                nome: 'criarNivel',
                rotulo: 'Nível de compreensão',
                valor: f.nivel,
                opcoes: Object.entries(NIVEIS).map(([valor, n]) => ({ valor, rotulo: n.nome })),
              })}
            </div>

            <details class="mais-opcoes" id="criarMaisOpcoes" ${this.maisOpcoesAbertas ? html`open` : ''}>
              <summary class="mais-opcoes__titulo">
                ⚙️ Mais opções
                <span class="texto-suave texto-pequeno">tamanho e ${f.modo === MODOS.MERGULHO ? 'adaptação pela IA' : 'uso da Wikipédia'}</span>
              </summary>
            <div class="grade-2 grade-2--compacta">
              ${segmentado({
                nome: 'criarTamanho',
                rotulo: 'Tamanho',
                valor: f.tamanho,
                opcoes: TAMANHOS_POR_MODO[f.modo] || TAMANHOS_POR_MODO.padrao,
              })}
              <div>
                ${
                  f.modo === MODOS.MERGULHO
                    ? alternador({
                        id: 'criarAdaptar',
                        rotulo: 'Adaptar ao meu nível com a IA',
                        ajuda: 'Reescreve o artigo com palavras do nível escolhido.',
                        marcado: f.adaptarComIA,
                      })
                    : alternador({
                        id: 'criarWikipedia',
                        rotulo: 'Usar a Wikipédia como base',
                        ajuda: 'Traz fatos reais para o texto (precisa de internet).',
                        marcado: f.usarWikipedia[f.modo],
                      })
                }
              </div>
            </div>
            </details>

            <div id="painelIA" ${info.precisaIA || info.usaIA || f.adaptarComIA ? '' : html`hidden`}></div>

            <div class="acoes acoes--entre criar__acoes">
              <span class="texto-suave texto-pequeno">${nomeNivel(f.nivel)} · ${IDIOMAS[f.idioma]?.nome}</span>
              <button type="button" class="btn btn--primario btn--grande" id="btnCriar">✨ Criar texto</button>
            </div>
          </div>

          <div id="areaResultado">${this.resultado ? this.htmlResultado() : ''}</div>
        </section>
      `
    );
    this.ligar();
  }

  ligar() {
    const r = this.raiz;
    const f = this.form;

    r.querySelectorAll('[data-modo]').forEach((aba) =>
      aba.addEventListener('click', () => {
        if (this.controle) return;
        f.modo = aba.dataset.modo;
        this.desenhar();
      })
    );
    const tema = $('#criarTema', r);
    tema.addEventListener('input', () => (f.tema = tema.value));
    tema.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.criar();
    });
    r.querySelectorAll('[data-sugestao]').forEach((chip) =>
      chip.addEventListener('click', () => {
        f.tema = chip.dataset.sugestao;
        tema.value = f.tema;
        tema.focus();
      })
    );
    $('#criarIdioma', r).addEventListener('change', (e) => (f.idioma = e.target.value));
    // Mantém "Mais opções" aberto ao redesenhar (troca de modo ou nível).
    $('#criarMaisOpcoes', r).addEventListener(
      'toggle',
      (e) => (this.maisOpcoesAbertas = e.target.open)
    );
    r.querySelectorAll('input[name="criarNivel"]').forEach((i) =>
      i.addEventListener('change', () => {
        f.nivel = valorSegmentado(r, 'criarNivel');
        settings.set('nivelTexto', f.nivel);
        this.desenhar();
      })
    );
    r.querySelectorAll('input[name="criarTamanho"]').forEach((i) =>
      i.addEventListener('change', () => (f.tamanho = valorSegmentado(r, 'criarTamanho')))
    );
    $('#criarWikipedia', r)?.addEventListener(
      'change',
      (e) => (f.usarWikipedia[f.modo] = e.target.checked)
    );
    $('#criarAdaptar', r)?.addEventListener('change', (e) => {
      f.adaptarComIA = e.target.checked;
      $('#painelIA', r).hidden = !e.target.checked;
    });

    const painel = $('#painelIA', r);
    if (painel && !painel.hidden) {
      montarPainelIA(painel, { aoMudar: (pronta) => (this.iaPronta = pronta) });
    }

    $('#btnCriar', r).addEventListener('click', () =>
      this.controle ? this.controle.abort() : this.criar()
    );
    if (this.resultado) this.ligarResultado();
  }

  async criar() {
    const f = this.form;
    if (!f.tema.trim()) {
      toast.aviso('Digite um tema.');
      $('#criarTema', this.raiz).focus();
      return;
    }
    const motor = obterMotorIA();
    const usarIA = f.modo === MODOS.MERGULHO ? f.adaptarComIA : true;
    if (INFO_MODOS[f.modo].precisaIA && !motor) {
      toast.aviso('Configure a IA no painel acima para criar diálogos.');
      return;
    }

    const botao = $('#btnCriar', this.raiz);
    const area = $('#areaResultado', this.raiz);
    this.controle = new AbortController();
    botao.textContent = '✕ Cancelar';
    this.resultado = null;
    render(
      area,
      html`<div class="cartao">
        <p class="criar__etapa" id="criarEtapa" aria-live="polite">Começando…</p>
        <div class="leitor__texto criar__previa" id="criarPrevia"></div>
      </div>`
    );
    const etapa = $('#criarEtapa', area);
    const previa = $('#criarPrevia', area);

    try {
      const resultado = await criarTexto({
        ...f,
        usarWikipedia: f.usarWikipedia[f.modo] ?? true,
        usarIA: usarIA && Boolean(motor),
        ia: motor,
        aoEtapa: (texto) => (etapa.textContent = texto),
        aoTexto: (parcial) => {
          previa.textContent = parcial;
          previa.scrollTop = previa.scrollHeight;
        },
        signal: this.controle.signal,
      });
      this.resultado = { ...resultado, id: gerarId() };
      render(area, this.htmlResultado());
      this.ligarResultado();
      area.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    } catch (erro) {
      if (erro?.name === 'AbortError' || this.controle?.signal.aborted) {
        render(area, '');
        toast.info('Criação cancelada.');
      } else {
        console.error(erro);
        render(
          area,
          html`<div class="cartao"><p class="campo__ajuda campo__ajuda--aviso">${erro.message}</p></div>`
        );
      }
    } finally {
      this.controle = null;
      botao.textContent = '✨ Criar texto';
    }
  }

  htmlResultado() {
    const r = this.resultado;
    const a = r.analise;
    const estimado = a ? NIVEIS[a.nivelEstimado] : null;
    return html`
      <div class="cartao criar__resultado">
        <div class="secao__cabecalho">
          <h3 class="secao__titulo">${r.titulo}</h3>
          <span class="selo selo--neutro">${NIVEIS[r.nivel].nome}${r.geradoPorIA ? ' · IA (Gemini)' : ' · Wikipédia'}</span>
        </div>
        <div class="leitor__texto">${r.texto}</div>
        ${
          a
            ? html`<p class="texto-pequeno texto-suave">
              ${a.palavras} palavras · ${a.palavrasPorFrase} palavras por frase · legibilidade ${a.facilidade}/100
              (parece nível <strong>${estimado.nome}</strong>${a.nivelEstimado !== r.nivel ? ' — gere de novo se quiser mais próximo do pedido' : ''})
            </p>`
            : ''
        }
        ${
          r.fonte
            ? html`<p class="texto-pequeno texto-suave">Fonte: <a href="${r.fonte.url}" target="_blank" rel="noopener">${r.fonte.nome} — ${r.fonte.titulo}</a> (${r.fonte.licenca})${r.geradoPorIA ? ', adaptado pela IA' : ''}.</p>`
            : ''
        }
        ${alternadorTraducao(r.idioma)}
        <div class="acoes">
          <button type="button" class="btn btn--primario" data-acao="kit">📦 Kit de estudo (PDF + MP3)</button>
          <button type="button" class="btn btn--secundario" data-acao="ouvir">🎧 Ouvir e estudar</button>
          <button type="button" class="btn btn--secundario" data-acao="mp3">🎵 MP3</button>
          <button type="button" class="btn btn--secundario" data-acao="pdf">📄 PDF</button>
          <button type="button" class="btn btn--secundario" data-acao="palavras">📖 Palavras</button>
          <button type="button" class="btn btn--secundario" data-acao="frases">💬 Frases</button>
          <button type="button" class="btn btn--fantasma" data-acao="novo">🔄 Gerar de novo</button>
        </div>
      </div>
    `;
  }

  materialTexto() {
    const r = this.resultado;
    return {
      id: r.id,
      tipo: TIPOS.TEXTO,
      titulo: r.titulo,
      idioma: r.idioma,
      texto: r.texto,
      fonte: r.fonte,
      nivel: r.nivel,
    };
  }

  ligarResultado() {
    const area = $('#areaResultado', this.raiz);
    ligarAlternadorTraducao(area);
    area.onclick = async (e) => {
      const botao = e.target.closest('[data-acao]');
      if (!botao) return;
      const r = this.resultado;
      const opcoes = { idioma: r.idioma };
      switch (botao.dataset.acao) {
        case 'ouvir':
          navegar(ROTAS.TEXTO, { material: this.materialTexto() });
          break;
        case 'kit':
          abrirKit(this.materialTexto());
          break;
        case 'mp3':
          abrirExportacaoMp3(this.materialTexto());
          break;
        case 'pdf':
          await exportarPdfComBotao(botao, this.materialTexto());
          break;
        case 'palavras':
        case 'frases': {
          const frases = botao.dataset.acao === 'frases';
          const itens = frases
            ? extrairFrases(r.texto.replace(/^[\p{L} .'-]{1,24}:\s+/gmu, ''), opcoes)
            : extrairPalavras(r.texto, { ...opcoes, ignorarComuns: settings.get('ignorarComuns') });
          navegar(frases ? ROTAS.FRASES : ROTAS.PALAVRAS, { itens, idioma: r.idioma });
          break;
        }
        case 'novo':
          this.criar();
          break;
      }
    };
  }
}
