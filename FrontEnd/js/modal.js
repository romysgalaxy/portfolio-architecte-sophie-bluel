export function initModal() {
  let API = window.API_BASE;

  let openBtn = document.getElementById("openModalBtn");
  let overlay = null;
  let previewURL = null;

  if (openBtn !== null) {
    openBtn.addEventListener("click", function () {
      let token = localStorage.getItem("token");
      if (token === null) {
        window.location.href = "./login.html";
        return;
      }
      openModal();
    });
  }

  function openModal() {
    if (overlay !== null) return;

    overlay = buildModal();
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    renderGalleryView();
  }

  function closeModal() {
    if (overlay === null) return;

    if (previewURL !== null) {
      URL.revokeObjectURL(previewURL);
      previewURL = null;
    }

    overlay.remove();
    overlay = null;
    document.body.style.overflow = "";

    document.removeEventListener("keydown", onEscKey);
  }

  function onEscKey(event) {
    if (event.key === "Escape") closeModal();
  }

  function buildModal() {
    // overlay
    let ov = document.createElement("div");
    ov.className = "modal-overlay";

    // panel
    let panel = document.createElement("div");
    panel.className = "modal-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("tabindex", "-1");

    // close button (croix)
    let closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Fermer");
    closeBtn.innerHTML = '<img src="./assets/icons/close.svg" alt="" aria-hidden="true">';

    // header
    let header = document.createElement("div");
    header.className = "modal-header";

    // back icon button (hidden by default)
    let backIconBtn = document.createElement("button");
    backIconBtn.className = "modal-back";
    backIconBtn.type = "button";
    backIconBtn.setAttribute("aria-label", "Retour");
    backIconBtn.hidden = true;
    backIconBtn.innerHTML = '<img src="./assets/icons/back.svg" alt="" aria-hidden="true">';

    // title
    let titleEl = document.createElement("h3");
    titleEl.id = "modal-title";
    titleEl.textContent = "Galerie photo";

    header.appendChild(backIconBtn);
    header.appendChild(titleEl);

    // body
    let body = document.createElement("div");
    body.className = "modal-body";

    // footer
    let footer = document.createElement("div");
    footer.className = "modal-footer";

    // footer back button (hidden by default)
    let backBtn = document.createElement("button");
    backBtn.className = "btn btn-secondary";
    backBtn.id = "modalBack";
    backBtn.type = "button";
    backBtn.textContent = "← Retour";
    backBtn.hidden = true;

    // footer next button
    let nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-primary";
    nextBtn.id = "modalNext";
    nextBtn.type = "button";
    nextBtn.textContent = "Ajouter une photo";

    footer.appendChild(backBtn);
    footer.appendChild(nextBtn);

    panel.appendChild(closeBtn);
    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    ov.appendChild(panel);

    // close events
    closeBtn.addEventListener("click", closeModal);
    ov.addEventListener("click", function (e) {
      if (e.target === ov) closeModal();
    });
    document.addEventListener("keydown", onEscKey);

    // navigation
    nextBtn.addEventListener("click", renderUploadView);
    backBtn.addEventListener("click", renderGalleryView);
    backIconBtn.addEventListener("click", renderGalleryView);

    // store refs
    ov._panel = panel;
    ov._title = titleEl;
    ov._body = body;
    ov._footer = footer;
    ov._backBtn = backBtn;
    ov._nextBtn = nextBtn;
    ov._backIcon = backIconBtn;

    // focus (simple)
    setTimeout(function () {
      panel.focus();
    }, 0);

    return ov;
  }

  // -------------------------
  // VUE 1 : GALERIE
  // -------------------------
  function renderGalleryView() {
    if (overlay === null) return;

    overlay._title.textContent = "Galerie photo";
    overlay._backIcon.hidden = true;
    overlay._backBtn.hidden = true;
    overlay._nextBtn.hidden = false;

    // footer : uniquement "Ajouter une photo"
    overlay._footer.innerHTML = "";
    overlay._footer.appendChild(overlay._nextBtn);

    // loading
    overlay._body.innerHTML = '<div class="modal-grid" id="modalGrid">Chargement…</div>';
    let grid = overlay._body.querySelector("#modalGrid");

    fetch(API + "/works", { headers: { Accept: "application/json" } })
      .then(function (response) {
        if (response.ok === false) {
          grid.textContent = "Impossible de charger la galerie.";
          return null;
        }
        return response.json();
      })
      .then(function (works) {
        if (works === null) return;

        grid.innerHTML = "";

        for (let i = 0; i < works.length; i++) {
          createMiniature(grid, works[i]);
        }
      })
      .catch(function (error) {
        console.error(error);
        grid.textContent = "Impossible de charger la galerie.";
      });
  }

  function createMiniature(grid, work) {
    let fig = document.createElement("figure");

    // reprend le HTML du projet initial (classes + bouton .del + svg)
    fig.innerHTML =
      '<img src="' + work.imageUrl + '" alt="' + (work.title || "") + '">' +
      "<figcaption>" + (work.title || "") + "</figcaption>" +
      '<button class="del" type="button" aria-label="Supprimer">' +
      '  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '    <path fill="currentColor" d="M9 3h6a1 1 0 0 1 1 1v1h4v2h-1v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4V5h4V4a1 1 0 0 1 1-1zm1 2h4V5h-4zM7 7v12h10V7H7zm3 2h2v8h-2V9zm4 0h2v8h-2V9z"/>' +
      "  </svg>" +
      "</button>";

    let delBtn = fig.querySelector(".del");
    delBtn.addEventListener("click", function (e) {
      e.preventDefault();

      if (confirm("Supprimer ce média ?") === false) return;

      let token = localStorage.getItem("token");

      fetch(API + "/works/" + work.id, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token }
      })
        .then(function (response) {
          if (response.ok === false) {
            alert("Suppression impossible.");
            return;
          }
          fig.remove();
          if (window.reloadGallery) window.reloadGallery();
          else reloadMainGallery();
        })
        .catch(function (error) {
          console.error(error);
          alert("Suppression impossible.");
        });
    });

    grid.appendChild(fig);
  }

  // -------------------------
  // VUE 2 : UPLOAD
  // -------------------------
  function renderUploadView() {
    if (overlay === null) return;

    overlay._title.textContent = "Ajout photo";
    overlay._backIcon.hidden = false;
    overlay._backBtn.hidden = true;
    overlay._nextBtn.hidden = true;

    // footer : uniquement "Valider" (btn btn-primary)
    overlay._footer.innerHTML = "";
    let submitBtn = document.createElement("button");
    submitBtn.className = "btn btn-primary";
    submitBtn.type = "submit";
    submitBtn.setAttribute("form", "uploadForm");
    submitBtn.textContent = "Valider";
    overlay._footer.appendChild(submitBtn);

    // reprend les classes HTML du projet initial
    overlay._body.innerHTML =
      '<form id="uploadForm" novalidate>' +
      '  <div class="dropzone">' +
      '    <img src="./assets/icons/img.svg" alt="" class="dropzone-icon" aria-hidden="true">' +
      '    <img class="preview" id="previewImg" alt="">' +
      '    <input id="fileInput" name="image" type="file" accept="image/png,image/jpeg" hidden>' +
      '    <button class="pick" type="button" id="pickBtn">+ Ajouter une photo</button>' +
      '    <p id="dropHint">jpg, png • 4 Mo max</p>' +
      "  </div>" +
      '  <div class="form-row">' +
      '    <label for="titleInput">Titre</label>' +
      '    <input id="titleInput" name="title" type="text" required>' +
      "  </div>" +
      '  <div class="form-row">' +
      '    <label for="catSelect">Catégorie</label>' +
      '    <select id="catSelect" name="category" required>' +
      '      <option value="" disabled selected>Choisir…</option>' +
      "    </select>" +
      "  </div>" +
      '  <p id="uploadError" class="form-error" role="alert" hidden></p>' +
      "</form>";

    let form = overlay._body.querySelector("#uploadForm");
    let fileInput = overlay._body.querySelector("#fileInput");
    let pickBtn = overlay._body.querySelector("#pickBtn");
    let previewImg = overlay._body.querySelector("#previewImg");
    let icon = overlay._body.querySelector(".dropzone-icon");
    let hint = overlay._body.querySelector("#dropHint");

    let titleInput = overlay._body.querySelector("#titleInput");
    let catSelect = overlay._body.querySelector("#catSelect");
    let errorBox = overlay._body.querySelector("#uploadError");

    // Remplir catégories
    fillCategories(catSelect);

    // Ouvrir le sélecteur de fichier
    pickBtn.addEventListener("click", function () {
      fileInput.click();
    });

    // Gestion erreurs
    function showErr(msg) {
      errorBox.textContent = msg;
      errorBox.hidden = (msg === "");
    }

    function clearErr() {
      showErr("");
    }

    // Preview + validation simple fichier
    fileInput.addEventListener("change", function () {
      clearErr();

      let file = fileInput.files[0];
      if (!file) {
        resetPreview();
        return;
      }

      if (file.size > 4 * 1024 * 1024) {
        fileInput.value = "";
        showErr("Image trop lourde (> 4 Mo).");
        resetPreview();
        return;
      }

      if (file.type !== "image/jpeg" && file.type !== "image/png") {
        fileInput.value = "";
        showErr("Formats autorisés : JPG ou PNG.");
        resetPreview();
        return;
      }

      setPreview(file);
    });

    function setPreview(file) {
      if (previewURL !== null) {
        URL.revokeObjectURL(previewURL);
        previewURL = null;
      }

      previewURL = URL.createObjectURL(file);
      previewImg.src = previewURL;
      previewImg.style.display = "block";

      if (icon) icon.style.display = "none";
      if (pickBtn) pickBtn.style.display = "none";
      if (hint) hint.style.display = "none";
    }

    function resetPreview() {
      if (previewURL !== null) {
        URL.revokeObjectURL(previewURL);
        previewURL = null;
      }
      previewImg.removeAttribute("src");
      previewImg.style.display = "none";

      if (icon) icon.style.display = "";
      if (pickBtn) pickBtn.style.display = "";
      if (hint) hint.style.display = "";
    }

    // Submit
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErr();

      let file = fileInput.files[0];
      let title = titleInput.value.trim();
      let category = catSelect.value;

      if (file === undefined) {
        showErr("Choisis une image JPG/PNG ≤ 4 Mo.");
        return;
      }

      if (title === "") {
        showErr("Le titre est obligatoire.");
        return;
      }

      if (category === "" || category === null) {
        showErr("Choisis une catégorie.");
        return;
      }


      let token = localStorage.getItem("token");

      let formData = new FormData();
      formData.append("image", file);
      formData.append("title", title);
      formData.append("category", category);

      fetch(API + "/works", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: formData
      })
        .then(function (response) {
          if (response.ok === false) {
            if (response.status === 400) return showErr("Formulaire incomplet.");
            if (response.status === 401) return showErr("Non autorisé (token expiré).");
            return showErr("Erreur (" + response.status + ").");
          }

          // succès
          if (window.reloadGallery) window.reloadGallery();
          else reloadMainGallery();
          renderGalleryView();
        })
        .catch(function (error) {
          console.error(error);
          showErr("Échec de l'envoi. Réessaie.");
        });
    });
  }

  function fillCategories(selectEl) {
    fetch(API + "/categories", { headers: { Accept: "application/json" } })
      .then(function (response) {
        if (response.ok === false) return null;
        return response.json();
      })
      .then(function (cats) {
        if (cats === null) return;

        // Ajoute les <option>
        for (let i = 0; i < cats.length; i++) {
          let opt = document.createElement("option");
          opt.value = String(cats[i].id);
          opt.textContent = cats[i].name;
          selectEl.appendChild(opt);
        }
      })
      .catch(function (error) {
        console.error(error);
      });
  }

  // -------------------------
  // RAFRAÎCHIR GALERIE PAGE
  // -------------------------
  function reloadMainGallery() {
    let mainGallery = document.getElementById("gallery");
    if (mainGallery === null) return;

    fetch(API + "/works", { headers: { Accept: "application/json" } })
      .then(function (response) {
        if (response.ok === false) return null;
        return response.json();
      })
      .then(function (data) {
        if (data === null) return;

        mainGallery.innerHTML = "";

        for (let i = 0; i < data.length; i++) {
          let work = data[i];

          let fig = document.createElement("figure");

          let img = document.createElement("img");
          img.src = work.imageUrl;
          img.alt = work.title || "";

          let cap = document.createElement("figcaption");
          cap.textContent = work.title || "";

          fig.appendChild(img);
          fig.appendChild(cap);
          mainGallery.appendChild(fig);
        }
      })
      .catch(function (error) {
        console.error(error);
      });
  }
}
