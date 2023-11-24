function processVoiceEmotions(voiceEmotions) {
    const emotionCount = {};
  
    voiceEmotions.forEach((emotion) => {
      if (emotionCount[emotion]) {
        emotionCount[emotion]++;
      } else {
        emotionCount[emotion] = 1;
      }
    });
  
    const labels = Object.keys(emotionCount);
    const data = Object.values(emotionCount);
  
    return { labels, data };
  }
  
  function extractLastEmotionHistoryTranscript(emotionHistory) {
    if (Array.isArray(emotionHistory) && emotionHistory.length > 0) {
      const lastEmotion = emotionHistory[emotionHistory.length - 1];
  
      if (lastEmotion && lastEmotion.transcript) {
        return lastEmotion.transcript;
      }
    }
  
    return '';
  }
  
  function aggregateCallsByHour(data, text_customLabels) {
    const aggregatedData = {};
    for (let hour = 0; hour < 24; hour++) {
      aggregatedData[hour] = {};
      text_customLabels.forEach((emotion) => {
        aggregatedData[hour][emotion] = 0;
      });
    }
  
    data.forEach((item) => {
      const callStarted = item.call_started;
      const emotion_history = item.emotion_history;
      const emotion = emotion_history[emotion_history.length - 1].emotion.emotion; // Change 'unknown' to a default emotion if voice emotion is not available
      //print last element of emotion_history
      console.log('last element of emotion_history', )
  
      if (callStarted) {
        const hour = new Date(callStarted).getHours();
  
        if (!aggregatedData[hour]) {
          aggregatedData[hour] = {};
        }
  
        if (!aggregatedData[hour][emotion]) {
          aggregatedData[hour][emotion] = 1;
        } else {
          aggregatedData[hour][emotion]++;
        }
      }
    });
    console.log('aggregatedData', aggregatedData)
    return aggregatedData;
  }
  
module.exports = {
    processVoiceEmotions,
    extractLastEmotionHistoryTranscript,
    aggregateCallsByHour,
}  