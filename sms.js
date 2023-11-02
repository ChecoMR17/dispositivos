const twilio = require("twilio");

const accountSid = "AC2ab70461ab9e355a9566b3e0ff14fd9f";
const authToken = "e675485cf59f6e184b9624a4ece5228d";

const client = new twilio(accountSid, authToken);

const destino = "++527341089680"; // Número de teléfono de destino (incluyendo código de país)
const mensaje = "Hola, este es un mensaje de prueba de alertas del PLC!";

client.messages
  .create({
    body: mensaje,
    from: "+15713647466", // Reemplazar con tu número de Twilio
    to: destino,
  })
  .then((message) => console.log(`Mensaje enviado con SID: ${message.sid}`))
  .catch((error) =>
    console.error(`Error al enviar el mensaje: ${error.message}`)
  );
