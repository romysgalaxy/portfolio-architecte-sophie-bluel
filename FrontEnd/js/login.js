const API_BASE = 'http://localhost:5678/api';

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorBox = document.getElementById('loginError');

function showError(msg) {
  errorBox.textContent = msg || 'Identifiants incorrects.';
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    return showError('Veuillez saisir votre e-mail et votre mot de passe.');
  }

  try {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      // 401/404 = identifiants invalides, autres = erreur serveur
      if (res.status === 401 || res.status === 404) return showError('E-mail ou mot de passe incorrect.');
      throw new Error('Erreur serveur (' + res.status + ')');
    }

    const data = await res.json(); // { token, userId }
    // Stocke le token pour les futures requêtes protégées (POST/DELETE)
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);

    // Redirection vers l’accueil
    window.location.href = './index.html';
  } catch (err) {
    console.error(err);
    showError('Impossible de se connecter. Vérifie le serveur et réessaie.');
  }
});