const { checkInternetConnection } = require("./network");
const modbus = require("jsmodbus");
const moment = require("moment");
const { sql } = require("./db");
const mqtt = require("mqtt");
const cron = require("cron");
const net = require("net");

let date = new Date();
let sendData = {};
var topicBase, mqttUrl, clientMQTT;
const clientId = `equipoAsb:${Math.floor(Math.random() * (10000 - 1 + 1) + 1)}`;
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

let plc = (data) => {
  const optionsPlc = {
    host: data.plcHost,
    port: data.plcPort,
  };
  //console.log(data);

  topicBase = `asb/proyecto${data.folio}/${data.clave}`;
  mqttUrl = `ws://${data.mqttHost}:${data.mqttPort}/mqtt`;
  clientMQTT = mqtt.connect(mqttUrl, opcionesMqtt);
  const socket = new net.Socket();
  const clientPLC = new modbus.client.TCP(socket);
  socket.connect(optionsPlc);
  socket.on("connect", (err) => console.log("Conectado al PLC"));

  socket.on("error", (err) => {
    console.error("Error en el socket:", err);
    //process.exit(0);
  });
  //console.log(topicBase);
  clientMQTT.on("connect", () => {
    suscribirseATopico(clientMQTT, `${topicBase}/#`, async () => {
      var sqlP = "SELECT * FROM parametros WHERE permiso<>'N'";
      try {
        const resultP = await sql(sqlP, []);
        let listaParametros = resultP.data;
        //console.log(listaParametros);
        let status = socket.resume()._readableState.destroyed;
        status ? socket.connect(optionsPlc) : "";
        if (listaParametros.length > 0) {
          setTimeout(() => {
            Object.keys(listaParametros).forEach((key) => {
              const fecha = `${date.getFullYear()}/${
                date.getMonth() + 1
              }/${date.getDate()}`;
              const hora = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
              const paramet = listaParametros[key];
              if (paramet.tipo == "BIT") {
                sendData = {
                  fecha: fecha,
                  hora: hora,
                  Valor: "BIT",
                };
                publicarMensaje(
                  clientMQTT,
                  `${topicBase}/${paramet.nombre}`,
                  JSON.stringify(sendData),
                  () => {
                    console.log("datos enviados");
                  }
                );
              } else if (paramet.tipo == "FLOAT") {
                sendData = {
                  fecha: fecha,
                  hora: hora,
                  Valor: "FLOAT",
                };
                publicarMensaje(
                  clientMQTT,
                  `${topicBase}/${paramet.nombre}`,
                  JSON.stringify(sendData),
                  () => {
                    console.log("datos enviados");
                  }
                );
              } else {
                sendData = {
                  fecha: fecha,
                  hora: hora,
                  Valor: "INT",
                };
                publicarMensaje(
                  clientMQTT,
                  `${topicBase}/${paramet.nombre}`,
                  JSON.stringify(sendData),
                  () => {
                    console.log("datos enviados");
                  }
                );
              }
            });
          }, data.mqttTime);
        } else {
          console.log("No se encontraron parámetro");
          process.exit(0);
        }
      } catch (err) {
        console.log("Error al consultar los parámetro");
        process.exit(0);
      }
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

async function main() {
  try {
    const isOnline = await checkInternetConnection();

    if (isOnline) {
      console.log("Conexión a Internet establecida.");
      const query = `${process.env.dbcheckDatabaseQuery} = 'proyectoDB${process.env.numProyecto}'`;
      const result = await sql(query, []);
      if (result.data.length > 0) {
        const sqlP = `select * from dispositivos where clave='${process.env.clave}'`;
        const resultP = await sql(sqlP, []);
        var resultDatos = resultP.data[0];
        if (resultDatos.licencia != "" && date <= resultDatos.licencia) {
          plc(resultDatos);
        } else {
          throw new Error("Licencia invalida");
        }
      } else {
        console.log("Base de datos no encontrada");
        process.exit(0);
      }
    } else {
      console.log("No hay conexión a Internet.");
    }
  } catch (error) {
    console.error(error.message);
  }
}
main();
