/**
 * Diálogo de exportação de áudio MP3 (palavras, frases ou textos).
 */

import { IDIOMAS, TIPOS, VOZES_KOKORO } from '../config.js';
import { $, baixarArquivo, html, render } from '../core/dom.js';
import { formatarDuracao } from '../core/utils.js';
import { criarMotor, gerarMp3 } from '../audio/export/index.js';
import { ehDialogo, estimarDuracao, planejarAudio } from '../audio/export/plan.js';
import { settings } from '../services/settings.js';
import { toast } from './toast.js';

function opcoesVoz(selecionada) {
  return VOZES_KOKORO.map(
    (v) =>
      html`<option value="${v.id}" ${v.id === selecionada ? html`selected` : ''}>${v.nome}</option>`
  );
}

/**
 * Abre o diálogo de exportação.
 * @param {{tipo: string, titulo: string, idioma: string, itens?: string[], texto?: string}} conteudo
 * @param {object} [opcoes]
 * @param {{nomeBase: string, gerarPdf: () => Promise<object>}} [opcoes.kit] modo "kit de estudo":
 *   baixa o PDF primeiro e depois o MP3, os dois com o mesmo nome
 */
export function abrirExportacaoMp3(conteudo, { kit } = {}) {
  let pdfPronto = false;
  const prefs = settings.carregar();
  const estado = { ...prefs.mp3, velocidade: 1, repeticoes: prefs.repeticoes };
  const temItens = conteudo.tipo !== TIPOS.TEXTO;
  const dialogo = ehDialogo(conteudo.texto);
  const ingles = String(conteudo.idioma || '').startsWith('en');
  let controle = null;
  let urlAudio = null;

  const el = document.createElement('dialog');
  el.className = 'dialogo dialogo--largo';
  el.setAttribute('aria-labelledby', 'mp3Titulo');
  document.body.appendChild(el);

  const rotuloGerar = () => (kit && !pdfPronto ? '📦 Gerar kit' : '🎵 Gerar MP3');

  const desenhar = () => {
    const segmentos = planejarAudio(conteudo, {
      repeticoes: estado.repeticoes,
      pausaMs: estado.pausaMs,
    });
    render(
      el,
      html`
        <div class="dialogo__conteudo">
          <h2 id="mp3Titulo" class="dialogo__titulo">${kit ? '📦 Kit de estudo (PDF + MP3)' : '🎵 Exportar áudio (MP3)'}</h2>
          <p class="dialogo__mensagem">${conteudo.titulo} · ${segmentos.length} trechos · ≈ ${formatarDuracao(estimarDuracao(segmentos, estado.velocidade))}</p>
          ${
            kit
              ? html`<p class="campo__ajuda">Baixa o PDF na hora e, em seguida, o MP3 — os dois com o nome <strong>${kit.nomeBase}</strong>, para ficarem juntos na pasta.</p>`
              : ''
          }

          <p class="campo__ajuda">
            Voz neural Kokoro, gerada no seu navegador sem custo. Na primeira vez a voz é baixada
            (90 a 330 MB, conforme o aparelho) e fica guardada. Textos longos podem levar alguns minutos.
          </p>
          ${
            !ingles
              ? html`<p class="campo__ajuda campo__ajuda--aviso">A voz do MP3 fala apenas inglês; em ${IDIOMAS[conteudo.idioma]?.nome || 'outro idioma'} a pronúncia sairá com sotaque inglês.</p>`
              : ''
          }

          <div class="grade-2 grade-2--compacta">
            <div class="campo">
              <label class="campo__rotulo" for="mp3Voz">${dialogo ? 'Voz da 1ª pessoa' : 'Voz'}</label>
              <select id="mp3Voz" class="input">${opcoesVoz(estado.vozKokoro)}</select>
            </div>
            ${
              dialogo
                ? html`<div class="campo">
                  <label class="campo__rotulo" for="mp3Voz2">Voz da 2ª pessoa</label>
                  <select id="mp3Voz2" class="input">${opcoesVoz(estado.vozKokoro2)}</select>
                </div>`
                : html`<div class="campo">
                  <label class="campo__rotulo" for="mp3Velocidade">Velocidade: <strong id="mp3VelocidadeValor">${estado.velocidade}×</strong></label>
                  <input type="range" id="mp3Velocidade" class="faixa" min="0.7" max="1.3" step="0.05" value="${estado.velocidade}" />
                </div>`
            }
          </div>

          ${
            temItens
              ? html`<div class="grade-2 grade-2--compacta">
                <div class="campo">
                  <label class="campo__rotulo" for="mp3Repeticoes">Repetir cada ${conteudo.tipo === TIPOS.FRASES ? 'frase' : 'palavra'}</label>
                  <select id="mp3Repeticoes" class="input">
                    ${[1, 2, 3].map((n) => html`<option value="${n}" ${n === estado.repeticoes ? html`selected` : ''}>${n}×</option>`)}
                  </select>
                </div>
                <div class="campo">
                  <label class="campo__rotulo" for="mp3Pausa">Pausa entre itens</label>
                  <select id="mp3Pausa" class="input">
                    ${[600, 900, 1500, 2500, 4000].map((ms) => html`<option value="${ms}" ${ms === estado.pausaMs ? html`selected` : ''}>${(ms / 1000).toLocaleString('pt-BR')} s${ms >= 2500 ? ' (tempo para repetir)' : ''}</option>`)}
                  </select>
                </div>
              </div>`
              : ''
          }

          <div class="mp3-progresso" id="mp3Progresso" hidden>
            <div class="barra"><div class="barra__preenchimento" id="mp3Barra"></div></div>
            <p class="campo__ajuda" id="mp3Status" aria-live="polite"></p>
          </div>
          <div id="mp3Resultado" hidden></div>

          <div class="dialogo__acoes">
            <button type="button" class="btn btn--fantasma" id="mp3Fechar">Fechar</button>
            <button type="button" class="btn btn--primario" id="mp3Gerar">${rotuloGerar()}</button>
          </div>
        </div>
      `
    );
    ligar();
  };

  const ligar = () => {
    $('#mp3Voz', el)?.addEventListener('change', (e) => {
      estado.vozKokoro = e.target.value;
      settings.setMp3({ vozKokoro: e.target.value });
    });
    $('#mp3Voz2', el)?.addEventListener('change', (e) => {
      estado.vozKokoro2 = e.target.value;
      settings.setMp3({ vozKokoro2: e.target.value });
    });
    $('#mp3Velocidade', el)?.addEventListener('input', (e) => {
      estado.velocidade = Number(e.target.value);
      $('#mp3VelocidadeValor', el).textContent = `${estado.velocidade}×`;
    });
    $('#mp3Repeticoes', el)?.addEventListener('change', (e) => {
      estado.repeticoes = Number(e.target.value);
      desenhar();
    });
    $('#mp3Pausa', el)?.addEventListener('change', (e) => {
      estado.pausaMs = Number(e.target.value);
      settings.setMp3({ pausaMs: estado.pausaMs });
      desenhar();
    });
    $('#mp3Fechar', el).addEventListener('click', () => el.close());
    $('#mp3Gerar', el).addEventListener('click', gerar);
  };

  const mostrarProgresso = ({ fase, atual, total, progresso }) => {
    const barra = $('#mp3Barra', el);
    const status = $('#mp3Status', el);
    if (!barra) return;
    if (fase === 'carregando') {
      barra.style.width = `${Math.round((progresso || 0) * 100)}%`;
      status.textContent = progresso
        ? `Preparando a voz… ${Math.round(progresso * 100)}%`
        : 'Preparando a voz…';
    } else if (fase === 'gerando') {
      barra.style.width = `${Math.round((atual / total) * 100)}%`;
      status.textContent = `Gerando trecho ${atual} de ${total}…`;
    } else {
      status.textContent = 'Montando o arquivo MP3…';
    }
  };

  const gerar = async () => {
    const botao = $('#mp3Gerar', el);
    if (controle) {
      controle.abort();
      return;
    }
    controle = new AbortController();
    botao.textContent = '✕ Cancelar';
    el.querySelectorAll('select, input').forEach((c) => (c.disabled = true));
    $('#mp3Progresso', el).hidden = false;
    $('#mp3Resultado', el).hidden = true;
    try {
      if (kit && !pdfPronto) {
        $('#mp3Status', el).textContent = 'Gerando o PDF…';
        await kit.gerarPdf();
        pdfPronto = true; // se o MP3 for cancelado, tentar de novo não repete o PDF
      }
      const motor = criarMotor();
      const resultado = await gerarMp3(conteudo, {
        motor,
        vozes: [estado.vozKokoro, estado.vozKokoro2],
        velocidade: estado.velocidade,
        repeticoes: estado.repeticoes,
        pausaMs: estado.pausaMs,
        aoProgresso: mostrarProgresso,
        signal: controle.signal,
      });
      if (kit) resultado.nome = `${kit.nomeBase}.mp3`;
      baixarArquivo(resultado.blob, resultado.nome);
      if (urlAudio) URL.revokeObjectURL(urlAudio);
      urlAudio = URL.createObjectURL(resultado.blob);
      const area = $('#mp3Resultado', el);
      render(
        area,
        html`<p class="campo__ajuda">✅ ${resultado.nome} · ${formatarDuracao(resultado.duracao)} · ${(resultado.blob.size / 1024 / 1024).toFixed(1)} MB</p>
          <audio controls src="${urlAudio}" class="mp3-player"></audio>`
      );
      area.hidden = false;
      $('#mp3Progresso', el).hidden = true;
      toast.sucesso(kit ? 'Kit de estudo pronto: PDF e MP3 baixados.' : 'Áudio MP3 gerado.');
    } catch (erro) {
      $('#mp3Progresso', el).hidden = true;
      if (erro?.name !== 'AbortError') {
        console.error(erro);
        toast.erro(erro.message || 'Não foi possível gerar o áudio.');
      }
    } finally {
      controle = null;
      botao.textContent = rotuloGerar();
      el.querySelectorAll('select, input').forEach((c) => (c.disabled = false));
    }
  };

  el.addEventListener('close', () => {
    controle?.abort();
    if (urlAudio) URL.revokeObjectURL(urlAudio);
    el.remove();
  });
  desenhar();
  if (typeof el.showModal === 'function') el.showModal();
  else el.setAttribute('open', '');
}
