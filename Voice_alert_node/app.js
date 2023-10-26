const express = require("express");
const app = express();
const WebSocket = require("ws");
const server = require("http").createServer(app);
const path = require("path");
const sttStore = require("./lib/stt-store")
const speechToText = require("./lib/speech-to-text");
const uiUpdater = require("./lib/ui-updater")


function getCalls(req, res) {
  console.log('getCalls')
  res.json({
      calls: sttStore.getCallTimestamps().map(timestamp => { return { timestamp }; })
  });
}

function getCallTranscript(req, res) {
  console.log('getCallTranscript')
  res.json(sttStore.getTranscript(req.params.timestamp));
}

speechToText.init();

require('express-ws')(app, server, {perMessageDeflate: false,})

app.ws("/ws/caller", speechToText.handleIncomingWSConnection);

app.ws("/ws/updates", uiUpdater.handleIncomingWSConnection);

app.use(express.json());

app.get('/api/calls', getCalls);

app.get('/api/calls/:timestamp/transcript', getCallTranscript);

app.use(express.text());

app.use(express.static("public"));
// app.get("/", (req, res) => res.sendFile(path.join(__dirname, "/index.html")));

app.post("/", (req, res) => {
  res.set("Content-Type", "text/xml");
  console.log('post')
  res.send(`
    <Response>
      <Start>
        <Stream url="wss://${req.headers.host}/ws/caller" />
      </Start>
      <Say>I will stream the next 60 seconds of audio through your websocket</Say>
      <Pause length="60" />
    </Response>
  `);
});


console.log("Listening on Port 8080");
server.listen(8080);

