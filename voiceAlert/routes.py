from flask import Blueprint, render_template, request
from twilio.twiml.voice_response import VoiceResponse, Start

main = Blueprint("main", __name__)

@main.route("/")
def index():
    return render_template("index.html")

@main.route('/call', methods=['POST'])
def call():
    """Accept a phone call."""
    response = VoiceResponse()
    start = Start()
    start.stream(url=f'wss://{request.host}/stream')
    response.append(start)
    response.say('Please leave a message')
    response.pause(length=60)
    print(f'Incoming call from {request.form["From"]}')
    return str(response), 200, {'Content-Type': 'text/xml'}