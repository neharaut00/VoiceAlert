window.onload = function () {
    const reloadInterval = 2000;

    setInterval(function() {
        location.reload();
    }, reloadInterval);
    
    let pageSelectedCall;

    function updateCallsList() {
        console.log('updateCallsList')

        fetchJson('/api/calls')
            .then((data) => {
                // add the calls to the page
                const callsListDiv = document.getElementById('calls-list');
                data.calls.forEach((call) => {
                    const callDiv = createCallHtml(call);
                    callsListDiv.appendChild(callDiv);
                });

                // select the most recent call
                if (data.calls.length > 0) {
                    selectCall(data.calls[data.calls.length - 1].timestamp);
                }
            });
    }

    function selectCall(timestamp) {
        console.log('selectCall')
        fetchJson('/api/calls/' + timestamp + '/transcript')
            .then((data) => {
                // store the timestamp for the currently-selected call
                pageSelectedCall = timestamp;

                // remove any previous chat that is displayed
                const callHistoryDiv = document.getElementById('chat-history');
                removeAllChildNodes(callHistoryDiv);

                // add the new chat to the UI
                data.history.forEach((message) => {
                    const messageDiv = createChatHistoryMessage(message);
                    callHistoryDiv.appendChild(messageDiv);
                });

                // clear the live transcript
                updateLiveTranscript({ transcript: '' });
                // updateLiveTranscript({ who: 'receiver', transcript: ''});

                // update the sentiment analysis view
                // updateSpeakerAnalysis('caller');
                // updateSpeakerAnalysis('receiver');
            });
    }

    function registerForUpdates() {
        // const ws = new WebSocket('wss://' + window.location.host + '/ws/updates');
        console.log('registerForUpdates')
        const ws = new WebSocket("ws://localhost:8080");
        ws.addEventListener('message', (wsMessage) => {
            const callEvent = JSON.parse(wsMessage.data);
            if (callEvent.event === 'new-call') {
                // add the new call to the list
                const callsListDiv = document.getElementById('calls-list');
                callsListDiv.appendChild(createCallHtml(callEvent));

                // select the new call
                selectCall(callEvent.timestamp);
            }
            else if (callEvent.event === 'interim-transcription') {
                // update the UI if the transcription is for the
                //  currently selected phone call
                if (callEvent.callTimestamp === pageSelectedCall) {
                    updateLiveTranscript(callEvent.transcription);
                }
            }
            else if (callEvent.event === 'final-transcription') {
                // update the UI if the transcription is for the
                //  currently selected phone call
                if (callEvent.callTimestamp === pageSelectedCall) {
                    // add the new message to the UI
                    const callHistoryDiv = document.getElementById('chat-history');
                    const messageDiv = createChatHistoryMessage(callEvent.transcription);
                    callHistoryDiv.appendChild(messageDiv);

                    messageDiv.scrollIntoView(false);

                    // clear the interim transcription from the UI
                    updateLiveTranscript({
                        transcript: ''
                    });

                    // update the sentiment analysis now that we
                    //  have an update to the conversation
                    // updateSpeakerAnalysis(callEvent.transcription.who);
                }
            }
            else {
                console.error('Unexpected event', callEvent);
            }
        });
    }


    function createCallHtml(call) {
        console.log('createCallHtml')
        const callDiv = document.createElement('div');
        callDiv.classList.add('call');
        callDiv.onclick = function () {
            selectCall(call.timestamp);
        };

        const callId = document.createElement('div');
        callId.classList.add('call-id');
        callId.innerHTML = 'call started at:';

        const callTimestamp = document.createElement('div');
        callTimestamp.classList.add('timestamp');
        callTimestamp.innerHTML = new Date(call.timestamp).toLocaleTimeString();

        callDiv.appendChild(callId);
        callDiv.appendChild(callTimestamp);

        return callDiv;
    }

    function createChatHistoryMessage(message) {
        console.log('createChatHistoryMessage')
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message');
        // messageDiv.classList.add(message.who);

        const timestamp = document.createElement('div');
        timestamp.classList.add('timestamp');
        timestamp.innerHTML = new Date(message.timestamp).toLocaleTimeString();

        const transcript = document.createElement('div');
        transcript.classList.add('transcript');
        transcript.innerHTML = message.transcript;

        messageDiv.appendChild(timestamp);
        messageDiv.appendChild(transcript);

        return messageDiv;
    }

    function updateLiveTranscript(update) {
        console.log('updateLiveTranscript')
        const liveDiv = document.getElementById('current-message');
        liveDiv.innerHTML = update.transcript;
    }

    function fetchJson(url) {
        return fetch(url)
            .then(response => response.json());
    }

    function removeAllChildNodes(parent) {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    }

    updateCallsList();
    registerForUpdates();
}