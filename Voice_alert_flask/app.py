from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)

# Load the saved pipeline and model
pipeline_file = "../ML models/model.pkl"
pipe_lr = joblib.load(pipeline_file)

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
