module.exports = function auth(request, response, next) {
  return next(new Error("Le middleware JWT sera implémenté avec le service d'authentification"));
};
