/**
 * Meu progresso: estatísticas, agenda de revisões, histórico e backup.
 */

import { IDIOMAS, TIPOS, nomeTipo } from '../config.js';
import { $, baixarArquivo, html, lerTextoDoArquivo, render } from '../core/dom.js';
import { formatarDataBR, formatarDuracao } from '../core/utils.js';
import { progresso } from '../services/progress.js';
import { cabecalhoTela, estadoVazio, seloRevisao } from '../ui/components.js';
import { confirmar, escolher } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';

const ROTULO_TIPO = {
  [TIPOS.PALAVRAS]: '📖 Palavras',
  [TIPOS.FRASES]: '💬 Frases',
  [TIPOS.TEXTO]: '🎧 Texto',
};

export class ProgressScreen {
  montar(raiz) {
    this.raiz = raiz;
    this.desenhar();
  }

  desenhar() {
    const servico = progresso();
    const s = servico.estatisticas();
    const agenda = servico.agenda();
    const maxVezes = s.maisEstudadas[0]?.vezes || 1;

    render(
      this.raiz,
      html`
        <section class="tela">
          <div class="cartao">
            ${cabecalhoTela({
              icone: '📈',
              titulo: 'Meu progresso',
              subtitulo: 'Tudo fica salvo neste navegador. Faça backup para não perder.',
            })}
            <div class="estatisticas estatisticas--4">
              <div class="estatistica">
                <span class="estatistica__valor">${s.sessoes}</span
                ><span class="estatistica__rotulo">sessões</span>
              </div>
              <div class="estatistica">
                <span class="estatistica__valor">${s.palavrasUnicas}</span
                ><span class="estatistica__rotulo">palavras únicas</span>
              </div>
              <div class="estatistica">
                <span class="estatistica__valor">${formatarDuracao(s.segundos.total)}</span
                ><span class="estatistica__rotulo">de estudo</span>
              </div>
              <div class="estatistica">
                <span class="estatistica__valor">${s.diasSeguidos}🔥</span
                ><span class="estatistica__rotulo">dias seguidos</span>
              </div>
            </div>
            <div class="estatisticas estatisticas--4 estatisticas--suaves">
              <div class="estatistica">
                <span class="estatistica__valor">${s.palavras}</span
                ><span class="estatistica__rotulo"
                  >palavras estudadas · ${formatarDuracao(s.segundos.palavras)}</span
                >
              </div>
              <div class="estatistica">
                <span class="estatistica__valor">${s.frases}</span
                ><span class="estatistica__rotulo"
                  >frases estudadas · ${formatarDuracao(s.segundos.frases)}</span
                >
              </div>
              <div class="estatistica">
                <span class="estatistica__valor">${s.textos}</span
                ><span class="estatistica__rotulo"
                  >textos ouvidos · ${formatarDuracao(s.segundos.texto)}</span
                >
              </div>
              <div class="estatistica">
                <span class="estatistica__valor">${s.exportados}/${s.revisados}</span
                ><span class="estatistica__rotulo">PDFs exportados / revisados</span>
              </div>
            </div>
            <div class="estatisticas estatisticas--4 estatisticas--suaves">
              <div class="estatistica">
                <span class="estatistica__valor">${s.criados.textos}</span
                ><span class="estatistica__rotulo">textos criados</span>
              </div>
              <div class="estatistica">
                <span class="estatistica__valor">${s.criados.pdfs}</span
                ><span class="estatistica__rotulo">PDFs gerados</span>
              </div>
              <div class="estatistica">
                <span class="estatistica__valor">${s.criados.mp3}</span
                ><span class="estatistica__rotulo">MP3 gerados</span>
              </div>
              <div class="estatistica">
                <span class="estatistica__valor">${s.criados.kits}</span
                ><span class="estatistica__rotulo">kits de estudo</span>
              </div>
            </div>
            ${
              s.aparelhos > 1
                ? html`<p class="campo__ajuda">Inclui o progresso de ${s.aparelhos} aparelhos/navegadores, juntado por backup.</p>`
                : ''
            }
          </div>

          <div class="cartao">
            <h3 class="secao__titulo">🗓️ Agenda de revisões</h3>
            ${
              agenda.length
                ? html`
                  <ul class="lista-revisoes">
                    ${agenda.map(
                      (m) => html`
                        <li class="lista-revisoes__item">
                          <span class="lista-revisoes__titulo"
                            >${IDIOMAS[m.idioma]?.bandeira || ''} ${m.titulo}</span
                          >
                          <span class="lista-revisoes__meta"
                            >${
                              m.quantidade
                                ? `${m.quantidade} ${nomeTipo(m.tipo)}`
                                : nomeTipo(m.tipo, { plural: false, maiuscula: true })
                            }
                            · ${formatarDataBR(m.revisao.revisarEm)}</span
                          >
                          ${seloRevisao(m.status)}
                          <button
                            type="button"
                            class="btn btn--fantasma btn--icone btn--pequeno"
                            data-remover="${m.id}"
                            aria-label="Remover ${m.titulo} da agenda"
                          >
                            ✕
                          </button>
                        </li>
                      `
                    )}
                  </ul>
                  <p class="campo__ajuda">
                    Para revisar, abra o PDF correspondente em “Revisar arquivo”.
                  </p>
                `
                : estadoVazio({
                    icone: '🗓️',
                    titulo: 'Nenhuma revisão agendada',
                    texto: 'Ao exportar um PDF, escolha quando quer revisá-lo.',
                  })
            }
          </div>

          ${
            s.maisEstudadas.length
              ? html`
                <div class="cartao">
                  <h3 class="secao__titulo">🏆 Palavras mais estudadas</h3>
                  <ol class="ranking">
                    ${s.maisEstudadas.map(
                      (p) => html`
                        <li class="ranking__item">
                          <span class="ranking__palavra">${p.palavra}</span>
                          <span class="ranking__barra"
                            ><span style="width:${Math.round((p.vezes / maxVezes) * 100)}%"></span
                          ></span>
                          <span class="ranking__vezes">${p.vezes}×</span>
                        </li>
                      `
                    )}
                  </ol>
                </div>
              `
              : ''
          }

          <div class="cartao">
            <h3 class="secao__titulo">🕑 Últimas sessões</h3>
            ${
              s.ultimasSessoes.length
                ? html`
                  <div class="tabela-rolagem">
                    <table class="tabela">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Tipo</th>
                          <th class="num">Qtd.</th>
                          <th class="num">Tempo</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${s.ultimasSessoes.map(
                          (sessao) => html`
                            <tr>
                              <td>
                                ${new Date(sessao.data).toLocaleString('pt-BR', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </td>
                              <td>
                                ${ROTULO_TIPO[sessao.tipo] || sessao.tipo}${
                                  sessao.titulo
                                    ? html` <span class="texto-suave">· ${sessao.titulo}</span>`
                                    : ''
                                }
                              </td>
                              <td class="num">${sessao.quantidade}</td>
                              <td class="num">${formatarDuracao(sessao.segundos)}</td>
                            </tr>
                          `
                        )}
                      </tbody>
                    </table>
                  </div>
                `
                : estadoVazio({
                    icone: '📭',
                    titulo: 'Nenhuma sessão ainda',
                    texto: 'Conclua um estudo para ver seu histórico aqui.',
                  })
            }
          </div>

          <div class="cartao" id="cartaoBackup">
            <h3 class="secao__titulo">💾 Backup</h3>
            <p class="texto-suave">
              Baixe um arquivo com todo o seu progresso (estatísticas, materiais criados e agenda de
              revisões) e importe-o em outro aparelho ou navegador. Ao importar, você pode
              <strong>juntar</strong> com o progresso que já existe ou substituí-lo.
            </p>
            <p class="campo__ajuda ${servico.precisaBackup() ? 'campo__ajuda--aviso' : ''}">
              ${
                s.ultimoBackup
                  ? `Último backup: ${formatarDataBR(s.ultimoBackup)}.`
                  : 'Você ainda não fez nenhum backup.'
              }
            </p>
            <div class="acoes">
              <button type="button" class="btn btn--primario" id="btnBackup">
                📤 Exportar backup (JSON)
              </button>
              <label class="btn btn--secundario">
                📥 Importar backup
                <input type="file" id="entradaBackup" accept=".json,application/json" hidden />
              </label>
              <button type="button" class="btn btn--perigo-suave" id="btnZerar">
                🗑️ Apagar progresso
              </button>
            </div>
          </div>
        </section>
      `
    );
    this.ligar();
  }

  ligar() {
    const r = this.raiz;
    const servico = progresso();

    r.querySelectorAll('[data-remover]').forEach((botao) =>
      botao.addEventListener('click', () => {
        servico.removerMaterial(botao.dataset.remover);
        this.desenhar();
      })
    );

    $('#btnBackup', r).addEventListener('click', () => {
      const json = JSON.stringify(servico.exportarJSON(), null, 2);
      baixarArquivo(new Blob([json], { type: 'application/json' }), servico.nomeArquivoBackup());
      toast.sucesso('Backup exportado.');
      this.desenhar(); // atualiza a data do último backup
    });

    $('#entradaBackup', r).addEventListener('change', async (e) => {
      const arquivo = e.target.files?.[0];
      e.target.value = '';
      if (!arquivo) return;
      const texto = await lerTextoDoArquivo(arquivo);
      // Sem progresso neste navegador, não há o que juntar: importa direto.
      const modo = servico.temProgresso
        ? await escolher({
            titulo: 'Importar backup',
            mensagem:
              'Juntar soma o progresso do arquivo ao deste navegador (sem contar nada em dobro). Substituir troca o progresso deste navegador pelo do arquivo.',
            botoes: [
              { valor: '', rotulo: 'Cancelar', estilo: 'fantasma' },
              { valor: 'substituir', rotulo: 'Substituir', estilo: 'secundario' },
              { valor: 'juntar', rotulo: 'Juntar (recomendado)', estilo: 'primario' },
            ],
          })
        : 'juntar';
      if (!modo) return;
      try {
        const sessoes = servico.importarJSON(texto, { modo });
        toast.sucesso(
          `${modo === 'juntar' ? 'Progresso juntado' : 'Backup importado'}: ${sessoes} sessões no total.`
        );
        this.desenhar();
      } catch (erro) {
        toast.erro(erro.message);
      }
    });

    $('#btnZerar', r).addEventListener('click', async () => {
      const ok = await confirmar({
        titulo: 'Apagar todo o progresso?',
        mensagem:
          'Sessões, estatísticas e agenda de revisões serão apagadas. Esta ação não pode ser desfeita.',
        confirmar: 'Apagar tudo',
        perigo: true,
      });
      if (!ok) return;
      servico.reiniciar();
      toast.sucesso('Progresso apagado.');
      this.desenhar();
    });
  }
}
