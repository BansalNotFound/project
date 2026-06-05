FROM python:3.10-slim

WORKDIR /app

# Install system dependencies needed for OpenCV or Pillow if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY ml_requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ml_service.py .

EXPOSE 5001

CMD ["python", "ml_service.py"]
