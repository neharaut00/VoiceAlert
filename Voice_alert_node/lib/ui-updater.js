const api = require("./setup");

function newCall(callTimestamp) {
    transcription = api.sendNotification({
        event: 'new-call',
        timestamp : callTimestamp
    });
}

function endCall(callTimestamp) {
    transcription = api.sendNotification({
        event: 'end-call',
        timestamp : callTimestamp
    });
}

function newFinalTranscription(callTimestamp, transcription) {
    transcription = api.sendNotification({
        event: 'final-transcription',
        time: callTimestamp,
        text: transcription
    });
    console.log(transcription);
}

function newInterimTranscription(callTimestamp, transcription) {
    transcription = api.sendNotification({
        event: 'interim-transcription',
        time: callTimestamp,
        text: transcription
    });
    console.log(transcription);
}

module.exports = {
    newCall,
    endCall,

    newFinalTranscription,
    newInterimTranscription
};
