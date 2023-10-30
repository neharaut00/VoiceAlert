const { db } = require('./firebase.js')
const calls = {}

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
        console.log("Call Timestamp:", callTimestamp);
        console.log("Call End Time:", callEndTime);
        console.log("Call History:", callHistory);
        
        // Check if the document with the given ID exists
        const docRef = db.collection('calls').doc(id);
        const docSnapshot = await docRef.get();
        
        // If the document exists, update the data
        if (!docSnapshot.exists) {
            // Document does not exist, add it
            const callData = {
                call_started: callTimestamp,
                call_ended: callEndTime,
                history: callHistory,
            };

            try {
            await docRef.set(callData);
            console.log(`Data added for ID ${id}`);
            } catch (error) {
            console.error("Error adding data for ID " + id, error);
            }
        }
        else {
            console.log(`Document with ID ${id} already exists, skipping.`);
        }
        // for(let i = 0; i < callHistory.length; i++) {
        //     const timestamp = callHistory[i].timestamp;
        //     const transcript = callHistory[i].transcript;
        //     console.log("Timestamp:", timestamp);
        //     console.log("Transcript:", transcript);
        // }
     }


}

function addFinalTranscription(callTimestamp, transcription) {
    if (!(callTimestamp in calls)) {
        prepareNewCallRecord(callTimestamp);
    }
    calls[callTimestamp].history.push(transcription);
    calls[callTimestamp].live[transcription] = { ...transcription, transcript: '' };
    console.log("Added final transcription:");
    // console.log("Call Timestamp:", callTimestamp);
    // console.log("Transcription:", transcription);
    // console.log("Call Record:", calls[callTimestamp]);
}

function addCallEndTime(callTimestamp, callEndTime) {
    calls[callTimestamp].call_ended = callEndTime;
}

function updateLiveTranscription(callTimestamp, transcription) {
    if (!(callTimestamp in calls)) {
        prepareNewCallRecord(callTimestamp);
    }
    calls[callTimestamp].live[transcription] = transcription;
    // console.log("Updated live transcription:");
    // console.log("Call Timestamp:", callTimestamp);
    // console.log("Transcription:", transcription);
    // console.log("Call Record:", calls[callTimestamp]);
}

function getTranscript(callTimestamp) {
    if (!(callTimestamp in calls)) {
        prepareNewCallRecord(callTimestamp);
    }
    console.log("Get Transcript for Call Timestamp:", callTimestamp);
    // console.log("Call Record:", transcript);
    return calls[callTimestamp];
}

function prepareNewCallRecord(timestamp) {
    calls[timestamp] = {
        call_started: timestamp,
        call_ended: null,
        history: [],
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
};