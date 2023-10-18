const WebSocket = require("ws");
const speech = require("@google-cloud/speech");
require("dotenv").config();
const sttStore = require('./stt-store');
const uiUpdater = require('./ui-updater');
const client = new speech.SpeechClient();
const request = {
  config: {
    encoding: "MULAW",
    sampleRateHertz: 8000,
    languageCode: "en-GB",
    useEnhanced: true,
    model: 'phone_call',
  },
  interimResults: true,
};
let currentCallStartTime;
function newCall() {
  currentCallStartTime = Date.now();
  uiUpdater.newCall(currentCallStartTime);
}

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
          newCall();
          break;
        case "start":
          console.log(`Starting Media Stream ${msg.streamSid}`);
          recognizeStream = client
            .streamingRecognize(request)
            .on("error", console.error)
            .on("data", (data) => { handleSttData(data); });
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

function handleSttData(msg) {
  if (containsTranscript(msg)) {
      const transcription = {
          timestamp: Date.now(),
          transcript: msg.results[0].alternatives[0].transcript,
      };
      if (msg.results[0].isFinal) {
          sttStore.addFinalTranscription(currentCallStartTime, transcription);
          uiUpdater.newFinalTranscription(currentCallStartTime, transcription);
      }
      else {
          sttStore.updateLiveTranscription(currentCallStartTime, transcription);
          uiUpdater.newInterimTranscription(currentCallStartTime, transcription);
      }
  }
}

function containsTranscript(msg) {
  return msg &&
         msg.results &&
         msg.results.length > 0 &&
         msg.results[0].alternatives &&
         msg.results[0].alternatives.length > 0;

}

module.exports = { startWebSocketServer };
// {
//   console.log(data.results[0].alternatives[0].transcript);
//   wss.clients.forEach((client) => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(
//         JSON.stringify({
//           event: "interim-transcription",
//           text: data.results[0].alternatives[0].transcript,
//         })
//       );
//     }
//   });
// }