/**
 * Configurações: idioma de estudo, tema, IA local e exportação de áudio.
 */

import { MODELOS_IA, VOZES_KOKORO, VOZES_OPENAI } from '../config.js';
import { $, html, render } from '../core/dom.js';
import { ia } from '../create/llm.js';
import { settings } from '../services/settings.js';
import { montarPainelIA } from '../ui/aiPanel.js';
import { cabecalhoTela, seletorIdioma } from '../ui/components.js';
import { confirmar } from '../ui/dialog.js';
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
    const vozesOpenai = VOZES_OPENAI.map((id) => ({ id, nome: id }));
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
            <p class="texto-suave">
              Usada para criar diálogos e adaptar textos ao seu nível. A opção <strong>online</strong> (Gemini) é rápida e funciona no celular com uma chave gratuita do Google.
              A opção <strong>no navegador</strong> roda no seu computador, sem internet e sem conta, mas exige download grande e placa de vídeo compatível.
            </p>
            <div id="cfgPainelIA"></div>
            ${p.chaveGemini ? html`<button type="button" class="btn btn--fantasma btn--pequeno" id="cfgRemoverChaveGemini">🗑️ Remover a chave do Gemini</button>` : ''}
            <div class="separador"></div>
            <h4 class="campo__rotulo">Modelo da IA no navegador</h4>
            <div class="opcoes-modelo" role="radiogroup">
              ${Object.entries(MODELOS_IA).map(
                ([chave, m]) => html`
                  <label class="opcao-modelo">
                    <input type="radio" name="cfgModelo" value="${chave}" ${chave === p.modeloIA ? html`checked` : ''} />
                    <span class="opcao-modelo__corpo">
                      <strong>${m.nome}</strong> <span class="texto-suave">${m.tamanho}</span>
                      <span class="texto-pequeno texto-suave">${m.descricao}</span>
                    </span>
                  </label>
                `
              )}
            </div>
            <button type="button" class="btn btn--fantasma btn--pequeno" id="cfgRemoverModelo">🗑️ Apagar o modelo baixado</button>
          </div>

          <div class="cartao">
            <h3 class="secao__titulo">🎵 Áudio MP3</h3>
            <div class="grade-2 grade-2--compacta">
              <div class="campo">
                <label class="campo__rotulo" for="cfgMotor">Motor padrão</label>
                <select id="cfgMotor" class="input">
                  <option value="kokoro" ${p.mp3.motor === 'kokoro' ? html`selected` : ''}>Kokoro — grátis, no navegador (inglês)</option>
                  <option value="openai" ${p.mp3.motor === 'openai' ? html`selected` : ''}>OpenAI — sua chave (vários idiomas)</option>
                </select>
              </div>
              <div class="campo">
                <label class="campo__rotulo" for="cfgVozKokoro">Voz Kokoro principal</label>
                <select id="cfgVozKokoro" class="input">${opcoes(VOZES_KOKORO, p.mp3.vozKokoro)}</select>
              </div>
              <div class="campo">
                <label class="campo__rotulo" for="cfgVozKokoro2">Voz Kokoro da 2ª pessoa (diálogos)</label>
                <select id="cfgVozKokoro2" class="input">${opcoes(VOZES_KOKORO, p.mp3.vozKokoro2)}</select>
              </div>
              <div class="campo">
                <label class="campo__rotulo" for="cfgVozOpenai">Vozes OpenAI (principal / 2ª pessoa)</label>
                <div class="campo__linha">
                  <select id="cfgVozOpenai" class="input">${opcoes(vozesOpenai, p.mp3.vozOpenai)}</select>
                  <select id="cfgVozOpenai2" class="input">${opcoes(vozesOpenai, p.mp3.vozOpenai2)}</select>
                </div>
              </div>
            </div>
            <div class="campo">
              <label class="campo__rotulo" for="cfgChave">Chave da OpenAI (opcional)</label>
              <div class="campo__linha">
                <input id="cfgChave" class="input" type="password" autocomplete="off" spellcheck="false" placeholder="sk-…" value="${p.mp3.chaveOpenai}" />
                <button type="button" class="btn btn--secundario" id="cfgMostrarChave">Mostrar</button>
              </div>
              <p class="campo__ajuda">Só é usada para gerar áudio com a OpenAI, direto do seu navegador para a OpenAI, com cobrança na sua conta. Fica guardada apenas neste navegador — não use em computadores compartilhados.</p>
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

    const painel = montarPainelIA($('#cfgPainelIA', r), { compacto: true });
    r.querySelectorAll('input[name="cfgModelo"]').forEach((radio) =>
      radio.addEventListener('change', async () => {
        settings.set('modeloIA', radio.value);
        if (ia.pronto) await ia.descarregar();
        painel.atualizar();
      })
    );
    $('#cfgRemoverChaveGemini', r)?.addEventListener('click', () => {
      settings.set('chaveGemini', '');
      toast.sucesso('Chave do Gemini removida deste navegador.');
      this.desenhar();
    });
    $('#cfgRemoverModelo', r).addEventListener('click', async () => {
      const chave = settings.get('modeloIA');
      const ok = await confirmar({
        titulo: 'Apagar o modelo baixado?',
        mensagem: `O modelo ${MODELOS_IA[chave].nome} (${MODELOS_IA[chave].tamanho}) será removido do navegador. Você pode baixá-lo de novo depois.`,
        confirmar: 'Apagar',
        perigo: true,
      });
      if (!ok) return;
      try {
        await ia.remover(chave);
        toast.sucesso('Modelo apagado.');
      } catch (erro) {
        toast.erro(erro.message);
      }
      painel.atualizar();
    });

    const mp3 = (id, chave) =>
      $(id, r).addEventListener('change', (e) => settings.setMp3({ [chave]: e.target.value }));
    mp3('#cfgMotor', 'motor');
    mp3('#cfgVozKokoro', 'vozKokoro');
    mp3('#cfgVozKokoro2', 'vozKokoro2');
    mp3('#cfgVozOpenai', 'vozOpenai');
    mp3('#cfgVozOpenai2', 'vozOpenai2');
    const chave = $('#cfgChave', r);
    chave.addEventListener('change', () => {
      settings.setMp3({ chaveOpenai: chave.value.trim() });
      toast.sucesso(chave.value.trim() ? 'Chave salva neste navegador.' : 'Chave removida.');
    });
    $('#cfgMostrarChave', r).addEventListener('click', (e) => {
      const mostrar = chave.type === 'password';
      chave.type = mostrar ? 'text' : 'password';
      e.currentTarget.textContent = mostrar ? 'Ocultar' : 'Mostrar';
    });
  }
}
