const WebSocket = require("ws");
const speech = require("@google-cloud/speech");
require("dotenv").config();

const client = new speech.SpeechClient();
const request = {
  config: {
    encoding: "MULAW",
    sampleRateHertz: 8000,
    languageCode: "en-GB",
  },
  interimResults: true,
};

const startWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", function connection(ws) {
    console.log("New Connection Initiated");

    let recognizeStream = null;

    ws.on("message", function incoming(message) {
      const msg = JSON.parse(message);
      switch (msg.event) {
        case "connected":
          console.log(`A new call has connected.`);
          break;
        case "start":
          console.log(`Starting Media Stream ${msg.streamSid}`);
          recognizeStream = client
            .streamingRecognize(request)
            .on("error", console.error)
            .on("data", (data) => {
              console.log(data.results[0].alternatives[0].transcript);
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(
                    JSON.stringify({
                      event: "interim-transcription",
                      text: data.results[0].alternatives[0].transcript,
                    })
                  );
                }
              });
            });
          break;
        case "media":
          recognizeStream.write(msg.media.payload);
          break;
        case "stop":
          console.log(`Call Has Ended`);
          recognizeStream.destroy();
          break;
      }
    });
  });

  return wss;
};

module.exports = { startWebSocketServer };
