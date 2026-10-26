import { h, formulaireReponse } from '../utils.js';

// Question ouverte (mode « texte ») ou à choix multiples (mode « choix »).
export function monter(zone, d, api) {
  if (d.mode !== 'choix') {
    zone.append(formulaireReponse(api, d.reponses, d.placeholder));
    return;
  }
  // Lettres A, B, C, D comme dans « Qui veut gagner des millions ? ».
  const boutons = d.options.map((option, k) => {
    const bouton = h('button', { class: 'option', type: 'button' },
      h('span', { class: 'option-lettre' }, `${String.fromCharCode(65 + k)} :`), option.texte);
    bouton.addEventListener('click', () => {
      if (option.correct) {
        bouton.classList.add('option-bonne');
        boutons.forEach((b) => { b.disabled = true; });
        api.reussite();
      } else {
        bouton.classList.add('option-fausse');
        bouton.disabled = true;
        api.erreur(option.reaction);
      }
    });
    return bouton;
  });
  zone.append(h('div', { class: 'options' }, boutons));
}
