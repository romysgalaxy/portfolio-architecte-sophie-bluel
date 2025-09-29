const API_BASE = 'http://localhost:5678/api';
const galleryEl = document.getElementById('gallery');


console.log('[DEBUG] front origin =', location.origin);
console.log('[DEBUG] galleryEl found =', !!galleryEl);

function showLoader() {
  const loader = document.createElement('p');
  loader.id = 'gallery-loader';
  loader.textContent = 'Chargement…';
  galleryEl.replaceChildren(loader);
}

function showError(message = 'Une erreur est survenue.') {
  const p = document.createElement('p');
  p.className = 'gallery-error';
  p.textContent = message;
  galleryEl.replaceChildren(p);
}

function createWorkFigure(work) {
  const fig = document.createElement('figure');
  fig.className = 'work';
  fig.dataset.id = work.id;

  const img = document.createElement('img');
  img.src = work.imageUrl;
  img.alt = work.title ?? 'Projet';

  const cap = document.createElement('figcaption');
  cap.textContent = work.title ?? '';

  fig.append(img, cap);
  return fig;
}

async function fetchWorks() {
  const res = await fetch(`${API_BASE}/works`, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function initGallery() {
  try {
    showLoader();
    const works = await fetchWorks();

    const frag = document.createDocumentFragment();
    works.forEach(w => frag.appendChild(createWorkFigure(w)));

    galleryEl.replaceChildren(frag);
  } catch (e) {
    console.error(e);
    showError("Impossible de charger la galerie. Vérifie que le back-end tourne sur http://localhost:5678.");
  }
}

document.addEventListener('DOMContentLoaded', initGallery);