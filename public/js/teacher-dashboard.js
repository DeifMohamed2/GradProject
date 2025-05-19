document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard components
    initRecentActivities();
    
    // Initialize stats cards
    updateStatsCards();
});

// Function to initialize recent activities
function initRecentActivities() {
    const recentActivityContainer = document.getElementById('recentActivities');
    if (!recentActivityContainer) return;
    
    // Fetch recent activities data
    fetch('/teacher/api/dashboard')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data.recentActivities.length > 0) {
                recentActivityContainer.innerHTML = '';
                
                data.data.recentActivities.forEach(activity => {
                    const activityEl = createActivityElement(activity);
                    recentActivityContainer.appendChild(activityEl);
                });
            } else {
                recentActivityContainer.innerHTML = '<div class="alert alert-info">No recent activities found.</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching recent activities:', error);
            recentActivityContainer.innerHTML = '<div class="alert alert-danger">Failed to load recent activities.</div>';
        });
}

// Function to create an activity element
function createActivityElement(activity) {
    const activityDiv = document.createElement('div');
    activityDiv.className = 'recent-activity';
    
    const date = new Date(activity.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    activityDiv.innerHTML = `
        <div class="activity-content">
            <h6 class="activity-title">${activity.className}</h6>
            <p class="activity-description">${activity.description}</p>
            <p class="activity-date">${formattedDate}</p>
        </div>
        <div class="activity-status ${getStatusClass(activity.status)}">
            ${activity.status}
        </div>
    `;
    
    return activityDiv;
}

// Function to get status class based on status text
function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'completed':
            return 'status-completed';
        case 'pending':
            return 'status-pending';
        case 'failed':
            return 'status-failed';
        default:
            return '';
    }
}

// Function to update stats cards with real data
function updateStatsCards() {
    fetch('/teacher/api/dashboard')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update classes count
                const classesCountEl = document.querySelector('.stat-card.primary .content h3');
                if (classesCountEl) {
                    classesCountEl.textContent = data.data.stats.classesCount || 0;
                }
                
                // Update students count
                const studentsCountEl = document.querySelector('.stat-card.success .content h3');
                if (studentsCountEl) {
                    studentsCountEl.textContent = data.data.stats.studentsCount || 0;
                }
                
                // Update quizzes count
                const quizzesCountEl = document.querySelector('.stat-card.warning .content h3');
                if (quizzesCountEl) {
                    quizzesCountEl.textContent = data.data.stats.quizzesCount || 0;
                }
                
                // Update attendance count
                const attendanceCountEl = document.querySelector('.stat-card.info .content h3');
                if (attendanceCountEl) {
                    attendanceCountEl.textContent = data.data.stats.attendanceCount || 0;
                }
                
                // Update classes list
                updateClassesList(data.data.classes);
            }
        })
        .catch(error => {
            console.error('Error fetching dashboard data:', error);
        });
}

// Function to update classes list
function updateClassesList(classes) {
    const classesListEl = document.getElementById('classesList');
    if (!classesListEl || !classes) return;
    
    if (classes.length > 0) {
        classesListEl.innerHTML = '';
        
        classes.forEach(cls => {
            const classItem = document.createElement('a');
            classItem.href = `/teacher/classes/${cls.id}`;
            classItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            
            classItem.innerHTML = `
                <div>
                    <h6 class="mb-1">${cls.name}</h6>
                    <small>${cls.description || 'No description'}</small>
                </div>
                <span class="badge bg-primary rounded-pill">${cls.studentCount} students</span>
            `;
            
            classesListEl.appendChild(classItem);
        });
    } else {
        classesListEl.innerHTML = '<div class="alert alert-info">No classes found.</div>';
    }
} 