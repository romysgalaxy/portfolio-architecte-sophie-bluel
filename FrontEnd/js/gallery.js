// --- Config ---
// URL de base de l'API, injectée dans window (ex : http://localhost:5678/api)
const API = window.API_BASE;

// --- Refs DOM ---
// Conteneur de la galerie principale (où on affiche les travaux)
const galleryEl = document.getElementById('gallery');
// Conteneur du menu de filtres (boutons de catégories)
const menuEl = document.getElementById('categoryMenu');

// --- État ---
// Tableau de tous les travaux récupérés depuis l'API
let WORKS = [];
// Tableau des catégories (dérivées des travaux)
let CATS = [];
// ID de la catégorie sélectionnée (0 = afficher tous les travaux)
let currentCatId = 0; // 0 = Tous

// --- Helpers ---
// Affiche la galerie en fonction de la catégorie actuelle (currentCatId)
function renderGallery() {
  // Si une catégorie est sélectionnée, on filtre WORKS, sinon on prend tout
  const list = currentCatId
    ? WORKS.filter(w => (w.category?.id ?? w.categoryId) === currentCatId)
    : WORKS;

  // On reconstruit complètement le contenu de la galerie
  const frag = document.createDocumentFragment();
  list.forEach(w => {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    const cap = document.createElement('figcaption');
    img.src = w.imageUrl;
    img.alt = w.title || '';
    cap.textContent = w.title || '';
    fig.append(img, cap);
    frag.appendChild(fig);
  });

  // Remplace tout le contenu de #gallery par la nouvelle liste
  galleryEl.replaceChildren(frag);
}

// Construit dynamiquement le menu des filtres (boutons de catégories)
function renderMenu() {
  const frag = document.createDocumentFragment();

  // Bouton "Tous" (catégorie spéciale avec id 0)
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn' + (currentCatId === 0 ? ' active' : '');
  allBtn.dataset.cat = '0';
  allBtn.type = 'button';
  allBtn.textContent = 'Tous';
  frag.appendChild(allBtn);

  // Boutons des catégories réelles (issues de CATS)
  CATS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (currentCatId === c.id ? ' active' : '');
    btn.dataset.cat = String(c.id); // on stocke l'id dans data-cat
    btn.type = 'button';
    btn.textContent = c.name;
    frag.appendChild(btn);
  });

  // On remplace tout le contenu du menu par la nouvelle liste de boutons
  menuEl.replaceChildren(frag);
}

// Dédoublonne les catégories à partir de la liste des travaux
// → permet d'éviter un deuxième appel à /categories
function deriveCategoriesFromWorks(works) {
  const map = new Map(); // id → { id, name }
  for (const w of works) {
    // Compatibilité : certains objets ont w.category.id, d'autres w.categoryId
    const id = w.category?.id ?? w.categoryId;
    const name = w.category?.name ?? '';
    if (!id || !name) continue;   // on ignore les données incomplètes
    if (!map.has(id)) map.set(id, { id, name });
  }
  // On retourne un tableau trié par nom de catégorie (ordre alpha FR)
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// (Option) Appel direct à l'API des catégories si on veut les récupérer séparément
async function fetchCategoriesFromApi() {
  const res = await fetch(`${API}/categories`);
  if (!res.ok) throw new Error('GET /categories ' + res.status);
  return res.json(); // retourne une promesse de [{id,name}]
}

// Point d'entrée principal : initialisation de la page
async function init() {
  try {
    // 1) Récupère les travaux depuis l'API
    const worksRes = await fetch(`${API}/works`, { headers: { Accept: 'application/json' } });
    if (!worksRes.ok) throw new Error('GET /works ' + worksRes.status);
    WORKS = await worksRes.json();

    // 2) Dérive les catégories à partir des travaux
    CATS = deriveCategoriesFromWorks(WORKS);

    // 3) Premier affichage : menu + galerie complète
    renderMenu();
    renderGallery();

    // 4) Gestion des clics sur les filtres (délégation d'évènement)
    menuEl.addEventListener('click', (e) => {
      // On cherche le bouton ".filter-btn" le plus proche de la cible
      const btn = e.target.closest('button.filter-btn');
      if (!btn) return; // clic en dehors d'un bouton
      const id = Number(btn.dataset.cat); // récupère l'id de catégorie à partir du data-attribute
      if (Number.isNaN(id)) return;
      currentCatId = id; // met à jour la catégorie active

      // Met à jour la classe "active" sur tous les boutons
      [...menuEl.querySelectorAll('.filter-btn')]
        .forEach(b => b.classList.toggle('active', Number(b.dataset.cat) === id));

      // Réaffiche la galerie filtrée
      renderGallery();
    });

  } catch (err) {
    // En cas d'erreur (API KO, etc.), on affiche un message dans le DOM
    console.error(err);
    menuEl.textContent = 'Impossible de charger les catégories.';
    galleryEl.textContent = 'Impossible de charger la galerie.';
  }
}

// Lance init() une fois que le DOM est prêt
document.addEventListener('DOMContentLoaded', init);

// --- Mises à jour cross-modules (provenant de la modale) ---
// Ces events sont dispatchés par la modale quand on ajoute/supprime des travaux

// Quand un nouveau travail est créé via la modale
document.addEventListener('works:append', (e) => {
  const w = e.detail.work; // objet complet retourné par l'API après POST
  WORKS.push(w);           // on l'ajoute dans l'état local
  CATS = deriveCategoriesFromWorks(WORKS); // on recalcule les catégories
  renderMenu();            // on met à jour les filtres
  renderGallery();         // on met à jour la galerie
});

// Quand un travail est supprimé via la modale
document.addEventListener('works:delete', (e) => {
  const id = e.detail.id;  // id du work supprimé
  // On filtre WORKS pour retirer l'élément supprimé
  WORKS = WORKS.filter(w => w.id !== id);
  CATS = deriveCategoriesFromWorks(WORKS);
  renderMenu();
  renderGallery();
});

// (optionnel) refresh total depuis l'API si besoin ailleurs
// Permet à un autre module de redemander un "full reload" de WORKS/CATS
document.addEventListener('works:refresh', async () => {
  try {
    const res = await fetch(`${API}/works`);
    WORKS = await res.json();
    CATS = deriveCategoriesFromWorks(WORKS);
    renderMenu();
    renderGallery();
  } catch (_) {
    // erreur ignorée silencieusement ici
  }
});
