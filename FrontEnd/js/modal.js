export function initModal() {

  // -------------------------
  // CONFIG + BOUTON OUVRIR
  // -------------------------
  var API = window.API_BASE;

  var openBtn = document.getElementById("openModalBtn");
  var overlay = null;      // la modale (div overlay)
  var previewURL = null;   // url temporaire pour preview image

  if (openBtn !== null) {
    openBtn.addEventListener("click", function () {
      var token = localStorage.getItem("token");

      // Si pas connecté, on renvoie au login
      if (token === null) {
        window.location.href = "./login.html";
        return;
      }

      openModal();
    });
  }


  // -------------------------
  // OUVRIR / FERMER MODALE
  // -------------------------
  function openModal() {
    // Si déjà ouverte, on ne la recrée pas
    if (overlay !== null) {
      return;
    }

    overlay = buildModal();
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden"; // bloque scroll

    showGalleryView();
  }

  function closeModal() {
    if (overlay === null) {
      return;
    }

    // libère l'URL de preview si elle existe
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
    if (event.key === "Escape") {
      closeModal();
    }
  }


  // -------------------------
  // CONSTRUIRE LA MODALE HTML
  // -------------------------
  function buildModal() {
    var ov = document.createElement("div");
    ov.className = "modal-overlay";

    var panel = document.createElement("div");
    panel.className = "modal-panel";

    var closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.type = "button";
    closeBtn.textContent = "X";

    var title = document.createElement("h3");
    title.id = "modalTitle";
    title.textContent = "Galerie photo";

    var body = document.createElement("div");
    body.className = "modal-body";

    var footer = document.createElement("div");
    footer.className = "modal-footer";

    var addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.id = "modalAddBtn";
    addBtn.textContent = "Ajouter une photo";

    var backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.id = "modalBackBtn";
    backBtn.textContent = "Retour";
    backBtn.style.display = "none";

    footer.appendChild(backBtn);
    footer.appendChild(addBtn);

    panel.appendChild(closeBtn);
    panel.appendChild(title);
    panel.appendChild(body);
    panel.appendChild(footer);
    ov.appendChild(panel);

    // fermer avec la croix
    closeBtn.addEventListener("click", function () {
      closeModal();
    });

    // fermer si clic en dehors du panel
    ov.addEventListener("click", function (event) {
      if (event.target === ov) {
        closeModal();
      }
    });

    // fermer avec Escape
    document.addEventListener("keydown", onEscKey);

    // navigation vues
    addBtn.addEventListener("click", function () {
      showUploadView();
    });

    backBtn.addEventListener("click", function () {
      showGalleryView();
    });

    // on stocke les éléments utiles directement sur ov
    ov._panel = panel;
    ov._title = title;
    ov._body = body;
    ov._footer = footer;
    ov._addBtn = addBtn;
    ov._backBtn = backBtn;

    return ov;
  }


  // -------------------------
  // VUE 1 : GALERIE + SUPPR
  // -------------------------
  function showGalleryView() {
    if (overlay === null) return;

    overlay._title.textContent = "Galerie photo";
    overlay._addBtn.style.display = "";
    overlay._backBtn.style.display = "none";

    overlay._body.innerHTML = "Chargement...";

    fetch(API + "/works")
      .then(function (response) {
        if (response.ok === false) {
          overlay._body.innerHTML = "Impossible de charger la galerie.";
          return null;
        }
        return response.json();
      })
      .then(function (data) {
        if (data === null) return;

        // on construit le HTML simple
        overlay._body.innerHTML = "";
        var grid = document.createElement("div");
        grid.className = "modal-grid";
        overlay._body.appendChild(grid);

        for (var i = 0; i < data.length; i++) {
          createWorkMiniature(grid, data[i]);
        }
      })
      .catch(function (error) {
        console.error(error);
        overlay._body.innerHTML = "Impossible de charger la galerie.";
      });
  }

  function createWorkMiniature(container, work) {
    var fig = document.createElement("figure");

    var img = document.createElement("img");
    img.src = work.imageUrl;
    img.alt = work.title || "";

    var cap = document.createElement("figcaption");
    cap.textContent = work.title || "";

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "Supprimer";

    delBtn.addEventListener("click", function (event) {
      event.preventDefault();

      var ok = window.confirm("Supprimer ce média ?");
      if (ok === false) return;

      deleteWork(work.id, fig);
    });

    fig.appendChild(img);
    fig.appendChild(cap);
    fig.appendChild(delBtn);
    container.appendChild(fig);
  }

  function deleteWork(id, figureElement) {
    var token = localStorage.getItem("token");

    fetch(API + "/works/" + id, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token
      }
    })
      .then(function (response) {
        if (response.ok === false) {
          alert("Suppression impossible.");
          return;
        }

        // retire la miniature de la modale
        figureElement.remove();

        // rafraîchit la galerie principale
        reloadMainGallery();
      })
      .catch(function (error) {
        console.error(error);
        alert("Suppression impossible.");
      });
  }


  // -------------------------
  // VUE 2 : AJOUT (FORM)
  // -------------------------
  function showUploadView() {
    if (overlay === null) return;

    overlay._title.textContent = "Ajout photo";
    overlay._addBtn.style.display = "none";
    overlay._backBtn.style.display = "";

    // Formulaire simple
    overlay._body.innerHTML =
      '<form id="uploadForm">' +
      '  <p id="uploadError" hidden></p>' +
      '  <div>' +
      '    <label>Image (jpg/png, 4 Mo max)</label><br>' +
      '    <input id="fileInput" type="file" accept="image/jpeg,image/png">' +
      '    <br><img id="previewImg" alt="" style="display:none; max-width:150px;">' +
      "  </div>" +
      '  <div>' +
      '    <label>Titre</label><br>' +
      '    <input id="titleInput" type="text">' +
      "  </div>" +
      '  <div>' +
      '    <label>Catégorie</label><br>' +
      '    <select id="catSelect">' +
      '      <option value="">Choisir...</option>' +
      "    </select>" +
      "  </div>" +
      '  <button id="submitBtn" type="submit">Valider</button>' +
      "</form>";

    // Remplir les catégories
    fillCategories();

    var form = overlay._body.querySelector("#uploadForm");
    var fileInput = overlay._body.querySelector("#fileInput");
    var titleInput = overlay._body.querySelector("#titleInput");
    var catSelect = overlay._body.querySelector("#catSelect");
    var errorBox = overlay._body.querySelector("#uploadError");
    var previewImg = overlay._body.querySelector("#previewImg");

    // preview image
    fileInput.addEventListener("change", function () {
      var file = fileInput.files[0];

      if (!file) {
        hidePreview(previewImg);
        return;
      }

      // validation simple
      if (file.size > 4 * 1024 * 1024) {
        fileInput.value = "";
        showUploadError(errorBox, "Image trop lourde (> 4 Mo).");
        hidePreview(previewImg);
        return;
      }

      if (file.type !== "image/jpeg" && file.type !== "image/png") {
        fileInput.value = "";
        showUploadError(errorBox, "Formats autorisés : JPG ou PNG.");
        hidePreview(previewImg);
        return;
      }

      clearUploadError(errorBox);
      showPreview(previewImg, file);
    });

    // submit
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearUploadError(errorBox);

      var file = fileInput.files[0];
      var title = titleInput.value.trim();
      var category = catSelect.value;

      // validation simple
      if (!file) {
        showUploadError(errorBox, "Choisis une image.");
        return;
      }
      if (title === "") {
        showUploadError(errorBox, "Le titre est obligatoire.");
        return;
      }
      if (category === "") {
        showUploadError(errorBox, "Choisis une catégorie.");
        return;
      }

      // envoi
      uploadWork(file, title, category, errorBox);
    });
  }

  function showPreview(previewImg, file) {
    if (previewURL !== null) {
      URL.revokeObjectURL(previewURL);
      previewURL = null;
    }
    previewURL = URL.createObjectURL(file);
    previewImg.src = previewURL;
    previewImg.style.display = "block";
  }

  function hidePreview(previewImg) {
    if (previewURL !== null) {
      URL.revokeObjectURL(previewURL);
      previewURL = null;
    }
    previewImg.removeAttribute("src");
    previewImg.style.display = "none";
  }

  function showUploadError(errorBox, message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearUploadError(errorBox) {
    errorBox.textContent = "";
    errorBox.hidden = true;
  }

  function fillCategories() {
    fetch(API + "/categories")
      .then(function (response) {
        if (response.ok === false) return null;
        return response.json();
      })
      .then(function (cats) {
        if (cats === null || overlay === null) return;

        var select = overlay._body.querySelector("#catSelect");
        if (select === null) return;

        for (var i = 0; i < cats.length; i++) {
          var option = document.createElement("option");
          option.value = String(cats[i].id);
          option.textContent = cats[i].name;
          select.appendChild(option);
        }
      })
      .catch(function (error) {
        console.error(error);
      });
  }

  function uploadWork(file, title, category, errorBox) {
    var token = localStorage.getItem("token");

    var formData = new FormData();
    formData.append("image", file);
    formData.append("title", title);
    formData.append("category", category);

    fetch(API + "/works", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token
      },
      body: formData
    })
      .then(function (response) {
        if (response.ok === false) {
          if (response.status === 401) {
            showUploadError(errorBox, "Non autorisé (token expiré).");
            return null;
          }
          showUploadError(errorBox, "Erreur (" + response.status + ").");
          return null;
        }
        return response.json();
      })
      .then(function (createdWork) {
        if (createdWork === null) return;

        // rafraîchit la galerie principale
        reloadMainGallery();

        // retour vue galerie dans la modale
        showGalleryView();
      })
      .catch(function (error) {
        console.error(error);
        showUploadError(errorBox, "Échec de l'envoi. Réessaie.");
      });
  }


  // -------------------------
  // RAFRAÎCHIR GALERIE PAGE
  // -------------------------
  function reloadMainGallery() {
    var mainGallery = document.getElementById("gallery");
    if (mainGallery === null) return;

    fetch(API + "/works")
      .then(function (response) {
        if (response.ok === false) return null;
        return response.json();
      })
      .then(function (data) {
        if (data === null) return;

        mainGallery.innerHTML = "";

        for (var i = 0; i < data.length; i++) {
          var work = data[i];

          var fig = document.createElement("figure");

          var img = document.createElement("img");
          img.src = work.imageUrl;
          img.alt = work.title || "";

          var cap = document.createElement("figcaption");
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