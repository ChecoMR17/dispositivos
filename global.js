require("dotenv").config();

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

module.exports.dataOption = dataOption;
module.exports.tables = tables;
