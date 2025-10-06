(function () {
  const token = localStorage.getItem('token');
  document.body.classList.toggle('is-admin', !!token);
})();
