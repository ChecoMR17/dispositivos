async function checkInternetConnection() {
  try {
    const isOnline = await import("is-online");
    const connection = await isOnline.default();
    return connection;
  } catch (error) {
    throw new Error("Error al verificar la conexión a Internet");
  }
}

module.exports = { checkInternetConnection };
