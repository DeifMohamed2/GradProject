document.addEventListener('DOMContentLoaded', function() {
    // Get the student ID from the page
    const studentId = document.getElementById('student-id').value;
    
    // Function to fetch grades data
    async function fetchGrades() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }
            
            const response = await fetch(`/parent/api/student-grades/${studentId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch grades');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching grades:', error);
            showAlert('error', 'Failed to load grades. Please try again later.');
        }
    }
    
    // Function to show subject details when clicked
    function setupSubjectClickHandlers() {
        document.querySelectorAll('.subject-card').forEach(card => {
            card.addEventListener('click', function() {
                const subjectId = this.getAttribute('data-subject-id');
                const subjectName = this.getAttribute('data-subject-name');
                const semesterId = this.getAttribute('data-semester');
                
                // Hide all subject details
                document.querySelectorAll('.subject-details').forEach(detail => {
                    detail.classList.add('d-none');
                });
                
                // Show the selected subject details
                const detailElement = document.getElementById(`subject-detail-${subjectId}-${semesterId}`);
                if (detailElement) {
                    detailElement.classList.remove('d-none');
                    
                    // Update the breadcrumb
                    document.getElementById('subject-breadcrumb').textContent = subjectName;
                    document.getElementById('breadcrumb-container').classList.remove('d-none');
                    
                    // Hide the subjects grid
                    document.getElementById('subjects-grid').classList.add('d-none');
                }
            });
        });
        
        // Back button functionality
        document.getElementById('back-to-subjects').addEventListener('click', function() {
            // Hide all subject details
            document.querySelectorAll('.subject-details').forEach(detail => {
                detail.classList.add('d-none');
            });
            
            // Hide breadcrumb
            document.getElementById('breadcrumb-container').classList.add('d-none');
            
            // Show the subjects grid
            document.getElementById('subjects-grid').classList.remove('d-none');
        });
    }
    
    // Helper function to show alerts
    function showAlert(type, message) {
        const alertContainer = document.getElementById('alert-container');
        const alertClass = type === 'error' ? 'alert-danger' : 'alert-success';
        
        alertContainer.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = document.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
    
    // Initialize the page
    function init() {
        setupSubjectClickHandlers();
    }
    
    // Call init function
    init();
}); 