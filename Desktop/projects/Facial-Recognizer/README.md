# Facial Recognizer

A web application that uses face-api.js to detect facial emotions, age, gender, and eye states in real-time. The app provides emotional balancing sentences based on detected emotions and allows users to save and manage their mood history.

## Features

- **Real-time Facial Detection**: Detects emotions (happy, sad, angry, fear, disgust, surprise, neutral), age, gender, and eye states (open, closed, partially opened, single eye opened)
- **Emotional Balancing**: Displays sentences to help balance emotions based on detected mood
- **Facial Analysis**: Provides facial symmetry score and face distance estimation
- **Mood History**: Save and view past mood entries with detailed facial data
- **Text-to-Speech**: Option to speak the balancing sentences aloud
- **Offline Functionality**: Stores mood history locally in the browser

## Technologies Used

- React
- face-api.js
- Vite
- HTML5 Canvas for video processing

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Usage

1. Allow camera access when prompted
2. The app will detect your facial features and emotions in real-time
3. View balancing sentences and facial data
4. Save your mood to history for later review
5. Use the delete button to remove history entries

## Models

The app uses pre-trained models from face-api.js:
- Tiny Face Detector
- Face Landmark 68 Net
- Face Expression Net
- Age Gender Net

Models are loaded from the `/public/models/` directory.

## Browser Support

Requires a modern browser with WebRTC support for camera access.
