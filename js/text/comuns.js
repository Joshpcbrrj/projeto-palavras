/**
 * Palavras muito comuns (artigos, pronomes, preposições, conjunções, verbos
 * auxiliares...). Aparecem em quase toda frase e quase não ensinam nada sozinhas,
 * então podem ser deixadas de fora das listas de estudo.
 *
 * Lista própria do projeto (inglês). Para outros idiomas, nada é filtrado.
 */

const INGLES = `
a an the
i me my mine myself you your yours yourself yourselves he him his himself she her hers herself
it its itself we us our ours ourselves they them their theirs themselves
this that these those who whom whose which what where when why how
am is are was were be been being have has had having do does did doing done
will would shall should can could may might must ought
i'm you're he's she's it's we're they're i've you've we've they've i'd you'd he'd she'd we'd they'd
i'll you'll he'll she'll we'll they'll isn't aren't wasn't weren't hasn't haven't hadn't
doesn't don't didn't won't wouldn't can't cannot couldn't shouldn't mustn't let's that's there's here's what's
and or but nor so yet if then than because as while until unless although though whether
of in on at by for with about against between into through during before after above below
to from up down out off over under again further once onto upon within without along across
around near toward towards per via
not no yes all any both each few more most other some such only own same too very just also
there here now even ever still already quite rather really maybe
one two three first
oh ok okay hi hello
`;

const LISTAS = { en: new Set(INGLES.split(/\s+/).filter(Boolean)) };

/** A palavra é muito comum no idioma? (só há lista para inglês) */
export function ehPalavraComum(palavra, idioma = 'en') {
  const lista = LISTAS[String(idioma).split('-')[0].toLowerCase()];
  if (!lista) return false;
  return lista.has(String(palavra).toLowerCase().replace(/’/g, "'"));
}

/** Há lista de palavras comuns para o idioma? */
export function temListaDeComuns(idioma) {
  return Boolean(LISTAS[String(idioma).split('-')[0].toLowerCase()]);
}

/** Remove as palavras muito comuns de uma lista. */
export function semPalavrasComuns(palavras, idioma) {
  return temListaDeComuns(idioma) ? palavras.filter((p) => !ehPalavraComum(p, idioma)) : palavras;
}
