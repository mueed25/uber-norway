
class FormHandler {
    constructor() {
        this.form = document.getElementById('tripForm');
        this.pickupInput = document.getElementById('pickup');
        this.destinationInput = document.getElementById('destination');
        this.dateInput = document.getElementById('date');
        this.timeInput = document.getElementById('time');
        this.submitBtn = this.form.querySelector('button[type="submit"]');
        this.bookTripBtn = document.getElementById('bookTripBtn');
        
        this.pickupAutocomplete = null;
        this.destinationAutocomplete = null;
        this.isGoogleMapsReady = false;
        this.formDataFromUrl = false;
        this.validationTimer = null;
        this.geocodeTimeout = null;
        
        this.init();
    }
    
    init() {
        this.detectFormDataFromUrl();
        this.setDefaultDateTime();
        this.setupEventListeners();
        this.waitForGoogleMapsAndSetup();
        this.validateForm();
    }
    
    detectFormDataFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        this.formDataFromUrl = !!(urlParams.get('pickup') || urlParams.get('destination'));
        console.log('Form data from URL detected:', this.formDataFromUrl);
    }
    
    waitForGoogleMapsAndSetup() {
        const checkGoogleMaps = () => {
            if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                this.isGoogleMapsReady = true;
                this.setupLocationAutocomplete();
                
                if (this.formDataFromUrl) {
                    setTimeout(() => {
                        this.handleFormDataFromUrl();
                    }, 500);
                }
            } else {
                setTimeout(checkGoogleMaps, 100);
            }
        };
        checkGoogleMaps();
    }
    
    handleFormDataFromUrl() {
        console.log('Handling form data from URL');
        
        const pickup = this.pickupInput.value.trim();
        const destination = this.destinationInput.value.trim();
        
        const geocodePromises = [];
        
        if (pickup && pickup.length > 3) {
            geocodePromises.push(
                this.geocodeAddressPromise(pickup, true)
                    .then(result => {
                        console.log('Pickup geocoded:', result);
                        this.pickupInput.dataset.lat = result.lat;
                        this.pickupInput.dataset.lng = result.lng;
                    })
                    .catch(err => console.warn('Pickup geocoding failed:', err))
            );
        }
        
        if (destination && destination.length > 3) {
            geocodePromises.push(
                this.geocodeAddressPromise(destination, false)
                    .then(result => {
                        console.log('Destination geocoded:', result);
                        this.destinationInput.dataset.lat = result.lat;
                        this.destinationInput.dataset.lng = result.lng;
                    })
                    .catch(err => console.warn('Destination geocoding failed:', err))
            );
        }
        
        Promise.allSettled(geocodePromises).then(() => {
            console.log('All geocoding complete, validating form');
            setTimeout(() => {
                this.validateForm();
            }, 200);
        });
    }
    
    geocodeAddressPromise(address, isPickup) {
        return new Promise((resolve, reject) => {
            if (!this.isGoogleMapsReady) {
                reject('Google Maps not ready');
                return;
            }
            
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({
                address: address,
                componentRestrictions: { country: 'NO' }
            }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    const lat = location.lat();
                    const lng = location.lng();
                    
                    if (window.mapHandler) {
                        if (isPickup) {
                            window.mapHandler.updatePickupLocation(location);
                        } else {
                            window.mapHandler.updateDestinationLocation(location);
                        }
                    }
                    
                    resolve({ address, lat, lng });
                } else {
                    reject(`Geocoding failed: ${status}`);
                }
            });
        });
    }
    
    setDefaultDateTime() {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        if (!this.dateInput.value) {
            this.dateInput.value = dateStr;
        }
        
        const futureTime = new Date(today.getTime() + 15 * 60000);
        const timeStr = futureTime.toTimeString().slice(0, 5);
        if (!this.timeInput.value) {
            this.timeInput.value = timeStr;
        }
    }
    
    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        [this.pickupInput, this.destinationInput, this.dateInput, this.timeInput].forEach(input => {
            input.addEventListener('input', () => this.debouncedValidate());
            input.addEventListener('blur', () => this.validateField(input));
        });
        this.pickupInput.addEventListener('input', () => {
            if (this.pickupInput.value.length > 3) {
                this.geocodeAddress(this.pickupInput.value, true);
            }
        });
        
        this.destinationInput.addEventListener('input', () => {
            if (this.destinationInput.value.length > 3) {
                this.geocodeAddress(this.destinationInput.value, false);
            }
        });
        
        if (this.bookTripBtn) {
            this.bookTripBtn.addEventListener('click', (e) => this.handleBookTrip(e));
        }
        
        this.setupClearButtons();
    }
    
    debouncedValidate() {
        clearTimeout(this.validationTimer);
        this.validationTimer = setTimeout(() => {
            this.validateForm();
        }, 300);
    }
    
    setupClearButtons() {
        [this.pickupInput, this.destinationInput].forEach(input => {
            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'input-clear-btn';
            clearBtn.innerHTML = '×';
            clearBtn.addEventListener('click', () => {
                input.value = '';
                input.dataset.lat = '';
                input.dataset.lng = '';
                input.focus();
                this.validateForm();
                
                if (window.mapHandler) {
                    if (input === this.pickupInput) {
                        window.mapHandler.clearPickupMarker();
                    } else if (input === this.destinationInput) {
                        window.mapHandler.clearDestinationMarker();
                    }
                }
            });
            
            const wrapper = input.parentNode;
            wrapper.style.position = 'relative';
            wrapper.appendChild(clearBtn);
            
            input.addEventListener('input', () => {
                clearBtn.style.display = input.value ? 'block' : 'none';
            });
        });
    }
    
    setupLocationAutocomplete() {
        if (!this.isGoogleMapsReady) {
            console.warn('Google Maps not ready for autocomplete setup');
            return;
        }
        
        const options = {
            types: ['geocode'],
            componentRestrictions: { country: 'no' }, 
            fields: ['formatted_address', 'geometry', 'name']
        };
        
        try {
            this.pickupAutocomplete = new google.maps.places.Autocomplete(this.pickupInput, options);
            this.destinationAutocomplete = new google.maps.places.Autocomplete(this.destinationInput, options);
            
            this.pickupAutocomplete.addListener('place_changed', () => {
                const place = this.pickupAutocomplete.getPlace();
                this.handlePlaceSelection(place, this.pickupInput, true);
            });
            
            this.destinationAutocomplete.addListener('place_changed', () => {
                const place = this.destinationAutocomplete.getPlace();
                this.handlePlaceSelection(place, this.destinationInput, false);
            });
            
            console.log('Autocomplete setup completed');
            
        } catch (error) {
            console.error('Error setting up autocomplete:', error);
        }
    }
    
    handlePlaceSelection(place, input, isPickup) {
        console.log(`${isPickup ? 'Pickup' : 'Destination'} place selected:`, place);
        
        if (place.geometry && place.geometry.location) {
            input.dataset.lat = place.geometry.location.lat();
            input.dataset.lng = place.geometry.location.lng();
            
            const fieldGroup = input.closest('.form-group');
            fieldGroup.classList.remove('error');
            const existingError = fieldGroup.querySelector('.field-error');
            if (existingError) existingError.remove();
            
            this.validateForm();
            
            if (window.mapHandler) {
                if (isPickup) {
                    window.mapHandler.updatePickupLocation(place.geometry.location);
                } else {
                    window.mapHandler.updateDestinationLocation(place.geometry.location);
                }
            }
        }
    }
    
    geocodeAddress(address, isPickup = true) {
        if (!address || address.length < 3 || !this.isGoogleMapsReady) return;
        
        clearTimeout(this.geocodeTimeout);
        this.geocodeTimeout = setTimeout(() => {
            this.geocodeAddressPromise(address, isPickup)
                .then((result) => {
                    const input = isPickup ? this.pickupInput : this.destinationInput;
                    input.dataset.lat = result.lat;
                    input.dataset.lng = result.lng;
                    this.validateForm();
                })
                .catch(err => console.warn('Geocoding failed:', err));
        }, 1000);
    }
    
    validateField(field) {
        const value = field.value.trim();
        const fieldGroup = field.closest('.form-group');
        
        fieldGroup.classList.remove('error');
        const existingError = fieldGroup.querySelector('.field-error');
        if (existingError) existingError.remove();
        
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
        
        const hasPickupCoords = this.pickupInput.dataset.lat && this.pickupInput.dataset.lng;
        const hasDestinationCoords = this.destinationInput.dataset.lat && this.destinationInput.dataset.lng;
        
        const isValid = pickup && destination && date && time && 
                       pickup !== destination &&
                       pickup.length >= 3 && destination.length >= 3;
        
        if (this.submitBtn) {
            this.submitBtn.disabled = !isValid;
            this.submitBtn.classList.toggle('disabled', !isValid);
        }
        
        console.log('Form validation:', {
            pickup: pickup,
            destination: destination,
            hasPickupCoords: hasPickupCoords,
            hasDestinationCoords: hasDestinationCoords,
            isValid: isValid
        });
        
        return isValid;
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const fields = [this.pickupInput, this.destinationInput, this.dateInput, this.timeInput];
        let allValid = true;
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                allValid = false;
            }
        });
        
        if (this.pickupInput.value.trim().toLowerCase() === this.destinationInput.value.trim().toLowerCase()) {
            this.showError('Pickup and destination cannot be the same location');
            allValid = false;
        }
        
        if (!allValid) {
            return;
        }
        
        const addHiddenInput = (name, value) => {
            let input = this.form.querySelector(`input[name="${name}"]`);
            if (!input) {
                input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                this.form.appendChild(input);
            }
            input.value = value || '';
        };
        
        addHiddenInput('pickup_lat', this.pickupInput.dataset.lat || '');
        addHiddenInput('pickup_lng', this.pickupInput.dataset.lng || '');
        addHiddenInput('destination_lat', this.destinationInput.dataset.lat || '');
        addHiddenInput('destination_lng', this.destinationInput.dataset.lng || '');
        addHiddenInput('dropoff', this.destinationInput.value.trim());
        addHiddenInput('pickupTime', `${this.dateInput.value} ${this.timeInput.value}`);
        addHiddenInput('rideFor', 'me');
        
        console.log('Form submitting with data:', {
            pickup: this.pickupInput.value,
            destination: this.destinationInput.value,
            pickup_lat: this.pickupInput.dataset.lat,
            pickup_lng: this.pickupInput.dataset.lng,
            destination_lat: this.destinationInput.dataset.lat,
            destination_lng: this.destinationInput.dataset.lng
        });
        
        this.form.submit();

setTimeout(() => {
    if (window.location.pathname === '/') {
        console.log('Redirect may have failed, trying manual login');
        window.location.href = '/login';
    }
}, 1500);
    }
    
    handleBookTrip(e) {
        e.preventDefault();
        
        if (confirm('Confirm booking this trip?')) {
            this.setLoadingState(true, 'Booking...');
            
            const formData = new FormData(this.form);
            formData.append('pickup_lat', this.pickupInput.dataset.lat || '');
            formData.append('pickup_lng', this.pickupInput.dataset.lng || '');
            formData.append('destination_lat', this.destinationInput.dataset.lat || '');
            formData.append('destination_lng', this.destinationInput.dataset.lng || '');
            
            fetch('/book', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.showSuccess('Trip booked successfully! You will receive confirmation shortly.');
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
            if (this.submitBtn) {
                this.submitBtn.disabled = true;
                this.submitBtn.textContent = text;
                this.submitBtn.classList.add('loading');
            }
            if (this.bookTripBtn) {
                this.bookTripBtn.disabled = true;
                this.bookTripBtn.classList.add('loading');
            }
        } else {
            if (this.submitBtn) {
                this.submitBtn.disabled = false;
                this.submitBtn.textContent = 'See prices';
                this.submitBtn.classList.remove('loading');
            }
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
        const existingAlert = document.querySelector('.form-alert');
        if (existingAlert) existingAlert.remove();
        
        const alert = document.createElement('div');
        alert.className = `form-alert alert-${type}`;
        alert.innerHTML = `
            <span class="alert-message">${message}</span>
            <button type="button" class="alert-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        this.form.insertBefore(alert, this.form.firstChild);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
    
    setPickupLocation(lat, lng, address = '') {
        this.pickupInput.value = address;
        this.pickupInput.dataset.lat = lat;
        this.pickupInput.dataset.lng = lng;
        this.validateForm();
    }
    
    setDestinationLocation(lat, lng, address = '') {
        this.destinationInput.value = address;
        this.destinationInput.dataset.lat = lat;
        this.destinationInput.dataset.lng = lng;
        this.validateForm();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tripForm')) {
        window.formHandler = new FormHandler();
        console.log('Form handler initialized');
    }
});