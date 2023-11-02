const global = require("./global");
const mysql = require("mysql2");
require("dotenv").config();

global.dataOption.database = `proyectoDB${process.env.numProyecto}`;

const connectionSql = mysql.createConnection(global.dataOption);

connectionSql.connect((error) => {
  if (error) {
    console.error("Error al conectarse a la base de datos");
    process.exit(1);
  } else {
    console.log("Conexión exitosa a la base de datos");
  }
});

const sql = async (sqlQuery, data) => {
  try {
    const result = await new Promise((resolve, reject) => {
      connectionSql.query(sqlQuery, data, (error, result) => {
        if (error) {
          reject({ Status: 404, message: "Error al consultar", data: error });
        } else {
          resolve({ Status: 200, message: "success", data: result });
        }
      });
    });
    return result;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};

module.exports = { sql };
