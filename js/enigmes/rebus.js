import { h, formulaireReponse } from '../utils.js';

export function monter(zone, d, api) {
  zone.append(
    h('div', { class: 'rebus', role: 'img', 'aria-label': `Rébus : ${d.symboles.join(' ')}` },
      d.symboles.map((s) => h('span', { class: s === '+' ? 'rebus-plus' : 'rebus-tuile' }, s))),
    formulaireReponse(api, d.reponses, 'Le mot caché…'));
}
