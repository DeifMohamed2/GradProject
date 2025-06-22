document.addEventListener('DOMContentLoaded', function() {
    // Get the class ID from the URL
    const pathParts = window.location.pathname.split('/');
    const classId = pathParts[3]; // URL format: /teacher/classes/:classId/quizzes
    
    // Initialize the page
    initQuizzesPage(classId);
});

// Function to initialize the quizzes page
function initQuizzesPage(classId) {
    // Get the container for quizzes
    const quizzesContainer = document.getElementById('quizzes-container');
    
    if (!quizzesContainer) {
        console.error('Quizzes container not found');
        return;
    }
    
    // Show loading state
    quizzesContainer.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    // Fetch quizzes for this class
    fetch(`/teacher/classes/${classId}/quizzes/data`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.quizzes && data.quizzes.length > 0) {
                    renderQuizzes(data.quizzes, classId);
                    updateStatistics(data.quizzes);
                } else {
                    quizzesContainer.innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            No quizzes found for this class.
                        </div>
                        <div class="text-center mt-4">
                            <a href="/teacher/quizzes/create?classId=${classId}" class="btn btn-success">
                                <i class="fas fa-plus me-2"></i>Create Your First Quiz
                            </a>
                        </div>
                    `;
                    // Update statistics with empty data
                    updateStatistics([]);
                }
            } else {
                quizzesContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${data.message || 'Failed to load quizzes'}
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error fetching quizzes:', error);
            quizzesContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    An error occurred while loading quizzes. Please try again later.
                </div>
            `;
        });
}

// Function to update the statistics cards
function updateStatistics(quizzes) {
    // Update total quizzes
    const totalQuizzesEl = document.getElementById('totalQuizzes');
    if (totalQuizzesEl) {
        totalQuizzesEl.textContent = quizzes.length;
    }
    
    // Calculate average submissions per quiz
    const avgSubmissionsEl = document.getElementById('avgSubmissions');
    if (avgSubmissionsEl) {
        if (quizzes.length > 0) {
            const totalSubmissions = quizzes.reduce((sum, quiz) => {
                return sum + (quiz.grades ? quiz.grades.length : 0);
            }, 0);
            const avgSubmissions = totalSubmissions / quizzes.length;
            avgSubmissionsEl.textContent = avgSubmissions.toFixed(1);
        } else {
            avgSubmissionsEl.textContent = '0';
        }
    }
    
    // Calculate average score across all quizzes
    const avgScoreEl = document.getElementById('avgScore');
    if (avgScoreEl) {
        if (quizzes.length > 0) {
            let totalScore = 0;
            let totalGrades = 0;
            
            quizzes.forEach(quiz => {
                if (quiz.grades && quiz.grades.length > 0) {
                    const quizTotalScore = quiz.grades.reduce((sum, grade) => sum + grade.score, 0);
                    totalScore += quizTotalScore;
                    totalGrades += quiz.grades.length;
                }
            });
            
            if (totalGrades > 0) {
                // Calculate average score as a percentage of max possible score
                const avgScore = (totalScore / totalGrades) / quizzes[0].maxScore * 100;
                avgScoreEl.textContent = `${avgScore.toFixed(1)}%`;
            } else {
                avgScoreEl.textContent = 'N/A';
            }
        } else {
            avgScoreEl.textContent = 'N/A';
        }
    }
}

// Function to render quizzes
function renderQuizzes(quizzes, classId) {
    const quizzesContainer = document.getElementById('quizzes-container');
    quizzesContainer.innerHTML = '';
    
    // Create the row for the quiz cards
    const row = document.createElement('div');
    row.className = 'row g-4';
    
    // Add each quiz as a card
    quizzes.forEach(quiz => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        
        // Format dates
        const createdDate = new Date(quiz.createdAt);
        const formattedCreatedDate = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const dueDate = new Date(quiz.dueDate);
        const formattedDueDate = dueDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Calculate submission stats
        const totalSubmissions = quiz.grades ? quiz.grades.length : 0;
        const averageScore = calculateAverageScore(quiz.grades);
        
        // Determine status based on due date
        const now = new Date();
        let statusClass = 'bg-success';
        let statusText = 'Active';
        
        if (dueDate < now) {
            statusClass = 'bg-secondary';
            statusText = 'Closed';
        } else if (dueDate - now < 86400000 * 2) { // Less than 2 days
            statusClass = 'bg-warning';
            statusText = 'Due Soon';
        }
        
        col.innerHTML = `
            <div class="card h-100 shadow-sm">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">${quiz.title}</h5>
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>
                <div class="card-body">
                    <p class="card-text text-muted mb-3">${quiz.description || 'No description provided'}</p>
                    
                    <div class="d-flex justify-content-between mb-3">
                        <div>
                            <span class="badge bg-info">Max Score: ${quiz.maxScore}</span>
                        </div>
                        <div>
                            <span class="badge bg-secondary">Submissions: ${totalSubmissions}</span>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="d-flex align-items-center mb-1">
                            <i class="fas fa-calendar-alt text-muted me-2"></i>
                            <small class="text-muted">Due: ${formattedDueDate}</small>
                        </div>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-clock text-muted me-2"></i>
                            <small class="text-muted">Created: ${formattedCreatedDate}</small>
                        </div>
                    </div>
                    
                    <div class="mb-1">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <small class="text-muted">Average Score</small>
                            <small class="fw-bold">${averageScore.toFixed(1)}%</small>
                        </div>
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar bg-success" role="progressbar" style="width: ${averageScore}%;" 
                                aria-valuenow="${averageScore}" aria-valuemin="0" aria-valuemax="100">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer bg-white border-top-0">
                    <div class="d-flex justify-content-between">
                        <a href="/teacher/classes/${classId}/quizzes/${quiz._id}" class="btn btn-sm btn-primary">
                            <i class="fas fa-eye me-1"></i> View Details
                        </a>
                        <button class="btn btn-sm btn-danger" onclick="deleteQuiz('${quiz._id}', '${classId}')">
                            <i class="fas fa-trash me-1"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        row.appendChild(col);
    });
    
    quizzesContainer.appendChild(row);
}

// Calculate average score for a quiz
function calculateAverageScore(grades) {
    if (!grades || grades.length === 0) return 0;
    
    const totalScore = grades.reduce((sum, grade) => sum + grade.score, 0);
    const maxPossibleScore = 100; // Default to 100 if not specified
    
    return (totalScore / (grades.length * maxPossibleScore)) * 100;
}

// Function to delete a quiz
function deleteQuiz(quizId, classId) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This quiz and all associated grades will be permanently deleted. You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/teacher/classes/${classId}/quizzes/${quizId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success message
                    Swal.fire(
                        'Deleted!',
                        'The quiz has been deleted successfully.',
                        'success'
                    );
                    
                    // Reload quizzes
                    initQuizzesPage(classId);
                } else {
                    // Show error message
                    Swal.fire(
                        'Error!',
                        data.message || 'Failed to delete quiz',
                        'error'
                    );
                }
            })
            .catch(error => {
                console.error('Error deleting quiz:', error);
                Swal.fire(
                    'Error!',
                    'An error occurred while deleting the quiz',
                    'error'
                );
            });
        }
    });
} 