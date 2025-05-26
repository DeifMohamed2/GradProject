/**
 * Image Fallback Handler
 * 
 * This script handles image loading errors and provides fallbacks for profile images.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Find all images that might need fallback handling
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
        // Add error handler to all images
        img.addEventListener('error', function() {
            // Check if this is likely a profile image
            const isProfileImage = this.classList.contains('avatar') || 
                                  this.classList.contains('parent-avatar') || 
                                  this.classList.contains('child-avatar') ||
                                  this.src.includes('avatar');
            
            if (isProfileImage) {
                // Get name from alt text or data attribute
                const name = this.alt || this.dataset.name || 'User';
                // Replace with UI Avatars
                this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
            } else {
                // For other images, replace with a generic placeholder
                this.src = '/img/placeholder.png';
            }
        });
    });
}); 