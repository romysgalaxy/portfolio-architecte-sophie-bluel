export function initGallery() {
  // 1) URL de base de l'API
  let API = window.API_BASE;

  // 2) Éléments HTML
  let galleryEl = document.getElementById("gallery");
  let menuEl = document.getElementById("categoryMenu");

  // 3) Données en mémoire
  let works = [];        // tous les projets
  let categories = [];   // catégories trouvées
  let currentCategoryId = 0; // 0 = Tous


  // =======================
  // AFFICHER LA GALERIE
  // =======================
  function showGallery() {
    // On vide la galerie
    galleryEl.innerHTML = "";

    // On parcourt tous les works
    for (let i = 0; i < works.length; i++) {
      let work = works[i];

      // On récupère l'id de catégorie du work
      let workCategoryId = 0;

      // Certains works ont work.category.id
      if (work.category && work.category.id) {
        workCategoryId = work.category.id;
      }

      // D'autres works ont work.categoryId
      if (work.categoryId) {
        workCategoryId = work.categoryId;
      }

      // Si on n'est pas sur "Tous" et que la catégorie ne correspond pas => on ignore ce work
      if (currentCategoryId !== 0 && workCategoryId !== currentCategoryId) {
        continue;
      }

      // Création du HTML : figure -> img + figcaption
      let figure = document.createElement("figure");

      let img = document.createElement("img");
      img.src = work.imageUrl;
      img.alt = work.title;

      let caption = document.createElement("figcaption");
      caption.textContent = work.title;

      figure.appendChild(img);
      figure.appendChild(caption);

      galleryEl.appendChild(figure);
    }
  }


  // =======================
  // AFFICHER LE MENU
  // =======================
  function showMenu() {
    // On vide le menu
    menuEl.innerHTML = "";

    // Bouton "Tous"
    let allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "filter-btn";
    allButton.textContent = "Tous";
    allButton.setAttribute("data-cat", "0");
    menuEl.appendChild(allButton);

    // Boutons des catégories
    for (let i = 0; i < categories.length; i++) {
      let cat = categories[i];

      let btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-btn";
      btn.textContent = cat.name;
      btn.setAttribute("data-cat", String(cat.id));

      menuEl.appendChild(btn);
    }

    // Met à jour le bouton actif
    updateActiveButton();
  }


  // =======================
  // BOUTON ACTIF (CSS)
  // =======================
  function updateActiveButton() {
    let buttons = menuEl.querySelectorAll(".filter-btn");

    for (let i = 0; i < buttons.length; i++) {
      let b = buttons[i];
      let id = Number(b.getAttribute("data-cat"));

      if (id === currentCategoryId) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    }
  }


  // =======================
  // CRÉER LA LISTE DES CATÉGORIES
  // =======================
  function buildCategoriesFromWorks() {
    categories = [];

    for (let i = 0; i < works.length; i++) {
      let work = works[i];

      let id = 0;
      let name = "";

      if (work.category && work.category.id && work.category.name) {
        id = work.category.id;
        name = work.category.name;
      } else if (work.categoryId) {
        // si on n'a pas le nom, on ne peut pas créer une catégorie propre
        // (donc on ignore)
        continue;
      } else {
        continue;
      }

      // Vérifie si la catégorie existe déjà dans categories
      let exists = false;
      for (let j = 0; j < categories.length; j++) {
        if (categories[j].id === id) {
          exists = true;
        }
      }

      // Si elle n'existe pas, on l'ajoute
      if (exists === false) {
        categories.push({ id: id, name: name });
      }
    }
  }

  // =======================
  // RELOAD DE LA GALERIE
  // =======================
  function reloadGallery() {
    return fetch(API + "/works")
      .then(function (response) {
        if (response.ok === false) {
          showUserError("Impossible de recharger la galerie (erreur " + response.status + ").");
          return null;
        }
        return response.json();
      })
      .then(function (data) {
        if (data === null) return;

        works = data;

        // Rebuild catégories
        buildCategoriesFromWorks();

        // Si la catégorie courante n'existe plus, on revient à "Tous"
        if (currentCategoryId !== 0) {
          let stillExists = false;
          for (let i = 0; i < categories.length; i++) {
            if (categories[i].id === currentCategoryId) stillExists = true;
          }
          if (stillExists === false) currentCategoryId = 0;
        }

        showMenu();
        showGallery();
      })
      .catch(function (error) {
        console.error(error);
        showUserError("Impossible de recharger la galerie.");
      });
  }

  // rend la fonction accessible depuis modal.js
  window.reloadGallery = reloadGallery;


  // =======================
  // AFFICHER UNE ERREUR UTILISATEUR
  // =======================
  function showUserError(message) {
    menuEl.textContent = message;
    galleryEl.textContent = message;
  }


  // =======================
  // INIT : CHARGER LES WORKS
  // =======================
  function init() {
    // Appel API : GET /works
    fetch(API + "/works")
      .then(function (response) {
        if (response.ok === false) {
          showUserError("Impossible de charger la galerie (erreur " + response.status + ").");
          return null;
        }
        return response.json();
      })
      .then(function (data) {
        if (data === null) {
          return;
        }

        works = data;

        // Crée les catégories depuis les works
        buildCategoriesFromWorks();

        // Affiche menu + galerie
        showMenu();
        showGallery();
      })
      .catch(function (error) {
        console.error(error);
        showUserError("Impossible de charger la galerie.");
      });

    // Gestion du clic sur les boutons du menu (délégation)
    menuEl.addEventListener("click", function (event) {
      let target = event.target;

      // On vérifie que c'est un bouton
      if (target.tagName !== "BUTTON") {
        return;
      }

      // Récupère la catégorie du bouton
      let id = Number(target.getAttribute("data-cat"));
      if (isNaN(id)) {
        return;
      }

      // Met à jour la catégorie sélectionnée
      currentCategoryId = id;

      // Met à jour le bouton actif + galerie
      updateActiveButton();
      showGallery();
    });
  }


  // Lance init quand la page est chargée
  document.addEventListener("DOMContentLoaded", init);

}