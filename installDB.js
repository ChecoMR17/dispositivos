const mysql = require("mysql");
const axios = require("axios");
require("dotenv").config();
const moment = require("moment");
const global = require("./global");

let checkData = async () => {
  try {
    const apiD = `${process.env.urlApi}/${process.env.numProyecto}/${process.env.clave}`;
    const response = await axios.get(apiD);
    return response.data;
  } catch (error) {
    throw new Error("Error al consultar dispositivo.", error);
  }
};

let checkParametros = async () => {
  try {
    const response = await axios.get(
      `${process.env.urlApi}/parametros/${process.env.numProyecto}/${process.env.clave}`
    );
    return response.data;
  } catch (error) {
    throw new Error("Error al consultar parámetros.", error);
  }
};

const connectionDb = mysql.createConnection(global.dataOption);
connectionDb.connect((error) => {
  if (error) {
    console.error("Error de DB");
    return;
  }
});

let sqlQuery = (query, data) => {
  return new Promise((resolve, reject) => {
    connectionDb.query(query, data, (error, result) => {
      if (error) {
        reject(201);
      } else {
        resolve(200);
      }
      connectionDb.end();
    });
  });
};

let checkDataBase = () => {
  return new Promise((resolve, reject) => {
    const sql = `${process.env.dbcheckDatabaseQuery} = 'proyectoDB${process.env.numProyecto}'`;
    connectionDb.query(sql, (error, result) => {
      if (error) {
        reject(404);
      } else {
        if (result.length > 0) {
          reject("Base de datos existente");
        } else {
          const createDbPromise = sqlQuery(
            `CREATE DATABASE proyectoDB${process.env.numProyecto}`
          );
          const tableCreationPromises = global.tables.map((element) => {
            return crearTablas(element)
              .then(() => {
                return "Tabla creada";
              })
              .catch((error) => {
                throw new Error("Error al crear la tabla", error);
              });
          });

          Promise.all([createDbPromise, ...tableCreationPromises])
            .then((results) => {
              resolve(results); // Puedes enviar un array con los resultados de todas las operaciones
            })
            .catch((error) => {
              reject(error.message); // Enviar el mensaje de error
            });
        }
      }
    });
  });
};

let crearTablas = (query) => {
  global.dataOption.database = `proyectoDB${process.env.numProyecto}`;
  return new Promise((resolve, reject) => {
    mysql.createConnection(global.dataOption).connect((error) => {
      if (error) {
        reject(404);
        return;
      } else {
        mysql
          .createConnection(global.dataOption)
          .query(query, (error, result) => {
            if (error) {
              reject(404);
            } else {
              resolve(200);
            }
            mysql.createConnection(global.dataOption).end();
          });
      }
    });
  });
};

let ingresarDispositivos = async () => {
  global.dataOption.database = `proyectoDB${process.env.numProyecto}`;

  try {
    const data = await checkData();
    const result = data.data[0];

    if (Object.keys(result).length === 0) {
      throw new Error("No se encontró un dispositivo");
    }

    if (result.vigencia === "") {
      throw new Error("No se encontró licencia");
    }

    const connection = mysql.createConnection(global.dataOption);
    connection.connect();
    const params = [
      result.id,
      result.idProyecto,
      result.clave,
      result.mqttTime,
      result.mqttHost,
      result.mqttPort,
      result.plcHost,
      result.plcPort,
      result.mysqlTime,
      result.longitud,
      result.latitud,
      moment(result.licencia).format("YYYY-MM-DD HH:mm:ss"),
    ];
    const queryS =
      "INSERT INTO dispositivos(idDB,folio, clave, mqttTime, mqttHost, mqttPort, plcHost, plcPort, mysqlTime, longitud, latitud, licencia) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    await new Promise((resolve, reject) => {
      connection.query(queryS, params, (error, result) => {
        if (error) {
          reject(new Error("Error al insertar el dispositivo"));
        } else {
          resolve(result);
        }
      });
    });

    connection.end();

    return "Dispositivo ingresado";
  } catch (error) {
    throw error;
  }
};

let insertarParametros = async () => {
  global.dataOption.database = `proyectoDB${process.env.numProyecto}`;
  const resultP = await checkParametros();
  const promises = Object.keys(resultP.data).map((key) => {
    const parametros = resultP.data[key];
    const sqlQ = `INSERT INTO parametros(idDB,dispositivo, tipo, addr, nombre, descripcion, permiso, um) VALUES (?,?,?,?,?,?,?,?)`;
    const params = [
      parametros.id,
      "1",
      parametros.tipo,
      parametros.addr,
      parametros.nombre,
      parametros.descripcion,
      parametros.permiso,
      parametros.um,
    ];
    return new Promise((resolve, reject) => {
      const connection = mysql.createConnection(global.dataOption);
      connection.connect((error) => {
        if (error) {
          reject("Error al conectar la BD");
        } else {
          connection.query(sqlQ, params, (error, result) => {
            connection.end();
            if (error) {
              reject("Error al insertar el parámetro");
            } else {
              resolve("Parámetro insertado");
            }
          });
        }
      });
    });
  });
  return Promise.all(promises);
};

let main = async () => {
  try {
    const dbCheckResult = await checkDataBase();
    console.log(dbCheckResult);

    let dispositivoResult;
    if (Array.isArray(dbCheckResult)) {
      dispositivoResult = await ingresarDispositivos();
      console.log(dispositivoResult);
    } else {
      console.error(
        "Error al verificar la base de datos. No se ingresará el dispositivo."
      );
    }

    if (dispositivoResult === "Dispositivo ingresado") {
      const parametrosResult = await insertarParametros();
      console.log(parametrosResult);
    } else {
      console.error(
        "Error al ingresar el dispositivo. No se insertarán los parámetros."
      );
    }

    console.log("Instalación finalizada");
    process.exit(1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();

//DROP DATABASE proyectoDB41
