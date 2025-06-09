// Main application JavaScript
class UberApp {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupGlobalEventListeners();
        this.setupUI();
        this.setupMobileNavigation();
        this.setupAnimations();
        this.setupUtilities();
    }
    
    setupGlobalEventListeners() {
        // Handle page loading states
        window.addEventListener('beforeunload', () => {
            document.body.classList.add('page-loading');
        });
        
        // Handle form submissions with loading states
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.tagName === 'FORM') {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn && !submitBtn.disabled) {
                    submitBtn.classList.add('loading');
                    submitBtn.disabled = true;
                    
                    // Re-enable after 10 seconds as fallback
                    setTimeout(() => {
                        submitBtn.classList.remove('loading');
                        submitBtn.disabled = false;
                    }, 10000);
                }
            }
        });
        
        // Handle back button
        window.addEventListener('popstate', () => {
            // Refresh page to ensure clean state
            window.location.reload();
        });
    }
    
    setupUI() {
        // Add smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Setup responsive navigation
        this.setupResponsiveNav();
        
        // Setup tooltips
        this.setupTooltips();
        
        // Setup auto-resize textareas
        this.setupAutoResizeTextareas();
    }
    
    setupResponsiveNav() {
        const header = document.querySelector('.app-header');
        if (!header) return;
        
        // Create mobile menu toggle
        const mobileToggle = document.createElement('button');
        mobileToggle.className = 'mobile-nav-toggle';
        mobileToggle.innerHTML = `
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        `;
        mobileToggle.setAttribute('aria-label', 'Toggle navigation');
        
        const headerContent = header.querySelector('.header-content');
        headerContent.appendChild(mobileToggle);
        
        // Toggle mobile menu
        mobileToggle.addEventListener('click', () => {
            header.classList.toggle('nav-open');
            document.body.classList.toggle('nav-open');
            
            // Update aria-expanded
            const isOpen = header.classList.contains('nav-open');
            mobileToggle.setAttribute('aria-expanded', isOpen);
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!header.contains(e.target) && header.classList.contains('nav-open')) {
                header.classList.remove('nav-open');
                document.body.classList.remove('nav-open');
                mobileToggle.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Close mobile menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && header.classList.contains('nav-open')) {
                header.classList.remove('nav-open');
                document.body.classList.remove('nav-open');
                mobileToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
    
    setupMobileNavigation() {
        // Handle mobile-specific interactions
        let touchStartY = 0;
        let touchEndY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        });
        
        document.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipeGesture();
        });
    }
    
    handleSwipeGesture() {
        const swipeThreshold = 50;
        const swipeDistance = touchStartY - touchEndY;
        
        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                // Swiped up - could trigger search focus
                const searchInput = document.querySelector('.location-input:focus');
                if (searchInput) {
                    searchInput.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    }
    
    setupAnimations() {
        // Add intersection observer for animations
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                } else {
                    entry.target.classList.remove('in-view');
                }
            });
        }, observerOptions);
        
        // Observe elements that should animate
        document.querySelectorAll('.booking-panel, .map-panel, .trip-estimate').forEach(el => {
            observer.observe(el);
        });
        
        // Add stagger animation for form elements
        const formGroups = document.querySelectorAll('.form-group');
        formGroups.forEach((group, index) => {
            group.style.animationDelay = `${index * 0.1}s`;
            group.classList.add('fade-in-up');
        });
    }
    
    setupTooltips() {
        // Simple tooltip system
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                this.showTooltip(e.target, e.target.dataset.tooltip);
            });
            
            element.addEventListener('mouseleave', (e) => {
                this.hideTooltip();
            });
        });
    }
    
    showTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.id = 'app-tooltip';
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
        
        setTimeout(() => tooltip.classList.add('visible'), 10);
    }
    
    hideTooltip() {
        const tooltip = document.getElementById('app-tooltip');
        if (tooltip) {
            tooltip.classList.remove('visible');
            setTimeout(() => tooltip.remove(), 200);
        }
    }
    
    setupAutoResizeTextareas() {
        document.querySelectorAll('textarea').forEach(textarea => {
            const resize = () => {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            };
            
            textarea.addEventListener('input', resize);
            resize(); // Initial resize
        });
    }
    
    setupUtilities() {
        // Add utility methods to window object
        window.uberApp = this;
        
        // Debounce utility
        window.debounce = (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        };
        
        // Throttle utility
        window.throttle = (func, limit) => {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        };
        
        // Format currency
        window.formatCurrency = (amount, currency = 'NOK') => {
            return new Intl.NumberFormat('no-NO', {
                style: 'currency',
                currency: currency
            }).format(amount);
        };
        
        // Format distance
        window.formatDistance = (distance) => {
            if (distance < 1) {
                return `${Math.round(distance * 1000)}m`;
            }
            return `${distance.toFixed(1)}km`;
        };
        
        // Format duration
        window.formatDuration = (minutes) => {
            if (minutes < 60) {
                return `${Math.round(minutes)} min`;
            }
            const hours = Math.floor(minutes / 60);
            const mins = Math.round(minutes % 60);
            return `${hours}h ${mins}m`;
        };
    }
    
    // Public methods
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add to page
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('visible'), 10);
        
        // Auto remove
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);
        
        return notification;
    }
    
    updatePageTitle(title) {
        document.title = title;
    }
    
    setLoadingState(loading) {
        if (loading) {
            document.body.classList.add('app-loading');
        } else {
            document.body.classList.remove('app-loading');
        }
    }
    
    // Handle errors gracefully
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
        // Show user-friendly error message
        this.showNotification(
            'Something went wrong. Please try again.',
            'error'
        );
        
        // Report to error tracking service (if implemented)
        if (window.errorTracker) {
            window.errorTracker.report(error, context);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new UberApp();
});

// Handle global errors
window.addEventListener('error', (e) => {
    if (window.app) {
        window.app.handleError(e.error, 'Global');
    }
});

window.addEventListener('unhandledrejection', (e) => {
    if (window.app) {
        window.app.handleError(e.reason, 'Promise');
    }
});

// Service Worker registration (if service worker exists)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}