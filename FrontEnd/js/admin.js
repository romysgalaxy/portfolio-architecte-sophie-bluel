(function () {
  const token = localStorage.getItem("token");

  // garde ta logique admin pour afficher les éléments réservés
  document.body.classList.toggle("is-admin", !!token);

  // lien login/logout dans le menu
  const authLink = document.getElementById("authLink");
  if (!authLink) return;

  if (!token) {
    // Déconnecté -> login
    authLink.textContent = "login";
    authLink.setAttribute("href", "./login.html");
    return;
  }

  // Connecté -> logout
  authLink.textContent = "logout";
  authLink.setAttribute("href", "#");

  authLink.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("token");
    localStorage.removeItem("userId");

    // Optionnel: si tu stockes d’autres choses liées à la session, supprime-les aussi ici

    // Retour à l'accueil (et mise à jour du menu + éléments admin)
    window.location.href = "./index.html";
  });
})();
