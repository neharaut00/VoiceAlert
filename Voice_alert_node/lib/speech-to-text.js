const WebSocket = require("ws");
const Transform = require('stream').Transform;
const fs = require('fs');
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
  sttStore.callStartTime(currentCallStartTime);
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
        let streamSid = msg.streamSid;
        console.log(`Starting Media Stream ${msg.streamSid}`);
        recognizeStream = CallerSpeechClient
          .streamingRecognize(request)
          .on("error", (msg) => { handleSttError(msg); })
          .on("data", (data) => { handleSttData(data); });
          ws.wstream = fs.createWriteStream(__dirname + `/${currentCallStartTime}.wav`, { encoding: 'binary' });
          ws.wstream.write(Buffer.from([
            0x52,0x49,0x46,0x46,0x62,0xb8,0x00,0x00,0x57,0x41,0x56,0x45,0x66,0x6d,0x74,0x20,
            0x12,0x00,0x00,0x00,0x07,0x00,0x01,0x00,0x40,0x1f,0x00,0x00,0x80,0x3e,0x00,0x00,
            0x02,0x00,0x04,0x00,0x00,0x00,0x66,0x61,0x63,0x74,0x04,0x00,0x00,0x00,0xc5,0x5b,
            0x00,0x00,0x64,0x61,0x74,0x61,0x00,0x00,0x00,0x00, // Those last 4 bytes are the data length
          ]));       
        break;
      case "media":
        recognizeStream.write(msg.media.payload);
        ws.wstream.write(Buffer.from(msg.media.payload, 'base64'));
        break;
      case "stop":
        console.log(`Call Has Ended`);
        recognizeStream.destroy();
        currentCallEndTime = Date.now();
        // Now the only thing missing is to write the number of data bytes in the header
        ws.wstream.write("", () => {
          let fd = fs.openSync(ws.wstream.path, 'r+'); // `r+` mode is needed in order to write to arbitrary position
          let count = ws.wstream.bytesWritten;
          count -= 58; // The header itself is 58 bytes long and we only want the data byte length
          console.log(count)
          fs.writeSync(
            fd,
            Buffer.from([
              count % 256,
              (count >> 8) % 256,
              (count >> 16) % 256,
              (count >> 24) % 256,
            ]),
            0,
            4, // Write 4 bytes
            54, // starts writing at byte 54 in the file
          );
        });
        handleSttClose(msg, currentCallEndTime);
        break;
    }
  });
   
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

async function handleSttData(msg) {
  if (containsTranscript(msg)) {
    const transcription = {
        timestamp: Date.now(),
        transcript: msg.results[0].alternatives[0].transcript,
    };
    
    if (msg.results[0].isFinal) {
      const emotion = await sttStore.addFinalTranscription(currentCallStartTime, transcription);
      console.log("emotion", emotion);
      uiUpdater.newFinalTranscription(currentCallStartTime, transcription, emotion);
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

async function handleSttClose(msg, currentCallEndTime) {
  log.debug('stt close', { msg });
  sttStore.addCallEndTime(currentCallStartTime, currentCallEndTime);
  await sttStore.addToFirestore();
  uiUpdater.endCall(currentCallStartTime);
  await sttStore.getVoiceEmotion(currentCallStartTime);
}


module.exports = { init, handleIncomingWSConnection };
