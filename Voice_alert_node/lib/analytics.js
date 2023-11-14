function processVoiceEmotions(voiceEmotions, customLabels) {
    const emotionCount = {};
  
    voiceEmotions.forEach((emotion) => {
      if (emotionCount[emotion]) {
        emotionCount[emotion]++;
      } else {
        emotionCount[emotion] = 1;
      }
    });
  
    const labels = customLabels || Object.keys(emotionCount);
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
  
  function aggregateCallsByHour(data, customLabels) {
    const aggregatedData = {};
    for (let hour = 0; hour < 24; hour++) {
      aggregatedData[hour] = {};
      customLabels.forEach((emotion) => {
        aggregatedData[hour][emotion] = 0;
      });
    }
  
    data.forEach((item) => {
      const callStarted = item.call_started;
      const emotion = item.voice_emotion?.emotion || 'unknown'; // Change 'unknown' to a default emotion if voice emotion is not available
  
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
    // console.log('aggregatedData', aggregatedData)
    return aggregatedData;
  }
  
module.exports = {
    processVoiceEmotions,
    extractLastEmotionHistoryTranscript,
    aggregateCallsByHour,
}  