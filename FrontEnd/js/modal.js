(() => {
  // URL de base de l'API (ex : http://localhost:5678/api)
  const API = window.API_BASE;

  // Bouton qui ouvre la modale ("modifier" sur la page d'accueil)
  const openBtn = document.getElementById('openModalBtn');

  // Ouvrir la modale (ou rediriger vers la page de login si pas connecté)
  openBtn?.addEventListener('click', () => {
    // Si pas de token : on renvoie l'utilisateur sur la page de connexion
    if (!localStorage.getItem('token')) { location.href = './login.html'; return; }
    // Sinon on ouvre la modale
    openModal();
  });

  // --- État interne de la modale ---
  let overlay = null;      // référence unique à l'overlay (singleton de la modale)
  let previewURL = null;   // URL créée pour la preview de l'image (à révoquer ensuite)

  // Ouvre la modale en créant la structure HTML uniquement si elle n'existe pas déjà
  function openModal() {
    if (overlay) return; // si déjà ouverte, on ne recrée pas
    overlay = buildModal(); // construit toute la structure DOM de la modale
    document.body.appendChild(overlay); // ajoute la modale au body
    document.body.style.overflow = 'hidden'; // bloque le scroll en arrière-plan
    renderGalleryView(); // vue 1 : galerie photo par défaut
  }

  // Ferme la modale et nettoie les ressources
  function closeModal() {
    if (!overlay) return;
    // Si on a créé une URL de preview, on la libère
    if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
    overlay.remove();          // supprime la modale du DOM
    overlay = null;            // reset la référence
    document.body.style.overflow = ''; // réactive le scroll
    document.removeEventListener('keydown', onEsc); // enlève le listener sur ESC
  }

  // Gestion de la touche Echap pour fermer la modale
  function onEsc(e) { if (e.key === 'Escape') closeModal(); }

  // Construit toute la structure DOM de la modale (overlay + panel + header + footer)
  function buildModal() {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';

    const panel = document.createElement('div');
    panel.className = 'modal-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('tabindex', '-1');

    // Bouton de fermeture (croix en haut à droite)
    const close = document.createElement('button');
    close.className = 'modal-close';
    close.type = 'button';
    close.ariaLabel = 'Fermer';
    close.innerHTML = `
  <img src="./assets/icons/close.svg" alt="" aria-hidden="true">
`;

    const header = document.createElement('div');
    header.className = 'modal-header';

    // 🔙 Bouton "retour" en haut à gauche (visible seulement sur la vue d'ajout)
    const backIconBtn = document.createElement('button');
    backIconBtn.className = 'modal-back';
    backIconBtn.type = 'button';
    backIconBtn.ariaLabel = 'Retour';
    backIconBtn.hidden = true; // masqué à l'ouverture (vue galerie)
    backIconBtn.innerHTML = `
    <img src="./assets/icons/back.svg" alt="" aria-hidden="true">
  `;

    // Titre de la modale (change selon la vue : "Galerie photo" / "Ajout photo")
    const titleEl = document.createElement('h3');
    titleEl.id = 'modal-title';
    titleEl.textContent = 'Galerie photo';

    header.append(backIconBtn, titleEl);

    const body = document.createElement('div');
    body.className = 'modal-body';

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    // Bouton "Retour" en bas à gauche (actuellement masqué)
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-secondary';
    backBtn.id = 'modalBack';
    backBtn.textContent = '← Retour';
    backBtn.hidden = true;

    // Bouton principal "Ajouter une photo" (vue galerie)
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary';
    nextBtn.id = 'modalNext';
    nextBtn.textContent = 'Ajouter une photo';

    footer.append(backBtn, nextBtn);
    panel.append(close, header, body, footer);
    ov.append(panel);

    // Fermeture en cliquant sur la croix
    close.addEventListener('click', closeModal);
    // Fermeture en cliquant en dehors du panel (sur l'overlay)
    ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(); });
    // Fermeture au clavier (Esc)
    document.addEventListener('keydown', onEsc);

    // Navigation entre les vues
    nextBtn.addEventListener('click', renderUploadView);    // bouton "Ajouter une photo" → vue d'ajout
    backBtn.addEventListener('click', renderGalleryView);   // bouton "Retour" (footer) → vue galerie
    backIconBtn.addEventListener('click', renderGalleryView); // bouton "retour" en haut à gauche

    // Met le focus sur la modale pour l'accessibilité
    queueMicrotask(() => panel.focus());

    // On stocke les références utiles de la modale dans ov.$ pour les réutiliser facilement
    ov.$ = {
      panel,
      title: titleEl,
      body,
      footer,
      backBtn,
      nextBtn,
      backIcon: backIconBtn
    };
    return ov;
  }


  // ========== Vue 1 : Galerie (miniatures + icône poubelle) ==========
  // Affiche la liste des travaux existants sous forme de miniatures avec un bouton de suppression
  async function renderGalleryView() {
    if (!overlay) return;
    const { body, backBtn, nextBtn, title, footer, backIcon } = overlay.$;

    // Titre de la vue
    title.textContent = 'Galerie photo';
    // Le bouton "retour" (icône) est masqué sur la vue galerie
    if (backIcon) backIcon.hidden = true;
    backBtn.hidden = true;
    nextBtn.hidden = false;
    // Dans le footer, on conserve uniquement le bouton "Ajouter une photo"
    footer.replaceChildren(nextBtn);

    // Contenu initial pendant le chargement
    body.innerHTML = `<div class="modal-grid" id="modalGrid">Chargement…</div>`;
    const grid = body.querySelector('#modalGrid');

    try {
      // Récupère tous les travaux depuis l'API
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

        // Gestion du clic sur la poubelle (suppression d'un travail)
        const delBtn = fig.querySelector('.del');
        delBtn.addEventListener('click', async (e) => {
          e.preventDefault(); e.stopPropagation();
          if (!confirm('Supprimer ce média ?')) return;
          try {
            // Appel DELETE sur l'API avec le token d'authentification
            const r = await fetch(`${API}/works/${w.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!r.ok) throw new Error('DELETE ' + r.status);

            // On retire immédiatement la miniature de la modale
            fig.remove();
            // On rafraîchit la galerie principale de la page d'accueil
            await reloadMainGallery();

            // Notifie les autres modules (script principal) de la suppression
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
  // Affiche le formulaire d'ajout de nouveau travail (image + titre + catégorie)
  function renderUploadView() {
    if (!overlay) return;
    const { body, backBtn, nextBtn, title, footer, backIcon } = overlay.$;

    // Titre de la vue
    title.textContent = 'Ajout photo';
    // Ici le bouton "retour" (icône) est visible pour revenir à la galerie
    if (backIcon) backIcon.hidden = false;
    backBtn.hidden = true;
    nextBtn.hidden = true;

    // Construction du formulaire d'upload (dropzone + champs texte + select)
    body.innerHTML = `
  <form id="uploadForm" novalidate>
    <div class="dropzone">
      <img src="./assets/icons/img.svg" alt="" class="dropzone-icon" aria-hidden="true">
      <img class="preview" id="previewImg" alt="">
      <input id="fileInput" name="image" type="file" accept="image/png,image/jpeg" hidden>
      <button class="pick" type="button" id="pickBtn">+ Ajouter une photo</button>
      <p id="dropHint">jpg, png • 4 Mo max</p>
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

    // Création du bouton "Valider" dans le footer, lié au formulaire via l'attribut form
    const submitBtn = document.createElement('button');
    submitBtn.id = 'submitBtn';
    submitBtn.className = 'btn btn-primary';
    submitBtn.type = 'submit';
    submitBtn.setAttribute('form', 'uploadForm');
    submitBtn.textContent = 'Valider';
    // Dans cette vue, le footer contient uniquement "Valider"
    footer.replaceChildren(submitBtn);

    // Remplit la liste des catégories dans le <select>
    fillCategories();

    // Références vers les éléments du formulaire
    const form = body.querySelector('#uploadForm');
    const fileInput = body.querySelector('#fileInput');
    const pickBtn = body.querySelector('#pickBtn');
    const preview = body.querySelector('#previewImg');
    const icon = body.querySelector('.dropzone-icon');
    const titleIn = body.querySelector('#titleInput');
    const catSel = body.querySelector('#catSelect');
    const errorBox = body.querySelector('#uploadError');
    const hint = body.querySelector('#dropHint');

    // Affichage / masquage des messages d'erreur
    const showErr = (msg) => { errorBox.textContent = msg; errorBox.hidden = !msg; };
    const clearErr = () => showErr('');

    // Vérifie que le fichier est bien un JPG/PNG <= 4 Mo
    const isValidImage = (f) => !!f && ['image/jpeg', 'image/png'].includes(f.type) && f.size <= 4 * 1024 * 1024;

    // Met à jour l'état du formulaire (preview + activation du bouton Valider)
    const updateState = () => {
      const ok = isValidImage(fileInput.files?.[0]) && titleIn.value.trim() && catSel.value;
      submitBtn.disabled = !ok; // "Valider" n'est cliquable que si tout est rempli / valide

      if (fileInput.files?.[0]) {
        // Si une image est sélectionnée, on génère une URL de preview
        if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
        previewURL = URL.createObjectURL(fileInput.files[0]);
        preview.src = previewURL;
        preview.style.display = 'block';
        // On masque l'icône, le bouton et le texte d'aide
        if (icon) icon.style.display = 'none';
        if (pickBtn) pickBtn.style.display = 'none';
        if (hint) hint.style.display = 'none';
      } else {
        // Si aucune image, on nettoie la preview et on réaffiche l'UI initiale
        if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
        preview.removeAttribute('src');
        preview.style.display = 'none';
        if (icon) icon.style.display = '';
        if (pickBtn) pickBtn.style.display = '';
        if (hint) hint.style.display = '';
      }
    };

    // Quand on clique sur le bouton "Ajouter une photo", on déclenche le input file caché
    pickBtn.addEventListener('click', () => fileInput.click());

    // Lorsqu'un fichier est choisi, on vérifie sa taille / type puis on met à jour la preview
    fileInput.addEventListener('change', () => {
      const f = fileInput.files?.[0];
      if (!f) { updateState(); return; }
      if (f.size > 4 * 1024 * 1024) { fileInput.value = ''; showErr('Image trop lourde (> 4 Mo).'); updateState(); return; }
      if (!['image/jpeg', 'image/png'].includes(f.type)) { fileInput.value = ''; showErr('Formats autorisés : JPG ou PNG.'); updateState(); return; }
      clearErr(); updateState();
    });

    // Quand le titre change, on revalide le formulaire
    titleIn.addEventListener('input', () => { clearErr(); updateState(); });
    // Quand la catégorie change, idem
    catSel.addEventListener('change', () => { clearErr(); updateState(); });

    // Soumission du formulaire d'upload
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErr();

      const f = fileInput.files?.[0];
      const titleVal = titleIn.value.trim();
      const catVal = catSel.value;

      // Double validation côté front avant l'envoi
      if (!isValidImage(f)) return showErr('Choisis une image JPG/PNG ≤ 4 Mo.');
      if (!titleVal) return showErr('Le titre est obligatoire.');
      if (!catVal) return showErr('Choisis une catégorie.');

      // Construction du FormData à envoyer à l'API
      const fd = new FormData();
      fd.append('image', f);
      fd.append('title', titleVal);
      fd.append('category', catVal);

      try {
        // Envoi du POST /works avec le token d'authentification
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

        const created = await r.json(); // objet du travail créé renvoyé par l'API

        // On rafraîchit la galerie principale
        await reloadMainGallery();

        // On notifie les autres scripts (principal) de l'ajout
        document.dispatchEvent(new CustomEvent('works:append', { detail: { work: created } }));
        if (typeof window.refreshWorksStateFromApi === 'function') window.refreshWorksStateFromApi();
        document.dispatchEvent(new CustomEvent('works:refresh'));

        // On réinitialise le formulaire + état, puis retour à la vue galerie
        form.reset();
        updateState();
        renderGalleryView();
      } catch (err) {
        console.error('[modal] POST /works failed', err);
        showErr("Échec de l'envoi. Réessaie.");
      }
    });

    // État initial : pas de fichier, bouton "Valider" désactivé
    updateState();
  }

  // Remplit la liste des catégories dans le <select> de la vue d'ajout
  async function fillCategories() {
    try {
      const res = await fetch(`${API}/categories`, { headers: { Accept: 'application/json' } });
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

  // Rafraîchit la galerie principale (#gallery) sur la page d'accueil
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