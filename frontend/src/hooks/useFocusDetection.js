import { useState, useRef, useEffect } from 'react'
import { FaceMesh } from '@mediapipe/face_mesh'
export const useFocusDetection = (videoRef, canvasRef) => {
const [focusData, setFocusData] = useState({
faceDetected: false,
lookingAtScreen: false,
focusScore: 0,
focusLostDuration: 0,
noFaceDuration: 0,
multipleFaces: false,
eyeClosure: false
})
const faceMeshRef = useRef(null)
const lastFocusTime = useRef(Date.now())
src/hooks/useFocusDetection.js
const lastFaceTime = useRef(Date.now())
useEffect(() => {
// Initialize MediaPipe FaceMesh
const faceMesh = new FaceMesh({
locateFile: (file) => {
return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
}
})
faceMesh.setOptions({
maxNumFaces: 3,
refineLandmarks: true,
minDetectionConfidence: 0.5,
minTrackingConfidence: 0.5
})
faceMesh.onResults(onFaceResults)
faceMeshRef.current = faceMesh
return () => {
if (faceMeshRef.current) {
faceMeshRef.current.close()
}
}
}, [])
const onFaceResults = (results) => {
const canvas = canvasRef.current
const video = videoRef.current
if (!canvas || !video) return
const ctx = canvas.getContext('2d')
canvas.width = video.videoWidth
canvas.height = video.videoHeight
ctx.clearRect(0, 0, canvas.width, canvas.height)
const currentTime = Date.now()
let newFocusData = { ...focusData }
if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
newFocusData.faceDetected = true
newFocusData.multipleFaces = results.multiFaceLandmarks.length > 1
newFocusData.noFaceDuration = 0
lastFaceTime.current = currentTime
const landmarks = results.multiFaceLandmarks[0]
// Draw face landmarks
drawFaceLandmarks(ctx, landmarks, canvas.width, canvas.height)
// Calculate gaze direction
const gazeData = calculateGaze(landmarks)
newFocusData.lookingAtScreen = gazeData.lookingAtScreen
newFocusData.eyeClosure = gazeData.eyeClosure
if (gazeData.lookingAtScreen) {
lastFocusTime.current = currentTime
newFocusData.focusLostDuration = 0
} else {
newFocusData.focusLostDuration = currentTime - lastFocusTime.current
}
} else {
newFocusData.faceDetected = false
newFocusData.lookingAtScreen = false
newFocusData.noFaceDuration = currentTime - lastFaceTime.current
newFocusData.focusLostDuration = currentTime - lastFocusTime.current
}
// Calculate focus score
newFocusData.focusScore = calculateFocusScore(newFocusData)
setFocusData(newFocusData)
}
const drawFaceLandmarks = (ctx, landmarks, width, height) => {
ctx.fillStyle = '#00FF00'
ctx.strokeStyle = '#00FF00'
ctx.lineWidth = 1
// Draw face outline
const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365
ctx.beginPath()
faceOval.forEach((pointIndex, index) => {
const point = landmarks[pointIndex]
const x = point.x * width
const y = point.y * height
if (index === 0) {
ctx.moveTo(x, y)
} else {
ctx.lineTo(x, y)
}
})
ctx.stroke()
// Draw eyes
drawEye(ctx, landmarks, [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159
drawEye(ctx, landmarks, [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387,
}
const drawEye = (ctx, landmarks, eyePoints, width, height) => {
ctx.beginPath()
eyePoints.forEach((pointIndex, index) => {
const point = landmarks[pointIndex]
const x = point.x * width
const y = point.y * height
if (index === 0) {
ctx.moveTo(x, y)
} else {
ctx.lineTo(x, y)
}
})
ctx.closePath()
ctx.stroke()
}
const calculateGaze = (landmarks) => {
// Simple gaze estimation based on eye landmarks
const leftEye = landmarks[33]
const rightEye = landmarks[263]
const noseTip = landmarks[1]
const chin = landmarks[175]
// Calculate head pose
const faceVector = {
x: (leftEye.x + rightEye.x) / 2 - noseTip.x,
y: (leftEye.y + rightEye.y) / 2 - noseTip.y
}
// Simple threshold-based gaze detection
const gazeThreshold = 0.05
const lookingAtScreen = Math.abs(faceVector.x) < gazeThreshold && Math.abs(faceVector
// Eye aspect ratio for drowsiness detection
const leftEyeEAR = calculateEAR(landmarks, [33, 160, 158, 133, 153, 144])
const rightEyeEAR = calculateEAR(landmarks, [362, 385, 387, 263, 373, 380])
const avgEAR = (leftEyeEAR + rightEyeEAR) / 2
const eyeClosure = avgEAR < 0.2
return { lookingAtScreen, eyeClosure }
}
const calculateEAR = (landmarks, eyePoints) => {
// Eye Aspect Ratio calculation
const [p1, p2, p3, p4, p5, p6] = eyePoints.map(i => landmarks[i])
const verticalDist1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2))
const verticalDist2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2))
const horizontalDist = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2))
return (verticalDist1 + verticalDist2) / (2 * horizontalDist)
}
const calculateFocusScore = (data) => {
let score = 100
if (!data.faceDetected) score -= 50
if (!data.lookingAtScreen) score -= 20
if (data.multipleFaces) score -= 30
if (data.eyeClosure) score -= 15
if (data.focusLostDuration > 5000) score -= 20
if (data.noFaceDuration > 10000) score -= 40
return Math.max(0, score)
}
const processFocusDetection = async () => {
const video = videoRef.current
if (!video || !faceMeshRef.current) return
if (video.readyState === 4) {
await faceMeshRef.current.send({ image: video })
}
}
return {
focusData,
processFocusDetection
}
}
