const express = require("express");
const app = express();
const WebSocket = require("ws");
// import * as tf from '@tensorflow/tfjs';
const PDFDocument = require('pdfkit');

const fs = require('fs');
const moment = require('moment');
const server = require("http").createServer(app);
const path = require("path");
const sttStore = require("./lib/stt-store")
const speechToText = require("./lib/speech-to-text");
const uiUpdater = require("./lib/ui-updater");
const { db } = require("./lib/firebase");
const analytics = require('./lib/analytics');

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
  const response = await callRef.orderBy('call_started', 'desc').get();
  const data = []
  response.forEach(doc => {
    data.push(doc.data())
  });
  res.render("callhistory", { data });
  // console.log('callRef', callRef)
 })

 app.get('/analytics', async (req, res) => {
  try {
    const callRef = db.collection('calls');
    const response = await callRef.get();
    const data = [];

    response.forEach((doc) => {
      data.push(doc.data());
    });

    // Provide your custom labels here
    const customLabels = ['angry', 'sad', 'neutral', 'happy', 'ps', 'fear'];

    // Process voice emotions with custom labels
    const emotionsData = analytics.processVoiceEmotions(data.map(item => item.voice_emotion?.emotion), customLabels);

    const heatmapdata = analytics.aggregateCallsByHour(data, customLabels);

    // Extract transcripts of the last emotion history
    const emotionTranscripts = data.map(item => analytics.extractLastEmotionHistoryTranscript(item.emotion_history)).join(' ');
    console.log(emotionTranscripts)
    // Generate word cloud using D3.js
    const wordcloudData = generateWordCloudData(emotionTranscripts);
    console.log(wordcloudData)
    res.render('analytics', { emotionsData, heatmapdata, wordcloudData });
  }
  
  catch (error) {
    console.error('Error retrieving analytics data:', error);
    res.status(500).send('Internal Server Error');
  }
 });

 // Function to generate word cloud data for D3.js
function generateWordCloudData(text) {
  const words = text.split(' ');

  // Count word frequencies
  const wordCounts = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  // Convert word frequencies to an array of objects
  const wordcloudData = Object.keys(wordCounts).map(word => ({ text: word, size: wordCounts[word] }));

  return wordcloudData;
}


 app.get('/downloadPDF', async (req, res) => {
  const timestamp = req.query.callStarted;

  try {
    const docSnapshot = await db.collection('calls').doc(timestamp).get();

    if (docSnapshot.exists) {
      const callData = docSnapshot.data();
      const callDataString = JSON.stringify(callData);

      // Create a new PDF document
      const doc = new PDFDocument();
      const pdfStream = fs.createWriteStream('call_details.pdf');

      // Pipe the PDF to a file
      doc.pipe(pdfStream);

      // Set font and font size
      doc.font('Helvetica').fontSize(12);

      // Format and add the data to the PDF
      doc.text('Call Started: ' + new Date(callData.call_started).toLocaleString());
      doc.text('Call Ended: ' + new Date(callData.call_ended).toLocaleString());

      // Underline "Call Started" and "Call Ended"
      doc.underline(0, 16, 90, 0, { color: 'black' });
      doc.underline(0, 28, 88, 0, { color: 'black' });

      doc.moveDown(1); // Add a blank line

      doc.text('History:');

      doc.moveDown(1);

      // Loop through the history entries and format them
      callData.history.forEach(entry => {
        const timestamp = new Date(entry.timestamp).toLocaleString();
        doc.text(`${timestamp} - ${entry.transcript}`);
      });

      doc.moveDown(1); // Add a blank line

      doc.text('Emotion History:');

      doc.moveDown(1);
      // Loop through the emotion_history entries and format them
      callData.emotion_history.forEach(emotionEntry => {
        doc.text(`Transcript: ${emotionEntry.transcript}`);
        // Make "Emotion" bold
        doc.font('Helvetica-Bold');
        doc.text(`Text based Emotion: ${emotionEntry.emotion.emotion}`);
        doc.font('Helvetica'); // Reset font to normal
        doc.moveDown(1);
        
      });
      doc.font('Helvetica-Bold');
      doc.text(`Voice based Emotion: ${callData.voice_emotion.emotion} with ${callData.voice_emotion.percentage}% confidence`);
      doc.font('Helvetica'); // Reset font to normal
      doc.moveDown(1);

    

      // End the PDF document
      doc.end();

      // Set the response headers for downloading
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=call_details.pdf');

      // Send the PDF as a response
      pdfStream.on('finish', () => {
        res.download('call_details.pdf');
      });
    } else {
      console.log('No document found with ID', timestamp);
      res.status(404).send('Document not found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error occurred while generating the PDF');
  }
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

