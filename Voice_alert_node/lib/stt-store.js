const { db } = require('./firebase.js')
const nlu = require('./nlu.js')
const calls = {}
const fs = require('fs');

function getAllCalls() {
    return calls;
}

function getCallTimestamps() {
    return Object.keys(calls).map(ts => parseInt(ts, 10));
}

// add the data if the id is not present in the database

async function addToFirestore() { 
    const calls = getAllCalls();
    console.log("Get All Calls");
    console.log("Calls:", calls);
    for (timestamp in calls) {
        const id = timestamp;
        const call = calls[timestamp];
        const callTimestamp = call.call_started;
        const callEndTime = call.call_ended;
        const callHistory = call.history;
        const callEmotionHistory = call.emotion_history;
        console.log("Call Timestamp:", callTimestamp);
        console.log("Call End Time:", callEndTime);
        console.log("Call History:", callHistory);
        
        // Check if the document with the given ID exists
        const docRef = db.collection('calls').doc(id);
        const docSnapshot = await docRef.get();
        
        // If the document exists, update the data
        if (!docSnapshot.exists) {
            // Read the wav file
            const wavFilePath = __dirname + `/${id}.wav`;
            const wavFileBuffer = fs.readFileSync(wavFilePath);
        
            // Document does not exist, add it
            const callData = {
                call_started: callTimestamp,
                call_ended: callEndTime,
                history: callHistory,
                emotion_history: callEmotionHistory,
                wavFile: wavFileBuffer.toString('base64'),
            };

            try {
            await docRef.set(callData);
            console.log(`Data added for ID ${id}`);
            } catch (error) {
            console.error("Error adding data for ID " + id, error);
            }finally {
                // Delete the local copy of the wav file after it's added to the database
                fs.unlinkSync(wavFilePath);
                console.log(`Local copy deleted for ID ${id}`);
            }
        }
        else {
            console.log(`Document with ID ${id} already exists, skipping.`);
        }
    
     }


}

async function getVoiceEmotion(callTimestamp) {
    //change typeof callTimestamp to string
    const callTimestampString = callTimestamp.toString();
    const callRef = db.collection('calls').doc(callTimestampString);
    let wavFile = null;

    try {
        const docSnapshot = await callRef.get();

        if (docSnapshot.exists) {
            wavFile = docSnapshot.data().wavFile;
        } 
    } catch (error) {
        console.error("Error getting document:", error);
    }

    voiceEmotion = await nlu.voice_analysis(wavFile);
    try {
        await callRef.update({ voice_emotion: voiceEmotion });
        console.log(`Voice emotion added/updated for ID ${callTimestamp}`);
    } catch (error) {
        console.error("Error updating voice_emotion for ID " + callTimestamp, error);
    }
    

 }

async function addFinalTranscription(callTimestamp, transcription) {
    if (!(callTimestamp in calls)) {
        prepareNewCallRecord(callTimestamp);
    }
    calls[callTimestamp].history.push(transcription);

    const combinedTranscript = calls[callTimestamp].history
        .map(item => item.transcript)
        .join(' ');
    //function call which will get us the emotion of the combined text 
    emotion = await nlu.text_analysis(combinedTranscript);

    const emotion_history = {
        timestamp: callTimestamp,
        transcript: combinedTranscript,
        emotion: emotion,
    };

    calls[callTimestamp].emotion_history.push(emotion_history);
    calls[callTimestamp].live[transcription] = { ...transcription, transcript: '' };
    console.log("Added final transcription:");
    return emotion;
}

function addCallEndTime(callTimestamp, callEndTime) {
    calls[callTimestamp].call_ended = callEndTime;
}

function callStartTime(callTimestamp) {
    if (!(callTimestamp in calls)) {
        prepareNewCallRecord(callTimestamp);
    }
    calls[callTimestamp].call_started = callTimestamp;
}

function updateLiveTranscription(callTimestamp, transcription) {
    if (!(callTimestamp in calls)) {
        prepareNewCallRecord(callTimestamp);
    }
    calls[callTimestamp].live[transcription] = transcription;
    
}

function getTranscript(callTimestamp) {
    if (!(callTimestamp in calls)) {
        prepareNewCallRecord(callTimestamp);
    }
    console.log("Get Transcript for Call Timestamp:", callTimestamp);
    return calls[callTimestamp];
}


function prepareNewCallRecord(timestamp) {
    calls[timestamp] = {
        call_started: null,
        call_ended: null,
        history: [],
        emotion_history: [],
        live: {
            timestamp,
            transcript: ''
        }
    };
    console.log("Prepared New Call Record for Timestamp:", timestamp);
}

module.exports = {

    getCallTimestamps,
    addToFirestore,


    addFinalTranscription,
    updateLiveTranscription,
    addCallEndTime,

    getTranscript,
    getAllCalls,
    callStartTime,

    getVoiceEmotion
};