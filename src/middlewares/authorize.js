module.exports = function authorize() {
  return function authorizeRequest(request, response, next) {
    return next(new Error("Le contrôle des rôles sera implémenté avec le service d'authentification"));
  };
};
