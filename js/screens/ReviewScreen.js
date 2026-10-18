/**
 * Revisão de arquivos: abre PDFs (novos e antigos), TXT e JSON, detecta o tipo
 * de cada um e permite retomar o estudo, ouvir o texto ou combinar listas.
 */

import { IDIOMAS, TIPOS, nomeTipo } from '../config.js';
import { $, baixarArquivo, html, render } from '../core/dom.js';
import { ROTAS, navegar } from '../core/nav.js';
import { carimboArquivo, formatarDataBR, unicos } from '../core/utils.js';
import { statusRevisao } from '../pdf/format.js';
import { ORIGENS, lerArquivo } from '../pdf/importer.js';
import { progresso, revisaoEfetiva } from '../services/progress.js';
import { settings } from '../services/settings.js';
import { extrairFrases, extrairPalavras } from '../text/extract.js';
import { cabecalhoTela, estadoVazio, seloRevisao } from '../ui/components.js';
import { confirmar } from '../ui/dialog.js';
import { exportarPdfComBotao } from '../ui/exportActions.js';
import { toast } from '../ui/toast.js';

const ICONES = { [TIPOS.PALAVRAS]: '📖', [TIPOS.FRASES]: '💬', [TIPOS.TEXTO]: '🎧' };

// Os arquivos abertos continuam disponíveis ao voltar para esta tela durante a visita.
let materiaisAbertos = [];

export class ReviewScreen {
  montar(raiz) {
    this.raiz = raiz;
    this.desenhar();
  }

  desenhar() {
    render(
      this.raiz,
      html`
        <section class="tela">
          <div class="cartao">
            ${cabecalhoTela({
              icone: '📂',
              titulo: 'Revisar arquivo',
              subtitulo:
                'Abra PDFs exportados pelo app (inclusive das versões antigas), arquivos .txt ou backups .json.',
            })}
            <label class="area-arquivos" id="areaArquivos" tabindex="0">
              <input
                type="file"
                id="entradaArquivos"
                accept=".pdf,.txt,.md,.json,application/pdf,text/plain,application/json"
                multiple
                hidden
              />
              <span class="area-arquivos__icone" aria-hidden="true">📥</span>
              <span class="area-arquivos__titulo"
                >Arraste os arquivos aqui ou clique para escolher</span
              >
              <span class="area-arquivos__ajuda"
                >PDF, TXT, MD ou JSON · vários arquivos de uma vez</span
              >
            </label>
            <p class="campo__ajuda" id="statusArquivos" aria-live="polite"></p>
          </div>
          <div id="areaMateriais">${this.htmlMateriais()}</div>
        </section>
      `
    );
    this.ligar();
  }

  htmlMateriais() {
    if (!materiaisAbertos.length) {
      return html`<div class="cartao">
        ${estadoVazio({
          icone: '🗂️',
          titulo: 'Nenhum arquivo aberto',
          texto:
            'Os PDFs gerados pelo app guardam as palavras, frases ou textos estudados e a data da próxima revisão.',
        })}
      </div>`;
    }

    const combinaveis = [TIPOS.PALAVRAS, TIPOS.FRASES]
      .map((tipo) => {
        const lista = materiaisAbertos.filter((m) => m.tipo === tipo);
        return { tipo, arquivos: lista.length, itens: unicos(lista.flatMap((m) => m.itens)) };
      })
      .filter((c) => c.arquivos > 1);

    return html`
      <div class="cartao">
        <div class="secao__cabecalho">
          <h3 class="secao__titulo">Arquivos abertos (${materiaisAbertos.length})</h3>
          <div class="acoes">
            <button type="button" class="btn btn--fantasma btn--pequeno" id="btnExportarJson">
              💾 Salvar JSON
            </button>
            <button type="button" class="btn btn--fantasma btn--pequeno" id="btnLimparLista">
              ✕ Limpar lista
            </button>
          </div>
        </div>
        <ul class="materiais">
          ${materiaisAbertos.map((m, i) => this.htmlMaterial(m, i))}
        </ul>
      </div>
      ${combinaveis.map(
        (c) => html`
          <div class="cartao cartao--info">
            <h3 class="secao__titulo">🔗 Combinar ${nomeTipo(c.tipo)}</h3>
            <p>
              <strong>${c.itens.length}</strong> ${nomeTipo(c.tipo)} únicas em ${c.arquivos}
              arquivos.
            </p>
            <div class="acoes">
              <button type="button" class="btn btn--primario" data-combinar="${c.tipo}">
                ▶ Estudar todas
              </button>
              <button type="button" class="btn btn--secundario" data-combinar-pdf="${c.tipo}">
                📄 Exportar PDF combinado
              </button>
            </div>
          </div>
        `
      )}
    `;
  }

  htmlMaterial(m, i) {
    const revisao = revisaoEfetiva(m);
    const idioma = IDIOMAS[m.idioma];
    const quantidade =
      m.tipo === TIPOS.TEXTO
        ? `${m.texto.split(/\s+/).filter(Boolean).length} palavras`
        : `${m.itens.length} ${nomeTipo(m.tipo)}`;
    const origem = {
      [ORIGENS.LEGADO]: html`<span
        class="selo selo--neutro"
        title="Gerado por uma versão anterior do app"
        >formato antigo</span
      >`,
      [ORIGENS.TEXTO_LIVRE]: html`<span class="selo selo--neutro">texto simples</span>`,
    }[m.origem];

    return html`
      <li class="material">
        <div class="material__icone" aria-hidden="true">${ICONES[m.tipo]}</div>
        <div class="material__info">
          <p class="material__titulo">${m.titulo}</p>
          <p class="material__meta">
            ${quantidade} · ${idioma?.bandeira || ''} ${idioma?.nome || m.idioma} · ${m.nomeArquivo}
          </p>
          <p class="material__selos">
            ${revisao ? seloRevisao(statusRevisao(revisao)) : ''} ${origem || ''}
          </p>
        </div>
        <div class="material__acoes">
          ${
            m.tipo === TIPOS.TEXTO
              ? html`
                <button
                  type="button"
                  class="btn btn--primario btn--pequeno"
                  data-acao="ouvir"
                  data-i="${i}"
                >
                  🎧 Ouvir
                </button>
                <button
                  type="button"
                  class="btn btn--secundario btn--pequeno"
                  data-acao="palavras"
                  data-i="${i}"
                >
                  📖 Palavras
                </button>
                <button
                  type="button"
                  class="btn btn--secundario btn--pequeno"
                  data-acao="frases"
                  data-i="${i}"
                >
                  💬 Frases
                </button>
              `
              : html`<button
                type="button"
                class="btn btn--primario btn--pequeno"
                data-acao="estudar"
                data-i="${i}"
              >
                ▶ Estudar
              </button>`
          }
          <button
            type="button"
            class="btn btn--fantasma btn--pequeno"
            data-acao="ver"
            data-i="${i}"
            aria-expanded="false"
          >
            👁 Ver
          </button>
          <button
            type="button"
            class="btn btn--fantasma btn--icone btn--pequeno"
            data-acao="remover"
            data-i="${i}"
            aria-label="Remover ${m.titulo} da lista"
          >
            ✕
          </button>
        </div>
        <div class="material__previa" id="previa${i}" hidden>
          ${
            m.tipo === TIPOS.TEXTO
              ? html`<p class="material__texto">${m.texto}</p>`
              : html`<ol class="material__itens">
                ${m.itens.map((item) => html`<li>${item}</li>`)}
              </ol>`
          }
        </div>
      </li>
    `;
  }

  ligar() {
    const r = this.raiz;
    const area = $('#areaArquivos', r);
    const entrada = $('#entradaArquivos', r);

    entrada.addEventListener('change', () => {
      this.abrir(Array.from(entrada.files || []));
      entrada.value = '';
    });
    area.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        entrada.click();
      }
    });
    ['dragenter', 'dragover'].forEach((ev) =>
      area.addEventListener(ev, (e) => {
        e.preventDefault();
        area.classList.add('area-arquivos--ativa');
      })
    );
    ['dragleave', 'drop'].forEach((ev) =>
      area.addEventListener(ev, () => area.classList.remove('area-arquivos--ativa'))
    );
    area.addEventListener('drop', (e) => {
      e.preventDefault();
      this.abrir(Array.from(e.dataTransfer?.files || []));
    });

    this.ligarMateriais();
  }

  ligarMateriais() {
    const r = this.raiz;
    const areaMateriais = $('#areaMateriais', r);

    areaMateriais.onclick = (e) => {
      const botao = e.target.closest('button');
      if (!botao) return;

      if (botao.id === 'btnLimparLista') {
        materiaisAbertos = [];
        this.atualizarLista();
        return;
      }
      if (botao.id === 'btnExportarJson') {
        const dados = {
          app: 'aprendendo-palavras',
          materiais: materiaisAbertos.map(({ nomeArquivo: _n, origem: _o, ...p }) => p),
        };
        baixarArquivo(
          new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }),
          `materiais_${carimboArquivo()}.json`
        );
        return;
      }
      if (botao.dataset.combinar) return this.estudarCombinado(botao.dataset.combinar);
      if (botao.dataset.combinarPdf)
        return this.exportarCombinado(botao, botao.dataset.combinarPdf);

      const material = materiaisAbertos[Number(botao.dataset.i)];
      if (!material) return;
      const comRevisao = { ...material, revisao: revisaoEfetiva(material) };
      const opcoes = { idioma: material.idioma };

      switch (botao.dataset.acao) {
        case 'estudar':
          navegar(material.tipo === TIPOS.FRASES ? ROTAS.FRASES : ROTAS.PALAVRAS, {
            itens: material.itens,
            material: comRevisao,
          });
          break;
        case 'ouvir':
          navegar(ROTAS.TEXTO, { material: comRevisao });
          break;
        case 'palavras':
        case 'frases': {
          const itens =
            botao.dataset.acao === 'frases'
              ? extrairFrases(material.texto, opcoes)
              : extrairPalavras(material.texto, {
                  ...opcoes,
                  ignorarComuns: settings.get('ignorarComuns'),
                });
          if (!itens.length) return toast.aviso('Nada encontrado neste texto.');
          navegar(botao.dataset.acao === 'frases' ? ROTAS.FRASES : ROTAS.PALAVRAS, {
            itens,
            idioma: material.idioma,
          });
          break;
        }
        case 'ver': {
          const previa = $(`#previa${botao.dataset.i}`, r);
          previa.hidden = !previa.hidden;
          botao.setAttribute('aria-expanded', String(!previa.hidden));
          break;
        }
        case 'remover':
          materiaisAbertos.splice(Number(botao.dataset.i), 1);
          this.atualizarLista();
          break;
      }
    };
  }

  atualizarLista() {
    render($('#areaMateriais', this.raiz), this.htmlMateriais());
  }

  async abrir(arquivos) {
    if (!arquivos.length) return;
    const status = $('#statusArquivos', this.raiz);
    const erros = [];
    let abertos = 0;

    for (const [n, arquivo] of arquivos.entries()) {
      status.textContent = `Lendo ${arquivo.name} (${n + 1} de ${arquivos.length})…`;
      try {
        const materiais = await lerArquivo(arquivo);
        for (const material of materiais) {
          const existente = materiaisAbertos.findIndex((m) => m.id === material.id);
          if (existente !== -1) materiaisAbertos.splice(existente, 1, material);
          else materiaisAbertos.push(material);
          abertos++;

          const servico = progresso();
          servico.registrarArquivo('revisados', {
            nome: material.nomeArquivo,
            tipo: material.tipo,
            quantidade: material.itens?.length ?? 1,
          });
          if (material.revisao) servico.salvarMaterial(material);
        }
      } catch (erro) {
        console.error(erro);
        erros.push(erro.message || `Falha ao ler ${arquivo.name}.`);
      }
    }

    status.textContent = '';
    this.atualizarLista();
    if (abertos) toast.sucesso(abertos === 1 ? 'Arquivo aberto.' : `${abertos} arquivos abertos.`);
    erros.forEach((mensagem) => toast.erro(mensagem));
  }

  itensCombinados(tipo) {
    return unicos(materiaisAbertos.filter((m) => m.tipo === tipo).flatMap((m) => m.itens));
  }

  estudarCombinado(tipo) {
    const lista = materiaisAbertos.filter((m) => m.tipo === tipo);
    navegar(tipo === TIPOS.FRASES ? ROTAS.FRASES : ROTAS.PALAVRAS, {
      itens: this.itensCombinados(tipo),
      idioma: lista[0]?.idioma,
    });
  }

  async exportarCombinado(botao, tipo) {
    const lista = materiaisAbertos.filter((m) => m.tipo === tipo);
    const ok = await confirmar({
      titulo: 'Exportar PDF combinado',
      mensagem: `Gerar um único PDF com ${this.itensCombinados(tipo).length} ${nomeTipo(tipo)} de ${lista.length} arquivos?`,
      confirmar: 'Gerar PDF',
    });
    if (!ok) return;
    await exportarPdfComBotao(botao, {
      tipo,
      titulo: `${nomeTipo(tipo, { maiuscula: true })} combinadas (${formatarDataBR(new Date())})`,
      idioma: lista[0]?.idioma,
      itens: this.itensCombinados(tipo),
      // Mantém as traduções que os arquivos originais já tinham.
      glossario: lista.flatMap((m) => m.glossario || []),
    });
  }
}

/** Somente para testes. */
export function _limparMateriaisAbertos() {
  materiaisAbertos = [];
}
