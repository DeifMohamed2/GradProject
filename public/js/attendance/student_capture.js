document.addEventListener('DOMContentLoaded', () => {
    // Cloudinary configuration
    const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dusod9wxt/upload';
    const CLOUDINARY_UPLOAD_PRESET = 'order_project';
    
    // DOM Elements
    const webcamElement = document.getElementById('webcam');
    const canvasElement = document.getElementById('canvas');
    const startCameraBtn = document.getElementById('start-camera');
    const capturePhotoBtn = document.getElementById('capture-photo');
    const retakePhotoBtn = document.getElementById('retake-photo');
    const addCapturedPhotoBtn = document.getElementById('add-captured-photo');
    const capturePreviewElement = document.getElementById('capture-preview');
    const capturedImageElement = document.getElementById('captured-image');
    const studentSearchForm = document.getElementById('student-search-form');
    const studentInfoContainer = document.getElementById('student-info-container');
    const saveStudentBtn = document.getElementById('save-student-btn');
    const rfidCardIdInput = document.getElementById('rfid-card-id');
    const scanRfidBtn = document.getElementById('scan-rfid-btn');
    const modalRfidStatusElement = document.getElementById('modal-rfid-status');
    const modalRfidCardIdElement = document.getElementById('modal-rfid-card-id');
    const useRfidBtn = document.getElementById('use-rfid-btn');
    const simulateRfidCheck = document.getElementById('simulate-rfid-check');
    const simulateRfidInput = document.getElementById('simulate-rfid-input');
    const manualRfidInput = document.getElementById('manual-rfid-input');
    const simulateRfidBtn = document.getElementById('simulate-rfid-btn');
    const refreshStudentsBtn = document.getElementById('refresh-students');
    const studentsTableBody = document.getElementById('students-table-body');
    const photoGallery = document.getElementById('photo-gallery');
    const photoUploadZone = document.getElementById('photo-upload-zone');
    const photoFileInput = document.getElementById('photo-file-input');
    const photoCountElement = document.getElementById('photo-count');
    const studentPhotosContainer = document.getElementById('student-photos-container');
    const setProfilePictureCheck = document.getElementById('set-profile-picture');
    const studentCodeInput = document.getElementById('student-code');
    const studentNameElement = document.getElementById('student-name');
    const studentGradeElement = document.getElementById('student-grade');
    const studentSectionElement = document.getElementById('student-section');

    // State variables
    let stream = null;
    let capturedImageData = null;
    let eventSource = null;
    let photoGalleryItems = []; // Array to store photos for upload
    let currentStudent = null; // Current student data

    // Initialize the page
    initPage();

    // Functions
    function initPage() {
        loadStudents();
        
        // Event listeners
        startCameraBtn.addEventListener('click', startCamera);
        capturePhotoBtn.addEventListener('click', capturePhoto);
        retakePhotoBtn.addEventListener('click', retakePhoto);
        addCapturedPhotoBtn.addEventListener('click', addCapturedPhotoToGallery);
        studentSearchForm.addEventListener('submit', findStudent);
        saveStudentBtn.addEventListener('click', saveStudentPhotos);
        simulateRfidCheck.addEventListener('change', toggleSimulateRfidInput);
        simulateRfidBtn.addEventListener('click', simulateRfid);
        useRfidBtn.addEventListener('click', useRfid);
        refreshStudentsBtn.addEventListener('click', loadStudents);
        
        // Setup RFID events in modal
        document.getElementById('scanRfidModal').addEventListener('show.bs.modal', setupRfidEvents);
        document.getElementById('scanRfidModal').addEventListener('hidden.bs.modal', closeRfidEvents);
        
        // Setup photo upload zone
        photoUploadZone.addEventListener('click', () => photoFileInput.click());
        photoUploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            photoUploadZone.classList.add('border-primary');
        });
        photoUploadZone.addEventListener('dragleave', () => {
            photoUploadZone.classList.remove('border-primary');
        });
        photoUploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            photoUploadZone.classList.remove('border-primary');
            if (e.dataTransfer.files.length) {
                handleFileUpload(e.dataTransfer.files);
            }
        });
        
        photoFileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFileUpload(e.target.files);
            }
        });
    }

    // Find student by code
    async function findStudent(event) {
        event.preventDefault();
        
        const studentCode = studentCodeInput.value.trim();
        if (!studentCode) {
            alert('Please enter a student code');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = event.submitter;
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Searching...';
            submitBtn.disabled = true;
            
            // Make API request to find student
            const response = await fetch(`/admin/getStudentByCode/${studentCode}`);
            
            if (!response.ok) {
                throw new Error('Student not found');
            }
            
            const student = await response.json();
            currentStudent = student;
            
            // Display student information
            studentNameElement.textContent = `${student.firstName} ${student.lastName}`;
            studentGradeElement.textContent = `Grade ${student.grade}`;
            studentSectionElement.textContent = student.section;
            
            // Show student info container
            studentInfoContainer.style.display = 'block';
            
            // Reset photo gallery
            photoGalleryItems = [];
            updatePhotoGallery();
            
            // Reset RFID field if needed
            if (student.rfidCardId) {
                rfidCardIdInput.value = student.rfidCardId;
            } else {
                rfidCardIdInput.value = '';
            }
            
            checkFormValidity();
        } catch (error) {
            console.error('Error finding student:', error);
            alert('Student not found. Please check the student code and try again.');
        } finally {
            // Reset button
            const submitBtn = event.submitter;
            submitBtn.innerHTML = '<i class="fas fa-search"></i> Find';
            submitBtn.disabled = false;
        }
    }

    // Handle file upload
    function handleFileUpload(files) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        
        Array.from(files).forEach(file => {
            if (allowedTypes.includes(file.type)) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const photoData = {
                        file: file,
                        dataUrl: e.target.result,
                        isPrimary: photoGalleryItems.length === 0 // First photo is primary
                    };
                    photoGalleryItems.push(photoData);
                    updatePhotoGallery();
                };
                reader.readAsDataURL(file);
            } else {
                alert(`File type not supported: ${file.type}. Please upload JPG or PNG images.`);
            }
        });
    }

    // Update photo gallery
    function updatePhotoGallery() {
        photoGallery.innerHTML = '';
        
        photoGalleryItems.forEach((item, index) => {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            
            const img = document.createElement('img');
            img.src = item.dataUrl;
            img.alt = 'Student Photo';
            
            const actions = document.createElement('div');
            actions.className = 'photo-actions';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Remove Photo';
            deleteBtn.addEventListener('click', () => removePhotoFromGallery(index));
            
            const setPrimaryBtn = document.createElement('button');
            setPrimaryBtn.innerHTML = '<i class="fas fa-star"></i>';
            setPrimaryBtn.title = 'Set as Primary Photo';
            setPrimaryBtn.addEventListener('click', () => setPrimaryPhoto(index));
            
            actions.appendChild(deleteBtn);
            actions.appendChild(setPrimaryBtn);
            
            photoItem.appendChild(img);
            photoItem.appendChild(actions);
            
            if (item.isPrimary) {
                const primaryBadge = document.createElement('div');
                primaryBadge.className = 'primary-badge';
                primaryBadge.textContent = 'Primary';
                photoItem.appendChild(primaryBadge);
            }
            
            photoGallery.appendChild(photoItem);
        });
        
        photoCountElement.textContent = `${photoGalleryItems.length} Photos`;
        checkFormValidity();
    }

    // Remove photo from gallery
    function removePhotoFromGallery(index) {
        const wasPrimary = photoGalleryItems[index].isPrimary;
        photoGalleryItems.splice(index, 1);
        
        // If we removed the primary photo and there are still photos left, set a new primary
        if (wasPrimary && photoGalleryItems.length > 0) {
            photoGalleryItems[0].isPrimary = true;
        }
        
        updatePhotoGallery();
    }

    // Set primary photo
    function setPrimaryPhoto(index) {
        photoGalleryItems.forEach((item, i) => {
            item.isPrimary = (i === index);
        });
        
        updatePhotoGallery();
    }

    // Start camera
    async function startCamera() {
        try {
            startCameraBtn.disabled = true;
            startCameraBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Starting...';
            
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
            
            // Show webcam and hide preview
            webcamElement.style.display = 'block';
            capturePreviewElement.style.display = 'none';
            
            // Enable capture button
            capturePhotoBtn.disabled = false;
            retakePhotoBtn.style.display = 'none';
            addCapturedPhotoBtn.style.display = 'none';
            
            // Change button text
            startCameraBtn.textContent = 'Camera Active';
            startCameraBtn.disabled = true;
            
            checkFormValidity();
        } catch (error) {
            console.error('Error starting camera:', error);
            alert('Failed to start camera. Please check camera permissions.');
            startCameraBtn.textContent = 'Start Camera';
            startCameraBtn.disabled = false;
        }
    }

    // Capture photo
    function capturePhoto() {
        try {
            // Set canvas dimensions to match video
            canvasElement.width = webcamElement.videoWidth;
            canvasElement.height = webcamElement.videoHeight;
            
            // Draw video frame to canvas
            const context = canvasElement.getContext('2d');
            context.drawImage(webcamElement, 0, 0, canvasElement.width, canvasElement.height);
            
            // Get image data as base64
            capturedImageData = canvasElement.toDataURL('image/jpeg');
            
            // Display the captured image
            capturedImageElement.src = capturedImageData;
            
            // Hide webcam and show preview
            webcamElement.style.display = 'none';
            capturePreviewElement.style.display = 'block';
            
            // Update buttons
            capturePhotoBtn.disabled = true;
            retakePhotoBtn.style.display = 'inline-block';
            addCapturedPhotoBtn.style.display = 'inline-block';
            
            // Stop camera stream
            stopCamera();
            
            checkFormValidity();
        } catch (error) {
            console.error('Error capturing photo:', error);
            alert('Failed to capture photo. Please try again.');
        }
    }

    // Add captured photo to gallery
    function addCapturedPhotoToGallery() {
        if (capturedImageData) {
            // Convert base64 to blob
            const byteString = atob(capturedImageData.split(',')[1]);
            const mimeType = capturedImageData.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            
            const blob = new Blob([ab], { type: mimeType });
            const fileName = `webcam-capture-${Date.now()}.jpg`;
            const file = new File([blob], fileName, { type: mimeType });
            
            const photoData = {
                file: file,
                dataUrl: capturedImageData,
                isPrimary: photoGalleryItems.length === 0 // First photo is primary
            };
            
            photoGalleryItems.push(photoData);
            updatePhotoGallery();
            
            // Reset capture UI
            retakePhoto();
            startCamera();
        }
    }

    // Retake photo
    function retakePhoto() {
        // Clear captured image
        capturedImageData = null;
        capturedImageElement.src = '';
        
        // Reset buttons
        retakePhotoBtn.style.display = 'none';
        addCapturedPhotoBtn.style.display = 'none';
        startCameraBtn.disabled = false;
        startCameraBtn.textContent = 'Start Camera';
        
        checkFormValidity();
    }

    // Stop camera
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            webcamElement.srcObject = null;
            stream = null;
        }
    }

    // Setup RFID events in modal
    function setupRfidEvents() {
        // Reset modal state
        modalRfidStatusElement.textContent = 'Waiting';
        modalRfidStatusElement.className = 'badge bg-secondary';
        modalRfidCardIdElement.textContent = 'None';
        useRfidBtn.disabled = true;
        
        // Connect to RFID events
        eventSource = new EventSource('/api/rfid/events');
        
        eventSource.onopen = () => {
            console.log('Connected to RFID events in modal');
            modalRfidStatusElement.textContent = 'Connected';
            modalRfidStatusElement.className = 'badge bg-success';
        };
        
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.rfidCardId) {
                console.log('RFID card detected in modal:', data.rfidCardId);
                modalRfidCardIdElement.textContent = data.rfidCardId;
                useRfidBtn.disabled = false;
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('Error with RFID events in modal:', error);
            modalRfidStatusElement.textContent = 'Error';
            modalRfidStatusElement.className = 'badge bg-danger';
        };
    }

    // Close RFID events
    function closeRfidEvents() {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    }

    // Toggle simulate RFID input
    function toggleSimulateRfidInput() {
        if (simulateRfidCheck.checked) {
            simulateRfidInput.style.display = 'block';
        } else {
            simulateRfidInput.style.display = 'none';
        }
    }

    // Simulate RFID
    async function simulateRfid() {
        const rfidCardId = manualRfidInput.value.trim();
        
        if (!rfidCardId) {
            alert('Please enter an RFID card ID');
            return;
        }
        
        try {
            simulateRfidBtn.disabled = true;
            simulateRfidBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            
            const response = await fetch('/api/rfid/simulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rfidCardId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                modalRfidCardIdElement.textContent = rfidCardId;
                useRfidBtn.disabled = false;
            } else {
                alert(`Failed to simulate RFID card: ${data.message}`);
            }
        } catch (error) {
            console.error('Error simulating RFID card:', error);
            alert('Failed to simulate RFID card. Check console for details.');
        } finally {
            simulateRfidBtn.disabled = false;
            simulateRfidBtn.textContent = 'Simulate';
        }
    }

    // Use RFID card
    function useRfid() {
        const rfidCardId = modalRfidCardIdElement.textContent;
        if (rfidCardId && rfidCardId !== 'None') {
            rfidCardIdInput.value = rfidCardId;
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('scanRfidModal'));
            modal.hide();
            
            checkFormValidity();
        }
    }

    // Check if form can be submitted
    function checkFormValidity() {
        // Form is valid if student is found and at least one photo is available
        const isValid = currentStudent && photoGalleryItems.length > 0;
        saveStudentBtn.disabled = !isValid;
    }

    // Upload photo to Cloudinary
    async function uploadToCloudinary(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to upload image to Cloudinary');
        }
        
        return await response.json();
    }

    // Save student photos
    async function saveStudentPhotos() {
        if (!currentStudent) {
            alert('No student selected. Please search for a student first.');
            return;
        }
        
        if (photoGalleryItems.length === 0) {
            alert('Please capture or upload at least one photo');
            return;
        }
        
        const rfidCardId = rfidCardIdInput.value.trim();
        
        try {
            saveStudentBtn.disabled = true;
            saveStudentBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
            
            // Find primary photo
            const primaryPhotoIndex = photoGalleryItems.findIndex(item => item.isPrimary);
            const primaryPhoto = photoGalleryItems[primaryPhotoIndex >= 0 ? primaryPhotoIndex : 0];
            
            // Upload primary photo to Cloudinary if set-profile-picture is checked
            let profilePictureUrl = null;
            if (setProfilePictureCheck.checked) {
                try {
                    const cloudinaryResponse = await uploadToCloudinary(primaryPhoto.file);
                    profilePictureUrl = cloudinaryResponse.secure_url;
                    
                    // Update student profile picture in database
                    await fetch(`/admin/updateStudentProfilePicture/${currentStudent._id}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ profilePicture: profilePictureUrl })
                    });
                } catch (error) {
                    console.error('Error uploading to Cloudinary:', error);
                    // Continue with face encoding even if Cloudinary upload fails
                }
            }
            
            // Create form data for face encoding
            const formData = new FormData();
            formData.append('studentId', currentStudent._id);
            formData.append('studentCode', currentStudent.studentCode);
            formData.append('name', `${currentStudent.firstName} ${currentStudent.lastName}`);
            formData.append('grade', currentStudent.grade);
            formData.append('section', currentStudent.section);
            
            if (rfidCardId) {
                formData.append('rfidCardId', rfidCardId);
                
                // Update RFID card ID in database
                await fetch(`/admin/updateStudentRfid/${currentStudent._id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ rfidCardId })
                });
            }
            
            // Append all photos
            photoGalleryItems.forEach((photo, index) => {
                formData.append('photos', photo.file);
                formData.append('isPrimary', photo.isPrimary ? 'true' : 'false');
            });
            
            // Send to face encoding API
            const response = await fetch('/api/attendance/encode-student-face', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                
                // Handle specific error types
                if (errorData.error === 'SERVICE_UNAVAILABLE') {
                    throw new Error(`Service unavailable: ${errorData.message}`);
                } else {
                    throw new Error(errorData.message || 'Failed to encode student face');
                }
            }
            
            const result = await response.json();
            
            // Show appropriate message based on result
            if (result.hasFailures) {
                // Some photos failed but some succeeded
                Swal.fire({
                    icon: 'warning',
                    title: 'Partial Success',
                    html: `
                        <p>${result.successfulPhotos} of ${result.totalPhotos} photos were processed successfully.</p>
                        <p>Some photos could not be processed due to errors:</p>
                        <ul class="text-start small">
                            ${result.failedPhotos.map(p => `<li>Error: ${p.error}</li>`).join('')}
                        </ul>
                    `,
                    confirmButtonColor: '#3085d6'
                });
            } else {
                // All photos succeeded
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: `All ${result.successfulPhotos} photos were saved and encoded successfully.`,
                    confirmButtonColor: '#3085d6'
                });
            }
            
            // Reset form
            studentInfoContainer.style.display = 'none';
            studentCodeInput.value = '';
            rfidCardIdInput.value = '';
            photoGalleryItems = [];
            updatePhotoGallery();
            currentStudent = null;
            
            // Reload students list
            loadStudents();
        } catch (error) {
            console.error('Error saving student photos:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Failed to save student photos: ${error.message}`,
                confirmButtonColor: '#d33'
            });
        } finally {
            saveStudentBtn.disabled = false;
            saveStudentBtn.innerHTML = '<i class="fas fa-save"></i> Save Photos';
        }
    }

    // Load students with encoded faces
    async function loadStudents() {
        try {
            refreshStudentsBtn.disabled = true;
            refreshStudentsBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
            
            const response = await fetch('/api/attendance/students-with-faces');
            const students = await response.json();
            
            studentsTableBody.innerHTML = '';
            
            if (students.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="fas fa-users fa-2x mb-2"></i>
                        <p>No students with captured photos yet</p>
                    </td>
                `;
                studentsTableBody.appendChild(row);
            } else {
                students.forEach(student => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>
                            <img src="${student.profilePicture || '/uploads/placeholder.jpg'}" alt="${student.firstName} ${student.lastName}" class="student-photo-preview">
                        </td>
                        <td>${student.studentCode}</td>
                        <td>${student.firstName} ${student.lastName}</td>
                        <td>Grade ${student.grade} - ${student.section}</td>
                        <td>${student.rfidCardId || 'Not assigned'}</td>
                        <td>
                            <div class="position-relative">
                                <button class="btn btn-sm btn-outline-primary" onclick="viewStudentPhotos('${student._id}')">
                                    <i class="fas fa-images"></i>
                                </button>
                                <span class="badge-count">${student.photoCount || 1}</span>
                            </div>
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="recaptureStudentPhotos('${student.studentCode}')">
                                    <i class="fas fa-camera"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="deleteStudentFaces('${student._id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    `;
                    studentsTableBody.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Error loading students:', error);
            alert('Failed to load students. Check console for details.');
        } finally {
            refreshStudentsBtn.disabled = false;
            refreshStudentsBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        }
    }

    // View student photos
    window.viewStudentPhotos = async function(studentId) {
        try {
            const response = await fetch(`/api/attendance/student-faces/${studentId}`);
            const student = await response.json();
            
            studentPhotosContainer.innerHTML = '';
            
            if (student.photos && student.photos.length > 0) {
                student.photos.forEach(photo => {
                    const col = document.createElement('div');
                    col.className = 'col-md-4 mb-3';
                    
                    const card = document.createElement('div');
                    card.className = 'card h-100';
                    
                    const img = document.createElement('img');
                    img.src = photo.url;
                    img.className = 'card-img-top';
                    img.alt = 'Student Photo';
                    
                    const cardBody = document.createElement('div');
                    cardBody.className = 'card-body';
                    
                    const cardText = document.createElement('div');
                    cardText.className = 'd-flex justify-content-between align-items-center';
                    
                    const badge = document.createElement('span');
                    if (photo.isPrimary) {
                        badge.className = 'badge bg-success';
                        badge.textContent = 'Primary';
                    } else {
                        badge.className = 'badge bg-secondary';
                        badge.textContent = 'Secondary';
                    }
                    
                    const date = document.createElement('small');
                    date.className = 'text-muted';
                    date.textContent = new Date(photo.createdAt).toLocaleDateString();
                    
                    cardText.appendChild(badge);
                    cardText.appendChild(date);
                    cardBody.appendChild(cardText);
                    
                    card.appendChild(img);
                    card.appendChild(cardBody);
                    col.appendChild(card);
                    
                    studentPhotosContainer.appendChild(col);
                });
            } else {
                studentPhotosContainer.innerHTML = `
                    <div class="col-12 text-center py-5 text-muted">
                        <i class="fas fa-image fa-3x mb-3"></i>
                        <p>No photos available</p>
                    </div>
                `;
            }
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('studentPhotosModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading student photos:', error);
            alert('Failed to load student photos. Check console for details.');
        }
    };

    // Recapture student photos
    window.recaptureStudentPhotos = function(studentCode) {
        studentCodeInput.value = studentCode;
        // Trigger the search form submission
        const event = new Event('submit', { bubbles: true, cancelable: true });
        studentSearchForm.dispatchEvent(event);
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Delete student faces
    window.deleteStudentFaces = async function(studentId) {
        if (confirm('Are you sure you want to delete this student\'s face data? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/attendance/delete-student-faces/${studentId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    alert('Student face data deleted successfully');
                    loadStudents();
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to delete student face data');
                }
            } catch (error) {
                console.error('Error deleting student face data:', error);
                alert(`Failed to delete student face data: ${error.message}`);
            }
        }
    };
}); 