const { checkInternetConnection } = require("./network");
const modbus = require("jsmodbus");
const moment = require("moment");
const { sql } = require("./db");
const mqtt = require("mqtt");
const cron = require("cron");
const net = require("net");

let date = new Date();
let sendData = {};
var topicBase, mqttUrl, clientMQTT, count;
const clientId = `equipoAsb:${Math.floor(Math.random() * (10000 - 1 + 1) + 1)}`;
var sqlP = "SELECT * FROM `parametros` WHERE permiso<>'N' ORDER BY tipo ASC; ";
const opcionesMqtt = {
  clientId: clientId,
  clean: true,
  keepalive: 5000,
  protocolVersion: 5,
  connectTimeout: 1000,
  reconnectPeriod: 5000,
};
const updateDate = new cron.CronJob("0 */5 * * *", function () {
  date = new Date();
});
updateDate.start();

let consultaPlc = (data, clientPLC) => {
  topicBase = `asb/proyecto${data.folio}/${data.clave}`;
  mqttUrl = `ws://${data.mqttHost}:${data.mqttPort}/mqtt`;
  clientMQTT = mqtt.connect(mqttUrl, opcionesMqtt);

  // Insert a la base de datos.

  setInterval(async () => {
    try {
      const resultP = await plc(sqlP, clientPLC, "S");
      //console.log(resultP);
    } catch (err) {
      console.error("Error al consultar los parámetros:", err);
    }
  }, data.mysqlTime);

  clientMQTT.on("connect", () => {
    suscribirseATopico(clientMQTT, `${topicBase}/#`, async () => {
      setInterval(async () => {
        try {
          const resultP = await plc(sqlP, clientPLC, "N");
          console.log(resultP);
          publicarMensaje(
            clientMQTT,
            `${topicBase}/${data.nombre}`,
            JSON.stringify(resultP),
            () => {
              console.log("datos enviados");
            }
          );
        } catch (err) {
          console.error("Error al consultar los parámetros:", err);
        }
      }, data.mqttTime);
    });
  });

  clientMQTT.on("message", async (topic, message) => {
    message = JSON.parse(message);
    console.log(topic);
    if (topic.includes(`${topicBase}/sql/dispositivos/update`)) {
      try {
        const params = [
          message.clave,
          message.mqttTime,
          message.mqttHost,
          message.mqttPort,
          message.plcHost,
          message.plcPort,
          message.mysqlTime,
          message.longitud,
          message.latitud,
          moment(message.licencia).format("YYYY-MM-DD HH:mm:ss"),
          message.id,
        ];
        const sqlP =
          "UPDATE dispositivos SET clave=?,mqttTime=?,mqttHost=?,mqttPort=?,plcHost=?,plcPort=?,mysqlTime=?,longitud=?,latitud=?,licencia=? WHERE idDB=?";
        const result = await sql(sqlP, params);
        console.log(result);
        process.exit(0);
      } catch (error) {
        console.log("Error al consultar", error);
        process.exit(0);
      }
    } else if (topic.includes(`${topicBase}/sql/parametros/update`)) {
      try {
        const params = [
          message.tipo,
          message.addr,
          message.nombre,
          message.descripcion,
          message.permiso,
          message.um,
          message.id,
        ];
        const sqlP =
          "UPDATE parametros SET tipo=?,addr=?,nombre=?,descripcion=?,permiso=?,um=? WHERE idDB=?";
        const result = await sql(sqlP, params);
        console.log(result);
        process.exit(0);
      } catch (error) {
        console.log("Error al consultar", error);
        process.exit(0);
      }
    } else if (topic.includes(`${topicBase}/sql/query/data`)) {
      try {
        console.log(message);
        const result = await sql(message, []);
        console.log(result);
        publicarMensaje(
          clientMQTT,
          `${topicBase}/sql/query/result`,
          JSON.stringify(result),
          () => {
            console.log("datos enviados");
          }
        );
      } catch (error) {
        console.log("Error al consultar", error);
        process.exit(0);
      }
    } else if (topic.includes(`${topicBase}/sql/query/on_off`)) {
      accion = message.accion == "on" ? true : false;

      clientPLC
        .writeSingleCoil(message.Addr, accion)
        .then((result) => {
          const params = {
            message: "success",
            addr: message.Addr,
            status: accion,
          };
          publicarMensaje(
            clientMQTT,
            `${topicBase}/sql/query/on_off/result`,
            JSON.stringify(params),
            () => {
              console.log("datos enviados");
            }
          );
        })
        .catch(() => {
          const params = {
            message: "error",
            addr: message.Addr,
            status: accion,
          };
          publicarMensaje(
            clientMQTT,
            `${topicBase}/sql/query/on_off/result`,
            JSON.stringify(params),
            () => {
              console.log("datos enviados");
            }
          );
          console.error(arguments);
        });
    }
  });

  clientMQTT.on("disconnect", () => {
    console.log("Desconectado");
  });
  clientMQTT.on("reconnect", () => {
    console.log("Reconectando");
  });
  clientMQTT.on("error", () => {
    console.log("Error al conectar");
  });
  clientMQTT.on("offline", () => {
    console.log("Revisa tu conexión a internet");
  });
};
let plc = async (sqlP, clientPLC, save) => {
  try {
    const resultP = await sql(sqlP, []);
    const listaParametros = resultP.data;
    const datosObtenidos = await obtenerDatos(clientPLC, listaParametros, save);
    console.log(datosObtenidos);
  } catch (err) {
    console.error("Error al consultar los parámetros:", err);
  }
};
let suscribirseATopico = (clientMQTT, topic, callback) => {
  clientMQTT.subscribe(topic, (error) => {
    if (!error) {
      //console.log("conectado a: ", topic);
      if (typeof callback === "function") {
        callback();
      }
    } else {
      console.log(`Error al suscribirse a ${topic}`, error);
    }
  });
};

let publicarMensaje = (clientMQTT, topic, data, callback) => {
  clientMQTT.publish(topic, data, (error) => {
    if (!error) {
      //console.log(`data publicado en ${topic}: ${data}`);
      if (typeof callback === "function") {
        callback();
      }
    } else {
      console.log(`Error al publicar mensaje en ${topic}`, error);
    }
  });
};

let obtenerDatos = async (clientPLC, listaParametros, save) => {
  const fecha = `${date.getFullYear()}/${
    date.getMonth() + 1
  }/${date.getDate()}`;
  const hora = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  const sendArray = [];

  try {
    if (listaParametros.length > 0) {
      for (const paramet of listaParametros) {
        let valor;
        if (paramet.tipo === "BIT") {
          valor = await leerRegistroBit(clientPLC, paramet.addr, 1);
          //Validar si es aviso de falla
          if (paramet.descripcion.includes("AVISOS FALLAS")) {
            paramet.tipo = paramet.descripcion;
          }
        } else if (paramet.tipo === "FLOAT") {
          valor = await leerRegistroFloat(clientPLC, paramet.addr, 2);
        } else {
          valor = await leerRegistroInt(clientPLC, paramet.Addr, 1);
        }

        const sendData = {
          idparametro: paramet.id,
          fecha: fecha,
          hora: hora,
          addr: paramet.addr,
          tipo: paramet.tipo,
          valor: valor,
          guardar: save,
        };
        if (save == "S") {
          try {
            const saveSql =
              "INSERT INTO historial(parametro, valor, fecha, tipo) VALUES (?,?,?,?)";
            const resultP = await sql(saveSql, [
              paramet.id,
              valor,
              fecha,
              paramet.tipo,
            ]);
          } catch (error) {
            console.log(error);
          }
        }

        sendArray.push(sendData);
      }
    } else {
      console.log("No se encontraron parámetros");
    }

    return sendArray;
  } catch (err) {
    console.error("Error al obtener datos:", err);
    return sendArray;
  }
};

let leerRegistroBit = (clientPLC, addr, cantidad) => {
  return new Promise((resolve, reject) => {
    clientPLC
      .readCoils(addr, cantidad)
      .then((resultPLC) => {
        let valorBit = resultPLC.response._body._valuesAsArray[0];
        resolve(valorBit);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

let leerRegistroFloat = (clientPLC, addr, cantidad) => {
  return new Promise((resolve, reject) => {
    clientPLC
      .readHoldingRegisters(addr, cantidad)
      .then((resultPLC) => {
        let floatArray = resultPLC.response._body._valuesAsArray;

        let buffer = Buffer.allocUnsafe(4);
        buffer.writeUInt16BE(floatArray[0], 2);
        buffer.writeUInt16BE(floatArray[1], 0);
        let valorFloat = buffer.readFloatBE(0).toFixed(2);

        resolve(valorFloat);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

let leerRegistroInt = (clientPLC, addr, cantidad) => {
  return new Promise((resolve, reject) => {
    clientPLC
      .readHoldingRegisters(addr, cantidad)
      .then((resultPLC) => {
        let valorInt = resultPLC.response._body._valuesAsArray[0];
        resolve(valorInt);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

async function main() {
  const query = `${process.env.dbcheckDatabaseQuery} = 'proyectoDB${process.env.numProyecto}'`;

  try {
    const result = await sql(query, []);
    if (result.data.length > 0) {
      const sqlD = `select * from dispositivos where clave='${process.env.clave}'`;
      const resultP = await sql(sqlD, []);
      var resultDatos = resultP.data[0];

      if (resultDatos.licencia != "" && date <= resultDatos.licencia) {
        const optionsPlc = {
          host: resultDatos.plcHost,
          port: resultDatos.plcPort,
        };
        const socket = new net.Socket();
        const clientPLC = new modbus.client.TCP(socket);
        socket.connect(optionsPlc);
        socket.on("connect", (err) => console.log("Conectado al PLC"));
        socket.on("error", (err) => {
          console.error("Error en el socket:", err);
          process.exit(0);
        });

        let status = socket.resume()._readableState.destroyed;
        status ? socket.connect(optionsPlc) : "";

        const isOnline = await checkInternetConnection();
        if (isOnline) {
          consultaPlc(resultDatos, clientPLC);
          console.log("Conexión a Internet establecida.");
        } else {
          console.log("No hay conexión a Internet.");
          setInterval(async () => {
            let status = socket.resume()._readableState.destroyed;
            status ? socket.connect(optionsPlc) : "";
            try {
              const resultP = await plc(sqlP, clientPLC, "S");
            } catch (err) {
              console.error("Error al consultar los parámetros:", err);
            }
          }, resultDatos.mysqlTime);
        }
      } else {
        throw new Error("Licencia invalida");
      }
    } else {
      console.log("Base de datos no encontrada");
      process.exit(0);
    }
  } catch (error) {
    console.error(error.message);
  }
}
main();
