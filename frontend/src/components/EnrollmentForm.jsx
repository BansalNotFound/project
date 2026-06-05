import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function EnrollmentForm({ onEnrollSuccess }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Start webcam
  const startCamera = async () => {
    setStatus({ type: '', message: '' });
    setCapturedImage(null);
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
    }
  };

  // File upload fallback disabled for security purposes

  // Submit enrollment
  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setStatus({ type: 'error', message: 'Name is required' });
      return;
    }
    if (!capturedImage) {
      setStatus({ type: 'error', message: 'Please perform a live face scan' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        image: capturedImage,
        metadata: {
          location: 'Toll Plaza Alpha',
          deviceId: 'Booth-Reader-01'
        }
      };

      const res = await axios.post(`${API_URL}/auth/enroll`, payload);
      
      setStatus({
        type: 'success',
        message: `Enrollment successful! Liveness Score: ${res.data.data.enrollment.livenessScore.toFixed(2)}, Quality: ${res.data.data.enrollment.qualityScore.toFixed(2)}`
      });
      
      if (onEnrollSuccess) {
        onEnrollSuccess(res.data.data);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || 'Enrollment failed. Please try again.';
      setStatus({ type: 'error', message: errorMsg });
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
    <form onSubmit={handleEnroll}>
      <h2>Biometric Enrollment Gateway</h2>
      
      {status.message && (
        <div className={`alert alert-${status.type}`}>
          {status.type === 'success' ? '✓' : '⚠'} {status.message}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Operator / Employee Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required 
        />
      </div>

      <div className="form-group">
        <label className="form-label">Email ID (Optional)</label>
        <input 
          type="email" 
          className="form-input" 
          placeholder="operator@nhai.org"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Phone Number (Optional)</label>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Mobile number"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      <label className="form-label">Live Face Scan</label>
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
              📷 Capture Photo
            </button>
          </>
        ) : capturedImage ? (
          <>
            <img src={capturedImage} alt="Captured preview" className="camera-preview" />
            <div className="scanner-overlay">
              <div className="scanner-ring success" />
            </div>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ position: 'absolute', bottom: '10px', width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              onClick={startCamera}
            >
              🔄 Recapture
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Webcam scanning is required for biometric validation</p>
            <button type="button" className="btn-primary" onClick={startCamera}>
              🔌 Activate Webcam
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Processing Biometrics...' : 'Register Operator Profile'}
      </button>
    </form>
  );
}
