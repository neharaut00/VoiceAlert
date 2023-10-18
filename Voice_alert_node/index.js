const express = require("express");
const app = express();
const server = require("http").createServer(app);
const path = require("path");
const { startWebSocketServer } = require("./lib/speech-to-text");
startWebSocketServer(server);

app.use(express.static("public"));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "/index.html")));

app.post("/", (req, res) => {
  res.set("Content-Type", "text/xml");

  res.send(`
    <Response>
      <Start>
        <Stream url="wss://${req.headers.host}/"/>
      </Start>
      <Say>I will stream the next 60 seconds of audio through your websocket</Say>
      <Pause length="60" />
    </Response>
  `);
});

console.log("Listening on Port 8080");
server.listen(8080);

