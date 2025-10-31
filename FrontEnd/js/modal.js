(() => {
  const API = window.API_BASE;
  const openBtn = document.getElementById('openModalBtn');

  // Ouvrir (ou rediriger vers login si pas connecté)
  openBtn?.addEventListener('click', () => {
    if (!localStorage.getItem('token')) { location.href = './login.html'; return; }
    openModal();
  });

  let overlay = null;      // singleton de la modale
  let previewURL = null;   // pour révoquer l’URL de la preview

  function openModal() {
    if (overlay) return;
    overlay = buildModal();
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    renderGalleryView(); // vue 1 par défaut
  }

  function closeModal() {
    if (!overlay) return;
    if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
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
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('tabindex', '-1');

    const close = document.createElement('button');
    close.className = 'modal-close';
    close.ariaLabel = 'Fermer';
    close.textContent = '×';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h3 id="modal-title">Galerie photo</h3>`;

    const body = document.createElement('div');
    body.className = 'modal-body';

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-secondary';
    backBtn.id = 'modalBack';
    backBtn.textContent = '← Retour';
    backBtn.hidden = true;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary';
    nextBtn.id = 'modalNext';
    nextBtn.textContent = 'Ajouter une photo';

    // Par défaut on met les deux, on ajustera par vue
    footer.append(backBtn, nextBtn);
    panel.append(close, header, body, footer);
    ov.append(panel);

    // Fermetures
    close.addEventListener('click', closeModal);
    ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(); });
    document.addEventListener('keydown', onEsc);

    // Navigation
    nextBtn.addEventListener('click', renderUploadView);
    backBtn.addEventListener('click', renderGalleryView);

    // Focus accessible
    queueMicrotask(() => panel.focus());

    // Expose refs
    ov.$ = {
      panel,
      title: header.querySelector('#modal-title'),
      body,
      footer,
      backBtn,
      nextBtn
    };
    return ov;
  }

  // ========== Vue 1 : Galerie (miniatures + icône poubelle) ==========
  async function renderGalleryView() {
    if (!overlay) return;
    const { body, backBtn, nextBtn, title, footer } = overlay.$;

    title.textContent = 'Galerie photo';
    backBtn.hidden = true;
    nextBtn.hidden = false;
    footer.replaceChildren(nextBtn); 

    body.innerHTML = `<div class="modal-grid" id="modalGrid">Chargement…</div>`;
    const grid = body.querySelector('#modalGrid');

    try {
      const res = await fetch(`${API}/works`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const works = await res.json();

      grid.innerHTML = '';
      works.forEach((w) => {
        const fig = document.createElement('figure');
        fig.innerHTML = `
          <img src="${w.imageUrl}" alt="${w.title || ''}">
          <figcaption>${w.title || ''}</figcaption>
          <button class="del" type="button" aria-label="Supprimer">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor"
                d="M9 3h6a1 1 0 0 1 1 1v1h4v2h-1v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4V5h4V4a1 1 0 0 1 1-1zm1 2h4V5h-4zM7 7v12h10V7H7zm3 2h2v8h-2V9zm4 0h2v8h-2V9z"/>
            </svg>
          </button>
        `;

        // Suppression
        const delBtn = fig.querySelector('.del');
        delBtn.addEventListener('click', async (e) => {
          e.preventDefault(); e.stopPropagation();
          if (!confirm('Supprimer ce média ?')) return;
          try {
            const r = await fetch(`${API}/works/${w.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!r.ok) throw new Error('DELETE ' + r.status);

            fig.remove();
            await reloadMainGallery();

            // Notifie les filtres de la suppression
            document.dispatchEvent(new CustomEvent('works:delete', { detail: { id: w.id } }));
            if (typeof window.refreshWorksStateFromApi === 'function') window.refreshWorksStateFromApi();
            document.dispatchEvent(new CustomEvent('works:refresh'));
          } catch (err) {
            console.error(err);
            alert("Suppression impossible.");
          }
        });

        grid.appendChild(fig);
      });
    } catch (e) {
      console.error('[modal] works failed:', e);
      grid.textContent = 'Impossible de charger la galerie.';
    }
  }

  // ========== Vue 2 : Ajout (validation + POST) ==========
  function renderUploadView() {
    if (!overlay) return;
    const { body, backBtn, nextBtn, title, footer } = overlay.$;

    title.textContent = 'Ajout photo';

    backBtn.hidden = true;
    nextBtn.hidden = true;

    body.innerHTML = `
      <form id="uploadForm" novalidate>
        <div class="dropzone">
          <img class="preview" id="previewImg" alt="">
          <input id="fileInput" name="image" type="file" accept="image/png,image/jpeg" hidden>
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

        <p id="uploadError" class="form-error" role="alert" hidden></p>
      </form>
    `;

    // Crée le bouton "Valider" dans le footer, relié au formulaire via l'attribut form
    const submitBtn = document.createElement('button');
    submitBtn.id = 'submitBtn';
    submitBtn.className = 'btn btn-primary';
    submitBtn.type = 'submit';
    submitBtn.setAttribute('form', 'uploadForm');
    submitBtn.textContent = 'Valider';
    footer.replaceChildren(submitBtn); // ⬅️ le footer n'a plus que "Valider"

    fillCategories();

    const form      = body.querySelector('#uploadForm');
    const fileInput = body.querySelector('#fileInput');
    const pickBtn   = body.querySelector('#pickBtn');
    const preview   = body.querySelector('#previewImg');
    const titleIn   = body.querySelector('#titleInput');
    const catSel    = body.querySelector('#catSelect');
    const errorBox  = body.querySelector('#uploadError');

    const showErr = (msg) => { errorBox.textContent = msg; errorBox.hidden = !msg; };
    const clearErr = () => showErr('');

    const isValidImage = (f) => !!f && ['image/jpeg','image/png'].includes(f.type) && f.size <= 4*1024*1024;

    const updateState = () => {
      const ok = isValidImage(fileInput.files?.[0]) && titleIn.value.trim() && catSel.value;
      submitBtn.disabled = !ok;
      if (fileInput.files?.[0]) {
        if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
        previewURL = URL.createObjectURL(fileInput.files[0]);
        preview.src = previewURL;
        preview.style.display = 'block';
      } else {
        if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
        preview.removeAttribute('src');
        preview.style.display = 'none';
      }
    };

    pickBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const f = fileInput.files?.[0];
      if (!f) { updateState(); return; }
      if (f.size > 4*1024*1024) { fileInput.value=''; showErr('Image trop lourde (> 4 Mo).'); updateState(); return; }
      if (!['image/jpeg','image/png'].includes(f.type)) { fileInput.value=''; showErr('Formats autorisés : JPG ou PNG.'); updateState(); return; }
      clearErr(); updateState();
    });
    titleIn.addEventListener('input', () => { clearErr(); updateState(); });
    catSel.addEventListener('change', () => { clearErr(); updateState(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErr();

      const f = fileInput.files?.[0];
      const titleVal = titleIn.value.trim();
      const catVal = catSel.value;

      if (!isValidImage(f)) return showErr('Choisis une image JPG/PNG ≤ 4 Mo.');
      if (!titleVal) return showErr('Le titre est obligatoire.');
      if (!catVal) return showErr('Choisis une catégorie.');

      const fd = new FormData();
      fd.append('image', f);
      fd.append('title', titleVal);
      fd.append('category', catVal);

      try {
        const r = await fetch(`${API}/works`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: fd
        });
        if (!r.ok) {
          if (r.status === 400) return showErr('Formulaire incomplet.');
          if (r.status === 401) return showErr('Non autorisé (token manquant/expiré).');
          throw new Error('HTTP ' + r.status);
        }

        const created = await r.json();

        await reloadMainGallery();

        // Notifie les filtres de l’ajout
        document.dispatchEvent(new CustomEvent('works:append', { detail: { work: created } }));
        if (typeof window.refreshWorksStateFromApi === 'function') window.refreshWorksStateFromApi();
        document.dispatchEvent(new CustomEvent('works:refresh'));

        // Reset + retour
        form.reset();
        updateState();
        renderGalleryView();
      } catch (err) {
        console.error('[modal] POST /works failed', err);
        showErr("Échec de l'envoi. Réessaie.");
      }
    });

    // État initial
    updateState();
  }

  async function fillCategories() {
    try {
      const res = await fetch(`${API}/categories`, { headers: { Accept: 'application/json' }});
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const cats = await res.json();
      const sel = overlay.$.body.querySelector('#catSelect');
      sel.insertAdjacentHTML('beforeend',
        cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
      );
    } catch (e) {
      console.error('[modal] categories failed:', e);
    }
  }

  // Rafraîchit la galerie principale (#gallery)
  async function reloadMainGallery() {
    const galleryEl = document.getElementById('gallery');
    if (!galleryEl) return;
    try {
      const res = await fetch(`${API}/works`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
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
      console.error('[modal] refresh main gallery failed:', e);
    }
  }
})();
