import { h, formulaireReponse } from '../utils.js';

const ALPHABET = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..',
  J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
};

export function monter(zone, d, api) {
  const lettres = [...d.mot.toUpperCase()].map((l) => ALPHABET[l]);
  const symboles = [];
  const code = h('div', { class: 'morse', role: 'img', 'aria-label': `Morse : ${lettres.join(' / ')}` },
    lettres.map((lettre) => h('span', { class: 'morse-lettre' }, [...lettre].map((s) => {
      const el = h('span', { class: s === '.' ? 'point' : 'trait' });
      symboles.push(el);
      return el;
    }))));

  const ecouter = h('button', { class: 'bouton secondaire petit', type: 'button' }, '▶ Écouter');
  ecouter.addEventListener('click', async () => {
    ecouter.disabled = true;
    await api.son.morse(lettres, (k, allume) => symboles[k].classList.toggle('allume', allume));
    ecouter.disabled = false;
  });

  const alphabet = h('details', { class: 'alphabet' },
    h('summary', {}, 'Alphabet morse'),
    h('div', { class: 'alphabet-grille' }, Object.entries(ALPHABET).map(([l, c]) =>
      h('span', {}, h('b', {}, l), ' ', c.replaceAll('.', '·').replaceAll('-', '–')))));

  zone.append(code, h('div', { class: 'centre' }, ecouter), alphabet,
    formulaireReponse(api, d.reponses, 'Le mot caché…'));
}
