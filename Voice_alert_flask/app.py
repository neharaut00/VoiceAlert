from flask import Flask, request, jsonify
import joblib
from keras.models import load_model
import librosa
import numpy as np

import base64
import io

app = Flask(__name__)

# Load the saved pipeline and model
pipeline_file = "../ML models/model.pkl"
pipe_lr = joblib.load(pipeline_file)
model = load_model('../ML models/speech_emotion_recg_model.h5')

@app.route('/predict_emotion', methods=['POST'])
def predict_emotion():
    try:
        data = request.get_json()
        text = data['text']
        print(text)
        # Use the loaded pipeline to make predictions
        emotion = pipe_lr.predict([text])[0]
        print("emotion")
        print(emotion)
        print(type(emotion))
        prediction_probabilities = pipe_lr.predict_proba([text])[0]
        print("prediction_probabilities")
        print(prediction_probabilities)

        # Convert prediction probabilities to percentages
        percentage_probabilities = [round(prob * 100, 2) for prob in prediction_probabilities]
        print("percentage_probabilities")
        print(percentage_probabilities)
        response = {
            'emotion': emotion,
            'probabilities': percentage_probabilities
        }

        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)})

def preprocess_audio(base64_data):
    try:
        # Decode base64 data
        audio_data = base64.b64decode(base64_data)

        # Convert to bytes-like object
        audio_bytes = io.BytesIO(audio_data)

        # Load the audio file
        y, sr = librosa.load(audio_bytes, duration=3, offset=0.5)

        # Extract MFCC features
        mfcc = np.mean(librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40).T, axis=0)

        # Add batch and channel dimensions
        mfcc = np.expand_dims(mfcc, axis=0)
        mfcc = np.expand_dims(mfcc, axis=-1)

        return mfcc

    except Exception as e:
        raise RuntimeError(f"Error during audio preprocessing: {str(e)}")

@app.route('/voice_predict', methods=['POST'])
def voice_predict():
    try:
        # Check if the 'voice_data' parameter is in the request
        if 'voice_data' not in request.json:
            return jsonify({'error': 'No voice_data part'})

        # Get the base64 encoded audio data from the request
        base64_data = request.json['voice_data']

        # Preprocess the audio data
        preprocessed_audio = preprocess_audio(base64_data)

        # Make predictions
        predictions = model.predict(preprocessed_audio)

        # Normalize predictions
        normalized_predictions = (predictions / np.sum(predictions)) * 100

        # Emotion labels
        emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'ps', 'sad']

        # Create a dictionary to map labels to percentages
        emotion_percentages = {label: float(percentage) for label, percentage in zip(emotion_labels, normalized_predictions[0])}

        voice_emotion = max(emotion_percentages, key=emotion_percentages.get)

        
        print(voice_emotion)
        print(emotion_percentages[voice_emotion])
        response = {
            'emotion': voice_emotion,
            'percentage': emotion_percentages[voice_emotion]
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
