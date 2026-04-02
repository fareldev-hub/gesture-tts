# Gesture TTS

A web application for real-time hand gesture detection with text-to-speech output.

## Features

- Real-time hand gesture recognition using TensorFlow.js HandPose
- Text-to-speech output in Indonesian
- Support for 10 different gestures
- WebSocket communication for gesture events
- Responsive design

## Gestures Supported

- 🤙 Call Me (SHAKA)
- 🖐 Hello (PALM)
- ✋ Stop (STOP)
- 👌 OK
- 👍 Good (THUMBS_UP)
- 👎 Bad (THUMBS_DOWN)
- ✊ Spirit (FIST)
- ☝️ Point (POINTING)
- ✌️ Peace (PEACE)
- 🤟 Love You (LOVE_YOU)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and go to `http://localhost:3000`

3. Click "Mulai" to start the camera

4. Make hand gestures in front of the camera

5. The app will detect gestures and speak them out loud

## Requirements

- Modern web browser with camera access
- Webcam
- Internet connection (for loading ML models)

## Technologies Used

- Node.js
- Express.js
- Socket.io
- TensorFlow.js
- HandPose model
- HTML5 Canvas