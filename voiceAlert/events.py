from .extensions import socketio
from flask_socketio import emit
import json

@socketio.on("connect")
def connect():
    print("Client connected")
@socketio.on("stream")
def stream(data):
     while True:
        packet = json.loads(data)
        if packet['event'] == 'start':
            print('Streaming is starting')
            emit('transcription', {'transcription': 'Streaming is starting'})
        elif packet['event'] == 'stop':
            print('\nStreaming has stopped')