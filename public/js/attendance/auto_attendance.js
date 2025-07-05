document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const webcamElement = document.getElementById('webcam');
    const canvasElement = document.getElementById('canvas');
    const statusOverlay = document.getElementById('status-overlay');
    const statusMessage = document.getElementById('status-message');
    const countdownTimer = document.getElementById('countdown-timer');
    const systemState = document.getElementById('system-state');
    const rfidStatus = document.getElementById('rfid-status');
    const studentCard = document.getElementById('student-card');
    const studentPhoto = document.getElementById('student-photo');
    const studentName = document.getElementById('student-name');
    const studentId = document.getElementById('student-id');
    const studentDepartment = document.getElementById('student-department');
    const verificationResult = document.getElementById('verification-result');
    const resultIcon = document.getElementById('result-icon');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const resultDetails = document.getElementById('result-details');
    const startSystemBtn = document.getElementById('start-system');
    const resetSystemBtn = document.getElementById('reset-system');
    const refreshActivityBtn = document.getElementById('refresh-activity');
    const recentActivity = document.getElementById('recent-activity');

    // State variables
    let stream = null;
    let socket = null;
    let captureInterval = null;
    let countdownInterval = null;
    let systemActive = false;
    let currentState = 'WAITING_FOR_RFID';

    // Initialize the page
    initPage();

    // Functions
    function initPage() {
        // Connect to socket
        connectSocket();
        
        // Load recent activity
        loadRecentActivity();
        
        // Add event listeners
        startSystemBtn.addEventListener('click', startSystem);
        resetSystemBtn.addEventListener('click', resetSystem);
        refreshActivityBtn.addEventListener('click', loadRecentActivity);
        
        // Start camera
        startCamera();
    }

    // Connect to WebSocket
    function connectSocket() {
        socket = io();
        
        socket.on('connect', () => {
            console.log('Connected to server');
            updateSystemState('CONNECTED', 'bg-success');
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            updateSystemState('DISCONNECTED', 'bg-danger');
        });
        
        // Listen for system state changes
        socket.on('systemState', (data) => {
            console.log('System state update:', data);
            currentState = data.state;
            
            // Update UI based on state
            updateUIForState(data);
        });
        
        // Listen for RFID detection
        socket.on('rfidDetected', (data) => {
            console.log('RFID detected:', data);
            updateRfidStatus('DETECTED', 'bg-success');
            
            // If we're in manual mode, we need to handle this
            if (systemActive && currentState === 'WAITING_FOR_RFID') {
                // No need to do anything, the server controller will handle it
            }
        });
        
        // Listen for attendance marked
        socket.on('attendanceMarked', (data) => {
            console.log('Attendance marked:', data);
            showSuccessResult(data);
        });
        
        // Listen for errors
        socket.on('systemError', (data) => {
            console.error('System error:', data);
            showErrorResult(data);
        });
        
        // Listen for max retries reached
        socket.on('maxRetriesReached', (data) => {
            console.log('Max retries reached:', data);
            showErrorResult({
                message: 'Max verification attempts reached',
                errorType: data.errorType,
                student: data.student
            });
        });
    }

    // Start the camera
    async function startCamera() {
        try {
            // Request camera access
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            // Set video source
            webcamElement.srcObject = stream;
            
            // Wait for video to be ready
            await new Promise(resolve => {
                webcamElement.onloadedmetadata = () => {
                    resolve();
                };
            });
            
            // Start playing video
            await webcamElement.play();
            
            console.log('Camera started');
        } catch (error) {
            console.error('Error starting camera:', error);
            statusMessage.textContent = 'Camera error. Please check permissions.';
            statusOverlay.classList.add('bg-danger');
        }
    }

    // Capture photo from webcam
    function capturePhoto() {
        try {
            // Set canvas dimensions to match video
            canvasElement.width = webcamElement.videoWidth;
            canvasElement.height = webcamElement.videoHeight;
            
            // Draw video frame to canvas
            const context = canvasElement.getContext('2d');
            context.drawImage(webcamElement, 0, 0, canvasElement.width, canvasElement.height);
            
            // Get image data as base64
            return canvasElement.toDataURL('image/jpeg');
        } catch (error) {
            console.error('Error capturing photo:', error);
            return null;
        }
    }

    // Start automatic photo capture
    function startAutomaticCapture() {
        // Clear any existing interval
        if (captureInterval) {
            clearInterval(captureInterval);
        }
        
        // Capture a photo every 500ms when in CAPTURING_FACE state
        captureInterval = setInterval(() => {
            if (currentState === 'CAPTURING_FACE') {
                const imageData = capturePhoto();
                if (imageData) {
                    // Send to server
                    socket.emit('faceCaptured', { imageData });
                }
            }
        }, 500);
    }

    // Stop automatic photo capture
    function stopAutomaticCapture() {
        if (captureInterval) {
            clearInterval(captureInterval);
            captureInterval = null;
        }
    }

    // Start countdown timer
    function startCountdown(seconds, onComplete) {
        // Clear any existing interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        
        // Show countdown timer
        countdownTimer.style.display = 'block';
        
        // Set initial value
        let remaining = seconds;
        countdownTimer.textContent = remaining;
        
        // Start interval
        countdownInterval = setInterval(() => {
            remaining--;
            countdownTimer.textContent = remaining;
            
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                countdownTimer.style.display = 'none';
                
                if (onComplete) {
                    onComplete();
                }
            }
        }, 1000);
    }

    // Update UI based on system state
    function updateUIForState(data) {
        const state = data.state;
        
        // Update system state indicator
        updateSystemState(state);
        
        // Update status message
        switch (state) {
            case 'WAITING_FOR_RFID':
                statusMessage.textContent = 'Waiting for RFID card...';
                statusOverlay.className = 'status-overlay';
                hideStudentInfo();
                hideVerificationResult();
                break;
                
            case 'CAPTURING_FACE':
                if (data.student) {
                    showStudentInfo(data.student);
                    statusMessage.textContent = data.retryCount 
                        ? `Retry ${data.retryCount}: Look at the camera...` 
                        : 'Look at the camera...';
                    statusOverlay.className = 'status-overlay pulse-animation';
                    
                    // Start automatic capture
                    startAutomaticCapture();
                }
                break;
                
            case 'VERIFYING':
                statusMessage.textContent = 'Verifying identity...';
                statusOverlay.className = 'status-overlay';
                break;
                
            case 'PROCESSING_RESULT':
                statusMessage.textContent = 'Processing result...';
                statusOverlay.className = 'status-overlay';
                
                // Stop automatic capture
                stopAutomaticCapture();
                
                // Show result if available
                if (data.result) {
                    if (data.result.success) {
                        showSuccessResult(data.result);
                    } else {
                        showErrorResult(data.result);
                    }
                }
                break;
        }
    }

    // Update system state indicator
    function updateSystemState(state, className) {
        systemState.textContent = state;
        
        if (className) {
            systemState.className = `badge ${className}`;
        } else {
            // Set class based on state
            switch (state) {
                case 'WAITING_FOR_RFID':
                    systemState.className = 'badge bg-info';
                    break;
                case 'CAPTURING_FACE':
                    systemState.className = 'badge bg-primary';
                    break;
                case 'VERIFYING':
                    systemState.className = 'badge bg-warning';
                    break;
                case 'PROCESSING_RESULT':
                    systemState.className = 'badge bg-secondary';
                    break;
                default:
                    systemState.className = 'badge bg-secondary';
            }
        }
    }

    // Update RFID status
    function updateRfidStatus(status, className) {
        rfidStatus.textContent = `RFID: ${status}`;
        
        if (className) {
            rfidStatus.className = `badge ${className} ms-2`;
        }
    }

    // Show student information
    function showStudentInfo(student) {
        studentCard.style.display = 'block';
        studentPhoto.src = student.photoUrl;
        studentName.textContent = student.name;
        studentId.textContent = `ID: ${student.studentId}`;
        studentDepartment.textContent = `Department: ${student.department}`;
    }

    // Hide student information
    function hideStudentInfo() {
        studentCard.style.display = 'none';
    }

    // Show success result
    function showSuccessResult(data) {
        verificationResult.style.display = 'block';
        resultIcon.innerHTML = '<i class="fas fa-check-circle result-success"></i>';
        resultTitle.textContent = 'Attendance Recorded';
        resultMessage.textContent = `Welcome, ${data.student.name}!`;
        
        // Format details
        const confidence = data.confidence || data.faceMatchConfidence || 0;
        resultDetails.innerHTML = `
            <div>Confidence: ${confidence.toFixed(2)}%</div>
            <div>Time: ${new Date().toLocaleTimeString()}</div>
        `;
        
        // Update recent activity
        loadRecentActivity();
    }

    // Show error result
    function showErrorResult(data) {
        verificationResult.style.display = 'block';
        resultIcon.innerHTML = '<i class="fas fa-times-circle result-error"></i>';
        
        if (data.errorType === 'RFID_ERROR' || data.errorType === 'RFID_NOT_FOUND') {
            resultTitle.textContent = 'RFID Not Recognized';
            resultMessage.textContent = 'Card not registered in the system.';
        } else if (data.errorType === 'FACE_VERIFICATION_FAILED') {
            resultTitle.textContent = 'Face Verification Failed';
            resultMessage.textContent = 'Your face doesn\'t match our records.';
        } else if (data.errorType === 'IDENTITY_MISMATCH') {
            resultTitle.textContent = 'Identity Mismatch';
            resultMessage.textContent = 'RFID and face don\'t match the same person.';
        } else {
            resultTitle.textContent = 'Verification Failed';
            resultMessage.textContent = data.message || 'An error occurred during verification.';
        }
        
        // Format details
        const confidence = data.confidence || data.faceMatchConfidence || 0;
        resultDetails.innerHTML = `
            <div>Confidence: ${confidence.toFixed(2)}%</div>
            <div>Error Type: ${data.errorType || 'Unknown'}</div>
        `;
    }

    // Hide verification result
    function hideVerificationResult() {
        verificationResult.style.display = 'none';
    }

    // Start the system
    function startSystem() {
        systemActive = true;
        socket.emit('startSystem');
        startAutomaticCapture();
    }

    // Reset the system
    function resetSystem() {
        socket.emit('resetSystem');
        stopAutomaticCapture();
    }

    // Load recent activity
    async function loadRecentActivity() {
        try {
            const response = await fetch('/api/attendance/today');
            const data = await response.json();
            
            // Clear existing items
            recentActivity.innerHTML = '';
            
            if (data.length === 0) {
                recentActivity.innerHTML = `
                    <li class="list-group-item text-center text-muted py-5">
                        <i class="fas fa-clock fa-2x mb-2"></i>
                        <p>No recent activity</p>
                    </li>
                `;
                return;
            }
            
            // Add new items (most recent first)
            data.slice(0, 10).forEach(item => {
                const time = new Date(item.timestamp).toLocaleTimeString();
                const statusClass = item.status === 'PRESENT' ? 'bg-success' : 'bg-danger';
                const statusText = item.status === 'PRESENT' ? 'Present' : 'Failed';
                
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item recent-item d-flex align-items-center';
                listItem.innerHTML = `
                    <img src="${item.student.photoUrl}" class="recent-photo me-3" alt="${item.student.name}">
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between">
                            <strong>${item.student.name}</strong>
                            <small>${time}</small>
                        </div>
                        <div class="text-muted small">${item.student.studentId}</div>
                    </div>
                    <span class="badge ${statusClass} status-badge ms-2">${statusText}</span>
                `;
                
                recentActivity.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error loading recent activity:', error);
            recentActivity.innerHTML = `
                <li class="list-group-item text-center text-danger py-3">
                    <i class="fas fa-exclamation-circle mb-2"></i>
                    <p>Failed to load activity</p>
                </li>
            `;
        }
    }
}); 