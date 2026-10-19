/**
 * Configurações: idioma de estudo, tema, IA para criar textos e vozes do MP3.
 */

import { VOZES_KOKORO } from '../config.js';
import { $, html, render } from '../core/dom.js';
import { settings } from '../services/settings.js';
import { montarPainelIA } from '../ui/aiPanel.js';
import { cabecalhoTela, segmentado, seletorIdioma, valorSegmentado } from '../ui/components.js';
import { aplicarTemaEscolhido } from '../ui/theme.js';
import { toast } from '../ui/toast.js';

function opcoes(lista, selecionada) {
  return lista.map(
    (v) =>
      html`<option value="${v.id}" ${v.id === selecionada ? html`selected` : ''}>${v.nome}</option>`
  );
}

export class SettingsScreen {
  montar(raiz) {
    this.raiz = raiz;
    this.desenhar();
  }

  desenhar() {
    const p = settings.carregar();
    render(
      this.raiz,
      html`
        <section class="tela">
          <div class="cartao">
            ${cabecalhoTela({ icone: '⚙️', titulo: 'Configurações', subtitulo: 'Tudo fica salvo apenas neste navegador.' })}
          </div>

          <div class="cartao">
            <h3 class="secao__titulo">🌐 Estudo e aparência</h3>
            <div class="grade-2 grade-2--compacta">
              ${seletorIdioma({ id: 'cfgIdiomaEstudo', valor: p.idioma, rotulo: 'Idioma que você está estudando' })}
              <div class="campo">
                <label class="campo__rotulo" for="cfgTema">Tema</label>
                <select id="cfgTema" class="input">
                  <option value="" ${!p.tema ? html`selected` : ''}>Seguir o sistema</option>
                  <option value="light" ${p.tema === 'light' ? html`selected` : ''}>Claro</option>
                  <option value="dark" ${p.tema === 'dark' ? html`selected` : ''}>Escuro</option>
                </select>
              </div>
            </div>
          </div>

          <div class="cartao">
            <h3 class="secao__titulo">🤖 IA para criar textos</h3>
            <div id="cfgPainelIA"></div>
            ${segmentado({
              nome: 'cfgVelocidadeIA',
              rotulo: 'Ao criar textos, priorizar',
              valor: p.velocidadeIA,
              opcoes: [
                { valor: 'qualidade', rotulo: '✨ Qualidade (Gemini Flash)' },
                { valor: 'rapidez', rotulo: '⚡ Rapidez (Flash-Lite)' },
              ],
            })}
            <p class="campo__ajuda">Os dois são grátis. O Flash-Lite responde mais rápido; o Flash escreve textos um pouco melhores.</p>
            ${p.chaveGemini ? html`<button type="button" class="btn btn--fantasma btn--pequeno" id="cfgRemoverChaveGemini">🗑️ Remover a chave do Gemini</button>` : ''}
          </div>

          <div class="cartao">
            <h3 class="secao__titulo">🎵 Vozes do MP3</h3>
            <p class="texto-suave texto-pequeno">O MP3 é gerado pela voz neural Kokoro, que roda no seu navegador de graça (fala inglês).</p>
            <div class="grade-2 grade-2--compacta">
              <div class="campo">
                <label class="campo__rotulo" for="cfgVozKokoro">Voz principal</label>
                <select id="cfgVozKokoro" class="input">${opcoes(VOZES_KOKORO, p.mp3.vozKokoro)}</select>
              </div>
              <div class="campo">
                <label class="campo__rotulo" for="cfgVozKokoro2">Voz da 2ª pessoa (diálogos)</label>
                <select id="cfgVozKokoro2" class="input">${opcoes(VOZES_KOKORO, p.mp3.vozKokoro2)}</select>
              </div>
            </div>
          </div>
        </section>
      `
    );
    this.ligar();
  }

  ligar() {
    const r = this.raiz;
    $('#cfgIdiomaEstudo', r).addEventListener('change', (e) => {
      settings.set('idioma', e.target.value);
      toast.sucesso('Idioma de estudo atualizado.');
    });
    $('#cfgTema', r).addEventListener('change', (e) =>
      aplicarTemaEscolhido(e.target.value || null)
    );

    montarPainelIA($('#cfgPainelIA', r));
    r.querySelectorAll('input[name="cfgVelocidadeIA"]').forEach((opcao) =>
      opcao.addEventListener('change', () => {
        settings.set('velocidadeIA', valorSegmentado(r, 'cfgVelocidadeIA'));
        toast.sucesso('Preferência da IA salva.');
      })
    );
    $('#cfgRemoverChaveGemini', r)?.addEventListener('click', () => {
      settings.set('chaveGemini', '');
      toast.sucesso('Chave do Gemini removida deste navegador.');
      this.desenhar();
    });

    const mp3 = (id, chave) =>
      $(id, r).addEventListener('change', (e) => settings.setMp3({ [chave]: e.target.value }));
    mp3('#cfgVozKokoro', 'vozKokoro');
    mp3('#cfgVozKokoro2', 'vozKokoro2');
  }
}
