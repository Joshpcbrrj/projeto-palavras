/**
 * Diálogo de exportação de áudio MP3 (palavras, frases ou textos).
 */

import { IDIOMAS, TIPOS, VOZES_KOKORO, VOZES_OPENAI } from '../config.js';
import { $, baixarArquivo, html, render } from '../core/dom.js';
import { formatarDuracao } from '../core/utils.js';
import { criarMotor, gerarMp3 } from '../audio/export/index.js';
import { ehDialogo, estimarDuracao, planejarAudio } from '../audio/export/plan.js';
import { settings } from '../services/settings.js';
import { toast } from './toast.js';

function opcoesVoz(motor, selecionada) {
  const lista = motor === 'openai' ? VOZES_OPENAI.map((id) => ({ id, nome: id })) : VOZES_KOKORO;
  return lista.map(
    (v) =>
      html`<option value="${v.id}" ${v.id === selecionada ? html`selected` : ''}>${v.nome}</option>`
  );
}

/**
 * Abre o diálogo de exportação.
 * @param {{tipo: string, titulo: string, idioma: string, itens?: string[], texto?: string}} conteudo
 */
export function abrirExportacaoMp3(conteudo) {
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

  const desenhar = () => {
    const motor = estado.motor;
    const vozPrincipal = motor === 'openai' ? estado.vozOpenai : estado.vozKokoro;
    const vozSegunda = motor === 'openai' ? estado.vozOpenai2 : estado.vozKokoro2;
    const segmentos = planejarAudio(conteudo, {
      repeticoes: estado.repeticoes,
      pausaMs: estado.pausaMs,
    });
    render(
      el,
      html`
        <div class="dialogo__conteudo">
          <h2 id="mp3Titulo" class="dialogo__titulo">🎵 Exportar áudio (MP3)</h2>
          <p class="dialogo__mensagem">${conteudo.titulo} · ${segmentos.length} trechos · ≈ ${formatarDuracao(estimarDuracao(segmentos, estado.velocidade))}</p>

          <fieldset class="campo">
            <legend class="campo__rotulo">Motor de voz</legend>
            <div class="segmentado">
              <label class="segmentado__opcao"><input type="radio" name="mp3Motor" value="kokoro" ${motor === 'kokoro' ? html`checked` : ''} /><span>Kokoro (grátis)</span></label>
              <label class="segmentado__opcao"><input type="radio" name="mp3Motor" value="openai" ${motor === 'openai' ? html`checked` : ''} /><span>OpenAI (sua chave)</span></label>
            </div>
            <p class="campo__ajuda">
              ${
                motor === 'kokoro'
                  ? 'Roda no seu navegador, sem custo. Na primeira vez a voz é baixada (90 a 330 MB, conforme o aparelho) e fica guardada.'
                  : estado.chaveOpenai
                    ? 'Usa a sua chave da OpenAI (cobrança por uso na sua conta).'
                    : html`Configure sua chave da OpenAI em <a href="#/configuracoes">Configurações</a>.`
              }
            </p>
            ${
              motor === 'kokoro' && !ingles
                ? html`<p class="campo__ajuda campo__ajuda--aviso">O Kokoro fala apenas inglês. Para ${IDIOMAS[conteudo.idioma]?.nome || 'este idioma'}, use o motor da OpenAI.</p>`
                : ''
            }
          </fieldset>

          <div class="grade-2 grade-2--compacta">
            <div class="campo">
              <label class="campo__rotulo" for="mp3Voz">${dialogo ? 'Voz da 1ª pessoa' : 'Voz'}</label>
              <select id="mp3Voz" class="input">${opcoesVoz(motor, vozPrincipal)}</select>
            </div>
            ${
              dialogo
                ? html`<div class="campo">
                  <label class="campo__rotulo" for="mp3Voz2">Voz da 2ª pessoa</label>
                  <select id="mp3Voz2" class="input">${opcoesVoz(motor, vozSegunda)}</select>
                </div>`
                : html`<div class="campo">
                  <label class="campo__rotulo" for="mp3Velocidade">Velocidade: <strong id="mp3VelocidadeValor">${estado.velocidade}×</strong></label>
                  <input type="range" id="mp3Velocidade" class="faixa" min="0.7" max="1.3" step="0.05" value="${estado.velocidade}" ${motor === 'openai' ? html`disabled` : ''} />
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
            <button type="button" class="btn btn--primario" id="mp3Gerar">🎵 Gerar MP3</button>
          </div>
        </div>
      `
    );
    ligar();
  };

  const ligar = () => {
    el.querySelectorAll('input[name="mp3Motor"]').forEach((r) =>
      r.addEventListener('change', () => {
        estado.motor = r.value;
        settings.setMp3({ motor: r.value });
        desenhar();
      })
    );
    $('#mp3Voz', el)?.addEventListener('change', (e) => {
      const chave = estado.motor === 'openai' ? 'vozOpenai' : 'vozKokoro';
      estado[chave] = e.target.value;
      settings.setMp3({ [chave]: e.target.value });
    });
    $('#mp3Voz2', el)?.addEventListener('change', (e) => {
      const chave = estado.motor === 'openai' ? 'vozOpenai2' : 'vozKokoro2';
      estado[chave] = e.target.value;
      settings.setMp3({ [chave]: e.target.value });
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
    el.querySelectorAll('a[href^="#/"]').forEach((a) =>
      a.addEventListener('click', () => el.close())
    );
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
    const openai = estado.motor === 'openai';
    try {
      const motor = criarMotor(estado.motor, { chaveOpenai: estado.chaveOpenai });
      const resultado = await gerarMp3(conteudo, {
        motor,
        vozes: openai
          ? [estado.vozOpenai, estado.vozOpenai2]
          : [estado.vozKokoro, estado.vozKokoro2],
        velocidade: openai ? 1 : estado.velocidade,
        repeticoes: estado.repeticoes,
        pausaMs: estado.pausaMs,
        aoProgresso: mostrarProgresso,
        signal: controle.signal,
      });
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
      toast.sucesso('Áudio MP3 gerado.');
    } catch (erro) {
      $('#mp3Progresso', el).hidden = true;
      if (erro?.name !== 'AbortError') {
        console.error(erro);
        toast.erro(erro.message || 'Não foi possível gerar o áudio.');
      }
    } finally {
      controle = null;
      botao.textContent = '🎵 Gerar MP3';
      el.querySelectorAll('select, input').forEach((c) => (c.disabled = false));
      const faixa = $('#mp3Velocidade', el);
      if (faixa && openai) faixa.disabled = true;
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
