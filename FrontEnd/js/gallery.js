// --- Config ---
const API = 'http://localhost:5678/api';

// --- Refs DOM ---
const galleryEl = document.getElementById('gallery');
const menuEl = document.getElementById('categoryMenu');

// --- État ---
let WORKS = [];
let CATS = [];
let currentCatId = 0; // 0 = Tous

// --- Helpers ---
function renderGallery() {
  const list = currentCatId
    ? WORKS.filter(w => (w.category?.id ?? w.categoryId) === currentCatId)
    : WORKS;

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

  galleryEl.replaceChildren(frag);
}

function renderMenu() {
  const frag = document.createDocumentFragment();

  // Bouton "Tous"
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn' + (currentCatId === 0 ? ' active' : '');
  allBtn.dataset.cat = '0';
  allBtn.type = 'button';
  allBtn.textContent = 'Tous';
  frag.appendChild(allBtn);

  // Catégories
  CATS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (currentCatId === c.id ? ' active' : '');
    btn.dataset.cat = String(c.id);
    btn.type = 'button';
    btn.textContent = c.name;
    frag.appendChild(btn);
  });

  menuEl.replaceChildren(frag);
}

// Dédoublonne les catégories à partir des works (évite parfois un 2e fetch)
function deriveCategoriesFromWorks(works) {
  const map = new Map(); // id → {id,name}
  for (const w of works) {
    const id = w.category?.id ?? w.categoryId;
    const name = w.category?.name ?? '';
    if (!id || !name) continue;
    if (!map.has(id)) map.set(id, { id, name });
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// (Option) Si tu préfères l’API dédiée
async function fetchCategoriesFromApi() {
  const res = await fetch(`${API}/categories`);
  if (!res.ok) throw new Error('GET /categories ' + res.status);
  return res.json(); // [{id,name}]
}

async function init() {
  try {
    // 1) Récupère les travaux
    const worksRes = await fetch(`${API}/works`, { headers: { Accept: 'application/json' } });
    if (!worksRes.ok) throw new Error('GET /works ' + worksRes.status);
    WORKS = await worksRes.json();

    // 2) Catégories : soit à partir des works, soit via l’API
    CATS = deriveCategoriesFromWorks(WORKS);
    // Si tu veux forcer via l'API, décommente :
    // CATS = await fetchCategoriesFromApi();

    // 3) Render init
    renderMenu();
    renderGallery();

    // 4) Interaction (délégation)
    menuEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button.filter-btn');
      if (!btn) return;
      const id = Number(btn.dataset.cat);
      if (Number.isNaN(id)) return;
      currentCatId = id;

      // maj UI
      [...menuEl.querySelectorAll('.filter-btn')].forEach(b => b.classList.toggle('active', Number(b.dataset.cat) === id));
      renderGallery();
    });

  } catch (err) {
    console.error(err);
    menuEl.textContent = 'Impossible de charger les catégories.';
    galleryEl.textContent = 'Impossible de charger la galerie.';
  }
}

document.addEventListener('DOMContentLoaded', init);
