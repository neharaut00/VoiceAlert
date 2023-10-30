const WebSocket = require("ws");
const Transform = require('stream').Transform;
const speech = require("@google-cloud/speech");
require("dotenv").config();
const sttStore = require('./stt-store');
const uiUpdater = require('./ui-updater');
const log = require('loglevel')
let CallerSpeechClient;

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
let currentCallEndTime;

function init() { 
  console.log('Speech to Text setup')
  CallerSpeechClient = new speech.SpeechClient();
}

function newCall() {
  currentCallStartTime = Date.now();
  uiUpdater.newCall(currentCallStartTime);
}


function handleIncomingWSConnection(ws, req) {
  console.log('received new ws connection from twilio');
  
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
        recognizeStream = CallerSpeechClient
          .streamingRecognize(request)
          .on("error", (msg) => { handleSttError(msg); })
          .on("data", (data) => { handleSttData(data); });
        break;
      case "media":
        recognizeStream.write(msg.media.payload);
        break;
      case "stop":
        console.log(`Call Has Ended`);
        recognizeStream.destroy();
        currentCallEndTime = Date.now();
        handleSttClose(msg, currentCallEndTime);
        break;
    }
  });
   
  
  // const mediaStreamClient = WebSocket.createWebSocketStream(ws, { encoding: "utf-8" });
  // const mediaDecoderStreamClient = new Transform({
  //   transform: (chunk, encoding, callback) => {
  //     const msg = JSON.parse(chunk.toString('utf-8'));
  //     if (msg.event !== 'media') return callback();
  //     const audio = Buffer.from(msg.media.payload, 'base64');
  //     return callback(null, audio);
  //   }
  // });

  // const recognizeStreamClient = CallerSpeechClient.streamingRecognize(request);
  
  // mediaStreamClient.pipe(mediaDecoderStreamClient).pipe(recognizeStreamClient);

  // recognizeStreamClient.on('error', (msg) => { handleSttError(msg) });
  // recognizeStreamClient.on('close', (msg) => { handleSttClose(msg) });
  // recognizeStreamClient.on('data', (msg) => { handleSttData(msg) });
}

// function newCall() {
//   currentCallStartTime = Date.now();
//     uiUpdater.newCall(currentCallStartTime);
// }

// function endCall(wss) {
//   wss.clients.forEach((client) => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(
//         JSON.stringify({
//           event: "end-call",
//           timestamp: currentCallStartTime,
//         })
//       );
//     }
//   });
// }

// const startWebSocketServer = (server) => {
//   const wss = new WebSocket.Server({ server });

  // wss.on("connection", function connection(ws) {
  //   console.log("New Connection Initiated");

  //   let recognizeStream = null;

  //   ws.on("message", function incoming(message) {
  //     const msg = JSON.parse(message);
  //     switch (msg.event) {
  //       case "connected":
  //         console.log(`A new call has connected.`);
  //         newCall(wss);
  //         break;
  //       case "start":
  //         console.log(`Starting Media Stream ${msg.streamSid}`);
  //         recognizeStream = client
  //           .streamingRecognize(request)
  //           .on("error", console.error)
  //           .on("data", (data) => { handleSttData(data, wss); });
  //         break;
  //       case "media":
  //         recognizeStream.write(msg.media.payload);
  //         break;
  //       case "stop":
  //         console.log(`Call Has Ended`);
  //         recognizeStream.destroy();
  //         endCall(wss);
  //         break;
  //     }
  //   });
  // });

//   return wss;
// };

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

function handleSttError(msg) {
  log.error('stt error', { msg });
}

function handleSttClose(msg, currentCallEndTime) {
  log.debug('stt close', { msg });
  sttStore.addCallEndTime(currentCallStartTime, currentCallEndTime);
  sttStore.addToFirestore();
  uiUpdater.endCall(currentCallStartTime);
}


module.exports = { init, handleIncomingWSConnection };
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