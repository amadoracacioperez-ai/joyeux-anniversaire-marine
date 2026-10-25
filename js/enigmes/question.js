import { h, formulaireReponse } from '../utils.js';

// Question ouverte (mode « texte ») ou à choix multiples (mode « choix »).
export function monter(zone, d, api) {
  if (d.mode !== 'choix') {
    zone.append(formulaireReponse(api, d.reponses, d.placeholder));
    return;
  }
  const boutons = d.options.map((option) => {
    const bouton = h('button', { class: 'option', type: 'button' }, option.texte);
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
