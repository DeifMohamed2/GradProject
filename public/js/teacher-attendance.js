document.addEventListener('DOMContentLoaded', function() {
    const classSelect = document.getElementById('class-select');
    const attendanceHistoryContainer = document.getElementById('attendance-history');
    
    if (classSelect) {
        // Load attendance history when class is selected
        classSelect.addEventListener('change', function() {
            const classId = this.value;
            if (classId) {
                loadAttendanceHistory(classId);
            } else {
                attendanceHistoryContainer.innerHTML = '<div class="alert alert-info">Please select a class to view attendance history.</div>';
            }
        });
        
        // Load initial data if a class is preselected
        if (classSelect.value) {
            loadAttendanceHistory(classSelect.value);
        }
    }
    
    // Initialize new attendance form if exists
    const newAttendanceForm = document.getElementById('new-attendance-form');
    if (newAttendanceForm) {
        newAttendanceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createAttendanceSession();
        });
    }
});

// Load attendance history for a class
function loadAttendanceHistory(classId) {
    const attendanceHistoryContainer = document.getElementById('attendance-history');
    
    attendanceHistoryContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    // Fetch attendance history
    fetch(`/teacher/classes/${classId}/attendance`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.sessions && data.sessions.length > 0) {
                    renderAttendanceSessions(data.sessions);
                } else {
                    attendanceHistoryContainer.innerHTML = '<div class="alert alert-info">No attendance records found for this class.</div>';
                }
            } else {
                attendanceHistoryContainer.innerHTML = `<div class="alert alert-danger">${data.message || 'Failed to load attendance history.'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading attendance history:', error);
            attendanceHistoryContainer.innerHTML = '<div class="alert alert-danger">An error occurred while loading attendance history.</div>';
        });
}

// Render attendance sessions
function renderAttendanceSessions(sessions) {
    const attendanceHistoryContainer = document.getElementById('attendance-history');
    attendanceHistoryContainer.innerHTML = '';
    
    sessions.forEach(session => {
        const sessionCard = document.createElement('div');
        sessionCard.className = 'card mb-4';
        
        // Format date
        const sessionDate = new Date(session.date);
        const formattedDate = sessionDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Calculate attendance stats
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        
        if (session.attendances && session.attendances.length > 0) {
            session.attendances.forEach(attendance => {
                if (attendance.status === 'present') presentCount++;
                else if (attendance.status === 'absent') absentCount++;
                else if (attendance.status === 'late') lateCount++;
            });
        }
        
        const totalStudents = presentCount + absentCount + lateCount;
        const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
        
        sessionCard.innerHTML = `
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Attendance: ${formattedDate}</h5>
                <button class="btn btn-sm btn-primary" onclick="toggleAttendanceDetails('${session.id}')">
                    <i class="fas fa-chevron-down" id="toggle-icon-${session.id}"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="attendance-summary d-flex flex-wrap justify-content-between mb-3">
                    <div class="attendance-stat">
                        <span class="stat-value text-success">${presentCount}</span>
                        <span class="stat-label">Present</span>
                    </div>
                    <div class="attendance-stat">
                        <span class="stat-value text-warning">${lateCount}</span>
                        <span class="stat-label">Late</span>
                    </div>
                    <div class="attendance-stat">
                        <span class="stat-value text-danger">${absentCount}</span>
                        <span class="stat-label">Absent</span>
                    </div>
                    <div class="attendance-stat">
                        <span class="stat-value">${totalStudents}</span>
                        <span class="stat-label">Total</span>
                    </div>
                    <div class="attendance-stat">
                        <span class="stat-value">${attendanceRate}%</span>
                        <span class="stat-label">Attendance Rate</span>
                    </div>
                </div>
                
                <div class="attendance-details" id="attendance-details-${session.id}" style="display: none;">
                    ${renderAttendanceDetails(session.attendances)}
                </div>
            </div>
        `;
        
        attendanceHistoryContainer.appendChild(sessionCard);
    });
}

// Render attendance details table
function renderAttendanceDetails(attendances) {
    if (!attendances || attendances.length === 0) {
        return '<div class="alert alert-info">No attendance records available.</div>';
    }
    
    let tableHtml = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    attendances.forEach(attendance => {
        const student = attendance.student;
        const statusClass = attendance.status === 'present' ? 'text-success' : 
                            attendance.status === 'late' ? 'text-warning' : 'text-danger';
        
        tableHtml += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${student.profilePicture || '/img/default-avatar.png'}" 
                            alt="${student.firstName}" class="rounded-circle me-2" width="40" height="40">
                        <div>
                            ${student.firstName} ${student.lastName}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="${statusClass}">
                        ${attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="editAttendance('${attendance._id}', '${attendance.status}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHtml += `
                </tbody>
            </table>
        </div>
    `;
    
    return tableHtml;
}

// Toggle attendance details visibility
function toggleAttendanceDetails(sessionId) {
    const detailsElement = document.getElementById(`attendance-details-${sessionId}`);
    const iconElement = document.getElementById(`toggle-icon-${sessionId}`);
    
    if (detailsElement.style.display === 'none') {
        detailsElement.style.display = 'block';
        iconElement.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
        detailsElement.style.display = 'none';
        iconElement.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
}

// Create a new attendance session
function createAttendanceSession() {
    const classId = document.getElementById('attendance-class').value;
    const date = document.getElementById('attendance-date').value;
    
    if (!classId) {
        showAlert('error', 'Please select a class');
        return;
    }
    
    if (!date) {
        showAlert('error', 'Please select a date');
        return;
    }
    
    const data = { date };
    
    fetch(`/teacher/classes/${classId}/attendance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.message);
            setTimeout(() => {
                window.location.href = `/teacher/classes/${classId}/attendance/${data.session.id}`;
            }, 1500);
        } else {
            showAlert('error', data.message);
        }
    })
    .catch(error => {
        console.error('Error creating attendance session:', error);
        showAlert('error', 'An error occurred while creating attendance session');
    });
}

// Edit attendance status
function editAttendance(attendanceId, currentStatus) {
    // Create a modal to change attendance status
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'editAttendanceModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-hidden', 'true');
    
    const statuses = ['present', 'late', 'absent'];
    
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Attendance</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="edit-attendance-form">
                        <div class="mb-3">
                            <label for="attendance-status" class="form-label">Status</label>
                            <select class="form-select" id="attendance-status" required>
                                ${statuses.map(status => `
                                    <option value="${status}" ${status === currentStatus ? 'selected' : ''}>
                                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-attendance">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize and show the modal
    const modalElement = new bootstrap.Modal(document.getElementById('editAttendanceModal'));
    modalElement.show();
    
    // Handle save button click
    document.getElementById('save-attendance').addEventListener('click', function() {
        const newStatus = document.getElementById('attendance-status').value;
        
        fetch(`/teacher/attendance/${attendanceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                modalElement.hide();
                showAlert('success', 'Attendance updated successfully');
                setTimeout(() => {
                    // Reload attendance history
                    const classSelect = document.getElementById('class-select');
                    if (classSelect && classSelect.value) {
                        loadAttendanceHistory(classSelect.value);
                    }
                }, 1000);
            } else {
                showAlert('error', data.message);
            }
        })
        .catch(error => {
            console.error('Error updating attendance:', error);
            showAlert('error', 'An error occurred while updating attendance');
        });
    });
}

// Show alert message
function showAlert(type, message) {
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertElement.setAttribute('role', 'alert');
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertElement);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        alertElement.classList.remove('show');
        setTimeout(() => {
            alertElement.remove();
        }, 300);
    }, 3000);
} 