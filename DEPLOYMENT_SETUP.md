# MERN Face Recognition & Liveness Detection - Deployment & Setup Guide

## Project Structure

```
NHAI_AI/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Enrollment.js
│   │   ├── FaceDB.js
│   │   └── VerificationLog.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── enrollments.js
│   │   └── logs.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── requestLogger.js
│   │   └── rateLimiter.js
│   ├── controllers/
│   │   └── authController.js
│   ├── ml_service.py
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── components/
│   │   ├── EnrollmentForm.jsx
│   │   └── VerificationForm.jsx
│   ├── App.jsx
│   ├── package.json
│   └── .env.example
├── models/
│   ├── recognition_embedding.keras
│   ├── recognition_int8.tflite
│   ├── liveness_int8.tflite
│   └── face_db.json
├── scripts/
│   ├── (existing training scripts)
│   └── export_tflite_liveness.py
├── MERN_PIPELINE_SCHEMA.md
└── DEPLOYMENT_SETUP.md (this file)
```

## Prerequisites

- Node.js 16+ and npm/yarn
- Python 3.8+
- MongoDB 4.4+ (local or MongoDB Atlas)
- Git
- Docker (optional, for containerization)

## Local Development Setup

### 1. Backend Setup

```bash
cd backend

# Create .env file
cp .env.example .env

# Update .env with your configuration
# For local development:
# MONGODB_URI=mongodb://localhost:27017/face-auth
# ML_SERVICE_URL=http://localhost:5001
# JWT_SECRET=your-development-secret-key

# Install dependencies
npm install

# Start backend server
npm start

# In another terminal, start ML service
python ml_service.py
```

### 2. Frontend Setup

```bash
cd frontend

# Create .env.local file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.local

# Install dependencies
npm install

# Start development server
npm start
```

The app will be available at `http://localhost:3000`

## MongoDB Setup

### Option A: Local MongoDB

```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Windows (using chocolatey)
choco install mongodb

# Linux (Ubuntu)
sudo apt-get install -y mongodb
sudo systemctl start mongod
```

### Option B: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a cluster
4. Get connection string
5. Update `.env` with connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/face-auth?retryWrites=true&w=majority
   ```

## ML Models Setup

### Export Models from Training Pipeline

```bash
# From project root
cd scripts

# Export TFLite models (if not already exported)
python export_tflite_liveness.py
python export_tflite_recognition.py

# Build face database from training data
python build_face_db.py
```

### Update ML Service Configuration

Edit `backend/.env`:

```env
LIVENESS_MODEL_PATH=../models/liveness_int8.tflite
RECOGNITION_MODEL_PATH=../models/recognition_embedding.keras
LIVENESS_THRESHOLD=0.5
MATCH_THRESHOLD=0.6
```

## Docker Deployment

### Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: face-auth-db
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: face-auth

  backend:
    build: ./backend
    container_name: face-auth-backend
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://mongodb:27017/face-auth
      ML_SERVICE_URL: http://ml-service:5001
      JWT_SECRET: your-secret-key
      NODE_ENV: production
    depends_on:
      - mongodb
    volumes:
      - ./models:/app/models

  ml-service:
    build: ./ml_service
    container_name: face-auth-ml
    ports:
      - "5001:5001"
    environment:
      LIVENESS_MODEL_PATH: /app/models/liveness_int8.tflite
      RECOGNITION_MODEL_PATH: /app/models/recognition_embedding.keras
    volumes:
      - ./models:/app/models

  frontend:
    build: ./frontend
    container_name: face-auth-frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:5000/api
    depends_on:
      - backend

volumes:
  mongo_data:
```

### Dockerfile for Backend

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

### Dockerfile for ML Service

Create `ml_service/Dockerfile`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ml_service.py .
COPY ../models /app/models

EXPOSE 5001

CMD ["python", "ml_service.py"]
```

### Run with Docker Compose

```bash
docker-compose build
docker-compose up
```

## Production Deployment

### Cloud Deployment Options

#### Option 1: Heroku

```bash
# Backend deployment
cd backend
heroku create face-auth-backend
heroku addons:create mongolab:sandbox
git push heroku main

# Frontend deployment
cd frontend
npm run build
# Deploy to Vercel or Netlify
```

#### Option 2: AWS

1. **Backend**: AWS Elastic Beanstalk or EC2
2. **Frontend**: AWS S3 + CloudFront
3. **Database**: AWS DocumentDB or MongoDB Atlas
4. **ML Service**: AWS Lambda or EC2

#### Option 3: Google Cloud

1. **Backend**: Cloud Run
2. **Frontend**: Firebase Hosting
3. **Database**: Firebase or Cloud Firestore
4. **ML Service**: Cloud Run

#### Option 4: Azure

1. **Backend**: App Service
2. **Frontend**: Static Web Apps
3. **Database**: Cosmos DB
4. **ML Service**: Container Instances

### Environment Configuration for Production

Create `.env.production`:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://prod-user:password@prod-cluster.mongodb.net/face-auth
ML_SERVICE_URL=https://ml-service.yourdomain.com
JWT_SECRET=generate-a-strong-random-secret-here
LIVENESS_THRESHOLD=0.6
MATCH_THRESHOLD=0.65
FRONTEND_URL=https://yourdomain.com
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### SSL/HTTPS Setup

```bash
# Using Let's Encrypt with nginx
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

## API Testing

### Using cURL

```bash
# Enrollment
curl -X POST http://localhost:5000/api/auth/enroll \
  -H "Content-Type: application/json" \
  -d @enrollment.json

# Verification
curl -X POST http://localhost:5000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d @verification.json

# Health Check
curl http://localhost:5000/api/health
```

### Using Postman

1. Import API collection from `backend/postman_collection.json`
2. Configure environment variables
3. Test endpoints with pre-built requests

## Monitoring & Logging

### Application Logging

All logs are output to console. For production:

```bash
# Using Winston for logging
npm install winston

# Update server.js to use Winston
```

### Database Monitoring

```javascript
// Monitor collection sizes
db.enrollments.stats()
db.verification_logs.stats()
```

### Performance Monitoring

```bash
# Use PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start server.js --name "face-auth"
pm2 logs
pm2 monit
```

## Database Backup & Recovery

### MongoDB Backup

```bash
# Local backup
mongodump --db face-auth --out ./backups

# MongoDB Atlas automated backups
# Enable in cluster settings (enabled by default)

# Restore from backup
mongorestore ./backups/face-auth
```

## Security Best Practices

1. **API Security**
   - Use HTTPS only
   - Enable CORS properly
   - Implement rate limiting
   - Validate all inputs

2. **Database Security**
   - Use strong passwords
   - Enable IP whitelisting (MongoDB Atlas)
   - Encrypt connections
   - Regular backups

3. **ML Models**
   - Prevent model theft (use TFLite, not full Keras)
   - Validate model inputs
   - Monitor prediction anomalies

4. **Secrets Management**
   - Never commit `.env` files
   - Use environment variables
   - Rotate JWT secrets regularly
   - Use secrets management services (AWS Secrets Manager, etc.)

## Troubleshooting

### Common Issues

**1. ML Service Connection Error**
```
Error: ML Service Error: ECONNREFUSED
```
Solution: Ensure ML service is running on the configured port

**2. MongoDB Connection Timeout**
```
MongooseError: connect ECONNREFUSED
```
Solution: Check MongoDB is running and URI is correct

**3. Image Upload Timeout**
```
Error: Request timeout (30s)
```
Solution: Increase timeout in backend or compress images

**4. CORS Errors**
```
Access to XMLHttpRequest blocked by CORS policy
```
Solution: Check CORS configuration in server.js

## Performance Optimization

### Backend Optimization

```javascript
// Enable response compression
import compression from 'compression';
app.use(compression());

// Implement caching
import redis from 'redis';
const redisClient = redis.createClient();

// Database indexing (already configured in models)
```

### Frontend Optimization

```javascript
// Code splitting
const EnrollmentForm = lazy(() => import('./components/EnrollmentForm'));

// Image compression before upload
const compressImage = (file) => {
  // Use sharp or similar library
};

// Service Worker for offline support
```

### ML Model Optimization

- Use quantized TFLite models (already done)
- Batch processing for multiple verifications
- GPU acceleration (if available)

## Monitoring & Analytics

### Key Metrics to Track

1. **Verification Success Rate**
   ```
   successRate = successfulVerifications / totalVerifications * 100
   ```

2. **Average Processing Time**
   - Liveness detection: < 200ms
   - Embedding generation: < 300ms
   - Face matching: < 100ms

3. **Error Rates**
   - Liveness failed
   - No match found
   - Low confidence matches

4. **User Metrics**
   - Active users
   - Failed attempts
   - Unique face IDs

## Maintenance

### Regular Tasks

- **Daily**: Monitor logs, check error rates
- **Weekly**: Database optimization, backup verification
- **Monthly**: Model performance review, threshold adjustment
- **Quarterly**: Security audit, dependency updates

### Updating Dependencies

```bash
# Backend
cd backend
npm outdated
npm update

# Frontend
cd frontend
npm outdated
npm update

# Python
pip list --outdated
pip install --upgrade <package>
```

## Support & Contact

For issues or questions:
- Check logs: `pm2 logs` or Docker logs
- Review API documentation
- Check database connectivity
- Verify model files exist and are readable

## License

MIT License - See LICENSE file for details
