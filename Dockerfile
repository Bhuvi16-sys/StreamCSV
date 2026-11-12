FROM python:3.11-slim

# Install C++ compiler (needed to build streamcsv on Linux)
RUN apt-get update && apt-get install -y g++ cmake make && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the whole project (C++ source + backend)
COPY . .

# Compile the C++17 streaming engine for Linux
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build --target streamcsv

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Move into the backend folder for running
WORKDIR /app/backend

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
