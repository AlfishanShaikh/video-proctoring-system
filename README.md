# 🎥 Video Interview Proctoring System

A comprehensive video proctoring system for online interviews that detects candidate focu

## 🚀 Features

- **Real-time Focus Detection**: Monitors if candidate is looking at screen
- **Face Detection**: Detects presence/absence of face and multiple faces
- **Object Detection**: Identifies suspicious items (phones, books, notes)
- **Eye Closure Detection**: Detects drowsiness/eye closure
- **Live Recording**: Records interview sessions
- **Integrity Scoring**: Calculates interview integrity score
- **Detailed Reports**: Generates comprehensive proctoring reports

## 🛠️Tech Stack

### Frontend

- **React 18** with Vite
- **TensorFlow.js** for object detection
- **MediaPipe** for face mesh detection
- **React Webcam** for camera access

### Backend

- **Node.js** with Express
- **MongoDB** with Mongoose
- **Socket.io** for real-time updates

## 📦 Installation

### Prerequisites

- Node.js 16+ and npm
- MongoDB (local or Atlas)
- Modern browser with camera access

### Backend Setup

- cd backend
- npm install
- cp .env.example .env
