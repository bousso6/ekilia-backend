const env = require("./env");

function getStorageProvider() {
  if (!env.STORAGE_PROVIDER) {
    throw new Error("STORAGE_PROVIDER doit être configuré avant d'utiliser le stockage");
  }

  throw new Error(
    `Le fournisseur ${env.STORAGE_PROVIDER} est sélectionné, mais son adaptateur n'est pas encore implémenté`
  );
}

module.exports = { getStorageProvider };
