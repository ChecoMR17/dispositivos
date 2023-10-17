require("dotenv").config();
const os = require("os");
const totalMemoryGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
const freeMemoryGB = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
const totalDiskGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
const freeDiskGB = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
const usedDiskGB = (totalDiskGB - freeDiskGB).toFixed(2);
const numCores = os.cpus().length;
const cpuModel = os.cpus()[0].model;
const cpuSpeed = os.cpus()[0].speed;

let dataOption = {
  host: process.env.dbHostName,
  user: process.env.dbUser,
  password: process.env.dbPassword,
  port: process.env.dbPort,
};

let tables = [
  process.env.tRegistros,
  process.env.tDispositivos,
  process.env.tParametros,
  process.env.tHistorial,
  process.env.fkeyP,
  process.env.fkeyH,
  process.env.triggerId,
  process.env.triggerAd,
  process.env.triggerIp,
  process.env.triggerAr,
  process.env.triggerIh,
  process.env.triggerAh,
];

const caracteristicasD = {
  ramTotal: `${totalMemoryGB} GB`,
  ramDisponible: `${freeMemoryGB} GB`,
  discoTotal: `${totalDiskGB} GB`,
  discoUsado: `${usedDiskGB} GB`,
  nucleosTotales: numCores,
  modeloCpu: cpuModel,
  velocidadCpu: `${cpuSpeed} MHz`,
};
module.exports.dataOption = dataOption;
module.exports.tables = tables;
module.exports.caracteristicasD = caracteristicasD;
