module.exports = function projectAccess(request, response, next) {
  return next(new Error("Le contrôle d'accès projet sera implémenté avec les modèles Project et User"));
};
