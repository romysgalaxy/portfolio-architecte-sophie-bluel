export function initAdmin() {
  // 1) On récupère le token dans le localStorage
  let token = localStorage.getItem("token");

  // 2) On récupère le lien dans le menu (login / logout)
  let authLink = document.getElementById("authLink");

  // 3) Si authLink existe
  if (token !== null) {
    // Utilisateur connecté
    // On ajoute la classe "is-admin" au body
    document.body.classList.add("is-admin");
    // Le lien devient "logout"
    authLink.textContent = "logout";
    authLink.href = "#";
    // Quand on clique sur logout
    authLink.addEventListener("click", function (event) {
      event.preventDefault();
      // On supprime les infos de connexion
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      // On retourne à la page d'accueil
      window.location.href = "./index.html";
    });

  } else {
    // Utilisateur déconnecté
    //On retire la classe "is-admin" du body
    document.body.classList.remove("is-admin");
    // Le lien devient "login"
    authLink.textContent = "login";
    authLink.href = "./login.html";
  }

}