from flask import Flask, request
from twilio.twiml.voice_response import VoiceResponse, Start
import speech_recognition as sr


app = Flask(__name__)


@app.route("/answer", methods=['GET', 'POST'])
def answer_call():
    """Respond to incoming phone calls with a brief message."""
    # Start our TwiML response
    resp = VoiceResponse()
    start = Start()
    start.stream(name='Example Audio Stream', url='wss://mystream.ngrok.io/audiostream')
    resp.append(start)

    print(resp)

    # Read a message aloud to the caller
    resp.say("Thank you for calling! You've called Neha Raut.", voice='Polly.Amy')

    return str(resp)

if __name__ == '__main__':
    app.run(debug=True)