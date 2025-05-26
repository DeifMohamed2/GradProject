document.addEventListener('DOMContentLoaded', function() {
    const classSelect = document.getElementById('quiz-class-select');
    const quizzesContainer = document.getElementById('quizzes-container');
    
    if (classSelect) {
        // Load quizzes when class is selected
        classSelect.addEventListener('change', function() {
            const classId = this.value;
            if (classId) {
                loadQuizzes(classId);
            } else {
                // Load all quizzes if no class is selected
                loadAllQuizzes();
            }
        });
        
        // Load initial data based on selected class or all quizzes
        if (classSelect.value) {
            loadQuizzes(classSelect.value);
        } else {
            loadAllQuizzes();
        }
    } else {
        // No class select, load all quizzes
        loadAllQuizzes();
    }
    
    // Initialize new quiz form if exists
    const newQuizForm = document.getElementById('new-quiz-form');
    if (newQuizForm) {
        newQuizForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createQuiz();
        });
    }
});

// Load quizzes for a specific class
function loadQuizzes(classId) {
    const quizzesContainer = document.getElementById('quizzes-container');
    
    quizzesContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    // Fetch quizzes for class
    fetch(`/teacher/classes/${classId}/quizzes`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.quizzes && data.quizzes.length > 0) {
                    renderQuizzes(data.quizzes);
                } else {
                    quizzesContainer.innerHTML = '<div class="alert alert-info">No quizzes found for this class.</div>';
                }
            } else {
                quizzesContainer.innerHTML = `<div class="alert alert-danger">${data.message || 'Failed to load quizzes.'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading quizzes:', error);
            quizzesContainer.innerHTML = '<div class="alert alert-danger">An error occurred while loading quizzes.</div>';
        });
}

// Load all quizzes
function loadAllQuizzes() {
    const quizzesContainer = document.getElementById('quizzes-container');
    
    quizzesContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    // Fetch all quizzes
    fetch('/teacher/api/quizzes')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.quizzes && data.quizzes.length > 0) {
                    renderQuizzes(data.quizzes);
                } else {
                    quizzesContainer.innerHTML = '<div class="alert alert-info">No quizzes found.</div>';
                }
            } else {
                quizzesContainer.innerHTML = `<div class="alert alert-danger">${data.message || 'Failed to load quizzes.'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading quizzes:', error);
            quizzesContainer.innerHTML = '<div class="alert alert-danger">An error occurred while loading quizzes.</div>';
        });
}

// Render quizzes
function renderQuizzes(quizzes) {
    const quizzesContainer = document.getElementById('quizzes-container');
    quizzesContainer.innerHTML = '';
    
    // Create cards row
    const row = document.createElement('div');
    row.className = 'row';
    
    quizzes.forEach(quiz => {
        const quizCard = document.createElement('div');
        quizCard.className = 'col-md-6 col-lg-4 mb-4';
        
        // Format date
        const createdDate = new Date(quiz.createdAt);
        const formattedCreatedDate = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        let dueDateHtml = '';
        if (quiz.dueDate) {
            const dueDate = new Date(quiz.dueDate);
            const formattedDueDate = dueDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            dueDateHtml = `<p class="card-text"><small class="text-muted">Due: ${formattedDueDate}</small></p>`;
        }
        
        // Calculate submission stats
        const totalSubmissions = quiz.grades ? quiz.grades.length : 0;
        const className = quiz.class ? quiz.class.name : 'Unknown Class';
        
        quizCard.innerHTML = `
            <div class="card h-100">
                <div class="card-header bg-light">
                    <h5 class="card-title mb-0">${quiz.title}</h5>
                    <small class="text-muted">${className}</small>
                </div>
                <div class="card-body">
                    <p class="card-text">${quiz.description || 'No description provided.'}</p>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-primary">Max Score: ${quiz.maxScore}</span>
                        <span class="badge bg-info">Submissions: ${totalSubmissions}</span>
                    </div>
                    ${dueDateHtml}
                </div>
                <div class="card-footer bg-white">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">Created: ${formattedCreatedDate}</small>
                        <div class="btn-group">
                            <a href="/teacher/classes/${quiz.class ? quiz.class._id : ''}/quizzes/${quiz._id}" class="btn btn-sm btn-outline-primary">
                                <i class="fas fa-eye"></i> View Details
                            </a>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteQuiz('${quiz._id}', '${quiz.class ? quiz.class._id : ''}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        row.appendChild(quizCard);
    });
    
    quizzesContainer.appendChild(row);
}

// Create a new quiz
function createQuiz() {
    const title = document.getElementById('quiz-title').value;
    const description = document.getElementById('quiz-description').value;
    const classId = document.getElementById('quiz-class').value;
    const maxScore = document.getElementById('quiz-max-score').value;
    const dueDate = document.getElementById('quiz-due-date').value;
    
    if (!title) {
        showAlert('error', 'Quiz title is required');
        return;
    }
    
    if (!classId) {
        showAlert('error', 'Please select a class');
        return;
    }
    
    const data = {
        title,
        description,
        maxScore: maxScore || 100,
        dueDate: dueDate || null
    };
    
    fetch(`/teacher/classes/${classId}/quizzes`, {
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
                window.location.href = `/teacher/classes/${classId}/quizzes/${data.quiz._id}`;
            }, 1500);
        } else {
            showAlert('error', data.message);
        }
    })
    .catch(error => {
        console.error('Error creating quiz:', error);
        showAlert('error', 'An error occurred while creating quiz');
    });
}

// Delete quiz
function deleteQuiz(quizId, classId) {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
        return;
    }
    
    fetch(`/teacher/classes/${classId}/quizzes/${quizId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', 'Quiz deleted successfully');
            
            // Reload quizzes
            if (classId) {
                loadQuizzes(classId);
            } else {
                loadAllQuizzes();
            }
        } else {
            showAlert('error', data.message);
        }
    })
    .catch(error => {
        console.error('Error deleting quiz:', error);
        showAlert('error', 'An error occurred while deleting quiz');
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