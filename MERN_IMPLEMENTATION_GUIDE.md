# MERN Face Recognition & Liveness Detection - Implementation Guide

## Quick Start

### 1. Clone and Setup

```bash
cd NHAI_AI
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 2. Local Development (Without Docker)

#### Terminal 1: Backend
```bash
cd backend
npm install
npm start
```

#### Terminal 2: ML Service
```bash
cd backend
pip install -r ml_requirements.txt
python ml_service.py
```

#### Terminal 3: Frontend
```bash
cd frontend
npm install
npm start
```

App runs at: `http://localhost:3000`

### 3. Docker Deployment

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## System Architecture

### Data Flow

```
User Image
    ↓
[Frontend: Camera/Upload]
    ↓
[Backend API: /api/auth/enroll or /api/auth/verify]
    ↓
[Image Preprocessing]
    ↓
[ML Service: Liveness Detection]
    ↓
[ML Service: Face Embedding]
    ↓
[MongoDB: Store/Retrieve Data]
    ↓
[Response to Frontend]
```

## Key Components

### Backend

**Models:**
- `User.js` - User account information
- `Enrollment.js` - Face enrollment records
- `FaceDB.js` - Aggregated face embeddings
- `VerificationLog.js` - Verification attempts

**Controllers:**
- `authController.js` - Handles enrollment and verification logic

**Middleware:**
- `auth.js` - JWT authentication
- `rateLimiter.js` - Rate limiting
- `errorHandler.js` - Error handling
- `requestLogger.js` - Request logging

### Frontend

**Components:**
- `EnrollmentForm.jsx` - Face enrollment UI
- `VerificationForm.jsx` - Face verification UI
- `App.jsx` - Main application component

### ML Service

**Endpoints:**
- `POST /ml/liveness` - Liveness detection
- `POST /ml/embedding` - Face embedding extraction
- `POST /ml/match` - Face matching against database

## API Endpoints

### Authentication

```javascript
// Enroll
POST /api/auth/enroll
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "image": "data:image/jpeg;base64,..."
}

// Verify
POST /api/auth/verify
{
  "image": "data:image/jpeg;base64,..."
}

// Logout
POST /api/auth/logout
```

### User Management

```javascript
// Get user
GET /api/users/:userId

// Update user
PUT /api/users/:userId

// Delete user
DELETE /api/users/:userId
```

### Enrollments

```javascript
// Get enrollments
GET /api/enrollments/:userId

// Add enrollment
POST /api/enrollments/:userId/add

// Delete enrollment
DELETE /api/enrollments/:enrollmentId
```

### Logs

```javascript
// Get user verification logs
GET /api/logs/user/:userId

// Get all logs (admin)
GET /api/logs/admin/all
```

## Database Schema

### Users
```json
{
  "_id": ObjectId,
  "userId": "unique-string",
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "1234567890",
  "enrollmentCount": 1,
  "lastVerified": "2024-01-01T00:00:00Z",
  "isActive": true,
  "statistics": {
    "totalVerifications": 10,
    "successfulVerifications": 9,
    "failedVerifications": 1,
    "successRate": 90
  }
}
```

### Enrollments
```json
{
  "_id": ObjectId,
  "userId": ObjectId,
  "embedding": [0.1, 0.2, ...],
  "imageUrl": "base64-or-s3-url",
  "quality": {
    "livenessScore": 0.95,
    "overallQuality": 0.88
  },
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### FaceDB
```json
{
  "_id": ObjectId,
  "userId": ObjectId,
  "masterEmbedding": [0.1, 0.2, ...],
  "embeddingCount": 3,
  "version": 1,
  "status": "active"
}
```

## Configuration

### Environment Variables

**Backend (.env):**
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `ML_SERVICE_URL` - ML service URL
- `LIVENESS_THRESHOLD` - Liveness confidence threshold (0-1)
- `MATCH_THRESHOLD` - Face match confidence threshold (0-1)

**Frontend (.env.local):**
- `REACT_APP_API_URL` - Backend API URL

**ML Service (.env):**
- `ML_SERVICE_PORT` - ML service port (default: 5001)
- `LIVENESS_MODEL_PATH` - Path to liveness model
- `RECOGNITION_MODEL_PATH` - Path to recognition model

## Performance Benchmarks

| Operation | Target Time | Typical Time |
|-----------|------------|--------------|
| Liveness Detection | < 200ms | 150ms |
| Embedding Generation | < 300ms | 250ms |
| Face Matching | < 100ms | 50ms |
| Total Verification | < 700ms | 550ms |
| API Response | < 1000ms | 700ms |

## Security Considerations

1. **Data Protection**
   - Only embeddings stored in database (not raw images)
   - HTTPS/TLS for all communications
   - JWT tokens for API authentication

2. **Model Security**
   - Using quantized TFLite models (prevents model extraction)
   - Input validation on all images
   - Liveness detection prevents spoofing

3. **Rate Limiting**
   - 5 verification attempts per minute per IP
   - 3 enrollments per day per user
   - Automatic lockout after failures

4. **Data Privacy**
   - GDPR compliant user deletion
   - Audit logs for all access
   - Encryption at rest (configurable)

## Troubleshooting

### ML Service Not Connecting

```bash
# Check if service is running
curl http://localhost:5001/health

# Check service logs
docker-compose logs ml-service

# Verify port is not in use
lsof -i :5001
```

### Database Connection Issues

```bash
# Test MongoDB connection
mongosh "mongodb://localhost:27017"

# For Atlas, verify:
# 1. Connection string is correct
# 2. IP is whitelisted
# 3. Username/password are correct
```

### Image Upload Errors

```
413 Payload Too Large
```
Solution: Increase `client_max_body_size` in nginx config or backend

```
422 Unprocessable Entity - LIVENESS_FAILED
```
Solution: Ensure face is clearly visible and head-on

## Extending the System

### Adding OAuth2 Authentication

```javascript
// In backend/routes/auth.js
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';

// Configure and use strategy
```

### Adding Multi-Factor Authentication

```javascript
// In backend/models/User.js
twoFactorEnabled: Boolean,
twoFactorSecret: String,
backupCodes: [String]
```

### Database Replication

```yaml
# In docker-compose.yml
mongodb:
  environment:
    REPLICA_SET: rs0
  command: --replSet rs0
```

## Monitoring & Debugging

### View Logs

```bash
# Backend logs
docker-compose logs -f backend

# ML Service logs
docker-compose logs -f ml-service

# Database logs
docker-compose logs -f mongodb
```

### Database Queries

```javascript
// Find failed verifications
db.verification_logs.find({ result: 'liveness_failed' }).limit(10)

// Get user statistics
db.users.findOne({ userId: 'xxx' })

// Check embeddings
db.face_db.find({ userId: ObjectId('...') })
```

## Production Deployment Checklist

- [ ] Update all environment variables
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure MongoDB backups
- [ ] Set up monitoring and alerting
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Test all API endpoints
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure CDN for frontend
- [ ] Load test the system
- [ ] Create runbook for common issues
- [ ] Set up CI/CD pipeline

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Verify all services are running
4. Check database connectivity
5. Ensure model files are in correct location

## References

- [Face Recognition Models](../scripts/train_recognition.py)
- [Liveness Detection Models](../scripts/train_liveness.py)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [TensorFlow Lite Guide](https://www.tensorflow.org/lite)

## License

MIT - See LICENSE file for details
