(function () {
   // On récupère le token de connexion stocké dans le localStorage
  const token = localStorage.getItem('token');
  // "is-admin" sert ensuite dans le CSS ou le JS pour afficher / masquer les éléments réservés à l'administrateur
  document.body.classList.toggle('is-admin', !!token);
})();
