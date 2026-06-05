import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function VerificationForm({ onVerifySuccess }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [matchData, setMatchData] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Start webcam
  const startCamera = async () => {
    setStatus({ type: '', message: '', code: '' });
    setCapturedImage(null);
    setMatchData(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.error(err);
      setStatus({
        type: 'error',
        message: 'Could not access webcam. Please check browser permissions and allow camera access.'
      });
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Capture frame
  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64Img = canvas.toDataURL('image/jpeg');
      setCapturedImage(base64Img);
      stopCamera();
      
      // Auto-trigger verification after capture
      verifyFace(base64Img);
    }
  };

  // File upload fallback disabled for security purposes

  // Run verification
  const verifyFace = async (imageBase64) => {
    setLoading(true);
    setStatus({ type: '', message: '', code: '' });
    setMatchData(null);

    try {
      const res = await axios.post(`${API_URL}/auth/verify`, { image: imageBase64 });
      
      const data = res.data.data;
      setMatchData(data);
      setStatus({
        type: 'success',
        message: `Verified successfully! Operator: ${data.name}. Liveness: ${data.verification.livenessScore.toFixed(2)}, Match Confidence: ${data.verification.confidence.toFixed(2)}`
      });

      if (onVerifySuccess) {
        onVerifySuccess(data);
      }
    } catch (err) {
      console.error(err);
      const errResponse = err.response?.data?.error;
      setStatus({
        type: 'error',
        message: errResponse?.message || 'Biometric verification failed.',
        code: errResponse?.code || 'AUTH_FAILED'
      });
    } finally {
      setLoading(false);
    }
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div>
      <h2>Operator Verification Portal</h2>
      
      {status.message && (
        <div className={`alert alert-${status.type}`}>
          {status.type === 'success' ? '✓' : '⚠'} {status.message}
        </div>
      )}

      <label className="form-label">Webcam Face Scanner</label>
      <div className="camera-container">
        {cameraActive ? (
          <>
            <video 
              ref={(el) => {
                videoRef.current = el;
                if (el && streamRef.current) {
                  el.srcObject = streamRef.current;
                }
              }} 
              autoPlay 
              playsInline 
              className="camera-preview" 
            />
            <div className="scanner-overlay">
              <div className="scanner-ring scanning" />
              <div className="scanner-line" />
            </div>
            <button 
              type="button" 
              className="btn-primary" 
              style={{ position: 'absolute', bottom: '10px', width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              onClick={captureFrame}
            >
              🔐 Scan & Authenticate
            </button>
          </>
        ) : capturedImage ? (
          <>
            <img src={capturedImage} alt="Captured preview" className="camera-preview" />
            <div className="scanner-overlay">
              <div className={`scanner-ring ${status.type}`} />
            </div>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ position: 'absolute', bottom: '10px', width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              onClick={startCamera}
              disabled={loading}
            >
              🔄 Re-scan Face
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Webcam scan is required for secure authentication</p>
            <button type="button" className="btn-primary" onClick={startCamera}>
              📷 Open Scanner
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {loading && (
        <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--text-secondary)' }}>
          <p>Analyzing facial landmarks...</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Checking for liveness spoof and database matches</p>
        </div>
      )}
    </div>
  );
}
