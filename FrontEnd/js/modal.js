const API = window.API_BASE;
const token = localStorage.getItem('token');
const openBtn = document.getElementById('openModalBtn');

// Ne branche l’UI que pour un admin
if (token && openBtn) {
  openBtn.addEventListener('click', openModal);
}

let overlay = null; // singleton

function openModal() {
  if (overlay) return;
  overlay = buildModal();
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  renderGalleryView(); // vue 1 par défaut
}

function closeModal() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onEsc);
}

function onEsc(e) { if (e.key === 'Escape') closeModal(); }

function buildModal() {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';

  const panel = document.createElement('div');
  panel.className = 'modal-panel';
  panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true');

  const close = document.createElement('button');
  close.className = 'modal-close'; close.ariaLabel = 'Fermer'; close.textContent = '×';

  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = `<h3 id="modal-title">Galerie photo</h3>`;

  const body = document.createElement('div'); body.className = 'modal-body';
  const footer = document.createElement('div'); footer.className = 'modal-footer';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-secondary'; backBtn.id = 'modalBack';
  backBtn.textContent = '← Retour'; backBtn.hidden = true;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-primary'; nextBtn.id = 'modalNext';
  nextBtn.textContent = 'Ajouter une photo';

  footer.append(backBtn, nextBtn);
  panel.append(close, header, body, footer);
  ov.append(panel);

  // Fermeture
  close.addEventListener('click', closeModal);
  ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(); });
  document.addEventListener('keydown', onEsc);

  // Navigation
  nextBtn.addEventListener('click', renderUploadView);
  backBtn.addEventListener('click', renderGalleryView);

  ov.$ = { body, backBtn, nextBtn, title: header.querySelector('#modal-title') };
  return ov;
}

// ---------------- Vue 1: Galerie photo + DELETE ----------------
async function renderGalleryView() {
  if (!overlay) return;
  const { body, backBtn, nextBtn, title } = overlay.$;
  title.textContent = 'Galerie photo';
  backBtn.hidden = true; nextBtn.hidden = false;

  body.innerHTML = `<div class="modal-grid" id="modalGrid">Chargement…</div>`;
  const grid = body.querySelector('#modalGrid');

  try {
    const res = await fetch(`${API}/works`);
    const works = await res.json();
    grid.innerHTML = '';

    works.forEach((w) => {
      const fig = document.createElement('figure');
      fig.innerHTML = `
        <img src="${w.imageUrl}" alt="${w.title}">
        <figcaption>${w.title || ''}</figcaption>
      `;

      // Bouton suppression (admin only)
      const del = document.createElement('button');
      del.className = 'del'; del.title = 'Supprimer';
      del.innerHTML = '🗑';
      del.addEventListener('click', async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!confirm('Supprimer ce média ?')) return;
        try {
          const r = await fetch(`${API}/works/${w.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!r.ok) throw new Error('DELETE ' + r.status);
          fig.remove();                 // retire du mode modale
          await reloadMainGallery();    // MAJ de la galerie principale
        } catch (err) {
          console.error(err);
          alert("Suppression impossible.");
        }
      });

      fig.appendChild(del);
      grid.appendChild(fig);
    });
  } catch (e) {
    grid.textContent = 'Impossible de charger la galerie.';
  }
}

// ---------------- Vue 2: Ajout photo + POST ----------------
function renderUploadView() {
  if (!overlay) return;
  const { body, backBtn, nextBtn, title } = overlay.$;
  title.textContent = 'Ajout photo';
  backBtn.hidden = false; nextBtn.hidden = true;

  body.innerHTML = `
    <form id="uploadForm">
      <div class="dropzone">
        <img class="preview" id="previewImg" alt="">
        <input id="fileInput" name="image" type="file" accept="image/*" hidden>
        <button class="pick" type="button" id="pickBtn">+ Ajouter une photo</button>
        <p>jpg, png • 4 Mo max</p>
      </div>

      <div class="form-row">
        <label for="titleInput">Titre</label>
        <input id="titleInput" name="title" type="text" required>
      </div>

      <div class="form-row">
        <label for="catSelect">Catégorie</label>
        <select id="catSelect" name="category" required>
          <option value="" disabled selected>Choisir…</option>
        </select>
      </div>

      <div class="form-row" style="text-align:center; margin-top:16px;">
        <button id="submitBtn" class="btn btn-primary" type="submit" disabled>Valider</button>
      </div>
    </form>
  `;

  fillCategories();

  const fileInput = body.querySelector('#fileInput');
  const pickBtn   = body.querySelector('#pickBtn');
  const preview   = body.querySelector('#previewImg');
  const titleIn   = body.querySelector('#titleInput');
  const catSel    = body.querySelector('#catSelect');
  const submitBtn = body.querySelector('#submitBtn');
  const form      = body.querySelector('#uploadForm');

  const updateState = () => {
    submitBtn.disabled = !(fileInput.files?.[0] && titleIn.value.trim() && catSel.value);
    preview.style.display = fileInput.files?.[0] ? 'block' : 'none';
  };

  pickBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (!f) return updateState();
    if (f.size > 4 * 1024 * 1024) { alert('Fichier > 4 Mo'); fileInput.value = ''; return updateState(); }
    preview.src = URL.createObjectURL(f);
    updateState();
  });
  titleIn.addEventListener('input', updateState);
  catSel.addEventListener('change', updateState);

  // Envoi POST réel
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = fileInput.files?.[0];
    if (!f) return;

    const fd = new FormData();
    fd.append('image', f);
    fd.append('title', titleIn.value.trim());
    fd.append('category', catSel.value);

    try {
      const r = await fetch(`${API}/works`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      if (!r.ok) throw new Error('POST ' + r.status);

      // MAJ UI
      await reloadMainGallery(); // rafraîchit la galerie sur la page
      alert('Photo ajoutée ✅');
      renderGalleryView();       // retour à la vue 1
    } catch (err) {
      console.error(err);
      alert("Impossible d'ajouter la photo.");
    }
  });
}

async function fillCategories() {
  try {
    const res = await fetch(`${API}/categories`);
    const cats = await res.json();
    const sel = overlay.$.body.querySelector('#catSelect');
    sel.insertAdjacentHTML('beforeend',
      cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
    );
  } catch (e) { /* ignore */ }
}

// -------- MAJ de la galerie principale (sans recharger la page) --------
async function reloadMainGallery() {
  const galleryEl = document.getElementById('gallery');
  if (!galleryEl) return;
  try {
    const res = await fetch(`${API}/works`);
    const works = await res.json();

    const frag = document.createDocumentFragment();
    works.forEach(w => {
      const fig = document.createElement('figure');
      fig.innerHTML = `<img src="${w.imageUrl}" alt="${w.title || ''}">
                       <figcaption>${w.title || ''}</figcaption>`;
      frag.appendChild(fig);
    });
    galleryEl.replaceChildren(frag);
  } catch (e) {
    console.error('refresh gallery failed', e);
  }
}
