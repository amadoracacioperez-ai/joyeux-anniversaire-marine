import { h, confettis, son } from './utils.js';

const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
// OpenStreetMap France (noms en français : Londres, la Manche…), et l'OSM standard en secours.
const TUILES = 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png';
const TUILES_SECOURS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function afficherRevelation(ecran, R, etat, recommencer) {
  const conteneurCarte = h('div', { class: 'carte-map', role: 'img', 'aria-label': R.carte.titre });
  const minutes = Math.max(1, Math.round(((etat.fin || Date.now()) - (etat.debut || Date.now())) / 60000));
  const aides = etat.aides.reduce((a, b) => a + b, 0);
  const phraseAides = aides === 0 ? 'sans aucun coup de pouce'
    : `avec ${aides} coup${aides > 1 ? 's' : ''} de pouce`;
  const delai = (k) => ({ animationDelay: `${0.5 + k * 1.2}s` });

  ecran.append(
    h('section', { class: 'revelation' },
      h('h1', { class: 'rev-titre' }, R.titre),
      R.lignes.map((l, k) => h('p', { class: 'rev-ligne', style: delai(k) }, l)),
      h('p', { class: 'rev-grand', style: delai(R.lignes.length) }, R.grand)),
    h('section', { class: 'carte rev-carte' },
      h('h2', {}, R.carte.titre),
      conteneurCarte,
      h('p', { class: 'legende' }, R.carte.legende)),
    billet(R.billet),
    h('section', { class: 'carte message' },
      R.message.map((p) => h('p', {}, p)),
      h('p', { class: 'signature' }, R.signature)),
    h('p', { class: 'stats' }, R.stats.replace('{minutes}', minutes).replace('{aides}', phraseAides)),
    h('div', { class: 'rev-actions' },
      h('button', {
        class: 'bouton', type: 'button',
        onclick: () => { confettis('grand'); son.fanfare(); },
      }, '🎊 Encore des confettis !'),
      h('button', { class: 'bouton-lien clair', type: 'button', onclick: recommencer }, 'Rejouer depuis le début')));

  confettis('grand');
  son.fanfare();
  dessinerCarte(conteneurCarte, R.carte).catch(() => carteDeSecours(conteneurCarte, R.carte));
}

function billet(B) {
  return h('section', { class: 'billet' },
    h('div', { class: 'billet-entete' }, h('span', {}, B.titre), h('span', {}, B.numero)),
    h('div', { class: 'billet-trajet' },
      h('div', {}, h('small', {}, 'Départ'), h('strong', {}, B.depart)),
      h('div', { class: 'billet-velo', 'aria-hidden': 'true' }, '🚲'),
      h('div', {}, h('small', {}, 'Arrivée'), h('strong', {}, B.arrivee))),
    h('dl', { class: 'billet-champs' }, B.champs.map(([cle, valeur]) => h('div', {}, h('dt', {}, cle), h('dd', {}, valeur)))),
    h('p', { class: 'billet-talon' }, B.talon));
}

// ---------- carte Leaflet, chargée seulement ici pour ne rien dévoiler avant ----------

function charger(url) {
  return new Promise((ok, ko) => {
    const el = url.endsWith('.css') ? h('link', { rel: 'stylesheet', href: url }) : h('script', { src: url });
    el.onload = ok;
    el.onerror = ko;
    document.head.append(el);
  });
}

const icone = (L, emoji, classe = 'repere') =>
  L.divIcon({ className: classe, html: `<span>${emoji}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] });

// Ajoute des points intermédiaires pour que le tracé avance en douceur.
function densifier(points, pas = 0.01) {
  const res = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / pas));
    for (let k = 1; k <= n; k++) res.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return res;
}

function tracer(L, carte, mobile, points, style, duree) {
  const pts = densifier(points);
  const ligne = L.polyline(reduit() ? pts : [pts[0]], style).addTo(carte);
  if (reduit()) {
    mobile.setLatLng(pts[pts.length - 1]);
    return Promise.resolve();
  }
  return new Promise((ok) => {
    const debut = performance.now();
    const image = (t) => {
      const f = Math.min(1, (t - debut) / duree);
      const n = Math.max(1, Math.round(f * (pts.length - 1)));
      ligne.setLatLngs(pts.slice(0, n + 1));
      mobile.setLatLng(pts[n]);
      if (f < 1) requestAnimationFrame(image);
      else ok();
    };
    requestAnimationFrame(image);
  });
}

async function dessinerCarte(conteneur, K) {
  if (!window.L) {
    await Promise.race([
      Promise.all([charger(`${LEAFLET}leaflet.min.css`), charger(`${LEAFLET}leaflet.min.js`)]),
      new Promise((_, ko) => setTimeout(() => ko(new Error('Leaflet trop lent')), 10000)),
    ]);
  }
  const L = window.L;
  const carte = L.map(conteneur, { scrollWheelZoom: false, zoomSnap: 0.25 });
  carte.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  const credits = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  const fond = L.tileLayer(TUILES, { subdomains: 'abc', maxZoom: 19, attribution: `${credits} · OSM France` });
  let tuilesRatees = 0;
  fond.on('tileerror', () => {
    if (++tuilesRatees !== 4) return;
    carte.removeLayer(fond);
    L.tileLayer(TUILES_SECOURS, { maxZoom: 19, attribution: credits }).addTo(carte);
  });
  fond.addTo(carte);
  carte.fitBounds(L.latLngBounds([...K.france, ...K.ferry, ...K.angleterre]), { padding: [24, 24] });

  for (const e of K.etapes) {
    L.marker(e.pos, { icon: icone(L, e.emoji), keyboard: false, title: e.nom })
      .addTo(carte)
      .bindTooltip(e.nom, { direction: 'top', offset: [0, -14] });
  }
  const mobile = L.marker(K.france[0], {
    icon: icone(L, '🚲', 'repere repere-velo'), zIndexOffset: 1000, keyboard: false, interactive: false,
  }).addTo(carte);

  const rouge = { color: '#e4572e', weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round' };
  let enCours = false;
  const animer = async () => {
    if (enCours) return;
    enCours = true;
    carte.eachLayer((couche) => { if (couche instanceof L.Polyline) couche.remove(); });
    mobile.setIcon(icone(L, '🚲', 'repere repere-velo'));
    await tracer(L, carte, mobile, K.france, rouge, 3400);
    mobile.setIcon(icone(L, '⛴️', 'repere repere-velo'));
    await tracer(L, carte, mobile, K.ferry, { color: '#2b55b8', weight: 4, dashArray: '8 10' }, 1800);
    mobile.setIcon(icone(L, '🚲', 'repere repere-velo'));
    await tracer(L, carte, mobile, K.angleterre, rouge, 2600);
    enCours = false;
  };

  // Le vélo ne part que lorsque la carte est bien visible à l'écran.
  const observateur = new IntersectionObserver((entrees) => {
    if (!entrees.some((e) => e.isIntersecting)) return;
    observateur.disconnect();
    animer();
  }, { threshold: 0.6 });
  observateur.observe(conteneur);
  conteneur.after(h('button', { class: 'bouton-lien', type: 'button', onclick: animer }, '↻ Revoir le trajet'));
}

// Si la carte ne charge pas (réseau capricieux), un schéma du trajet la remplace.
function carteDeSecours(conteneur, K) {
  const tout = [...K.france, ...K.ferry, ...K.angleterre];
  const lats = tout.map((p) => p[0]);
  const lngs = tout.map((p) => p[1]);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const W = 320;
  const H = 360;
  const m = 34;
  const xy = ([lat, lng]) => [
    m + ((lng - minLng) / (maxLng - minLng)) * (W - 2 * m),
    m + ((maxLat - lat) / (maxLat - minLat)) * (H - 2 * m),
  ];
  const chemin = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${xy(p).map((v) => v.toFixed(1)).join(' ')}`).join(' ');
  const trait = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const reperes = K.etapes.map((e) => {
    const [x, y] = xy(e.pos);
    const aDroite = x < W / 2;
    return `<circle cx="${x}" cy="${y}" r="5" fill="#fff" stroke="#22263a" stroke-width="2"/>`
      + `<text x="${aDroite ? x + 9 : x - 9}" y="${y + 4}" text-anchor="${aDroite ? 'start' : 'end'}" `
      + `style="font: 700 11px Nunito, sans-serif" fill="#22263a">${e.nom}</text>`;
  }).join('');
  conteneur.classList.add('carte-secours');
  conteneur.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect width="${W}" height="${H}" fill="#cfe3f5"/>
    <path d="${chemin(K.france)}" ${trait} stroke="#e4572e" stroke-width="4"/>
    <path d="${chemin(K.ferry)}" ${trait} stroke="#2b55b8" stroke-width="3" stroke-dasharray="6 7"/>
    <path d="${chemin(K.angleterre)}" ${trait} stroke="#e4572e" stroke-width="4"/>
    ${reperes}
  </svg>`;
}
