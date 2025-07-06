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
    
    // New Manual Mode Automation Elements
    const startManualSystemBtn = document.getElementById('start-manual-system');
    const resetManualSystemBtn = document.getElementById('reset-manual-system');
    const manualStatusOverlay = document.getElementById('manual-status-overlay');
    const manualStatusMessage = document.getElementById('manual-status-message');
    const manualRfidInputContainer = document.getElementById('manual-rfid-input-container');
    const manualRfidDirectInput = document.getElementById('manual-rfid-direct-input');
    
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
    let autoRefreshInterval = null;
    let manualSystemActive = false;
    let manualFaceCaptureInterval = null;
    let faceDetected = false;
    let faceTrackingTimeout = null;
    let autoCaptureCooldown = false;

    // Default avatar for missing student photos
    const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgNjQwIDY0MCI+PHBhdGggZmlsbD0iI2RkZCIgZD0iTTMyMCAzMmMxNzYuNzIgMCAzMjAgMTQzLjI4IDMyMCAzMjBTNDk2LjcyIDY3MiAzMjAgNjcyIDAgNTI4LjcyIDAgMzUyIDEzMy4yOCAzMiAzMjAgMzJ6Ii8+PHBhdGggZmlsbD0iIzU1NSIgZD0iTTMyMCAzMDRjNTUuNTUgMCAxMDAtNDQuNDUgMTAwLTEwMHMtNDQuNDUtMTAwLTEwMC0xMDAtMTAwIDQ0LjQ1LTEwMCAxMDAgNDQuNDUgMTAwIDEwMCAxMDB6bTAgNTBjLTY2LjI3IDAtMjAwIDMzLjczLTIwMCAxMDB2NTBoNDAwdi01MGMwLTY2LjI3LTEzMy43My0xMDAtMjAwLTEwMHoiLz48L3N2Zz4=';

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
        
        // Connect to RFID events
        connectToRfidEvents();
        
        // Initialize socket for real-time updates
        initializeSocket();
        
        // Set up auto-refresh for attendance table
        startAutoRefresh();
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
        
        // New automated manual mode event listeners
        startManualSystemBtn.addEventListener('click', startAutomatedManualSystem);
        resetManualSystemBtn.addEventListener('click', resetAutomatedManualSystem);
        
        // Direct RFID input event listener for manual mode
        manualRfidDirectInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitManualDirectRfid();
            }
        });
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
                
                // If in automated manual mode, process the RFID
                if (manualSystemActive) {
                    handleManualRfidDetection(data.rfidCardId);
                }
                
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

    // Simulate RFID card detection
    async function simulateRfidCard() {
        const rfidInput = document.getElementById('rfid-input');
        const rfidCardId = rfidInput.value.trim();
        
        if (!rfidCardId) {
            alert('Please enter an RFID card ID');
            return;
        }
        
        // Update UI to show RFID card detected
        updateManualRfidStatus('connected', rfidCardId);
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('simulateRfidModal'));
        modal.hide();
        
        // Clear the input
        rfidInput.value = '';
        
        try {
            // Fetch student by RFID
            const student = await fetchStudentByRfid(rfidCardId);
            
            if (student) {
                displayStudentInfo(student);
            } else {
                displayNoStudentFound('No student found with this RFID card');
            }
        } catch (error) {
            console.error('Error fetching student:', error);
            displayNoStudentFound('Error fetching student data');
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
                return student;
            } else {
                const errorData = await response.json();
                displayNoStudentFound(errorData.message || 'Student not found');
                return null;
            }
        } catch (error) {
            console.error('Error fetching student:', error);
            displayNoStudentFound('Error fetching student data');
            return null;
        }
    }

    // Display student information
    function displayStudentInfo(student) {
        document.getElementById('no-student-message').style.display = 'none';
        document.getElementById('student-details').style.display = 'block';
        
        // Handle missing data with fallbacks
        const studentName = student.name || (student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : 'Unknown');
        const studentCode = student.studentCode || student.studentId || 'N/A';
        const department = student.department || 'N/A';
        
        // Set student information
        document.getElementById('student-name').textContent = studentName;
        document.getElementById('student-id').textContent = `Code: ${studentCode}`;
        document.getElementById('student-department').textContent = `Department: ${department}`;
        
        // Set photo or default
        const photoElement = document.getElementById('student-photo');
        if (student.photoUrl) {
            photoElement.src = student.photoUrl;
        } else {
            photoElement.src = DEFAULT_AVATAR;
        }
        
        // Enable capture button
        document.getElementById('capture-photo').disabled = false;
        
        // Store current student
        currentStudent = student;
        
        // Hide verification result
        document.getElementById('manual-verification-result').style.display = 'none';
    }
    
    // Display student info for automated mode
    function displayAutoStudentInfo(student) {
        document.getElementById('auto-student-card').style.display = 'block';
        
        // Handle missing data with fallbacks
        const studentName = student.name || (student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : 'Unknown');
        const studentCode = student.studentCode || student.studentId || 'N/A';
        const department = student.department || 'N/A';
        
        document.getElementById('auto-student-name').textContent = studentName;
        document.getElementById('auto-student-id').textContent = `Code: ${studentCode}`;
        document.getElementById('auto-student-department').textContent = `Department: ${department}`;
        
        // Set photo or default
        const photoElement = document.getElementById('auto-student-photo');
        if (student.photoUrl) {
            photoElement.src = student.photoUrl;
        } else {
            photoElement.src = DEFAULT_AVATAR;
        }
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
    async function startManualCamera(automated = false) {
        try {
            startCameraBtn.disabled = true;
            startCameraBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
            
            // Get selected resolution
            const resolutionSelect = document.getElementById('camera-resolution');
            const resolution = resolutionSelect.value;
            
            let videoConstraints = {
                facingMode: "user",
                aspectRatio: { ideal: 16/9 }, // 16:9 aspect ratio for wider view
                frameRate: { ideal: 30, min: 20 } // Increased minimum framerate
            };
            
            // Set resolution based on selection with higher values
            switch(resolution) {
                case 'low':
                    videoConstraints.width = { ideal: 800, min: 640 }; // Increased from 640
                    videoConstraints.height = { ideal: 600, min: 480 }; // Increased from 480
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
            
            // Apply CSS to ensure the video fills the container properly
            manualWebcamElement.style.width = '100%';
            manualWebcamElement.style.height = '100%';
            
            // Wait for video to be ready
            await new Promise(resolve => {
                manualWebcamElement.onloadedmetadata = () => {
                    resolve();
                };
            });
            
            // Start playing video
            await manualWebcamElement.play();
            
            // Enable capture button
            capturePhotoBtn.disabled = false;
            
            // Start face detection if in automated mode
            if (automated && manualSystemActive) {
                startManualFaceCapture();
            }
            
            console.log('Manual camera started');
        } catch (error) {
            console.error('Error starting manual camera:', error);
            alert('Could not start camera. Please check camera permissions and try again.');
            
            // Reset button
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
                    studentCode: currentStudent.studentCode || currentStudent.studentId,
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
            manualStream = null;
            manualWebcamElement.srcObject = null;
            
            startCameraBtn.disabled = false;
            startCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
            capturePhotoBtn.disabled = true;
            
            console.log('Manual camera stopped');
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
                aspectRatio: { ideal: 16/9 }, // 16:9 aspect ratio for wider view
                frameRate: { ideal: 30, min: 20 } // Increased minimum framerate
            };
            
            // Set resolution based on selection with higher values
            switch(resolution) {
                case 'low':
                    videoConstraints.width = { ideal: 800, min: 640 }; // Increased from 640
                    videoConstraints.height = { ideal: 600, min: 480 }; // Increased from 480
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
            
            // Apply CSS to ensure the video fills the container properly
            autoWebcamElement.style.width = '100%';
            autoWebcamElement.style.height = '100%';
            
            // Wait for video to be ready
            await new Promise(resolve => {
                autoWebcamElement.onloadedmetadata = () => {
                    resolve();
                };
            });
            
            // Start playing video
            await autoWebcamElement.play();
            
            console.log('Automated camera started');
        } catch (error) {
            console.error('Error starting automated camera:', error);
            alert('Could not start camera. Please check camera permissions and try again.');
            
            // Reset automated system if camera fails
            resetAutomatedSystem();
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
                    studentCode: currentStudent.studentCode || currentStudent.studentId,
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
                    if (record.verificationMethod === 'DUAL_FACTOR') {
                        methodBadge = '<span class="badge bg-primary">Dual Factor</span>';
                    } else if (record.verificationMethod === 'FACE_ONLY') {
                        methodBadge = '<span class="badge bg-info">Face Only</span>';
                    } else if (record.verificationMethod === 'RFID_ONLY') {
                        methodBadge = '<span class="badge bg-warning">RFID Only</span>';
                    } else {
                        methodBadge = '<span class="badge bg-secondary">Manual</span>';
                    }
                    
                    // Handle missing student data with fallbacks
                    const student = record.student || {};
                    const studentName = student.name || (student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : 'Unknown');
                    const studentCode = student.studentCode || student.studentId || 'N/A';
                    const department = student.department || 'N/A';
                    
                    // RFID number - show full number without truncation
                    const rfidDisplay = student.rfidCardId || 'N/A';
                    
                    // Default photo if missing
                    const photoUrl = student.photoUrl || DEFAULT_AVATAR;
                    
                    // Delete button
                    const deleteBtn = `
                        <button class="btn btn-sm btn-danger delete-attendance" data-id="${record._id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                    
                    // Add confidence info if available
                    const confidenceInfo = record.faceConfidence ? 
                        `<div class="small text-muted mt-1">Confidence: ${record.faceConfidence.toFixed(1)}%</div>` : '';
                    
                    row.innerHTML = `
                        <td>
                            <img src="${photoUrl}" alt="${studentName}" class="recent-photo" onerror="this.src='${DEFAULT_AVATAR}'">
                        </td>
                        <td>${studentCode}</td>
                        <td>${studentName}</td>
                        <td class="rfid-cell">${rfidDisplay}</td>
                        <td>${department}</td>
                        <td>
                            ${formattedTime}
                            <div class="small text-muted">${recordTime.toLocaleDateString()}</div>
                        </td>
                        <td>${statusBadge}${confidenceInfo}</td>
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
            
            // Update last refresh timestamp
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            document.getElementById('last-refresh-time').textContent = `Last updated: ${timeString}`;
            
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

    // Start auto-refresh for attendance table
    function startAutoRefresh() {
        // Clear any existing interval
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
        
        // Refresh every 30 seconds
        autoRefreshInterval = setInterval(() => {
            loadTodaysAttendance();
        }, 30000);
    }

    // Stop auto-refresh
    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
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
        
        // Stop auto-refresh
        stopAutoRefresh();
    });

    // Display RFID card ID
    function displayRfidCardId(rfidCardId) {
        document.getElementById('manual-rfid-card-id').textContent = rfidCardId || 'None';
    }

    // Update RFID status in manual mode
    function updateManualRfidStatus(status, rfidCardId) {
        const statusElement = document.getElementById('manual-rfid-status');
        const cardIdElement = document.getElementById('manual-rfid-card-id');
        
        if (status === 'connected') {
            statusElement.className = 'badge bg-success';
            statusElement.textContent = 'Connected';
            cardIdElement.textContent = rfidCardId || 'Waiting for card...';
        } else {
            statusElement.className = 'badge bg-secondary';
            statusElement.textContent = 'Disconnected';
            cardIdElement.textContent = 'None';
        }
    }

    // Start automated manual system
    async function startAutomatedManualSystem() {
        try {
            // Hide regular camera controls
            startCameraBtn.style.display = 'none';
            capturePhotoBtn.style.display = 'none';
            
            // Show reset button
            resetManualSystemBtn.style.display = 'block';
            
            // Disable start button during initialization
            startManualSystemBtn.disabled = true;
            startManualSystemBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
            
            // Start camera
            await startManualCamera(true); // Pass true to indicate automated mode
            
            // Show and focus RFID input
            manualRfidInputContainer.style.display = 'block';
            manualRfidDirectInput.focus();
            
            // Show status overlay
            manualStatusOverlay.style.display = 'block';
            manualStatusMessage.textContent = 'Waiting for RFID card...';
            
            // Mark system as active
            manualSystemActive = true;
            
            // Add active class to system button
            startManualSystemBtn.classList.add('system-active');
            startManualSystemBtn.innerHTML = '<i class="fas fa-check-circle"></i> System Active';
            
            // Add automation visual indicators
            document.querySelector('.face-frame').classList.add('active-tracking');
            
            // Create face detected indicator
            const faceDetectedIndicator = document.createElement('div');
            faceDetectedIndicator.id = 'manual-face-detected';
            faceDetectedIndicator.className = 'face-detected';
            faceDetectedIndicator.style.display = 'none';
            faceDetectedIndicator.innerHTML = '<i class="fas fa-circle"></i> Face Detected';
            document.querySelector('.camera-container').appendChild(faceDetectedIndicator);
            
            // Create auto capture flash element
            const autoCaptureFlash = document.createElement('div');
            autoCaptureFlash.id = 'manual-auto-capture-flash';
            autoCaptureFlash.className = 'auto-capture-flash';
            document.querySelector('.camera-container').appendChild(autoCaptureFlash);
            
            // Update system state indicator in header
            const manualSystemStateElement = document.getElementById('manual-system-state');
            if (manualSystemStateElement) {
                manualSystemStateElement.style.display = 'inline-block';
                manualSystemStateElement.classList.remove('bg-light', 'text-dark');
                manualSystemStateElement.classList.add('bg-success', 'text-white');
                manualSystemStateElement.querySelector('i').classList.remove('text-secondary');
                manualSystemStateElement.querySelector('i').classList.add('text-white');
            }
            
            console.log('Automated manual system started');
        } catch (error) {
            console.error('Error starting automated manual system:', error);
            alert('Failed to start automated system. Please check camera permissions and try again.');
            
            // Reset UI
            resetAutomatedManualSystem();
        }
    }

    // Reset automated manual system
    function resetAutomatedManualSystem() {
        // Stop face capture interval
        stopManualFaceCapture();
        
        // Stop camera
        stopManualCamera();
        
        // Reset UI
        startCameraBtn.style.display = 'inline-block';
        capturePhotoBtn.style.display = 'inline-block';
        resetManualSystemBtn.style.display = 'none';
        manualRfidInputContainer.style.display = 'none';
        manualStatusOverlay.style.display = 'none';
        
        // Reset system state
        manualSystemActive = false;
        faceDetected = false;
        
        // Reset button state
        startManualSystemBtn.disabled = false;
        startManualSystemBtn.classList.remove('system-active');
        startManualSystemBtn.innerHTML = '<i class="fas fa-play"></i> Start System';
        
        // Remove face tracking indicators
        const faceFrame = document.querySelector('.face-frame');
        if (faceFrame) {
            faceFrame.classList.remove('active-tracking', 'face-detected');
        }
        
        // Remove face detected indicator
        const faceDetectedIndicator = document.getElementById('manual-face-detected');
        if (faceDetectedIndicator) {
            faceDetectedIndicator.remove();
        }
        
        // Remove auto capture flash
        const autoCaptureFlash = document.getElementById('manual-auto-capture-flash');
        if (autoCaptureFlash) {
            autoCaptureFlash.remove();
        }
        
        // Reset system state indicator in header
        const manualSystemStateElement = document.getElementById('manual-system-state');
        if (manualSystemStateElement) {
            manualSystemStateElement.style.display = 'none';
            manualSystemStateElement.classList.remove('bg-success', 'text-white');
            manualSystemStateElement.classList.add('bg-light', 'text-dark');
            manualSystemStateElement.querySelector('i').classList.remove('text-white');
            manualSystemStateElement.querySelector('i').classList.add('text-secondary');
        }
        
        // Reset student data
        resetStudentDataForNextEntry();
        
        console.log('Automated manual system reset');
    }

    // Handle RFID detection in manual automated mode
    async function handleManualRfidDetection(rfidCardId) {
        if (!manualSystemActive) return;
        
        try {
            // Update status
            manualStatusMessage.textContent = 'RFID detected. Verifying student...';
            
            // Fetch student data
            const student = await fetchStudentByRfid(rfidCardId);
            
            if (student) {
                // Update status
                manualStatusMessage.textContent = 'Student verified. Position face in frame...';
                
                // Start face tracking
                startManualFaceCapture();
            } else {
                // Update status for error
                manualStatusMessage.textContent = 'Student not found. Please try again.';
                manualStatusOverlay.classList.add('error');
                
                // Reset after delay
                setTimeout(() => {
                    manualStatusOverlay.classList.remove('error');
                    manualStatusMessage.textContent = 'Waiting for RFID card...';
                    manualRfidDirectInput.value = '';
                    manualRfidDirectInput.focus();
                }, 3000);
            }
        } catch (error) {
            console.error('Error handling RFID in manual mode:', error);
            
            // Update status for error
            manualStatusMessage.textContent = 'Error processing RFID. Please try again.';
            manualStatusOverlay.classList.add('error');
            
            // Reset after delay
            setTimeout(() => {
                manualStatusOverlay.classList.remove('error');
                manualStatusMessage.textContent = 'Waiting for RFID card...';
                manualRfidDirectInput.value = '';
                manualRfidDirectInput.focus();
            }, 3000);
        }
    }

    // Submit direct RFID input for manual mode
    function submitManualDirectRfid() {
        const rfidCardId = manualRfidDirectInput.value.trim();
        
        if (!rfidCardId) {
            alert('Please enter an RFID card ID');
            return;
        }
        
        // Process the RFID
        handleManualRfidDetection(rfidCardId);
        
        // Clear the input and refocus
        manualRfidDirectInput.value = '';
        manualRfidDirectInput.focus();
    }

    // Start manual face capture for automated detection
    function startManualFaceCapture() {
        // Clear any existing interval
        stopManualFaceCapture();
        
        // Start a new interval to check for face position
        manualFaceCaptureInterval = setInterval(() => {
            checkFacePositionAndCapture();
        }, 500); // Check every 500ms
        
        console.log('Manual face tracking started');
    }

    // Stop manual face capture interval
    function stopManualFaceCapture() {
        if (manualFaceCaptureInterval) {
            clearInterval(manualFaceCaptureInterval);
            manualFaceCaptureInterval = null;
            console.log('Manual face tracking stopped');
        }
        
        // Clear face tracking timeout
        if (faceTrackingTimeout) {
            clearTimeout(faceTrackingTimeout);
            faceTrackingTimeout = null;
        }
        
        // Reset face detection state
        faceDetected = false;
        
        // Remove face-detected class from face frame
        const faceFrame = document.querySelector('.face-frame');
        if (faceFrame) {
            faceFrame.classList.remove('face-detected');
        }
        
        // Hide face detected indicator
        const faceDetectedIndicator = document.getElementById('manual-face-detected');
        if (faceDetectedIndicator) {
            faceDetectedIndicator.style.display = 'none';
        }
    }

    // Check face position and auto-capture if centered
    function checkFacePositionAndCapture() {
        try {
            // Skip if on cooldown
            if (autoCaptureCooldown) return;
            
            // Ensure we have a valid video stream
            if (!manualWebcamElement.srcObject || !manualWebcamElement.videoWidth) {
                console.log('Video not ready yet');
                return;
            }
            
            // Use a more sophisticated face detection approach
            // Draw current frame to canvas to analyze - using a larger size for better detection
            const tempCanvas = document.createElement('canvas');
            const tempContext = tempCanvas.getContext('2d');
            tempCanvas.width = 200; // Increased from 100 for better analysis
            tempCanvas.height = 200;
            
            // Draw video frame to canvas (centered and scaled down)
            tempContext.drawImage(
                manualWebcamElement, 
                (manualWebcamElement.videoWidth - manualWebcamElement.videoWidth*0.7)/2, // Use more of the frame (70% vs 50%)
                (manualWebcamElement.videoHeight - manualWebcamElement.videoHeight*0.7)/2,
                manualWebcamElement.videoWidth*0.7, 
                manualWebcamElement.videoHeight*0.7,
                0, 0, 200, 200
            );
            
            // Get image data
            const imageData = tempContext.getImageData(0, 0, 200, 200);
            const data = imageData.data;
            
            // Calculate average brightness in center region
            let totalBrightness = 0;
            let pixelCount = 0;
            
            // Focus on center region where face is likely to be
            for (let y = 60; y < 140; y++) {
                for (let x = 60; x < 140; x++) {
                    const index = (y * 200 + x) * 4;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];
                    
                    // Calculate brightness (weighted average for better skin tone detection)
                    // Human skin has higher red component regardless of ethnicity
                    const brightness = (r * 0.5 + g * 0.3 + b * 0.2);
                    totalBrightness += brightness;
                    pixelCount++;
                }
            }
            
            const averageBrightness = totalBrightness / pixelCount;
            
            // Calculate variance (for movement detection)
            let totalVariance = 0;
            
            // Calculate skin tone ratio - faces have a specific R:G:B ratio
            let redSum = 0, greenSum = 0, blueSum = 0;
            
            for (let y = 60; y < 140; y++) {
                for (let x = 60; x < 140; x++) {
                    const index = (y * 200 + x) * 4;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];
                    
                    // Add to color sums
                    redSum += r;
                    greenSum += g;
                    blueSum += b;
                    
                    const pixelBrightness = (r * 0.5 + g * 0.3 + b * 0.2);
                    const diff = pixelBrightness - averageBrightness;
                    totalVariance += diff * diff;
                }
            }
            
            const variance = Math.sqrt(totalVariance / pixelCount);
            
            // Calculate color ratios (most human faces have R>G>B regardless of ethnicity)
            const redRatio = redSum / (redSum + greenSum + blueSum);
            const greenRatio = greenSum / (redSum + greenSum + blueSum);
            const blueRatio = blueSum / (redSum + greenSum + blueSum);
            
            // Face detection criteria:
            // 1. Brightness in acceptable range (wider range)
            // 2. Enough variance (for facial features)
            // 3. Color ratios typical of human skin (R > G > B in most cases)
            // 4. Variance not too high (to avoid detecting hands waving)
            const brightnessFactor = averageBrightness > 40 && averageBrightness < 220;
            const varianceFactor = variance > 15 && variance < 80; // Tighter range to avoid false positives
            const colorFactor = (redRatio > greenRatio) && (greenRatio > blueRatio) && (redRatio < 0.5); // Basic skin tone check
            
            // Combine factors - no randomness for consistent detection
            const faceDetectionResult = brightnessFactor && varianceFactor && colorFactor;
            
            const faceDetectedIndicator = document.getElementById('manual-face-detected');
            const faceFrame = document.querySelector('.face-frame');
            
            if (faceDetectionResult) {
                // Face detected
                if (!faceDetected) {
                    console.log('Face detected', {averageBrightness, variance, redRatio, greenRatio, blueRatio});
                    faceDetected = true;
                    
                    // Show face detected indicator
                    if (faceDetectedIndicator) {
                        faceDetectedIndicator.style.display = 'flex';
                    }
                    
                    // Update face frame to show detection
                    if (faceFrame) {
                        faceFrame.classList.add('face-detected');
                    }
                    
                    // Start timeout for auto capture (REDUCED to 0.7s for faster response)
                    faceTrackingTimeout = setTimeout(() => {
                        // Auto capture if face is still detected
                        if (faceDetected && manualSystemActive) {
                            autoCaptureFace();
                        }
                    }, 700);
                }
            } else {
                // Face not detected
                if (faceDetected) {
                    console.log('Face lost', {averageBrightness, variance, redRatio, greenRatio, blueRatio});
                    faceDetected = false;
                    
                    // Hide face detected indicator
                    if (faceDetectedIndicator) {
                        faceDetectedIndicator.style.display = 'none';
                    }
                    
                    // Update face frame to show no detection
                    if (faceFrame) {
                        faceFrame.classList.remove('face-detected');
                    }
                    
                    // Clear timeout
                    if (faceTrackingTimeout) {
                        clearTimeout(faceTrackingTimeout);
                        faceTrackingTimeout = null;
                    }
                }
            }
            
            // Clean up
            tempCanvas.remove();
        } catch (error) {
            console.error('Error checking face position:', error);
        }
    }

    // Auto capture face when positioned correctly
    async function autoCaptureFace() {
        if (!manualStream || !manualSystemActive || !currentStudent) {
            console.log('Cannot auto-capture: system not ready');
            return;
        }
        
        try {
            // Set cooldown flag to prevent multiple captures
            autoCaptureCooldown = true;
            
            // Update status
            manualStatusMessage.textContent = 'Capturing face...';
            manualStatusOverlay.classList.add('processing');
            
            // Add capture flash effect
            const autoCaptureFlash = document.getElementById('manual-auto-capture-flash');
            if (autoCaptureFlash) {
                autoCaptureFlash.classList.add('active');
                setTimeout(() => {
                    autoCaptureFlash.classList.remove('active');
                }, 500);
            }
            
            // Set canvas dimensions to match video
            manualCanvasElement.width = manualWebcamElement.videoWidth;
            manualCanvasElement.height = manualWebcamElement.videoHeight;
            
            // Draw video frame to canvas
            const context = manualCanvasElement.getContext('2d');
            context.drawImage(manualWebcamElement, 0, 0, manualCanvasElement.width, manualCanvasElement.height);
            
            // Get image data as base64
            const imageData = manualCanvasElement.toDataURL('image/jpeg', 0.9);
            
            // Show processing message
            manualVerificationResultElement.style.display = 'block';
            manualVerificationResultElement.className = 'alert alert-info';
            manualVerificationResultElement.innerHTML = `
                <i class="fas fa-spinner fa-spin me-2"></i>
                <strong>Processing...</strong> Verifying student identity.
            `;
            
            // Store current student for reset
            const processedStudent = {...currentStudent};
            
            // Send to server for verification
            const response = await fetch('/api/attendance/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: processedStudent.id || processedStudent._id || processedStudent.studentId,
                    rfidCardId: processedStudent.rfidCardId,
                    imageData: imageData
                })
            });
            
            // Process response
            if (response.ok) {
                const data = await response.json();
                
                // Update status based on verification result
                if (data.verified) {
                    // Success
                    manualStatusMessage.textContent = 'Attendance recorded successfully!';
                    manualStatusOverlay.classList.remove('processing');
                    manualStatusOverlay.classList.add('success');
                    
                    // Show success message
                    manualVerificationResultElement.className = 'alert alert-success';
                    manualVerificationResultElement.innerHTML = `
                        <i class="fas fa-check-circle me-2"></i>
                        <strong>Success!</strong> ${data.message || 'Attendance recorded.'}
                    `;
                    
                    // Enable print button
                    printBtn.disabled = false;
                    
                    // Refresh attendance table
                    loadTodaysAttendance();
                    
                    // Reset system after delay
                    setTimeout(() => {
                        // Reset for next student
                        resetStudentDataForNextEntry();
                        
                        // Reset cooldown
                        autoCaptureCooldown = false;
                    }, 2000);
                } else {
                    // Verification failed
                    manualStatusMessage.textContent = 'Verification failed. Please try again.';
                    manualStatusOverlay.classList.remove('processing');
                    manualStatusOverlay.classList.add('error');
                    
                    // Show error message
                    manualVerificationResultElement.className = 'alert alert-danger';
                    manualVerificationResultElement.innerHTML = `
                        <i class="fas fa-times-circle me-2"></i>
                        <strong>Failed!</strong> ${data.message || 'Face verification failed.'}
                    `;
                    
                    // Reset after delay
                    setTimeout(() => {
                        // Reset for next student
                        resetStudentDataForNextEntry();
                        
                        // Reset cooldown
                        autoCaptureCooldown = false;
                    }, 2000);
                }
            } else {
                // API error
                const errorData = await response.json();
                
                manualStatusMessage.textContent = 'Server error. Please try again.';
                manualStatusOverlay.classList.remove('processing');
                manualStatusOverlay.classList.add('error');
                
                // Show error message
                manualVerificationResultElement.className = 'alert alert-danger';
                manualVerificationResultElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Error!</strong> ${errorData.message || 'Failed to process verification.'}
                `;
                
                // Reset after delay
                setTimeout(() => {
                    // Reset for next student
                    resetStudentDataForNextEntry();
                    
                    // Reset cooldown
                    autoCaptureCooldown = false;
                }, 2000);
            }
        } catch (error) {
            console.error('Error in auto capture:', error);
            
            manualStatusMessage.textContent = 'System error. Please try again.';
            manualStatusOverlay.classList.remove('processing');
            manualStatusOverlay.classList.add('error');
            
            // Show error message
            manualVerificationResultElement.className = 'alert alert-danger';
            manualVerificationResultElement.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Error!</strong> System error occurred.
            `;
            
            // Reset after delay
            setTimeout(() => {
                // Reset for next student
                resetStudentDataForNextEntry();
                
                // Reset cooldown
                autoCaptureCooldown = false;
            }, 2000);
        }
    }
    
    // Helper function to reset student data and prepare for next entry
    function resetStudentDataForNextEntry() {
        // Clear current student
        currentStudent = null;
        
        // Hide student details
        studentDetailsElement.style.display = 'none';
        noStudentMessageElement.style.display = 'block';
        
        // Reset student photo
        studentPhotoElement.src = '';
        
        // Clear student info
        studentNameElement.textContent = '';
        studentIdElement.textContent = '';
        studentDepartmentElement.textContent = '';
        
        // Hide verification result
        manualVerificationResultElement.style.display = 'none';
        
        // Reset status overlay
        manualStatusOverlay.classList.remove('success', 'error', 'processing');
        manualStatusMessage.textContent = 'Waiting for RFID card...';
        
        // Reset RFID input
        manualRfidDirectInput.value = '';
        manualRfidCardIdElement.textContent = 'None';
        
        // Focus on RFID input
        manualRfidDirectInput.focus();
        
        // Stop face tracking
        stopManualFaceCapture();
    }
}); 