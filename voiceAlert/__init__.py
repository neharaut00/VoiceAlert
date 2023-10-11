import audioop
import base64
import json
import os

from flask import Flask 
from pyngrok import ngrok
from .events import socketio
from .routes import main 
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

# Retrieve Twilio Account SID and Auth Token from environment variables
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")



def create_app():
    app = Flask(__name__)
    app.config["DEBUG"] = True
    app.config["SECRET_KEY"] = "secret"

    app.register_blueprint(main)
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

    socketio.init_app(app)

    return app

