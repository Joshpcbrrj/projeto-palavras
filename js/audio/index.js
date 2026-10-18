/**
 * Instâncias compartilhadas de áudio usadas pelas telas.
 */

import { settings } from '../services/settings.js';
import { Speaker } from './speaker.js';
import { VoiceManager } from './voices.js';

export const vozes = new VoiceManager({
  preferencias: {
    getVoz: (idioma) => settings.getVoz(idioma),
    setVoz: (idioma, uri) => settings.setVoz(idioma, uri),
  },
});

export const speaker = new Speaker({ vozes });
