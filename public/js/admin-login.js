// Initialize particles.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize particles.js
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: { value: 80, density: { enable: true, value_area: 800 } },
                color: { value: '#ffffff' },
                shape: { type: 'circle' },
                opacity: { value: 0.5, random: false },
                size: { value: 3, random: true },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: '#ffffff',
                    opacity: 0.4,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out',
                    bounce: false
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: { enable: true, mode: 'grab' },
                    onclick: { enable: true, mode: 'push' },
                    resize: true
                },
                modes: {
                    grab: { distance: 140, line_linked: { opacity: 1 } },
                    push: { particles_nb: 4 }
                }
            },
            retina_detect: true
        });
    }
    
    // Button ripple effect
    document.querySelector('.btn-login').addEventListener('click', function(e) {
        let x = e.clientX - e.target.offsetLeft;
        let y = e.clientY - e.target.offsetTop;
        
        let ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        this.appendChild(ripple);
        
        setTimeout(function() {
            ripple.remove();
        }, 600);
    });
    
    // Form submission
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Show loading state
        const loginBtn = document.querySelector('.btn-login');
        const originalBtnText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Logging in...';
        loginBtn.disabled = true;
        
        // Make API request to login
        fetch('/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            // Reset button
            loginBtn.innerHTML = originalBtnText;
            loginBtn.disabled = false;
            
            if (data.message === 'Login successful') {
                // Show success message
                Swal.fire({
                    icon: 'success',
                    title: 'Login Successful',
                    text: 'Redirecting to dashboard...',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    // Redirect to dashboard
                    window.location.href = '/admin/dashboard';
                });
            } else {
                // Show error
                document.getElementById('error-message').textContent = data.message || 'Invalid credentials. Please try again.';
                document.getElementById('error-alert').style.display = 'block';
                
                // Shake animation for form
                const form = document.querySelector('.login-card');
                form.classList.add('shake');
                setTimeout(() => {
                    form.classList.remove('shake');
                }, 500);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            loginBtn.innerHTML = originalBtnText;
            loginBtn.disabled = false;
            
            document.getElementById('error-message').textContent = 'An error occurred. Please try again.';
            document.getElementById('error-alert').style.display = 'block';
        });
    });
}); 