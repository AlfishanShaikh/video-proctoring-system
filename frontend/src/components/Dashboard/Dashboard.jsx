import React, { useState, useEffect, useRef } from 'react'
import CameraView from '../Camera/CameraView'
import DetectionPanel from '../DetectionPanel/DetectionPanel'
import { useFocusDetection } from '../../hooks/useFocusDetection'
import { useObjectDetection } from '../../hooks/useObjectDetection'
import { useCamera } from '../../hooks/useCamera'
import { apiService } from '../../services/apiService'; // Make sure this file exists
import styles from './Dashboard.module.css'

const Dashboard = ({ onSessionComplete }) => {
    const [isSessionActive, setIsSessionActive] = useState(false)
    const [candidateName, setCandidateName] = useState('')
    const [sessionId, setSessionId] = useState(null)
    const [sessionStartTime, setSessionStartTime] = useState(null)
    const [events, setEvents] = useState([])
    const [sessionTimer, setSessionTimer] = useState(0); 
    const intervalRef = useRef(null)
    const timerIntervalRef = useRef(null); 

    const {
        videoRef,
        canvasRef,
        stream,
        startCamera,
        stopCamera,
        isRecording,
        startRecording,
        stopRecording
    } = useCamera()

    const {
        focusData,
        processFocusDetection
    } = useFocusDetection(videoRef, canvasRef)

    const {
        objectData,
        processObjectDetection
    } = useObjectDetection(videoRef, canvasRef)

    const startSession = async () => {
        if (!candidateName.trim()) {
            alert('Please enter candidate name')
            return
        }
        try {
            await startCamera()
            await startRecording()

            const session = await apiService.createSession({
                candidateName: candidateName.trim(),
                startTime: new Date().toISOString()
            })

            setSessionId(session.id)
            setSessionStartTime(new Date())
            setIsSessionActive(true)
            setEvents([])
            setSessionTimer(0); 

            // Start detection loops
            intervalRef.current = setInterval(() => {
                processFocusDetection()
                processObjectDetection()
            }, 1000)

            // Start session timer
            timerIntervalRef.current = setInterval(() => {
                setSessionTimer(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error starting session:', error)
            alert('Failed to start session. Check console for errors.')
        }
    }

    const endSession = async () => {
        try {
            clearInterval(intervalRef.current)
            clearInterval(timerIntervalRef.current); 
            await stopRecording()
            stopCamera()

            const sessionEndTime = new Date();
            const sessionDuration = (sessionEndTime.getTime() - sessionStartTime.getTime()) / 1000; // in seconds

            const sessionData = {
                sessionId,
                candidateName,
                startTime: sessionStartTime,
                endTime: sessionEndTime,
                duration: sessionDuration,
                events,
                focusSummary: {
                    focusLostCount: events.filter(e => e.type === 'FOCUS_LOST').length,
                    noFaceCount: events.filter(e => e.type === 'NO_FACE').length,
                    multipleFacesCount: events.filter(e => e.type === 'MULTIPLE_FACES').length,
                    eyeClosureCount: events.filter(e => e.type === 'EYE_CLOSURE').length,
                },
                objectSummary: {
                    totalDetections: events.filter(e => e.type === 'SUSPICIOUS_OBJECT').length,
                    items: [...new Set(events.filter(e => e.type === 'SUSPICIOUS_OBJECT').map(e => e.data?.class).filter(Boolean))]
                }
            }

            await apiService.endSession(sessionId, sessionData)
            onSessionComplete(sessionData) 
            setIsSessionActive(false)
            setSessionId(null)
            setCandidateName('')
            setSessionTimer(0); 
        } catch (error) {
            console.error('Error ending session:', error)
        }
    }

    // Debounced addEvent to prevent spamming
    const lastEventTimeRef = useRef({});
    const addEvent = (event) => {
        const now = Date.now();
        const lastTime = lastEventTimeRef.current[event.type] || 0;
        
        // Only log same event type every 3 seconds
        if (now - lastTime < 3000) {
            return; 
        }
        lastEventTimeRef.current[event.type] = now;

        const newEvent = {
            ...event,
            timestamp: new Date().toISOString(),
            sessionTime: Date.now() - sessionStartTime?.getTime()
        }
        setEvents(prev => [...prev, newEvent])
        
        if (sessionId) {
            apiService.logEvent(sessionId, newEvent);
        }
    }

    useEffect(() => {
        if (!isSessionActive) return;

        if (focusData.focusLostDuration > 5000) {
            addEvent({
                type: 'FOCUS_LOST',
                severity: 'warning',
                // --- FIXED ---
                message: \`Focus lost for ${Math.round(focusData.focusLostDuration / 1000)}s\`,
                data: focusData
            })
        }
        if (focusData.noFaceDuration > 10000) {
            addEvent({
                type: 'NO_FACE',
                severity: 'danger',
                // --- FIXED ---
                message: \`No face detected for ${Math.round(focusData.noFaceDuration / 1000)}s\`,
                data: focusData
            })
        }
        if (focusData.multipleFaces) {
            addEvent({
                type: 'MULTIPLE_FACES',
                severity: 'danger',
                message: 'Multiple faces detected in frame',
                data: focusData
            })
        }
    }, [focusData, isSessionActive])

    useEffect(() => {
        if (!isSessionActive) return;

        const suspiciousObjects = objectData.detectedObjects.filter(obj => obj.class !== 'person');
        
        if (suspiciousObjects.length > 0) {
            suspiciousObjects.forEach(obj => {
                addEvent({
                    type: 'SUSPICIOUS_OBJECT',
                    severity: 'danger',
                    // --- FIXED ---
                    message: \`${obj.class} detected (${Math.round(obj.confidence * 100)}% confidence)\`,
                    data: obj
                })
            })
        }
    }, [objectData, isSessionActive])

    // Helper function to format timer
    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        // --- FIXED ---
        return \`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}\`;
    };

    return (
        <div className={styles.dashboard}>
            <div className={styles.header}>
                <div className={styles.sessionInfo}>
                    <h2>Interview Session</h2>
                    {isSessionActive && (
                        <div className={styles.liveIndicator}>
                            <span className={styles.liveDot}></span>
                            LIVE
                        </div>
                    )}
                </div>

                {!isSessionActive ? (
                    <div className={styles.startSession}>
                        <input
                            type="text"
                            placeholder="Enter candidate name"
                            value={candidateName}
                            onChange={(e) => setCandidateName(e.target.value)}
                            className={styles.nameInput}
                        />
                        <button onClick={startSession} className={styles.startBtn}>
                            Start Interview
                        </button>
                    </div>
                ) : (
                    <div className={styles.sessionControls}>
                        <span className={styles.timer}>
                            {formatTimer(sessionTimer)}
                        </span>
                        <button onClick={endSession} className={styles.endBtn}>
                            End Interview
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.content}>
                <div className={styles.videoSection}>
                    <CameraView
                        videoRef={videoRef}
                        canvasRef={canvasRef}
                        isActive={isSessionActive}
                        focusData={focusData}
                        objectData={objectData}
                    />
                </div>
                <div className={styles.detectionSection}>
                    <DetectionPanel
                        focusData={focusData}
                        objectData={objectData}
                        events={events}
                        isActive={isSessionActive} 
                    />
                </div>
            </div>
        </div>
    )
}

export default Dashboard
