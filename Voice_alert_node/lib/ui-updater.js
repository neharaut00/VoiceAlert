const log = require('loglevel');

const browserConnections = [];

function handleIncomingWSConnection(ws, req) {
    console.log('received new ws connection from UI');
    browserConnections.push(ws);
    ws.on('close', () => {
        log.debug('closing connection to UI');
        const idx = browserConnections.indexOf(ws);
        if (idx > -1) {
            browserConnections.splice(idx, 1);
        }
    });
}

function newCall(callTimestamp) {
    sendNotification({
        event: 'new-call',
        timestamp : callTimestamp
    });
}

function endCall(callTimestamp) {
    sendNotification({
        event: 'end-call',
        timestamp : callTimestamp
    });
}

function newFinalTranscription(callTimestamp, transcription) {
    sendNotification({
        event: 'final-transcription',
        callTimestamp,
        transcription,
        
    });
    
}

function newInterimTranscription(callTimestamp, transcription) {
    sendNotification({
        event: 'interim-transcription',
        callTimestamp,
        transcription
    });
    
   
}

function sendNotification(notification) {
    browserConnections.forEach((ws) => {
        try {
            ws.send(JSON.stringify(notification));
        }
        catch (err) {
            log.error('failed to send notification to UI', err);
        }
    });
}

module.exports = {
    handleIncomingWSConnection,

    newCall,
    endCall,

    newFinalTranscription,
    newInterimTranscription
};
