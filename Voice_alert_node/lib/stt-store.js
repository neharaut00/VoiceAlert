const calls = {}

function getCallTimestamps() {
    return Object.keys(calls).map(ts => parseInt(ts, 10));
}

function addFinalTranscription(callTimestamp, transcription) {
    if (!(callTimestamp in calls)) {
        prepareNewCallRecord(callTimestamp);
    }
    calls[callTimestamp].history.push(transcription);
    calls[callTimestamp].live[transcription] = { ...transcription, transcript: '' };
    // console.log("Added final transcription:");
    // console.log("Call Timestamp:", callTimestamp);
    // console.log("Transcription:", transcription);
    // console.log("Call Record:", calls[callTimestamp]);
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
    console.log("Call Record:", transcript);
    return calls[callTimestamp];
}

function prepareNewCallRecord(timestamp) {
    calls[timestamp] = {
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

    addFinalTranscription,
    updateLiveTranscription,

    getTranscript
};