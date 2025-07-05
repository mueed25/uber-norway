
class TripHandler {
    constructor() {
        this.form = null;
        this.searchBtn = null;
        this.middlePanel = null;
        this.mapPanel = null;
        this.loadingOverlay = null;
        this.currentRideData = null;
        this.pickupLocation = null;
        this.dropoffLocation = null;
        this.pickupAutocomplete = null;
        this.destinationAutocomplete = null;
        this.scheduleCard = null;
        this.isScheduled = false;
        this.scheduleData = null;
        this.selectedRide = null;
        this.userPaymentInfo = null;
        this.hasExistingPayment = false;
        this.paymentCheckCompleted = false;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    async init() {
        console.log('TripHandler initializing...');
        this.initializeElements();
        this.setupEventListeners();
        this.setupLocationInputs();
        this.waitForMapHandler();
        this.setupRideSelection();
        this.forceHideMiddlePanel();
        await this.checkUserPaymentMethods();
        this.setupEnhancedPaymentHandling();
        
    }
    
    initializeElements() {
        this.form = document.getElementById('trip1-search-form');
        this.searchBtn = document.getElementById('trip1-search-btn');
        this.middlePanel = document.getElementById('trip1-middle-panel');
        this.mapPanel = document.getElementById('trip1-map-panel');
        this.loadingOverlay = document.getElementById('trip1-loading-overlay');
        this.pickupInput = document.getElementById('trip1-pickup');
        this.dropoffInput = document.getElementById('trip1-dropoff');
        this.paymentBtn = document.getElementById('trip1-payment-btn');
        this.requestBtn = document.getElementById('trip1-request-btn');
        this.selectBtn = document.getElementById('trip1-selected-ride');
        this.scheduleCard = document.getElementById('trip1-schedule-card');
        this.pickupTimeSelect = document.getElementById('trip1-pickup-time');
        this.scheduleDateInput = document.getElementById('trip1-schedule-date');
        this.scheduleTimeInput = document.getElementById('trip1-schedule-time');
        this.scheduleCloseBtn = document.getElementById('trip1-schedule-close');
        this.scheduleConfirmBtn = document.getElementById('trip1-schedule-confirm');
        
        console.log('Elements initialized:', {
            form: !!this.form,
            searchBtn: !!this.searchBtn,
            middlePanel: !!this.middlePanel,
            mapPanel: !!this.mapPanel,
            pickupInput: !!this.pickupInput,
            dropoffInput: !!this.dropoffInput
        });
    }
    
    setupEventListeners() {
    const paymentForm = document.getElementById('trip1-payment-form');
    if (paymentForm) {
      paymentForm.addEventListener('submit', (e) => this.handlePaymentFormSubmit(e));
    }
  }
    setupEventListeners() {
        if (this.pickupTimeSelect) {
    this.pickupTimeSelect.addEventListener('change', (e) => this.handleScheduleToggle(e));
}

if (this.scheduleCloseBtn) {
    this.scheduleCloseBtn.addEventListener('click', () => this.closeScheduleCard());
}

if (this.scheduleConfirmBtn) {
    this.scheduleConfirmBtn.addEventListener('click', () => this.confirmSchedule());
}
        const paymentForm = document.getElementById('trip1-payment-form');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => this.handlePaymentFormSubmit(e));
        }
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSearch(e));
        }
        
        const addStopBtn = document.querySelector('.trip1-add-stop');
        if (addStopBtn) {
            addStopBtn.addEventListener('click', () => this.handleAddStop());
        }
        
        if (this.paymentBtn) {
            this.paymentBtn.addEventListener('click', () => this.handlePaymentMethod());
        }
        
        document.addEventListener('tripUpdated', (e) => this.handleTripUpdate(e.detail));
        
        if (this.pickupInput) {
            this.pickupInput.addEventListener('input', () => this.handlePickupChange());
            this.pickupInput.addEventListener('focus', () => this.handleInputFocus('pickup'));
        }
        
        if (this.dropoffInput) {
            this.dropoffInput.addEventListener('input', () => this.handleDropoffChange());
            this.dropoffInput.addEventListener('focus', () => this.handleInputFocus('dropoff'));
        }
    }

    forceHideMiddlePanel() {
    if (this.middlePanel) {
        this.middlePanel.classList.add('trip1-hidden');
    }
    
    if (this.mapPanel) {
        this.mapPanel.classList.remove('trip1-map-shrunk');
    }
    
    console.log('Middle panel forcefully hidden on initialization');
}

 async checkUserPaymentMethods() {
    try {
      const response = await fetch('/check-payment-methods', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      this.hasExistingPayment = data.hasPaymentMethod;
      this.userPaymentInfo = data.paymentInfo;
      this.paymentCheckCompleted = true;
      
      console.log('User payment status:', { 
        hasExistingPayment: this.hasExistingPayment, 
        userPaymentInfo: this.userPaymentInfo 
      });
    } catch (error) {
      console.error('Error checking payment methods:', error);
      this.hasExistingPayment = false;
      this.paymentCheckCompleted = true;
    }
  }

handleDropoffChange() {
    const dropoffValue = this.dropoffInput ? this.dropoffInput.value.trim() : '';
    
    if (dropoffValue === '') {
        this.dropoffLocation = null;
        this.clearLocationData('dropoff');
        if (this.mapHandler) {
            this.mapHandler.clearDestinationMarker();
        }
        this.hideRidePanel();
    } else {
        this.dropoffLocation = null;
        this.clearLocationData('dropoff');
        if (this.mapHandler) {
            this.mapHandler.clearDestinationMarker();
        }
    }
}
    
    setupLocationInputs() {
        this.waitForGoogleMaps().then(() => {
            this.setupRealAutocomplete(this.pickupInput, 'pickup');
            this.setupRealAutocomplete(this.dropoffInput, 'dropoff');
        }).catch(error => {
            console.warn('Google Maps not available, falling back to basic input:', error);
            this.setupBasicLocationInputs();
        });
    }

    handleScheduleToggle(e) {
    if (e.target.value === 'scheduled') {
        this.showScheduleCard();
    } else {
        this.closeScheduleCard();
        this.isScheduled = false;
        this.scheduleData = null;
    }
}

showScheduleCard() {
    if (this.scheduleCard) {
        this.scheduleCard.style.display = 'block';
        this.setMinDateTime();
    }
}

closeScheduleCard() {
    if (this.scheduleCard) {
        this.scheduleCard.style.display = 'none';
    }
    if (this.pickupTimeSelect) {
        this.pickupTimeSelect.value = 'now';
    }
}

setMinDateTime() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (this.scheduleDateInput) {
        this.scheduleDateInput.min = today;
        this.scheduleDateInput.value = today;
    }
    
    if (this.scheduleTimeInput) {
        const minTime = new Date(now.getTime() + 15 * 60000); // 15 minutes from now
        this.scheduleTimeInput.value = minTime.toTimeString().slice(0, 5);
    }
}

confirmSchedule() {
    const date = this.scheduleDateInput?.value;
    const time = this.scheduleTimeInput?.value;
    
    if (!date || !time) {
        this.showError('Please select both date and time');
        return;
    }
    
    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    
    if (selectedDateTime <= now) {
        this.showError('Please select a future date and time');
        return;
    }
    
    this.scheduleData = { date, time, datetime: selectedDateTime };
    this.isScheduled = true;
    
    this.closeScheduleCard();
    
    if (this.pickupTimeSelect) {
        this.pickupTimeSelect.value = 'scheduled';
    }
    
    this.showNotification(`Ride scheduled for ${this.formatScheduleTime(selectedDateTime)}`, 'success');
    
    this.updateScheduleDisplay();
}

updateScheduleDisplay() {
    if (!this.scheduleData || !this.pickupTimeSelect) return;
    
    const scheduledOption = this.pickupTimeSelect.querySelector('option[value="scheduled"]');
    if (scheduledOption && this.scheduleData) {
        const shortDate = new Date(this.scheduleData.datetime).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
        const shortTime = this.scheduleData.time;
        scheduledOption.textContent = `Scheduled for ${shortDate} at ${shortTime}`;
    }
}

formatScheduleTime(datetime) {
    return datetime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}
    
    waitForGoogleMaps() {
        return new Promise((resolve, reject) => {
            if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                resolve();
                return;
            }
            
            let attempts = 0;
            const maxAttempts = 20; 
            
            const checkGoogleMaps = () => {
                attempts++;
                if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Google Maps API not loaded'));
                } else {
                    setTimeout(checkGoogleMaps, 500);
                }
            };
            
            checkGoogleMaps();
        });
    }
    
    setupRealAutocomplete(input, type) {
        if (!input) return;
        
        const options = {
            types: ['geocode'],
            componentRestrictions: { country: 'no' }, 
            fields: ['formatted_address', 'geometry', 'name', 'place_id']
        };
        
        try {
            const autocomplete = new google.maps.places.Autocomplete(input, options);
            
            if (type === 'pickup') {
                this.pickupAutocomplete = autocomplete;
            } else {
                this.destinationAutocomplete = autocomplete;
            }
            
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                console.log(`${type} place selected:`, place);
                
                if (place.geometry && place.geometry.location) {
                    const location = {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        address: place.formatted_address || place.name
                    };
                    
                    if (type === 'pickup') {
                        this.pickupLocation = location;
                        input.dataset.lat = location.lat;
                        input.dataset.lng = location.lng;
                    } else {
                        this.dropoffLocation = location;
                        input.dataset.lat = location.lat;
                        input.dataset.lng = location.lng;
                    }
                    
                    if (this.mapHandler) {
                        this.mapHandler.handleLocationUpdate(
                            type === 'pickup' ? 'pickup' : 'destination',
                            location,
                            location.address
                        );
                    }
                    
                    console.log(`${type} coordinates set:`, location);
                } else {
                    console.warn(`No geometry found for ${type} place`);
                    this.clearLocationData(type);
                }
            });
            
            console.log(`Real autocomplete setup completed for ${type}`);
            
        } catch (error) {
            console.error(`Error setting up autocomplete for ${type}:`, error);
            this.setupBasicLocationInputs();
        }
    }
    
    setupBasicLocationInputs() {
        console.log('Setting up basic location inputs with geocoding fallback');
        
        [this.pickupInput, this.dropoffInput].forEach(input => {
            if (!input) return;
            
            const type = input.id.includes('pickup') ? 'pickup' : 'dropoff';
            let timeoutId;
            
            input.addEventListener('input', (e) => {
                clearTimeout(timeoutId);
                const query = e.target.value.trim();
                
                if (query.length < 3) {
                    this.clearLocationData(type);
                    return;
                }
                
                timeoutId = setTimeout(() => {
                    this.geocodeAddress(query, type);
                }, 1000);
            });
        });
    }
    
    clearLocationData(type) {
        if (type === 'pickup') {
            this.pickupLocation = null;
            if (this.pickupInput) {
                delete this.pickupInput.dataset.lat;
                delete this.pickupInput.dataset.lng;
            }
        } else {
            this.dropoffLocation = null;
            if (this.dropoffInput) {
                delete this.dropoffInput.dataset.lat;
                delete this.dropoffInput.dataset.lng;
            }
        }
    }

setupRideSelection() {
    document.addEventListener('click', (e) => {
      const rideCard = e.target.closest('.trip1-ride-card');
      if (rideCard && !rideCard.classList.contains('trip1-ride-active')) {
      
        document.querySelectorAll('.trip1-ride-card').forEach(card => {
          card.classList.remove('trip1-ride-active', 'selected');
        });
        
      
        rideCard.classList.add('trip1-ride-active', 'selected');
        
     
        this.selectedRide = {
          id: rideCard.dataset.rideId,
          type: rideCard.dataset.rideType,
          price: rideCard.dataset.ridePrice
        };
        
        console.log('Ride selected:', this.selectedRide);
        
        this.updateActionButtons(this.selectedRide);
        this.showPaymentOptions();
      }
    });
  }

  updateActionButtons(ride) {
    const selectedRide = document.getElementById('trip1-selected-ride');
    const paymentForm = document.getElementById('trip1-payment-form');
    const requestForm = document.getElementById('trip1-request-form');
    
    if (selectedRide) {
      selectedRide.style.display = 'none';
    }
    
    const currentPickup = this.pickupInput ? this.pickupInput.value.trim() : '';
    const currentDropoff = this.dropoffInput ? this.dropoffInput.value.trim() : '';
    const scheduleDate = this.scheduleData ? this.scheduleData.date : '';
    const scheduleTime = this.scheduleData ? this.scheduleData.time : '';
    
   
    this.updateFormInputs(paymentForm, ride, currentPickup, currentDropoff, scheduleDate, scheduleTime);
    this.updateFormInputs(requestForm, ride, currentPickup, currentDropoff, scheduleDate, scheduleTime);
    
    
    if (this.hasExistingPayment) {
      if (paymentForm) paymentForm.style.display = 'none';
      if (requestForm) {
        requestForm.style.display = 'block';
        const requestBtn = requestForm.querySelector('.trip1-request-btn');
        if (requestBtn) requestBtn.textContent = `Request ${ride.type} - ${ride.price}`;
      }
    } else {
      if (requestForm) requestForm.style.display = 'none';
      if (paymentForm) paymentForm.style.display = 'block';
    }
  }

  updateFormInputs(form, ride, pickup, dropoff, scheduleDate, scheduleTime) {
    if (!form) return;
    
    const inputs = {
      'ride-id': ride.id,
      'ride-type': ride.type,
      'ride-price': ride.price,
      'pickup': pickup,
      'dropoff': dropoff,
      'schedule-date': scheduleDate,
      'schedule-time': scheduleTime
    };
    
    Object.entries(inputs).forEach(([key, value]) => {
      const input = form.querySelector(`[name="${key}"], [id*="${key}"]`);
      if (input) input.value = value;
    });
  }
showPaymentOptions() {
    if (!this.selectedRide) return;

    const selectedRideDiv = document.getElementById('trip1-selected-ride');
    if (selectedRideDiv) {
      selectedRideDiv.innerHTML = `
        <div class="trip1-selected-ride-info">
          <span class="trip1-selected-type">${this.selectedRide.type}</span>
          <span class="trip1-selected-price">${this.selectedRide.price}</span>
        </div>
      `;
    }

   
    if (this.hasExistingPayment && this.userPaymentInfo) {
      this.showRequestRideButton();
    } else {
      this.showAddPaymentButton();
    }
  }

showRequestRideButton() {
    const buttonsDiv = document.querySelector('.trip1-payment-request-buttons');
    if (!buttonsDiv) return;
    
    const requestForm = document.getElementById('trip1-request-form');
    const paymentForm = document.getElementById('trip1-payment-form');
    
    if (paymentForm) paymentForm.style.display = 'none';
    if (paymentForm) paymentForm.style.display = 'flex';
    if (requestForm) {
      requestForm.style.display = 'block';
      
      
      if (!document.querySelector('.trip1-saved-card-display')) {
        const cardDisplay = document.createElement('div');
        cardDisplay.className = 'trip1-saved-card-display';
        paymentForm.innerHTML = `
          <div class="trip1-saved-card-info">
            <div class="trip1-card-icon">💳</div>
            <div class="trip1-card-details">
              <span class="trip1-card-brand">${this.capitalizeFirst(this.userPaymentInfo.cardBrand)}</span>
              <span class="trip1-card-number">•••• ${this.userPaymentInfo.cardLast4}</span>
            </div>
          </div>
        `;
        requestForm.insertBefore(cardDisplay, requestForm.firstChild);
      }
      
      const requestBtn = requestForm.querySelector('.trip1-request-btn');
      if (requestBtn) {
        requestBtn.textContent = `Request ${this.selectedRide.type} - ${this.selectedRide.price}`;
        requestBtn.onclick = (e) => this.handleRequestRide(e);
      }
    }
  }

  showAddPaymentButton() {
    const paymentForm = document.getElementById('trip1-payment-form');
    const requestForm = document.getElementById('trip1-request-form');
    const divForm = document.getElementById('trip1-payment-request-buttons')
    
    if (requestForm) requestForm.style.display = 'none';
    if (divForm) requestForm.style.display = 'flex';
    if (paymentForm) {
      paymentForm.style.display = 'block';
      
      const paymentBtn = paymentForm.querySelector('.trip1-payment-btn');
      if (paymentBtn) {
        paymentBtn.innerHTML = `
          <svg class="trip1-payment-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
            <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" stroke-width="2"/>
          </svg>
          Add Payment Method
        `;
      }
    }
  }

  async handleRequestRide(e) {
    e.preventDefault();

    
    const data = {
      rideId: this.selectedRide.id,
      rideType: this.selectedRide.type,
      ridePrice: this.selectedRide.price,
      pickup: this.pickupInput?.value || '',
      dropoff: this.dropoffInput?.value || '',
      scheduleDate: this.scheduleData?.date || '',
      scheduleTime: this.scheduleData?.time || '',
      useExistingCard: 'true'
    };
    
    if (!this.selectedRide) {
      this.showError('Please select a ride first');
      return;
    }

    try {
      this.showPaymentLoading(true);

      const response = await fetch('/add-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success) {
        if (result.paymentStatus === 'completed') {
            window.location.href = result.redirectTo;
            } else if (result.requiresAction) {
          this.handlePaymentAuthentication(result.clientSecret);
        }
      } else {
        if (result.cardExpired || result.fallbackToNewCard) {
          this.showPaymentError('Your saved card needs to be updated. Please add a new payment method.');
          this.hasExistingPayment = false;
          this.showAddPaymentButton();
        } else {
          this.showPaymentError(result.message || 'Payment failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Request ride error:', error);
      this.showPaymentError('An error occurred. Please try again.');
    } finally {
      this.showPaymentLoading(false);
    }
  }


useNewCard() {
    this.hasExistingPayment = false; 
    this.showNewPaymentOptions();
    
    const paymentForm = document.getElementById('trip1-payment-form');
    if (paymentForm) paymentForm.style.display = 'block';
    
    const paymentBtn = document.getElementById('trip1-payment-btn');
    if (paymentBtn) {
        paymentBtn.textContent = 'Add New Payment Method';
    }
}

 showPaymentLoading(show) {
    const buttons = document.querySelectorAll('.trip1-payment-btn, .trip1-request-btn');
    buttons.forEach(btn => {
      btn.disabled = show;
      if (show) {
        btn.dataset.originalText = btn.textContent;
        btn.textContent = 'Processing...';
      } else if (btn.dataset.originalText) {
        btn.textContent = btn.dataset.originalText;
      }
    });
  }

showPaymentError(message) {
    let errorDiv = document.getElementById('trip1-payment-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'trip1-payment-error';
        errorDiv.className = 'trip1-payment-error';
        const buttonsDiv = document.querySelector('.trip1-payment-request-buttons');
        if (buttonsDiv) buttonsDiv.appendChild(errorDiv);
    }
    
    errorDiv.innerHTML = `
        <div class="trip1-error-message">
            <span>❌ ${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    setTimeout(() => {
        if (errorDiv) errorDiv.remove();
    }, 5000);
}

handlePaymentAuthentication(clientSecret) {
    console.log('Payment requires authentication:', clientSecret);
    this.showPaymentError('Payment requires additional authentication. Please try again.');
}

capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
    waitForMapHandler() {
        const checkMapHandler = () => {
            if (window.mapHandler) {
                console.log('MapHandler found, trip handler ready');
                this.mapHandler = window.mapHandler;
                return true;
            }
            return false;
        };
        
        if (!checkMapHandler()) {
            console.log('Waiting for MapHandler...');
            const interval = setInterval(() => {
                if (checkMapHandler()) {
                    clearInterval(interval);
                }
            }, 500);
            
            setTimeout(() => {
                clearInterval(interval);
                if (!this.mapHandler) {
                    console.warn('MapHandler not found after 10 seconds, continuing without map integration');
                }
            }, 10000);
        }
    }
    
    async handleSearch(e) {
    e.preventDefault();
    const formData = new FormData(this.form);
    const pickup = formData.get('pickup').trim();
    const dropoff = formData.get('dropoff').trim();
    const pickupTimeType = formData.get('pickupTime'); // This gets 'now' or 'scheduled'
    
    if (!pickup) {
        this.showError('Please enter a pickup location');
        this.pickupInput?.focus();
        return;
    }
    
    if (!dropoff) {
        this.showError('Please enter a drop-off location');
        this.dropoffInput?.focus();
        return;
    }
    
    if (pickup === dropoff) {
        this.showError('Pickup and drop-off locations must be different');
        return;
    }
    
    // Check if scheduled ride but no schedule data
    if (pickupTimeType === 'scheduled' && !this.scheduleData) {
        this.showError('Please confirm your schedule or select "Pick up now"');
        return;
    }
    
    try {
        this.showLoading(true);
        this.setButtonLoading(true);
        
        if (!this.pickupLocation) {
            this.pickupLocation = await this.geocodeLocation(pickup);
        }
        
        if (!this.dropoffLocation) {
            this.dropoffLocation = await this.geocodeLocation(dropoff);
        }
        
        if (this.mapHandler) {
            this.mapHandler.handleLocationUpdate('pickup', this.pickupLocation, pickup);
            this.mapHandler.handleLocationUpdate('destination', this.dropoffLocation, dropoff);
        }
        
        const searchParams = {
            pickup: this.pickupLocation,
            dropoff: this.dropoffLocation,
            pickupTime: pickupTimeType,
            rideFor: formData.get('rideFor'),
            scheduleData: this.scheduleData,
            isScheduled: this.isScheduled
        };
        
        console.log('Search params with schedule data:', searchParams);
        
        const rideData = await this.searchRides(searchParams);
        console.log('Ride data received:', rideData);
        
        this.displayRideResults(rideData);
        this.showRidePanel();
        
    } catch (error) {
        console.error('Search error:', error);
        this.showError('Unable to find rides. Please try again.');
    } finally {
        this.showLoading(false);
        this.setButtonLoading(false);
    }
}
    
    async searchRides(searchParams) {
       
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      
        const distance = this.calculateDistance(
            searchParams.pickup,
            searchParams.dropoff
        );
        
    
        const basePrice = Math.max(50, distance * 12);
        
        const rides = [
            {
                id: 'uberx-' + Date.now(),
                type: 'UberX',
                category: 'Affordable, everyday rides',
                price: `${Math.round(basePrice)} kr`,
                eta: Math.floor(Math.random() * 8) + 2, 
                arrivalTime: this.getArrivalTime(Math.floor(Math.random() * 8) + 2),
                rating: '4.8',
                icon: 'car'
            },
        ];
        
        
        rides.sort((a, b) => a.eta - b.eta);
        
        return {
            rides: rides,
            pickup: searchParams.pickup,
            dropoff: searchParams.dropoff,
            distance: distance,
            searchId: 'search-' + Date.now()
        };
    }
    
    calculateDistance(pickup, dropoff) {
    
        const R = 6371; 
        const dLat = (dropoff.lat - pickup.lat) * Math.PI / 180;
        const dLng = (dropoff.lng - pickup.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(pickup.lat * Math.PI / 180) * Math.cos(dropoff.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    getArrivalTime(etaMinutes) {
        const now = new Date();
        const arrival = new Date(now.getTime() + etaMinutes * 60000);
        return arrival.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: false 
        });
    }
    
    displayRideResults(rideData) {
        this.currentRideData = rideData;
        
  
        const bestRide = rideData.rides[0];
        
       
        const rideCard = document.querySelector('.trip1-ride-card');
        if (rideCard && bestRide) {
            
            rideCard.dataset.rideId = bestRide.id;
            rideCard.dataset.rideType = bestRide.type;
            rideCard.dataset.ridePrice = bestRide.price;
            
          
            const rideType = rideCard.querySelector('.trip1-ride-type');
            if (rideType) rideType.textContent = bestRide.type;
            
            
            const ratingValue = rideCard.querySelector('.trip1-rating-value');
            if (ratingValue) ratingValue.textContent = bestRide.rating;
            
            const eta = rideCard.querySelector('.trip1-eta');
            if (eta) eta.textContent = `${bestRide.eta} mins away`;
            
            const arrival = rideCard.querySelector('.trip1-arrival');
            if (arrival) arrival.textContent = bestRide.arrivalTime;
            
            const category = rideCard.querySelector('.trip1-ride-category');
            if (category) category.textContent = bestRide.category;
            
            const price = rideCard.querySelector('.trip1-price-amount');
            if (price) price.textContent = bestRide.price;
        }
        
        if (this.requestBtn && bestRide) {
            this.requestBtn.textContent = `Request ${bestRide.type}`;
            this.requestBtn.dataset.rideId = bestRide.id;
        }
        
        console.log('Ride results displayed:', rideData);
    }
    
    showRidePanel() {
        if (this.middlePanel) {
            this.middlePanel.classList.remove('trip1-hidden');
        }
        
        if (this.mapPanel) {
            this.mapPanel.classList.add('trip1-map-shrunk');
        }
        
        
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                this.middlePanel?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 300);
        }
    }
    
    hideRidePanel() {
        if (this.middlePanel) {
            this.middlePanel.classList.add('trip1-hidden');
        }
        
        if (this.mapPanel) {
            this.mapPanel.classList.remove('trip1-map-shrunk');
        }
    }

 async handlePaymentFormSubmit(e) {
    e.preventDefault();
    
    if (!this.selectedRide) {
      this.showError('Please select a ride first');
      return;
    }
    
    const formData = new FormData(e.target);
    
    const data = {
      rideId: this.selectedRide.id,
      rideType: this.selectedRide.type,
      ridePrice: this.selectedRide.price,
      pickup: formData.get('pickup'),
      dropoff: formData.get('dropoff'),
      scheduleDate: formData.get('scheduleDate') || '',
      scheduleTime: formData.get('scheduleTime') || '',
      useExistingCard: 'false'
    };
    
    if (!data.pickup || !data.dropoff) {
      this.showError('Pickup and dropoff locations are required');
      return;
    }
    
    try {
      this.showPaymentLoading(true);
      
      const response = await fetch('/add-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success && result.checkoutUrl) {
        console.log('Redirecting to payment setup:', result.checkoutUrl);
        window.location.href = result.checkoutUrl;
      } else {
        this.showPaymentError(result.message || 'Payment initialization failed');
      }
      
    } catch (error) {
      console.error('Payment form error:', error);
      this.showPaymentError('Failed to process payment. Please try again.');
    } finally {
      this.showPaymentLoading(false);
    }
  }
    
    handleAddStop() {
        this.showNotification('Multiple stops coming soon!', 'info');
    }
    
    handlePaymentMethod() {
      
        this.showNotification('Payment method added successfully', 'success');
        
     
        if (this.paymentBtn) {
            this.paymentBtn.innerHTML = `
                <svg class="trip1-payment-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                    <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" stroke-width="2"/>
                </svg>
                Card ending in 4242
            `;
            this.paymentBtn.style.borderColor = '#10b981';
            this.paymentBtn.style.color = '#10b981';
        }
    }
    
    handleTripUpdate(tripData) {
        console.log('Trip updated from map:', tripData);
        
        if (tripData.distance && tripData.duration) {
            if (this.currentRideData) {
                this.updatePriceEstimates(tripData.distance);
            }
        }
    }
    
    updatePriceEstimates(distance) {
        const basePrice = Math.max(50, distance * 12);
        
        const priceElement = document.querySelector('.trip1-price-amount');
        if (priceElement && this.currentRideData) {
            const currentRide = this.currentRideData.rides[0];
            if (currentRide) {
                currentRide.price = `${Math.round(basePrice)} kr`;
                priceElement.textContent = currentRide.price;
            }
        }
    }
    
    handlePickupChange() {
        this.pickupLocation = null;
        this.clearLocationData('pickup');
        if (this.mapHandler) {
            this.mapHandler.clearPickupMarker();
        }
    }
    
    handleDropoffChange() {
        this.dropoffLocation = null;
        this.clearLocationData('dropoff');
        if (this.mapHandler) {
            this.mapHandler.clearDestinationMarker();
        }
        this.hideRidePanel();
    }
    
    handleInputFocus(type) {
        document.querySelectorAll('.trip1-location-suggestions').forEach(el => el.remove());
    }
    
    showLoading(show) {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    setButtonLoading(loading, button = this.searchBtn) {
        if (!button) return;
        
        const btnText = button.querySelector('.trip1-btn-text');
        const spinner = button.querySelector('.trip1-loading-spinner');
        
        if (btnText && spinner) {
            if (loading) {
                btnText.style.display = 'none';
                spinner.style.display = 'flex';
                button.disabled = true;
            } else {
                btnText.style.display = 'block';
                spinner.style.display = 'none';
                button.disabled = false;
            }
        } else {
         
            if (loading) {
                button.disabled = true;
                button.style.opacity = '0.7';
            } else {
                button.disabled = false;
                button.style.opacity = '1';
            }
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info', duration = 3000) {
 
        document.querySelectorAll('.trip1-notification').forEach(el => el.remove());
        
        const notification = document.createElement('div');
        notification.className = `trip1-notification trip1-notification-${type}`;
        notification.innerHTML = message;
        
  
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideInRight 0.3s ease;
        `;
        
   
        switch (type) {
            case 'error':
                notification.style.background = '#ef4444';
                break;
            case 'success':
                notification.style.background = '#10b981';
                break;
            case 'info':
            default:
                notification.style.background = '#3b82f6';
                break;
        }
        
        document.body.appendChild(notification);
        
  
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
        
       
        if (!document.querySelector('#trip1-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'trip1-notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                .trip1-suggestion-item {
                    padding: 12px 16px;
                    cursor: pointer;
                    border-bottom: 1px solid #f3f4f6;
                    font-size: 14px;
                    color: #374151;
                }
                .trip1-suggestion-item:hover {
                    background: #f9fafb;
                }
                .trip1-suggestion-item:last-child {
                    border-bottom: none;
                }
                .trip1-booking-success h3 {
                    margin: 0 0 8px 0;
                    font-size: 18px;
                }
                .trip1-booking-success p {
                    margin: 4px 0;
                    font-size: 14px;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
 
    setPickupLocation(lat, lng, address) {
        this.pickupLocation = { lat, lng, address };
        if (this.pickupInput) {
            this.pickupInput.value = address;
        }
    }
    
    setDestinationLocation(lat, lng, address) {
        this.dropoffLocation = { lat, lng, address };
        if (this.dropoffInput) {
            this.dropoffInput.value = address;
        }
    }
    
    clearForm() {
        if (this.form) {
            this.form.reset();
        }
        this.pickupLocation = null;
        this.dropoffLocation = null;
        this.currentRideData = null;
        this.hideRidePanel();
        
        if (this.mapHandler) {
            this.mapHandler.clearAllMarkers();
        }
    }
    
    getCurrentRideData() {
        return this.currentRideData;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.tripHandler = new TripHandler();
    console.log('TripHandler initialized and attached to window');
});

window.TripHandler = TripHandler;

window.formHandler = {
    setPickupLocation: (lat, lng, address) => {
        if (window.tripHandler) {
            window.tripHandler.setPickupLocation(lat, lng, address);
        }
    },
    setDestinationLocation: (lat, lng, address) => {
        if (window.tripHandler) {
            window.tripHandler.setDestinationLocation(lat, lng, address);
        }
    }
}; 