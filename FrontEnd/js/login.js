export function initLogin() {
  // 1) URL de base de l'API
  let API = window.API_BASE;

  // 2) On récupère les éléments du formulaire dans le HTML
  let form = document.getElementById("loginForm");
  let emailInput = document.getElementById("email");
  let passwordInput = document.getElementById("password");
  let errorBox = document.getElementById("loginError");

  // 3) Fonction pour afficher un message d'erreur sous le formulaire
  function showError(message) {
    // Si message est vide, on met un message par défaut
    if (message === undefined || message === null || message === "") {
      message = "Identifiants incorrects.";
    }

    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  // 4) Fonction pour cacher le message d'erreur
  function clearError() {
    errorBox.textContent = "";
    errorBox.hidden = true;
  }

  // 5) On écoute l'envoi du formulaire
  if (form !== null) {
    form.addEventListener("submit", function (event) {
      event.preventDefault(); // empêche le rechargement de la page
      clearError(); // enlève l'erreur précédente

      // 6) On récupère les valeurs saisies
      let email = emailInput.value.trim();
      let password = passwordInput.value;

      // 7) Vérification : les champs doivent être remplis
      if (email === "" || password === "") {
        showError("Veuillez saisir votre e-mail et votre mot de passe.");
        return;
      }

      // 8) On prépare les données à envoyer à l'API
      let bodyData = JSON.stringify({
        email: email,
        password: password
      });

      // 9) On envoie la requête POST au serveur pour se connecter
      fetch(API + "/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: bodyData
      })
        .then(function (response) {
          // 10) Si le serveur répond avec une erreur (pas 2xx)
          if (response.ok === false) {
            // 401 ou 404 = identifiants faux
            if (response.status === 401 || response.status === 404) {
              showError("E-mail ou mot de passe incorrect.");
              return null; // on arrête la suite
            }

            // Autres erreurs
            showError("Erreur serveur (" + response.status + ").");
            return null;
          }

          // 11) Si tout va bien, on convertit en JSON
          return response.json();
        })
        .then(function (data) {
          // 12) Si data est null, c'est qu'on a déjà géré l'erreur
          if (data === null) {
            return;
          }

          // 13) On enregistre le token et l'id utilisateur
          localStorage.setItem("token", data.token);
          localStorage.setItem("userId", data.userId);

          // 14) On redirige vers l'accueil
          window.location.href = "./index.html";
        })
        .catch(function (error) {
          // 15) Erreur réseau (serveur éteint, problème internet, etc.)
          console.error(error);
          showError("Impossible de se connecter. Vérifie le serveur et réessaie.");
        });
    });
  }
}