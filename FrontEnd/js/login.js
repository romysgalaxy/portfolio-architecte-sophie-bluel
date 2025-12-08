// URL de base de l'API (ex : http://localhost:5678/api)
const API = window.API_BASE;

// Récupération des éléments du formulaire de login dans le DOM
const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorBox = document.getElementById('loginError');

// Affiche un message d'erreur sous le formulaire
function showError(msg) {
  // Si aucun message spécifique n'est fourni, on met un message générique
  errorBox.textContent = msg || 'Identifiants incorrects.';
  errorBox.hidden = false; // rend le <p id="loginError"> visible
}

// Cache la zone d'erreur et vide son contenu
function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
}

// Écoute la soumission du formulaire de connexion
form?.addEventListener('submit', async (e) => {
  e.preventDefault(); // empêche le rechargement de la page
  clearError();       // on nettoie les erreurs précédentes

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Vérification basique : champs obligatoires
  if (!email || !password) {
    return showError('Veuillez saisir votre e-mail et votre mot de passe.');
  }

  try {
    // Envoi de la requête de login à l'API
    const res = await fetch(`${API}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password }) // on envoie les identifiants en JSON
    });

    // Si la réponse n'est pas "ok" (status 2xx)
    if (!res.ok) {
      // 401 / 404 : identifiants invalides -> message pour l'utilisateur
      if (res.status === 401 || res.status === 404) {
        return showError('E-mail ou mot de passe incorrect.');
      }
      // Autres codes d'erreur : problème serveur
      throw new Error('Erreur serveur (' + res.status + ')');
    }

    // Si tout va bien, on récupère le token et l'id utilisateur
    const data = await res.json(); // { token, userId }

    // On stocke le token en localStorage pour les futures requêtes protégées (POST/DELETE)
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);

    // Redirection vers la page d'accueil après connexion réussie
    window.location.href = './index.html';
  } catch (err) {
    // Erreur réseau, serveur down, etc.
    console.error(err);
    showError('Impossible de se connecter. Vérifie le serveur et réessaie.');
  }
});