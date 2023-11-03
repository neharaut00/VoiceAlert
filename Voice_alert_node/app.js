const express = require("express");
const app = express();
const WebSocket = require("ws");
// import * as tf from '@tensorflow/tfjs';
const PDFDocument = require('pdfkit');
const fs = require('fs');
const server = require("http").createServer(app);
const path = require("path");
const sttStore = require("./lib/stt-store")
const speechToText = require("./lib/speech-to-text");
const uiUpdater = require("./lib/ui-updater");
const { db } = require("./lib/firebase");

app.set("view engine", "ejs");

function getCalls(req, res) {
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

app.get('/callHistory', async (req, res) => {
  console.log('callHistory')
  const callRef = db.collection('calls')
  const response = await callRef.get()
  const data = []
  response.forEach(doc => {
    data.push(doc.data())
  });
  res.render("callhistory", { data });
  // console.log('callRef', callRef)
 })

app.get('/downloadPDF', (req, res) => {
  let callData;
  const timestamp = req.query.callStarted;
  
   console.log('callStarted', timestamp)
   const docRef = db.collection('calls').doc(timestamp);
   docRef.get()
  .then(docSnapshot => {
    if (docSnapshot.exists) {
      // The document exists
      callData = docSnapshot.data();
      console.log('Document data:', callData);
    } else {
      // The document does not exist
      console.log('No document found with ID', docRef.id);
    }
  })
  .catch(error => {
    // Handle the error
    console.log(error);
  });
  const callDataString = JSON.stringify(callData);
   // Create a new PDF document
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream('call_details.pdf'));

  // You can use the `callStarted` value in the PDF content
  const formatedDate = new Date(timestamp).toLocaleString();
  doc.text('Call Started: ' + formatedDate);
  
  doc.text(callDataString);

  // Extract call details from your database and format them in the PDF
  // Replace this with your actual data retrieval and formatting logic

  // End the PDF document and send it as a response
  doc.end();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=call_details.pdf');
  doc.pipe(res);

});

app.use(express.text());

app.use(express.static(__dirname + '/public'));

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

