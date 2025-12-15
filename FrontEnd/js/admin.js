export function initAdmin() {
  // 1) On récupère le token dans le localStorage
  var token = localStorage.getItem("token");

  // 2) On récupère le lien dans le menu (login / logout)
  var authLink = document.getElementById("authLink");

  // 3) Si le lien n'existe pas, on arrête (évite une erreur)
  if (authLink === null) {
    // rien à faire
  } else {

    // 4) Si token existe => utilisateur connecté
    if (token !== null) {

      // 4a) On ajoute la classe "is-admin" au body
      document.body.classList.add("is-admin");

      // 4b) Le lien devient "logout"
      authLink.textContent = "logout";
      authLink.href = "#";

      // 4c) Quand on clique sur logout
      authLink.addEventListener("click", function (event) {
        event.preventDefault();

        // 4d) On supprime les infos de connexion
        localStorage.removeItem("token");
        localStorage.removeItem("userId");

        // 4e) On retourne à la page d'accueil
        window.location.href = "./index.html";
      });

    } else {
      // 5) Sinon => utilisateur déconnecté

      // 5a) On retire la classe "is-admin" du body
      document.body.classList.remove("is-admin");

      // 5b) Le lien devient "login"
      authLink.textContent = "login";
      authLink.href = "./login.html";
    }
  }
}
initAdmin();