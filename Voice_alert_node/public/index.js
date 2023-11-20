// window.onload = function () {
//     const reloadInterval = 2000;

//     setInterval(function() {
//         location.reload();
//     }, reloadInterval);
    
    let pageSelectedCall;
let mostRecentCall;
let lastProbabilities = [];
    
let items = document.querySelectorAll(".item")
            items.forEach(item => {
            item.addEventListener("click", event => {
                const current = document.querySelector('.selected')
                current.classList.remove('selected')
                item.classList.add("selected")
                
            })
            
            })
    function updateCallsList() {
        console.log('updateCallsList')

        fetchJson('/api/calls')
            .then((data) => {
                // select the most recent call
                if (data.calls.length > 0) {
                    mostRecentCall = data.calls[data.calls.length - 1].timestamp;
                    selectCall(mostRecentCall);
                    lastProbabilities = JSON.parse(localStorage.getItem('lastProbabilities'));
                    if (lastProbabilities && lastProbabilities.length > 0) {
                        console.log('lastProbabilities')
                        console.log(lastProbabilities)
                        updateSpeakerAnalysis(lastProbabilities);
                    }
                }
                
                
              
               
                
            });
    }

    function selectCall(timestamp) {
        console.log('selectCall')
        fetchJson('/api/calls/' + timestamp + '/transcript')
            .then((data) => {
                // store the timestamp for the currently-selected call
                pageSelectedCall = timestamp;

                const calldate = document.getElementById('call-date');
                calldate.innerHTML = new Date(pageSelectedCall).toLocaleDateString("en-GB");
                const calltime = document.getElementById('call-time');
                calltime.innerHTML = new Date(pageSelectedCall).toLocaleTimeString();
                probabilities = [];
                localStorage.setItem('lastProbabilities', JSON.stringify(probabilities));
                updateSpeakerAnalysis(lastProbabilities);

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
        const ws = new WebSocket('wss://' + window.location.host + '/ws/updates');
        console.log('registerForUpdates')
       
        ws.addEventListener('message', (wsMessage) => {
            const callEvent = JSON.parse(wsMessage.data);
            if (callEvent.event === 'new-call') {
                // select the new call
                selectCall(callEvent.timestamp);
                probabilities = [0,0,0,0,0,0,0,0];
                localStorage.setItem('lastProbabilities', JSON.stringify(probabilities));
                updateSpeakerAnalysis(probabilities);
                
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
                    const calldate = document.getElementById('call-date');
                    calldate.innerHTML = new Date(pageSelectedCall).toLocaleDateString("en-GB");
                    const calltime = document.getElementById('call-time');
                    calltime.innerHTML = new Date(pageSelectedCall).toLocaleTimeString();
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
                    // const emotion = document.getElementById('emotion');
                    // emotion.innerHTML = callEvent.emotion.emotion;
                    console.log('emotion', callEvent.emotion.emotion)
                    console.log('probabilities', callEvent.emotion.probabilities)
                    updateSpeakerAnalysis(callEvent.emotion.probabilities);
                }
            }
            else {
                console.error('Unexpected event', callEvent);
            }
        });
    }

    function createChatHistoryMessage(message) {
        console.log('createChatHistoryMessage')
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message');
        // messageDiv.classList.add(message.who);

        const timestamp = document.createElement('div');
        timestamp.classList.add('timestamp');
        timestamp.innerHTML = new Date(message.timestamp).toLocaleTimeString();

        const callDate = document.createElement('div');
        callDate.classList.add('date');
        callDate.innerHTML = new Date(message.timestamp).toLocaleDateString("en-GB");

        const transcript = document.createElement('div');
        transcript.classList.add('transcript');
        transcript.innerHTML = message.transcript;

        messageDiv.appendChild(callDate);
        messageDiv.appendChild(timestamp);
        messageDiv.appendChild(transcript);

        return messageDiv;
    }

    function updateLiveTranscript(update) {
        console.log('updateLiveTranscript')
        const liveDiv = document.getElementById('current-message');
        liveDiv.innerHTML = update.transcript;
    }
    
function updateSpeakerAnalysis(probabilities) {
    console.log('updateSpeakerAnalysis')
    console.log('probabilities')
    console.log(probabilities)
    
        if (probabilities) {
            const metricDivs = document.querySelectorAll('.metric');
             // Update the lastProbabilities when new probabilities are received
             lastProbabilities = probabilities;

             console.log('lastProbabilities')
            console.log(lastProbabilities)
            
            // Store the lastProbabilities in local storage
            localStorage.setItem('lastProbabilities', JSON.stringify(lastProbabilities));
    
            for (let i = 0; i < metricDivs.length; i++) {
                const widthPercentage = probabilities[i] + '%';
                const barchartDiv = metricDivs[i].querySelector('.barchart .value');
                barchartDiv.style.width = widthPercentage;
            }
    
           
    } 
    // else {
            
    //     // If no new probabilities are provided, use the last ones
    //     if (lastProbabilities) {
    //         const metricDivs = document.querySelectorAll('.metric');

    //         for (let i = 0; i < metricDivs.length; i++) {
    //             const widthPercentage = lastProbabilities[i] + '%';
    //             const barchartDiv = metricDivs[i].querySelector('.barchart .value');
    //             barchartDiv.style.width = widthPercentage;
    //         }
    //     }
    // }
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
// }