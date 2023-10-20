const WebSocket = require("ws");
const speech = require("@google-cloud/speech");
require("dotenv").config();
const sttStore = require('./stt-store');
// const { endCall } = require("../../Voice_alert_node2/lib/ui-updater");
// const uiUpdater = require('./setup');
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

function newCall(wss) {
  currentCallStartTime = Date.now();
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          event: "new-call",
          timestamp: currentCallStartTime,
        })
      );
    }
  });
}

function endCall(wss) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          event: "end-call",
          timestamp: currentCallStartTime,
        })
      );
    }
  });
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
          newCall(wss);
          break;
        case "start":
          console.log(`Starting Media Stream ${msg.streamSid}`);
          recognizeStream = client
            .streamingRecognize(request)
            .on("error", console.error)
            .on("data", (data) => { handleSttData(data, wss); });
          break;
        case "media":
          recognizeStream.write(msg.media.payload);
          break;
        case "stop":
          console.log(`Call Has Ended`);
          recognizeStream.destroy();
          endCall(wss);
          break;
      }
    });
  });

  return wss;
};

function handleSttData(msg, wss) {
  if (containsTranscript(msg)) {
      const transcription = {
          timestamp: Date.now(),
          transcript: msg.results[0].alternatives[0].transcript,
      };
      if (msg.results[0].isFinal) {
        sttStore.addFinalTranscription(currentCallStartTime, transcription);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                event: "final-transcription",
                text: msg.results[0].alternatives[0].transcript,
              })
            );
          }
        });
          // uiUpdater.newFinalTranscription(currentCallStartTime, transcription);
      }
      else {
        sttStore.updateLiveTranscription(currentCallStartTime, transcription);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                event: "interim-transcription",
                text: msg.results[0].alternatives[0].transcript,
              })
            );
          }
        });
          // uiUpdater.newInterimTranscription(currentCallStartTime, transcription);
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