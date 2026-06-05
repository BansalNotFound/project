# MERN App Pipeline Schema - Face Recognition & Liveness Detection

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │  Enrollment UI   │  │ Verification UI  │  │  Dashboard   │   │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────┘   │
└───────────┼──────────────────────┼──────────────────────────────┘
            │                      │
            ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express.js Backend / Node.js                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         API Routes & Controllers                         │   │
│  │  /api/enroll    /api/verify    /api/users    /api/auth  │   │
│  └────────┬─────────────────────────────────────┬──────────┘   │
└───────────┼──────────────────────────────────────┼──────────────┘
            │                                      │
            ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│         ML Pipeline Service (Python Integration)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Liveness   │  │ Recognition  │  │  Embedding & Face DB │   │
│  │  Classifier  │  │  Embedding   │  │  Similarity Matching │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└───────────┬──────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│              MongoDB Database                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │    Users     │  │ Enrollments  │  │   Verification Logs  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Pipeline

### 1. Enrollment Pipeline
```
User Image (Frontend)
    ↓
[API: POST /api/enroll]
    ↓
Image Preprocessing (resize, normalize)
    ↓
Liveness Detection Model
    ├─ LIVE? Continue
    └─ SPOOF? Return error
    ↓
Face Recognition Embedding
    ↓
Compute Face Embedding (128-dim vector)
    ↓
Store in Face DB + MongoDB
    ↓
Return: {success: true, userId: "xxx", embedding: [...]}
```

### 2. Verification Pipeline
```
User Image (Frontend)
    ↓
[API: POST /api/verify]
    ↓
Image Preprocessing (resize, normalize)
    ↓
Liveness Detection Model
    ├─ LIVE? Continue
    └─ SPOOF? Return error
    ↓
Face Recognition Embedding
    ↓
Compute Live Face Embedding (128-dim vector)
    ↓
Retrieve Face DB from MongoDB
    ↓
Cosine Similarity Matching with stored embeddings
    ↓
Find best match (threshold: 0.6)
    ├─ Match found? Return user info
    └─ No match? Return unauthorized
    ↓
Log verification attempt
    ↓
Return: {success: true, userId: "xxx", confidence: 0.92}
```

### 3. Authentication Flow
```
Verified User (from verification pipeline)
    ↓
Generate JWT Token
    ↓
Store session in Redis/MongoDB
    ↓
Return token to frontend
    ↓
Frontend stores in localStorage/sessionStorage
    ↓
Subsequent requests include JWT in headers
```

## MongoDB Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  userId: String (unique),
  email: String (optional),
  name: String,
  phone: String (optional),
  createdAt: Date,
  enrollmentCount: Number,
  lastVerified: Date,
  isActive: Boolean,
  metadata: {
    location: String,
    deviceId: String,
    enrollmentImage: String (base64 or S3 URL)
  }
}
```

### Enrollments Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  embedding: [Float] (128-dimensional array),
  imageUrl: String (S3 or base64),
  enrollmentDate: Date,
  quality: {
    livenessScore: Float (0-1),
    faceQuality: Float (0-1),
    lightingQuality: Float (0-1)
  },
  metadata: {
    imageSize: Number,
    processingTime: Number (ms)
  }
}
```

### FaceDB Collection (Aggregated)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  masterEmbedding: [Float] (128-dimensional array, averaged from enrollments),
  embeddingCount: Number,
  lastUpdated: Date,
  version: Number
}
```

### VerificationLogs Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users, optional for failed attempts),
  matchedUserId: ObjectId (ref: Users),
  verificationDate: Date,
  result: String (enum: "success", "liveness_failed", "no_match", "low_confidence"),
  livenessScore: Float,
  confidence: Float (0-1),
  matchedEmbedding: [Float],
  inputImage: String (optional, S3 URL),
  processingTime: Number (ms),
  ipAddress: String,
  deviceInfo: {
    userAgent: String,
    platform: String,
    browserVersion: String
  }
}
```

## API Endpoints

### Authentication & Enrollment
```
POST /api/auth/enroll
  Input: {image: base64String, metadata: {name, email, phone}}
  Output: {success: boolean, userId: string, message: string}
  Status: 200, 400, 409

POST /api/auth/verify
  Input: {image: base64String}
  Output: {success: boolean, userId: string, confidence: number, token: JWT}
  Status: 200, 401, 422

POST /api/auth/logout
  Input: {}
  Output: {success: boolean}
  Status: 200
```

### User Management
```
GET /api/users/:userId
  Auth: Required (JWT)
  Output: {_id, email, name, phone, createdAt, enrollmentCount, lastVerified}
  Status: 200, 401, 404

PUT /api/users/:userId
  Auth: Required (JWT)
  Input: {name?, email?, phone?}
  Output: {success: boolean, user: {...}}
  Status: 200, 401, 404

DELETE /api/users/:userId
  Auth: Required (JWT)
  Output: {success: boolean, message: string}
  Status: 200, 401, 404
```

### Enrollments Management
```
GET /api/enrollments/:userId
  Auth: Required (JWT)
  Output: [{_id, enrollmentDate, quality, imageUrl}]
  Status: 200, 401, 404

POST /api/enrollments/:userId/add
  Auth: Required (JWT)
  Input: {image: base64String}
  Output: {success: boolean, enrollmentCount: number}
  Status: 200, 401, 422

DELETE /api/enrollments/:enrollmentId
  Auth: Required (JWT)
  Output: {success: boolean, message: string}
  Status: 200, 401, 404
```

### Verification Logs
```
GET /api/logs/verification
  Auth: Required (JWT), Admin
  Query: {userId?, startDate?, endDate?, limit: 100}
  Output: [{_id, userId, result, verificationDate, confidence}]
  Status: 200, 401, 403

GET /api/logs/verification/:userId
  Auth: Required (JWT or owned userId)
  Output: [{_id, result, verificationDate, confidence, ipAddress}]
  Status: 200, 401, 403, 404
```

## ML Model Integration

### Python Flask/FastAPI Service
```python
# routes/ml_routes.py
POST /ml/liveness
  Input: {image: base64String}
  Output: {is_live: boolean, confidence: float, processing_time: int}

POST /ml/embedding
  Input: {image: base64String}
  Output: {embedding: [float, ...], quality_score: float, processing_time: int}

POST /ml/match
  Input: {embedding: [float, ...], face_db: [{id, embedding}, ...], threshold: 0.6}
  Output: {matched: boolean, matched_id: string, confidence: float}
```

### Configuration
```yaml
ml_service:
  host: localhost
  port: 5000
  models:
    liveness:
      path: models/liveness_int8.tflite
      input_size: 80
      threshold: 0.5
    recognition:
      path: models/recognition_int8.tflite
      input_size: 112
      embedding_dim: 128
      threshold: 0.6
  preprocessing:
    normalize: true
    resize: true
    format: RGB
  performance:
    batch_size: 1
    max_queue_size: 10
    timeout: 30
```

## Security Considerations

1. **Image Handling**
   - Store only embeddings in database, not raw images
   - Images stored temporarily for processing only
   - Use S3/cloud storage for long-term image storage with encryption

2. **Authentication**
   - JWT tokens with 1-hour expiry
   - Refresh tokens with 7-day expiry
   - OAuth2 support (optional)

3. **Rate Limiting**
   - 5 verification attempts per minute per IP
   - 3 enrollments per day per user
   - Lockout after 5 failed verifications

4. **Data Privacy**
   - Encrypt embeddings at rest
   - HTTPS only for API communication
   - Audit logs for all access

5. **ML Model Security**
   - Input validation (image size, format)
   - Liveness detection to prevent spoofing
   - Anomaly detection for unusual patterns

## Deployment Architecture

```
Frontend (React)
├── Vercel/Netlify
└── Environment: Production

Backend (Node.js + Express)
├── Heroku/Railway/AWS EC2
├── Environment variables for API keys
└── Auto-scaling enabled

ML Service (Python)
├── Separate Docker container
├── GPU support (optional)
└── Load balancer

Database (MongoDB)
├── MongoDB Atlas (Managed)
├── Backup daily
└── Replica set for HA

Cache (Redis)
├── Session storage
└── Rate limiting

Storage (S3/Cloud Storage)
├── Enrollment images
├── Verification logs (optional)
└── Backups
```

## Error Handling

```javascript
{
  // Success
  success: true,
  data: {...},
  statusCode: 200,

  // Error
  success: false,
  error: {
    code: "LIVENESS_FAILED",
    message: "Face is not live",
    details: {
      livenessScore: 0.2,
      threshold: 0.5
    }
  },
  statusCode: 422
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| LIVENESS_FAILED | 422 | Face detected as spoof |
| NO_FACE_DETECTED | 422 | No face found in image |
| POOR_IMAGE_QUALITY | 422 | Image quality too low |
| NO_MATCH_FOUND | 401 | No matching face in database |
| LOW_CONFIDENCE | 401 | Match confidence below threshold |
| INVALID_TOKEN | 401 | JWT token invalid/expired |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## Performance Targets

- Liveness Detection: < 200ms
- Embedding Generation: < 300ms
- Face Matching: < 100ms
- Total Verification Time: < 700ms
- API Response Time: < 1000ms
- FaceDB Lookup: < 50ms

## Testing Strategy

```
Unit Tests
├── Model inference
├── Embedding similarity
└── Database operations

Integration Tests
├── Enrollment flow
├── Verification flow
└── Authentication flow

Load Tests
├── 100 concurrent verifications
├── 1000 RPS on verification endpoint
└── ML service throughput

Security Tests
├── SQL injection prevention
├── Rate limiting verification
├── JWT token validation
└── Image validation
```
