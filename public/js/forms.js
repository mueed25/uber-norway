// Form validation and interaction handling
class FormHandler {
    constructor() {
        this.form = document.getElementById('tripForm');
        this.pickupInput = document.getElementById('pickup');
        this.destinationInput = document.getElementById('destination');
        this.dateInput = document.getElementById('date');
        this.timeInput = document.getElementById('time');
        this.submitBtn = document.getElementById('seePricesBtn');
        this.bookTripBtn = document.getElementById('bookTripBtn');
        
        this.init();
    }
    
    init() {
        this.setDefaultDateTime();
        this.setupEventListeners();
        this.setupLocationAutocomplete();
        this.validateForm();
    }
    
    setDefaultDateTime() {
        // Set default date to today
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        if (!this.dateInput.value) {
            this.dateInput.value = dateStr;
        }
        
        // Set default time to current time + 15 minutes
        const futureTime = new Date(today.getTime() + 15 * 60000);
        const timeStr = futureTime.toTimeString().slice(0, 5);
        if (!this.timeInput.value) {
            this.timeInput.value = timeStr;
        }
    }
    
    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Real-time validation
        [this.pickupInput, this.destinationInput, this.dateInput, this.timeInput].forEach(input => {
            input.addEventListener('input', () => this.validateForm());
            input.addEventListener('blur', () => this.validateField(input));
        });
        
        // Book trip button
        if (this.bookTripBtn) {
            this.bookTripBtn.addEventListener('click', (e) => this.handleBookTrip(e));
        }
        
        // Clear button functionality
        this.setupClearButtons();
    }
    
    setupClearButtons() {
        // Add clear buttons to location inputs
        [this.pickupInput, this.destinationInput].forEach(input => {
            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'input-clear-btn';
            clearBtn.innerHTML = '×';
            clearBtn.addEventListener('click', () => {
                input.value = '';
                input.focus();
                this.validateForm();
            });
            
            const wrapper = input.parentNode;
            wrapper.style.position = 'relative';
            wrapper.appendChild(clearBtn);
            
            // Show/hide clear button based on input value
            input.addEventListener('input', () => {
                clearBtn.style.display = input.value ? 'block' : 'none';
            });
        });
    }
    
    setupLocationAutocomplete() {
        if (typeof google !== 'undefined' && google.maps) {
            // Setup Google Places Autocomplete for location inputs
            const options = {
                types: ['geocode'],
                componentRestrictions: { country: 'no' } // Restrict to Norway based on the image
            };
            
            const pickupAutocomplete = new google.maps.places.Autocomplete(this.pickupInput, options);
            const destinationAutocomplete = new google.maps.places.Autocomplete(this.destinationInput, options);
            
            pickupAutocomplete.addListener('place_changed', () => {
                const place = pickupAutocomplete.getPlace();
                if (place.geometry) {
                    this.pickupInput.dataset.lat = place.geometry.location.lat();
                    this.pickupInput.dataset.lng = place.geometry.location.lng();
                    this.validateForm();
                    
                    // Update map if available
                    if (window.mapHandler) {
                        window.mapHandler.updatePickupLocation(place.geometry.location);
                    }
                }
            });
            
            destinationAutocomplete.addListener('place_changed', () => {
                const place = destinationAutocomplete.getPlace();
                if (place.geometry) {
                    this.destinationInput.dataset.lat = place.geometry.location.lat();
                    this.destinationInput.dataset.lng = place.geometry.location.lng();
                    this.validateForm();
                    
                    // Update map if available
                    if (window.mapHandler) {
                        window.mapHandler.updateDestinationLocation(place.geometry.location);
                    }
                }
            });
        }
    }
    
    validateField(field) {
        const value = field.value.trim();
        const fieldGroup = field.closest('.form-group');
        
        // Remove existing error states
        fieldGroup.classList.remove('error');
        const existingError = fieldGroup.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        let isValid = true;
        let errorMessage = '';
        
        switch (field.id) {
            case 'pickup':
            case 'destination':
                if (!value) {
                    isValid = false;
                    errorMessage = `${field.id === 'pickup' ? 'Pickup location' : 'Destination'} is required`;
                } else if (value.length < 3) {
                    isValid = false;
                    errorMessage = 'Please enter a valid location';
                }
                break;
                
            case 'date':
                const selectedDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (!value) {
                    isValid = false;
                    errorMessage = 'Date is required';
                } else if (selectedDate < today) {
                    isValid = false;
                    errorMessage = 'Please select a future date';
                }
                break;
                
            case 'time':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Time is required';
                } else {
                    // Check if selected time is in the past for today's date
                    const selectedDate = new Date(this.dateInput.value);
                    const today = new Date();
                    
                    if (selectedDate.toDateString() === today.toDateString()) {
                        const [hours, minutes] = value.split(':');
                        const selectedTime = new Date();
                        selectedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                        
                        if (selectedTime <= new Date()) {
                            isValid = false;
                            errorMessage = 'Please select a future time';
                        }
                    }
                }
                break;
        }
        
        if (!isValid) {
            fieldGroup.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = errorMessage;
            fieldGroup.appendChild(errorDiv);
        }
        
        return isValid;
    }
    
    validateForm() {
        const pickup = this.pickupInput.value.trim();
        const destination = this.destinationInput.value.trim();
        const date = this.dateInput.value;
        const time = this.timeInput.value;
        
        const isValid = pickup && destination && date && time && 
                       pickup !== destination &&
                       pickup.length >= 3 && destination.length >= 3;
        
        this.submitBtn.disabled = !isValid;
        this.submitBtn.classList.toggle('disabled', !isValid);
        
        return isValid;
    }
    
    handleFormSubmit(e) {
        e.preventDefault();
        
        // Validate all fields
        const fields = [this.pickupInput, this.destinationInput, this.dateInput, this.timeInput];
        let allValid = true;
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                allValid = false;
            }
        });
        
        // Check if pickup and destination are the same
        if (this.pickupInput.value.trim().toLowerCase() === this.destinationInput.value.trim().toLowerCase()) {
            this.showError('Pickup and destination cannot be the same location');
            allValid = false;
        }
        
        if (!allValid) {
            return;
        }
        
        // Show loading state
        this.setLoadingState(true);
        
        // Submit form
        const formData = new FormData(this.form);
        
        fetch('/estimate', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Form will be reloaded with results
                window.location.reload();
            } else {
                this.showError(data.message || 'Failed to get trip estimate');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            this.showError('Network error. Please try again.');
        })
        .finally(() => {
            this.setLoadingState(false);
        });
    }
    
    handleBookTrip(e) {
        e.preventDefault();
        
        // Show confirmation dialog
        if (confirm('Confirm booking this trip?')) {
            this.setLoadingState(true, 'Booking...');
            
            const formData = new FormData(this.form);
            
            fetch('/book', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.showSuccess('Trip booked successfully! You will receive confirmation shortly.');
                    // Reset form after successful booking
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                } else {
                    this.showError(data.message || 'Failed to book trip');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                this.showError('Network error. Please try again.');
            })
            .finally(() => {
                this.setLoadingState(false);
            });
        }
    }
    
    setLoadingState(loading, text = 'Loading...') {
        if (loading) {
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = text;
            this.submitBtn.classList.add('loading');
            
            if (this.bookTripBtn) {
                this.bookTripBtn.disabled = true;
                this.bookTripBtn.classList.add('loading');
            }
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'See prices';
            this.submitBtn.classList.remove('loading');
            
            if (this.bookTripBtn) {
                this.bookTripBtn.disabled = false;
                this.bookTripBtn.classList.remove('loading');
            }
        }
    }
    
    showError(message) {
        this.showAlert(message, 'error');
    }
    
    showSuccess(message) {
        this.showAlert(message, 'success');
    }
    
    showAlert(message, type = 'error') {
        // Remove existing alerts
        const existingAlert = document.querySelector('.form-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Create new alert
        const alert = document.createElement('div');
        alert.className = `form-alert alert-${type}`;
        alert.innerHTML = `
            <span class="alert-message">${message}</span>
            <button type="button" class="alert-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Insert at top of form
        this.form.insertBefore(alert, this.form.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Initialize form handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tripForm')) {
        window.formHandler = new FormHandler();
    }
});