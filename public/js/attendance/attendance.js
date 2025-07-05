document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Manual Mode
    const manualWebcamElement = document.getElementById('manual-webcam');
    const manualCanvasElement = document.getElementById('manual-canvas');
    const startCameraBtn = document.getElementById('start-camera');
    const capturePhotoBtn = document.getElementById('capture-photo');
    const manualRfidStatusElement = document.getElementById('manual-rfid-status');
    const manualRfidCardIdElement = document.getElementById('manual-rfid-card-id');
    const initRfidBtn = document.getElementById('init-rfid-btn');
    const simulateRfidBtn = document.getElementById('simulate-rfid-btn');
    const rfidInput = document.getElementById('rfid-input');
    const submitRfidBtn = document.getElementById('submit-rfid');
    const studentDetailsElement = document.getElementById('student-details');
    const noStudentMessageElement = document.getElementById('no-student-message');
    const studentPhotoElement = document.getElementById('student-photo');
    const studentNameElement = document.getElementById('student-name');
    const studentIdElement = document.getElementById('student-id');
    const studentDepartmentElement = document.getElementById('student-department');
    const manualVerificationResultElement = document.getElementById('manual-verification-result');
    const printBtn = document.getElementById('print-btn');
    
    // DOM Elements - Automated Mode
    const autoWebcamElement = document.getElementById('auto-webcam');
    const autoCanvasElement = document.getElementById('auto-canvas');
    const startSystemBtn = document.getElementById('start-system');
    const resetSystemBtn = document.getElementById('reset-system');
    const simulateAutoRfidBtn = document.getElementById('simulate-auto-rfid-btn');
    const autoRfidInput = document.getElementById('auto-rfid-input');
    const submitAutoRfidBtn = document.getElementById('submit-auto-rfid');
    const autoRfidInputContainer = document.getElementById('auto-rfid-input-container');
    const autoRfidDirectInput = document.getElementById('auto-rfid-direct-input');
    const autoRfidSubmitBtn = document.getElementById('auto-rfid-submit-btn');
    const systemStateElement = document.getElementById('system-state');
    const rfidStatusElement = document.getElementById('rfid-status');
    const statusMessageElement = document.getElementById('status-message');
    const countdownTimerElement = document.getElementById('countdown-timer');
    const verificationResultElement = document.getElementById('verification-result');
    const resultIconElement = document.getElementById('result-icon');
    const resultTitleElement = document.getElementById('result-title');
    const resultMessageElement = document.getElementById('result-message');
    const resultDetailsElement = document.getElementById('result-details');
    const autoStudentCardElement = document.getElementById('auto-student-card');
    const autoStudentPhotoElement = document.getElementById('auto-student-photo');
    const autoStudentNameElement = document.getElementById('auto-student-name');
    const autoStudentIdElement = document.getElementById('auto-student-id');
    const autoStudentDepartmentElement = document.getElementById('auto-student-department');
    
    // Shared Elements
    const refreshAttendanceBtn = document.getElementById('refresh-attendance');
    const attendanceTableBody = document.getElementById('attendance-table-body');

    // State variables
    let manualStream = null;
    let autoStream = null;
    let currentStudent = null;
    let eventSource = null;
    let socket = null;
    let systemActive = false;
    let faceCaptureInterval = null;

    // Initialize the page
    initPage();

    // Functions
    function initPage() {
        loadTodaysAttendance();
        
        // Initialize tabs
        const tabElements = document.querySelectorAll('button[data-bs-toggle="tab"]');
        tabElements.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (event) => {
                const targetId = event.target.getAttribute('data-bs-target');
                if (targetId === '#automated') {
                    initializeAutomatedMode();
                } else if (targetId === '#manual') {
                    initializeManualMode();
                }
            });
        });
        
        // Initialize the active tab
        const activeTab = document.querySelector('.nav-link.active');
        if (activeTab) {
            const targetId = activeTab.getAttribute('data-bs-target');
            if (targetId === '#automated') {
                initializeAutomatedMode();
            } else if (targetId === '#manual') {
                initializeManualMode();
            }
        }
        
        // Shared event listeners
        refreshAttendanceBtn.addEventListener('click', loadTodaysAttendance);
    }
    
    // Initialize Manual Mode
    function initializeManualMode() {
        // Connect to RFID events for manual mode
        connectToRfidEvents();
        
        // Manual mode event listeners
        startCameraBtn.addEventListener('click', startManualCamera);
        capturePhotoBtn.addEventListener('click', captureManualPhoto);
        initRfidBtn.addEventListener('click', initializeRfidReader);
        submitRfidBtn.addEventListener('click', simulateRfidCard);
        printBtn.addEventListener('click', printAttendance);
    }
    
    // Initialize Automated Mode
    function initializeAutomatedMode() {
        // Initialize socket connection for automated mode
        initializeSocket();
        
        // Automated mode event listeners
        startSystemBtn.addEventListener('click', startAutomatedSystem);
        resetSystemBtn.addEventListener('click', resetAutomatedSystem);
        submitAutoRfidBtn.addEventListener('click', simulateAutoRfidCard);
        
        // Direct RFID input event listeners
        autoRfidSubmitBtn.addEventListener('click', submitDirectRfid);
        autoRfidDirectInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitDirectRfid();
            }
        });
    }

    // Connect to RFID events using Server-Sent Events (SSE) for manual mode
    function connectToRfidEvents() {
        if (eventSource) {
            eventSource.close();
        }

        eventSource = new EventSource('/api/rfid/events');
        
        eventSource.onopen = () => {
            console.log('Connected to RFID events');
            manualRfidStatusElement.textContent = 'Connected';
            manualRfidStatusElement.classList.remove('bg-secondary', 'bg-danger');
            manualRfidStatusElement.classList.add('bg-success');
        };
        
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.rfidCardId) {
                console.log('RFID card detected:', data.rfidCardId);
                manualRfidCardIdElement.textContent = data.rfidCardId;
                
                // If student data is available, display it
                if (data.student) {
                    displayStudentInfo(data.student);
                } else {
                    // If no student found, fetch from API
                    fetchStudentByRfid(data.rfidCardId);
                }
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('Error with RFID events:', error);
            manualRfidStatusElement.textContent = 'Disconnected';
            manualRfidStatusElement.classList.remove('bg-success', 'bg-secondary');
            manualRfidStatusElement.classList.add('bg-danger');
            
            // Try to reconnect after a delay
            setTimeout(connectToRfidEvents, 5000);
        };
    }

    // Initialize Socket.IO connection for automated mode
    function initializeSocket() {
        if (socket) {
            socket.disconnect();
        }
        
        // Connect to the server
        socket = io();
        
        // Socket event listeners
        socket.on('connect', () => {
            console.log('Connected to socket server');
            updateSystemState('Ready', 'secondary');
            updateRfidStatus('Connected', 'success');
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from socket server');
            updateSystemState('Disconnected', 'danger');
            updateRfidStatus('Disconnected', 'danger');
        });
        
        socket.on('rfid_detected', (data) => {
            console.log('RFID detected in automated mode:', data);
            handleAutomatedRfidDetection(data);
        });
        
        socket.on('system_state', (data) => {
            console.log('System state update:', data);
            updateSystemState(data.state, data.status);
            
            if (data.message) {
                statusMessageElement.textContent = data.message;
            }
            
            if (data.countdown !== undefined) {
                if (data.countdown > 0) {
                    countdownTimerElement.textContent = data.countdown;
                    countdownTimerElement.style.display = 'block';
                } else {
                    countdownTimerElement.style.display = 'none';
                }
            }
        });

        // Listen for systemState events from the automated attendance controller
        socket.on('systemState', (data) => {
            console.log('Automated system state update:', data);
            
            // Update UI based on state
            if (data.state === 'WAITING_FOR_RFID') {
                updateSystemState('Waiting for RFID', 'info');
                statusMessageElement.textContent = 'Waiting for RFID card...';
                autoStudentCardElement.style.display = 'none';
                verificationResultElement.style.display = 'none';
                
                // Stop face capture interval if it's running
                stopAutomatedFaceCapture();
            } 
            else if (data.state === 'CAPTURING_FACE') {
                updateSystemState('Capturing Face', 'primary');
                if (data.student) {
                    displayAutoStudentInfo(data.student);
                    statusMessageElement.textContent = data.retryCount 
                        ? `Retry ${data.retryCount}: Look at the camera...` 
                        : 'Look at the camera...';
                    
                    // Start face capture interval
                    startAutomatedFaceCapture();
                }
            }
            else if (data.state === 'VERIFYING') {
                updateSystemState('Verifying', 'warning');
                statusMessageElement.textContent = 'Verifying identity...';
                
                // Stop face capture interval
                stopAutomatedFaceCapture();
            }
            else if (data.state === 'PROCESSING_RESULT') {
                updateSystemState('Processing', 'secondary');
                statusMessageElement.textContent = 'Processing result...';
            }
        });

        // Listen for attendanceMarked events
        socket.on('attendanceMarked', (data) => {
            console.log('Attendance marked:', data);
            verificationResultElement.style.display = 'block';
            
            // Ensure we have a valid confidence value
            const confidence = data.confidence || 0;
            
            // Only show success if confidence is greater than 0
            if (confidence > 0) {
                resultIconElement.innerHTML = '<i class="fas fa-check-circle result-success"></i>';
                resultTitleElement.textContent = 'Attendance Recorded';
                resultMessageElement.textContent = `Welcome, ${data.student.name}!`;
                
                const rawConfidence = data.rawConfidence || confidence;
                const detectionModel = data.detectionModel || 'Standard';
                
                resultDetailsElement.innerHTML = `
                    <div class="mt-3">
                        <div class="progress mb-2" style="height: 20px;">
                            <div class="progress-bar ${confidence >= 90 ? 'bg-success' : confidence >= 75 ? 'bg-info' : 'bg-warning'}" 
                                 role="progressbar" 
                                 style="width: ${Math.min(100, confidence)}%;" 
                                 aria-valuenow="${confidence}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                                ${confidence.toFixed(1)}%
                            </div>
                        </div>
                        <div class="text-muted small">
                            <div>Confidence: ${confidence.toFixed(2)}%</div>
                            ${rawConfidence !== confidence ? `<div>Raw Score: ${rawConfidence.toFixed(2)}%</div>` : ''}
                            <div>Detection Model: ${detectionModel}</div>
                            <div>Time: ${new Date().toLocaleTimeString()}</div>
                        </div>
                    </div>
                `;
                
                // Update recent activity
                loadTodaysAttendance();
            } else {
                // Show error for zero confidence
                resultIconElement.innerHTML = '<i class="fas fa-times-circle result-error"></i>';
                resultTitleElement.textContent = 'Verification Failed';
                resultMessageElement.textContent = 'Face not verified - No confidence score';
                
                resultDetailsElement.innerHTML = `
                    <div class="mt-3">
                        <div class="alert alert-danger">
                            <strong>Error:</strong> No confidence score detected
                        </div>
                        <div class="text-muted small">Time: ${new Date().toLocaleTimeString()}</div>
                    </div>
                `;
            }
        });

        // Listen for error events
        socket.on('systemError', (data) => {
            console.error('System error:', data);
            verificationResultElement.style.display = 'block';
            resultIconElement.innerHTML = '<i class="fas fa-times-circle result-error"></i>';
            resultTitleElement.textContent = 'Error';
            resultMessageElement.textContent = data.message || 'An error occurred';
            
            // Display confidence information if available
            const confidence = data.confidence || 0;
            const errorMessage = data.errorMessage || data.message || 'Unknown error';
            
            resultDetailsElement.innerHTML = `
                <div class="mt-3">
                    <div class="alert alert-danger">
                        <strong>Error Type:</strong> ${data.type || 'Unknown'}
                        <div>${errorMessage}</div>
                    </div>
                    ${confidence > 0 ? `
                    <div class="progress mb-2" style="height: 20px;">
                        <div class="progress-bar bg-danger" 
                             role="progressbar" 
                             style="width: ${Math.min(100, confidence)}%;" 
                             aria-valuenow="${confidence}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                            ${confidence.toFixed(1)}%
                        </div>
                    </div>
                    <div class="text-muted small">Confidence below threshold</div>
                    ` : ''}
                    <div class="text-muted small">Time: ${new Date().toLocaleTimeString()}</div>
                </div>
            `;
        });

        // Listen for maxRetriesReached events
        socket.on('maxRetriesReached', (data) => {
            console.log('Max retries reached:', data);
            verificationResultElement.style.display = 'block';
            resultIconElement.innerHTML = '<i class="fas fa-exclamation-circle result-error"></i>';
            resultTitleElement.textContent = 'Verification Failed';
            resultMessageElement.textContent = data.message || 'Maximum verification attempts reached';
            
            // Display confidence information if available
            const confidence = data.confidence || 0;
            
            resultDetailsElement.innerHTML = `
                <div class="mt-3">
                    <div class="alert alert-danger">
                        <strong>Error Type:</strong> ${data.errorType || 'Unknown'}
                        <div>${data.message || 'Maximum verification attempts reached'}</div>
                    </div>
                    ${confidence > 0 ? `
                    <div class="progress mb-2" style="height: 20px;">
                        <div class="progress-bar bg-danger" 
                             role="progressbar" 
                             style="width: ${Math.min(100, confidence)}%;" 
                             aria-valuenow="${confidence}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                            ${confidence.toFixed(1)}%
                        </div>
                    </div>
                    <div class="text-muted small">Confidence below threshold</div>
                    ` : ''}
                    <div class="text-muted small">Time: ${new Date().toLocaleTimeString()}</div>
                </div>
            `;
        });
    }

    // Initialize RFID reader for manual mode
    async function initializeRfidReader() {
        try {
            initRfidBtn.disabled = true;
            initRfidBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing...';
            
            const response = await fetch('/api/rfid/init', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                manualRfidStatusElement.textContent = 'Connected';
                manualRfidStatusElement.classList.remove('bg-secondary', 'bg-danger');
                manualRfidStatusElement.classList.add('bg-success');
                alert('RFID reader initialized successfully');
            } else {
                alert(`Failed to initialize RFID reader: ${data.message}`);
                manualRfidStatusElement.textContent = 'Error';
                manualRfidStatusElement.classList.remove('bg-success', 'bg-secondary');
                manualRfidStatusElement.classList.add('bg-danger');
            }
        } catch (error) {
            console.error('Error initializing RFID reader:', error);
            alert('Failed to initialize RFID reader. Check console for details.');
            manualRfidStatusElement.textContent = 'Error';
            manualRfidStatusElement.classList.remove('bg-success', 'bg-secondary');
            manualRfidStatusElement.classList.add('bg-danger');
        } finally {
            initRfidBtn.disabled = false;
            initRfidBtn.innerHTML = '<i class="fas fa-plug"></i> Initialize Reader';
        }
    }

    // Simulate RFID card for manual mode
    async function simulateRfidCard() {
        const rfidCardId = rfidInput.value.trim();
        
        if (!rfidCardId) {
            alert('Please enter an RFID card ID');
            return;
        }
        
        try {
            submitRfidBtn.disabled = true;
            submitRfidBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            
            const response = await fetch('/api/rfid/simulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rfidCardId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Close the modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('simulateRfidModal'));
                modal.hide();
                
                // Clear the input
                rfidInput.value = '';
                
                // Update the UI
                manualRfidCardIdElement.textContent = rfidCardId;
                
                // Fetch student data
                fetchStudentByRfid(rfidCardId);
            } else {
                alert(`Failed to simulate RFID card: ${data.message}`);
            }
        } catch (error) {
            console.error('Error simulating RFID card:', error);
            alert('Failed to simulate RFID card. Check console for details.');
        } finally {
            submitRfidBtn.disabled = false;
            submitRfidBtn.textContent = 'Submit';
        }
    }
    
    // Simulate RFID card for automated mode
    async function simulateAutoRfidCard() {
        const rfidCardId = autoRfidInput.value.trim();
        
        if (!rfidCardId) {
            alert('Please enter an RFID card ID');
            return;
        }
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('simulateAutoRfidModal'));
        modal.hide();
        
        // Clear the input
        autoRfidInput.value = '';
        
        // Send to server
        if (socket) {
            socket.emit('rfidDetected', { rfidCardId });
        } else {
            alert('Socket connection not established. Please refresh the page and try again.');
        }
    }

    // Fetch student by RFID card ID for manual mode
    async function fetchStudentByRfid(rfidCardId) {
        try {
            const response = await fetch(`/api/students/rfid/${rfidCardId}`);
            
            if (response.ok) {
                const student = await response.json();
                displayStudentInfo(student);
            } else {
                const errorData = await response.json();
                displayNoStudentFound(errorData.message || 'Student not found');
            }
        } catch (error) {
            console.error('Error fetching student:', error);
            displayNoStudentFound('Error fetching student data');
        }
    }

    // Display student information for manual mode
    function displayStudentInfo(student) {
        currentStudent = student;
        
        // Show student details and hide no-student message
        studentDetailsElement.style.display = 'block';
        noStudentMessageElement.style.display = 'none';
        
        // Set student information
        studentPhotoElement.src = student.photoUrl;
        studentNameElement.textContent = student.name;
        studentIdElement.textContent = `ID: ${student.studentId}`;
        studentDepartmentElement.textContent = `Department: ${student.department}`;
        
        // Hide verification result
        manualVerificationResultElement.style.display = 'none';
        
        // Enable camera button
        startCameraBtn.disabled = false;
    }
    
    // Display student information for automated mode
    function displayAutoStudentInfo(student) {
        // Show student card
        autoStudentCardElement.style.display = 'block';
        
        // Set student information
        autoStudentPhotoElement.src = student.photoUrl;
        autoStudentNameElement.textContent = student.name;
        autoStudentIdElement.textContent = `ID: ${student.studentId}`;
        autoStudentDepartmentElement.textContent = `Department: ${student.department}`;
    }

    // Display no student found message for manual mode
    function displayNoStudentFound(message) {
        currentStudent = null;
        
        // Hide student details and show no-student message
        studentDetailsElement.style.display = 'none';
        noStudentMessageElement.style.display = 'block';
        
        // Set message
        noStudentMessageElement.innerHTML = `<div class="alert alert-warning">${message}</div>`;
        
        // Disable camera button
        startCameraBtn.disabled = true;
        capturePhotoBtn.disabled = true;
    }

    // Start manual camera
    async function startManualCamera() {
        try {
            startCameraBtn.disabled = true;
            startCameraBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
            
            // Get selected resolution
            const resolutionSelect = document.getElementById('camera-resolution');
            const resolution = resolutionSelect.value;
            
            let videoConstraints = {
                facingMode: "user",
                aspectRatio: { ideal: 16/9 },
                frameRate: { ideal: 30, min: 15 }
            };
            
            // Set resolution based on selection
            switch(resolution) {
                case 'low':
                    videoConstraints.width = { ideal: 640, min: 640 };
                    videoConstraints.height = { ideal: 480, min: 480 };
                    break;
                case 'high':
                    videoConstraints.width = { ideal: 1920, min: 1280 };
                    videoConstraints.height = { ideal: 1080, min: 720 };
                    break;
                case 'medium':
                default:
                    videoConstraints.width = { ideal: 1280, min: 1024 };
                    videoConstraints.height = { ideal: 720, min: 576 };
                    break;
            }
            
            // Request camera access with improved settings
            manualStream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: false
            });
            
            // Set video source
            manualWebcamElement.srcObject = manualStream;
            
            // Wait for video to be ready
            await new Promise(resolve => {
                manualWebcamElement.onloadedmetadata = () => {
                    resolve();
                };
            });
            
            // Start playing video
            await manualWebcamElement.play();
            
            // Apply CSS to ensure the video fills the container properly
            manualWebcamElement.style.width = '100%';
            manualWebcamElement.style.height = '100%';
            manualWebcamElement.style.objectFit = 'cover';
            
            console.log(`Manual camera started with ${resolution} resolution settings`);
            
            // Update UI
            startCameraBtn.innerHTML = '<i class="fas fa-video-slash"></i> Stop Camera';
            capturePhotoBtn.disabled = false;
        } catch (error) {
            console.error('Error starting camera:', error);
            alert('Failed to start camera. Please check camera permissions and try again.');
            
            startCameraBtn.disabled = false;
            startCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
        }
    }

    // Capture photo for manual mode
    async function captureManualPhoto() {
        if (!manualStream) {
            alert('Camera not started. Please start the camera first.');
            return;
        }
        
        try {
            capturePhotoBtn.disabled = true;
            capturePhotoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Capturing...';
            
            // Add visual feedback for capture
            addCaptureEffect();
            
            // Set canvas dimensions to match video
            manualCanvasElement.width = manualWebcamElement.videoWidth;
            manualCanvasElement.height = manualWebcamElement.videoHeight;
            
            // Draw video frame to canvas
            const context = manualCanvasElement.getContext('2d');
            context.drawImage(manualWebcamElement, 0, 0, manualCanvasElement.width, manualCanvasElement.height);
            
            // Get image data as base64
            const imageData = manualCanvasElement.toDataURL('image/jpeg', 0.9); // Higher quality
            
            // Verify if we have a student
            if (!currentStudent) {
                alert('No student selected. Please tap an RFID card first.');
                capturePhotoBtn.disabled = false;
                capturePhotoBtn.innerHTML = '<i class="fas fa-camera"></i> Capture & Verify';
                return;
            }
            
            // Show processing message
            manualVerificationResultElement.style.display = 'block';
            manualVerificationResultElement.className = 'alert alert-info';
            manualVerificationResultElement.innerHTML = `
                <i class="fas fa-spinner fa-spin me-2"></i>
                <strong>Processing...</strong> Verifying student identity.
            `;
            
            // Send to server for verification
            const response = await fetch('/api/attendance/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: currentStudent.studentId,
                    rfidCardId: currentStudent.rfidCardId,
                    imageData
                })
            });
            
            const data = await response.json();
            
            // Display result
            manualVerificationResultElement.style.display = 'block';
            
            if (response.ok && data.verified) {
                manualVerificationResultElement.className = 'alert alert-success';
                manualVerificationResultElement.innerHTML = `
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>Verified!</strong> Face matched with ${data.confidence.toFixed(2)}% confidence.
                    ${data.message.includes('already') ? '<div class="mt-2">Note: Student was already marked present today.</div>' : ''}
                `;
                
                // Enable print button
                printBtn.disabled = false;
                
                // Refresh attendance table
                loadTodaysAttendance();
            } else {
                manualVerificationResultElement.className = 'alert alert-danger';
                manualVerificationResultElement.innerHTML = `
                    <i class="fas fa-times-circle me-2"></i>
                    <strong>Not Verified!</strong> ${data.message || 'Face does not match our records.'}
                    ${data.confidence ? `<div class="mt-2">Confidence: ${data.confidence.toFixed(2)}%</div>` : ''}
                    <div class="mt-2">Please ensure your face is clearly visible within the frame and try again.</div>
                `;
                
                // Disable print button
                printBtn.disabled = true;
            }
        } catch (error) {
            console.error('Error capturing photo:', error);
            alert('Failed to capture and verify photo. Please try again.');
            
            manualVerificationResultElement.style.display = 'block';
            manualVerificationResultElement.className = 'alert alert-danger';
            manualVerificationResultElement.innerHTML = `
                <i class="fas fa-exclamation-circle me-2"></i>
                <strong>Error!</strong> Failed to process verification.
            `;
        } finally {
            capturePhotoBtn.disabled = false;
            capturePhotoBtn.innerHTML = '<i class="fas fa-camera"></i> Capture & Verify';
        }
    }

    // Add visual capture effect
    function addCaptureEffect() {
        // Create flash effect
        const flashElement = document.createElement('div');
        flashElement.style.position = 'absolute';
        flashElement.style.top = '0';
        flashElement.style.left = '0';
        flashElement.style.right = '0';
        flashElement.style.bottom = '0';
        flashElement.style.backgroundColor = 'white';
        flashElement.style.opacity = '0.8';
        flashElement.style.zIndex = '100';
        flashElement.style.transition = 'opacity 0.5s ease-out';
        
        // Add to camera container
        const cameraContainer = manualWebcamElement.parentElement;
        cameraContainer.appendChild(flashElement);
        
        // Trigger flash effect
        setTimeout(() => {
            flashElement.style.opacity = '0';
        }, 50);
        
        // Remove flash element after animation
        setTimeout(() => {
            cameraContainer.removeChild(flashElement);
        }, 500);
        
        // Also highlight the face frame
        const faceFrame = cameraContainer.querySelector('.face-frame');
        if (faceFrame) {
            faceFrame.style.borderColor = '#28a745';
            faceFrame.style.borderWidth = '5px';
            
            setTimeout(() => {
                faceFrame.style.borderColor = 'rgba(255, 255, 255, 0.7)';
                faceFrame.style.borderWidth = '3px';
            }, 500);
        }
    }

    // Stop camera for manual mode
    function stopManualCamera() {
        if (manualStream) {
            manualStream.getTracks().forEach(track => track.stop());
            manualWebcamElement.srcObject = null;
            manualStream = null;
            
            // Reset button
            startCameraBtn.disabled = false;
            startCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
        }
    }
    
    // Start automated system
    function startAutomatedSystem() {
        if (!socket) {
            alert('Socket connection not established. Please refresh the page and try again.');
            return;
        }
        
        // Start the camera first
        startAutomatedCamera().then(() => {
            // After camera is started, emit the start system event
            socket.emit('startSystem');
            
            // Update UI
            systemActive = true;
            startSystemBtn.disabled = true;
            startSystemBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
            updateSystemState('Starting...', 'info');
            
            // Show RFID input field
            autoRfidInputContainer.style.display = 'block';
            autoRfidDirectInput.focus();
        }).catch(error => {
            console.error('Error starting camera:', error);
            alert('Failed to start camera. Please check camera permissions and try again.');
        });
    }

    // Start automated camera
    async function startAutomatedCamera() {
        try {
            // Get selected resolution (default to medium if not yet visible)
            const resolutionSelect = document.getElementById('auto-camera-resolution');
            const resolution = resolutionSelect ? resolutionSelect.value : 'medium';
            
            let videoConstraints = {
                facingMode: "user",
                aspectRatio: { ideal: 16/9 },
                frameRate: { ideal: 30, min: 15 }
            };
            
            // Set resolution based on selection
            switch(resolution) {
                case 'low':
                    videoConstraints.width = { ideal: 640, min: 640 };
                    videoConstraints.height = { ideal: 480, min: 480 };
                    break;
                case 'high':
                    videoConstraints.width = { ideal: 1920, min: 1280 };
                    videoConstraints.height = { ideal: 1080, min: 720 };
                    break;
                case 'medium':
                default:
                    videoConstraints.width = { ideal: 1280, min: 1024 };
                    videoConstraints.height = { ideal: 720, min: 576 };
                    break;
            }
            
            // Request camera access with improved settings
            autoStream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: false
            });
            
            // Set video source
            autoWebcamElement.srcObject = autoStream;
            
            // Wait for video to be ready
            await new Promise(resolve => {
                autoWebcamElement.onloadedmetadata = () => {
                    resolve();
                };
            });
            
            // Start playing video
            await autoWebcamElement.play();
            
            // Apply CSS to ensure the video fills the container properly
            autoWebcamElement.style.width = '100%';
            autoWebcamElement.style.height = '100%';
            autoWebcamElement.style.objectFit = 'cover';
            
            console.log(`Automated camera started with ${resolution} resolution settings`);
            return true;
        } catch (error) {
            console.error('Error starting automated camera:', error);
            throw error;
        }
    }

    // Reset automated system
    function resetAutomatedSystem() {
        if (!socket) {
            alert('Socket connection not established. Please refresh the page and try again.');
            return;
        }
        
        // Stop face capture interval
        stopAutomatedFaceCapture();
        
        resetSystemBtn.disabled = true;
        resetSystemBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
        
        // Request to reset the automated system
        socket.emit('resetSystem');
        
        // Hide student info and verification result
        autoStudentCardElement.style.display = 'none';
        verificationResultElement.style.display = 'none';
        
        // Hide RFID input field
        autoRfidInputContainer.style.display = 'none';
        autoRfidDirectInput.value = '';
        
        // Update UI
        systemActive = false;
        updateSystemState('Ready', 'secondary');
        statusMessageElement.textContent = 'Waiting for RFID card...';
        countdownTimerElement.style.display = 'none';
        
        // Re-enable start button
        startSystemBtn.disabled = false;
        startSystemBtn.innerHTML = '<i class="fas fa-play"></i> Start Automated System';
        resetSystemBtn.disabled = false;
        resetSystemBtn.innerHTML = '<i class="fas fa-redo"></i> Reset System';
    }
    
    // Handle automated RFID detection
    function handleAutomatedRfidDetection(data) {
        // Update status message
        statusMessageElement.textContent = `RFID Detected: ${data.rfidCardId}`;
        
        // The rest will be handled by socket events
    }
    
    // Show verification result
    function showVerificationResult(data) {
        verificationResultElement.style.display = 'block';
        
        if (data.success) {
            resultIconElement.innerHTML = '<i class="fas fa-check-circle result-success"></i>';
            resultTitleElement.textContent = 'Verification Successful';
            resultMessageElement.textContent = `Welcome, ${data.student.name}!`;
            
            // Show detailed confidence information
            const confidence = data.faceMatchConfidence || 0;
            const rawConfidence = data.rawConfidence || confidence;
            const detectionModel = data.detectionModel || 'Standard';
            
            resultDetailsElement.innerHTML = `
                <div class="mt-3">
                    <div class="progress mb-2" style="height: 20px;">
                        <div class="progress-bar ${confidence >= 90 ? 'bg-success' : confidence >= 75 ? 'bg-info' : 'bg-warning'}" 
                             role="progressbar" 
                             style="width: ${Math.min(100, confidence)}%;" 
                             aria-valuenow="${confidence}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                            ${confidence.toFixed(1)}%
                        </div>
                    </div>
                    <div class="text-muted small">
                        <div>Confidence: ${confidence.toFixed(2)}%</div>
                        ${rawConfidence !== confidence ? `<div>Raw Score: ${rawConfidence.toFixed(2)}%</div>` : ''}
                        <div>Detection Model: ${detectionModel}</div>
                        <div>Time: ${new Date().toLocaleTimeString()}</div>
                    </div>
                </div>
            `;
        } else {
            resultIconElement.innerHTML = '<i class="fas fa-times-circle result-error"></i>';
            resultTitleElement.textContent = 'Verification Failed';
            resultMessageElement.textContent = data.message || 'Unable to verify identity';
            
            // Show error details
            const errorType = data.errorType || 'Unknown';
            const confidence = data.faceMatchConfidence || 0;
            
            resultDetailsElement.innerHTML = `
                <div class="mt-3">
                    <div class="alert alert-danger">
                        <strong>Error Type:</strong> ${errorType}
                    </div>
                    ${confidence > 0 ? `
                    <div class="progress mb-2" style="height: 20px;">
                        <div class="progress-bar bg-danger" 
                             role="progressbar" 
                             style="width: ${Math.min(100, confidence)}%;" 
                             aria-valuenow="${confidence}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                            ${confidence.toFixed(1)}%
                        </div>
                    </div>
                    <div class="text-muted small">Confidence below threshold</div>
                    ` : ''}
                    <div class="text-muted small">Time: ${new Date().toLocaleTimeString()}</div>
                </div>
            `;
        }
        
        // Refresh attendance table if verification was successful
        if (data.success) {
            loadTodaysAttendance();
        }
    }
    
    // Update system state UI
    function updateSystemState(state, status) {
        systemStateElement.innerHTML = `<i class="fas fa-circle text-${status} me-2"></i> ${state}`;
        systemStateElement.className = `badge bg-light text-dark badge-large`;
    }
    
    // Update RFID status UI
    function updateRfidStatus(status, statusClass) {
        rfidStatusElement.innerHTML = `<i class="fas fa-wifi text-${statusClass} me-2"></i> RFID`;
        rfidStatusElement.className = `badge bg-light text-dark badge-large ms-2`;
    }

    // Print attendance for manual mode
    async function printAttendance() {
        if (!currentStudent) {
            alert('No student selected. Please tap an RFID card first.');
            return;
        }
        
        try {
            printBtn.disabled = true;
            printBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            const response = await fetch('/api/attendance/mark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: currentStudent.studentId,
                    rfidCardId: currentStudent.rfidCardId,
                    verificationMethod: 'manual'
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Attendance marked successfully!');
                loadTodaysAttendance();
            } else {
                alert(`Failed to mark attendance: ${data.message}`);
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            alert('Failed to mark attendance. Check console for details.');
        } finally {
            printBtn.disabled = false;
            printBtn.innerHTML = '<i class="fas fa-print"></i> Print Attendance';
        }
    }

    // Load today's attendance
    async function loadTodaysAttendance() {
        try {
            refreshAttendanceBtn.disabled = true;
            refreshAttendanceBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
            
            const response = await fetch('/api/attendance/today');
            const data = await response.json();
            
            attendanceTableBody.innerHTML = '';
            
            // Filter out failed attendance records - only show PRESENT status
            const presentRecords = data.filter(record => record.status === 'PRESENT');
            
            if (presentRecords.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="9" class="text-center py-4 text-muted">
                        <i class="fas fa-calendar-check fa-2x mb-2"></i>
                        <p>No attendance records for today</p>
                    </td>
                `;
                attendanceTableBody.appendChild(row);
            } else {
                presentRecords.forEach(record => {
                    const row = document.createElement('tr');
                    row.dataset.id = record._id; // Store record ID for delete functionality
                    
                    // Format time
                    const recordTime = new Date(record.timestamp);
                    const formattedTime = recordTime.toLocaleTimeString();
                    
                    // Status badge - Always show Present since we filtered
                    const statusBadge = '<span class="badge bg-success">Present</span>';
                    
                    // Method badge
                    let methodBadge = '';
                    if (record.verificationMethod === 'automated') {
                        methodBadge = '<span class="badge bg-primary">Automated</span>';
                    } else {
                        methodBadge = '<span class="badge bg-info">Manual</span>';
                    }
                    
                    // RFID number with truncation for display
                    const rfidDisplay = record.student.rfidCardId ? 
                        record.student.rfidCardId.substring(0, 8) + '...' : 
                        'N/A';
                    
                    // Delete button
                    const deleteBtn = `
                        <button class="btn btn-sm btn-danger delete-attendance" data-id="${record._id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                    
                    row.innerHTML = `
                        <td>
                            <img src="${record.student.photoUrl}" alt="${record.student.name}" class="recent-photo">
                        </td>
                        <td>${record.student.studentId}</td>
                        <td>${record.student.name}</td>
                        <td>${rfidDisplay}</td>
                        <td>${record.student.department}</td>
                        <td>${formattedTime}</td>
                        <td>${statusBadge}</td>
                        <td>${methodBadge}</td>
                        <td>${deleteBtn}</td>
                    `;
                    
                    attendanceTableBody.appendChild(row);
                });
                
                // Add event listeners for delete buttons
                document.querySelectorAll('.delete-attendance').forEach(button => {
                    button.addEventListener('click', deleteAttendanceRecord);
                });
            }
        } catch (error) {
            console.error('Error loading attendance records:', error);
            attendanceTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-3 text-danger">
                        <i class="fas fa-exclamation-circle mb-2"></i>
                        <p>Failed to load attendance records</p>
                    </td>
                </tr>
            `;
        } finally {
            refreshAttendanceBtn.disabled = false;
            refreshAttendanceBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        }
    }

    // Delete attendance record
    async function deleteAttendanceRecord(event) {
        const button = event.currentTarget;
        const recordId = button.dataset.id;
        
        if (!confirm('Are you sure you want to delete this attendance record?')) {
            return;
        }
        
        try {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;
            
            const response = await fetch(`/api/attendance/${recordId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Remove the row from the table
                const row = button.closest('tr');
                row.classList.add('bg-danger', 'text-white');
                
                // Fade out and remove
                setTimeout(() => {
                    row.style.transition = 'opacity 0.5s ease';
                    row.style.opacity = '0';
                    setTimeout(() => {
                        row.remove();
                        
                        // If no records left, show empty message
                        if (attendanceTableBody.children.length === 0) {
                            attendanceTableBody.innerHTML = `
                                <tr>
                                    <td colspan="9" class="text-center py-4 text-muted">
                                        <i class="fas fa-calendar-check fa-2x mb-2"></i>
                                        <p>No attendance records for today</p>
                                    </td>
                                </tr>
                            `;
                        }
                    }, 500);
                }, 300);
            } else {
                const data = await response.json();
                alert(`Failed to delete record: ${data.message || 'Unknown error'}`);
                button.innerHTML = '<i class="fas fa-trash"></i>';
                button.disabled = false;
            }
        } catch (error) {
            console.error('Error deleting attendance record:', error);
            alert('Failed to delete record. Check console for details.');
            button.innerHTML = '<i class="fas fa-trash"></i>';
            button.disabled = false;
        }
    }

    // Submit direct RFID input
    function submitDirectRfid() {
        const rfidCardId = autoRfidDirectInput.value.trim();
        
        if (!rfidCardId) {
            alert('Please enter an RFID card ID');
            return;
        }
        
        // Clear the input
        autoRfidDirectInput.value = '';
        
        // Send to server
        if (socket) {
            socket.emit('rfidDetected', { rfidCardId });
        } else {
            alert('Socket connection not established. Please refresh the page and try again.');
        }
        
        // Focus back on the input for next entry
        autoRfidDirectInput.focus();
    }

    // Start automated face capture interval
    function startAutomatedFaceCapture() {
        // Clear any existing interval
        stopAutomatedFaceCapture();
        
        // Start a new interval to capture faces every 1 second
        faceCaptureInterval = setInterval(() => {
            captureAndSendFace();
        }, 1000);
        
        console.log('Automated face capture started');
    }

    // Stop automated face capture interval
    function stopAutomatedFaceCapture() {
        if (faceCaptureInterval) {
            clearInterval(faceCaptureInterval);
            faceCaptureInterval = null;
            console.log('Automated face capture stopped');
        }
    }

    // Capture and send face image
    function captureAndSendFace() {
        try {
            // Ensure we have a valid video stream
            if (!autoWebcamElement.srcObject || !autoWebcamElement.videoWidth) {
                console.log('Video not ready yet');
                return;
            }
            
            // Set canvas dimensions to match video
            autoCanvasElement.width = autoWebcamElement.videoWidth;
            autoCanvasElement.height = autoWebcamElement.videoHeight;
            
            // Draw video frame to canvas
            const context = autoCanvasElement.getContext('2d');
            context.drawImage(autoWebcamElement, 0, 0, autoCanvasElement.width, autoCanvasElement.height);
            
            // Get image data as base64
            const imageData = autoCanvasElement.toDataURL('image/jpeg', 0.8);
            
            // Add timestamp to prevent caching issues
            const timestamp = new Date().getTime();
            
            // Send to server with timestamp
            socket.emit('faceCaptured', { 
                imageData: imageData,
                timestamp: timestamp 
            });
            
            console.log(`Face captured and sent to server at ${timestamp}`);
        } catch (error) {
            console.error('Error capturing face:', error);
        }
    }

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        // Close event source
        if (eventSource) {
            eventSource.close();
        }
        
        // Disconnect socket
        if (socket) {
            socket.disconnect();
        }
        
        // Stop cameras
        stopManualCamera();
    });
}); 