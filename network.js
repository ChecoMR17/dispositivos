const os = require("os");
const totalMemoryGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
const freeMemoryGB = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
const totalDiskGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
const freeDiskGB = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
const usedDiskGB = (totalDiskGB - freeDiskGB).toFixed(2);
const numCores = os.cpus().length;
const cpuModel = os.cpus()[0].model;
const cpuSpeed = os.cpus()[0].speed;

let caracteristicasD = () => {
  return {
    ramTotal: `${totalMemoryGB} GB`,
    ramDisponible: `${freeMemoryGB} GB`,
    discoTotal: `${totalDiskGB} GB`,
    discoUsado: `${usedDiskGB} GB`,
    nucleosTotales: numCores,
    modeloCpu: cpuModel,
    velocidadCpu: `${cpuSpeed} MHz`,
  };
};
let checkInternetConnection = async () => {
  try {
    const isOnline = await import("is-online");
    const connection = await isOnline.default();
    return connection;
  } catch (error) {
    throw new Error("Error al verificar la conexión a Internet");
  }
};
module.exports = { checkInternetConnection, caracteristicasD };
