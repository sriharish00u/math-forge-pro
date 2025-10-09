
import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import './App.css';

function App() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const diagramRef = useRef();
  const [emotion, setEmotion] = useState('neutral');
  const [age, setAge] = useState(0);
  const [gender, setGender] = useState('');
  const [blinkRate, setBlinkRate] = useState(0);
  const [faceDistance, setFaceDistance] = useState(0);
  const [facialSymmetry, setFacialSymmetry] = useState(0);
  const [eyeState, setEyeState] = useState('open');
  const [sentence, setSentence] = useState('');
  const [sentences, setSentences] = useState({});
  const [moodHistory, setMoodHistory] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const blinkHistory = useRef([]);

  const getEyeAspectRatio = (eye) => {
    const A = Math.sqrt((eye[1].x - eye[5].x) ** 2 + (eye[1].y - eye[5].y) ** 2);
    const B = Math.sqrt((eye[2].x - eye[4].x) ** 2 + (eye[2].y - eye[4].y) ** 2);
    const C = Math.sqrt((eye[0].x - eye[3].x) ** 2 + (eye[0].y - eye[3].y) ** 2);
    return (A + B) / (2 * C);
  };

  const calculateFacialSymmetry = (landmarks) => {
    const points = landmarks.positions;
    // Symmetric pairs: e.g., left cheek 1 and right cheek 15, etc.
    const pairs = [
      [1, 15], [2, 14], [3, 13], [4, 12], [5, 11], [6, 10], [7, 9], [8, 16]
    ];
    let totalDiff = 0;
    pairs.forEach(([left, right]) => {
      const diff = Math.abs(points[left].x - (points[0].x + (points[16].x - points[left].x)));
      totalDiff += diff;
    });
    return Math.max(0, 100 - totalDiff / pairs.length); // Arbitrary score
  };

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceExpressionNet.loadFromUri('/models');
      await faceapi.nets.ageGenderNet.loadFromUri('/models');
      setIsLoaded(true);
    };

    const loadSentences = async () => {
      const response = await fetch('/sentences.json');
      const data = await response.json();
      setSentences(data);
    };

    loadModels();
    loadSentences();

    // Load mood history from localStorage
    const history = JSON.parse(localStorage.getItem('moodHistory')) || [];
    setMoodHistory(history);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      startVideo();
    }
  }, [isLoaded]);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then(stream => {
        videoRef.current.srcObject = stream;
      })
      .catch(err => console.error(err));
  };

  const detectEmotions = async () => {
    if (!isLoaded) return;

    const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();

    if (detections.length > 0) {
      const detection = detections[0];
      const expressions = detection.expressions;
      const dominantEmotion = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
      if (dominantEmotion !== emotion) {
        setEmotion(dominantEmotion);
        showOppositeSentence(dominantEmotion);
        drawDiagram(dominantEmotion);
      }
      setAge(Math.round(detection.age));
      setGender(detection.gender);

      // Estimate face distance (proxy: inverse of bounding box area)
      const box = detection.detection.box;
      const area = box.width * box.height;
      setFaceDistance(Math.round(10000 / area)); // Arbitrary scale

      // Calculate facial symmetry
      const symmetry = calculateFacialSymmetry(detection.landmarks);
      setFacialSymmetry(Math.round(symmetry));

      // Calculate eye state
      const leftEye = detection.landmarks.getLeftEye();
      const rightEye = detection.landmarks.getRightEye();
      const leftEAR = getEyeAspectRatio(leftEye);
      const rightEAR = getEyeAspectRatio(rightEye);

      const getEyeState = (ear) => {
        if (ear < 0.25) return 'closed';
        if (ear < 0.35) return 'partially';
        return 'open';
      };

      const leftState = getEyeState(leftEAR);
      const rightState = getEyeState(rightEAR);

      let eyeStateStr;
      if (leftState === 'open' && rightState === 'open') {
        eyeStateStr = 'open';
      } else if (leftState === 'closed' && rightState === 'closed') {
        eyeStateStr = 'closed';
      } else if (leftState === 'partially' && rightState === 'partially') {
        eyeStateStr = 'partially opened';
      } else if ((leftState === 'open' && rightState === 'closed') || (leftState === 'closed' && rightState === 'open')) {
        eyeStateStr = 'single eye opened';
      } else {
        eyeStateStr = 'partially opened'; // Mixed partial and open/closed
      }

      setEyeState(eyeStateStr);

      // Draw landmarks on canvas
      const canvas = canvasRef.current;
      const displaySize = { width: videoRef.current.width, height: videoRef.current.height };
      faceapi.matchDimensions(canvas, displaySize);
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    }
  };

  const showOppositeSentence = (detectedEmotion) => {
    let possibleKeys = [];
    switch (detectedEmotion) {
      case 'happy':
        possibleKeys = ['sadSentences', 'excitedSentences'];
        break;
      case 'sad':
        possibleKeys = ['happySentences', 'tiredSentences'];
        break;
      case 'angry':
        possibleKeys = ['calmSentences', 'tiredSentences'];
        break;
      case 'fear':
        possibleKeys = ['confidenceSentences', 'anxiousSentences'];
        break;
      case 'disgust':
        possibleKeys = ['happySentences', 'calmSentences'];
        break;
      case 'surprise':
        possibleKeys = ['neutralSentences', 'excitedSentences'];
        break;
      default:
        possibleKeys = ['neutralSentences', 'tiredSentences', 'calmSentences'];
    }
    const randomKey = possibleKeys[Math.floor(Math.random() * possibleKeys.length)];
    const sentenceList = sentences[randomKey];
    if (sentenceList) {
      const randomSentence = sentenceList[Math.floor(Math.random() * sentenceList.length)];
      setSentence(randomSentence);
    }
  };

  useEffect(() => {
    const interval = setInterval(detectEmotions, 1000); // Detect every second
    return () => clearInterval(interval);
  }, [isLoaded, sentences]);

  const saveMood = () => {
    const newEntry = {
      emotion,
      sentence,
      age,
      gender,
      faceDistance,
      eyeState,
      facialSymmetry,
      timestamp: new Date().toISOString()
    };
    const updatedHistory = [...moodHistory, newEntry];
    setMoodHistory(updatedHistory);
    localStorage.setItem('moodHistory', JSON.stringify(updatedHistory));
  };

  const speakSentence = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(sentence);
      window.speechSynthesis.speak(utterance);
    }
  };

  const shuffleSentence = () => {
    showOppositeSentence(emotion);
  };

  const deleteHistoryItem = (index) => {
    const updatedHistory = moodHistory.filter((_, i) => i !== index);
    setMoodHistory(updatedHistory);
    localStorage.setItem('moodHistory', JSON.stringify(updatedHistory));
  };

  const drawDiagram = (emotion) => {
    const canvas = diagramRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // Draw face outline
    ctx.beginPath();
    ctx.arc(150, 120, 80, 0, Math.PI * 2);
    ctx.stroke();

    // Eyes
    ctx.beginPath();
    ctx.arc(130, 100, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(170, 100, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Mouth based on emotion
    ctx.beginPath();
    if (emotion === 'happy') {
      ctx.arc(150, 140, 20, 0, Math.PI);
    } else if (emotion === 'sad') {
      ctx.arc(150, 160, 20, Math.PI, 0);
    } else if (emotion === 'angry') {
      ctx.moveTo(130, 130);
      ctx.lineTo(170, 130);
      ctx.moveTo(135, 125);
      ctx.lineTo(140, 135);
      ctx.moveTo(165, 125);
      ctx.lineTo(160, 135);
    } else if (emotion === 'surprise') {
      ctx.arc(150, 140, 15, 0, Math.PI * 2);
    } else {
      ctx.moveTo(135, 140);
      ctx.lineTo(165, 140);
    }
    ctx.stroke();
  };

  const getBackgroundColor = () => {
    switch (emotion) {
      case 'happy': return '#FFD700'; // Gold
      case 'sad': return '#4682B4'; // Steel Blue
      case 'angry': return '#DC143C'; // Crimson
      case 'fear': return '#800080'; // Purple
      case 'disgust': return '#32CD32'; // Lime Green
      case 'surprise': return '#FF69B4'; // Hot Pink
      default: return '#F0F0F0'; // Light Gray
    }
  };

  const getEmotionIcon = (emotion) => {
    switch (emotion) {
      case 'happy': return '😊';
      case 'sad': return '😢';
      case 'angry': return '😠';
      case 'fear': return '😨';
      case 'disgust': return '🤢';
      case 'surprise': return '😲';
      default: return '😐';
    }
  };

  return (
    <div className="app" style={{ backgroundColor: getBackgroundColor(), transition: 'background-color 1s ease' }}>
      <div className="header">
        <img src="logo3.jpg" alt="Facial Recognizer Logo" className="logo" />
        <h1>Facial Recognizer</h1>
      </div>
      <div className="main-content">
        <div className="left-panel">
          <div className="video-container">
            <video ref={videoRef} autoPlay muted width="640" height="480"></video>
          </div>
        </div>
        <div className="right-panel">
          <div className="emotion-display">
            <div className="emotion-emoji">{getEmotionIcon(emotion)}</div>
            <h2>Detected Emotion: {emotion}</h2>
            <div className="facial-info">
              <p><strong>Age:</strong> {age}</p>
              <p><strong>Gender:</strong> {gender}</p>
              <p><strong>Face Distance:</strong> {faceDistance}</p>
              <p><strong>Eye State:</strong> {eyeState}</p>
              <div className="symmetry-bar">
                <label><strong>Facial Symmetry:</strong> {facialSymmetry}%</label>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${facialSymmetry}%` }}></div>
                </div>
              </div>
            </div>
            <p className="sentence">{sentence}</p>
            <div className="buttons">
              <button onClick={saveMood} aria-label="Save current mood to history">💾 Save My Mood</button>
              <button onClick={speakSentence} aria-label="Speak the current sentence aloud">🔊 Speak Sentence</button>
              <button onClick={shuffleSentence} aria-label="Get a new random sentence">🔄 Shuffle Sentence</button>
            </div>
          </div>
        </div>
      </div>
      <div className="history">
        <h3>📊 Mood History</h3>
        <div className="history-list">
          {moodHistory.slice(-5).reverse().map((entry, index) => (
            <div key={index} className="history-item">
              <div className="history-header">
                <span className="emotion-icon">{getEmotionIcon(entry.emotion)}</span>
                <span className="timestamp">{new Date(entry.timestamp).toLocaleString()}</span>
                <button onClick={() => deleteHistoryItem(moodHistory.length - 1 - index)} className="delete-btn" aria-label="Delete this history item">🗑️</button>
              </div>
              <p><strong>Emotion:</strong> {entry.emotion}</p>
              <p><strong>Sentence:</strong> {entry.sentence}</p>
              <p><strong>Age:</strong> {entry.age} | <strong>Gender:</strong> {entry.gender}</p>
              <p><strong>Face Distance:</strong> {entry.faceDistance} | <strong>Eye State:</strong> {entry.eyeState}</p>
              <p><strong>Facial Symmetry:</strong> {entry.facialSymmetry}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
