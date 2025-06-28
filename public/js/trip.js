
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
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        console.log('TripHandler initializing...');
        this.initializeElements();
        this.setupEventListeners();
        this.setupLocationInputs();
        this.waitForMapHandler();
        this.setupRideSelection();
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
        
        if (this.requestBtn) {
            this.requestBtn.addEventListener('click', () => this.handleRequestRide());
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
    
    setupLocationInputs() {
        this.waitForGoogleMaps().then(() => {
            this.setupRealAutocomplete(this.pickupInput, 'pickup');
            this.setupRealAutocomplete(this.dropoffInput, 'dropoff');
        }).catch(error => {
            console.warn('Google Maps not available, falling back to basic input:', error);
            this.setupBasicLocationInputs();
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
                    card.classList.remove('trip1-ride-active');
                });
                
                rideCard.classList.add('trip1-ride-active');
                
                const rideData = {
                    id: rideCard.dataset.rideId,
                    type: rideCard.dataset.rideType,
                    price: rideCard.dataset.ridePrice
                };
                
                console.log('Ride selected:', rideData);
                
                this.updateActionButtons(rideData);
            }
        });
        
        console.log('Ride selection event delegation setup completed');
    }

   updateActionButtons(ride) {
    const selectedRide = document.getElementById('trip1-selected-ride');
    const paymentForm = document.getElementById('trip1-payment-form');
    const requestForm = document.getElementById('trip1-request-form');
    
    console.log('Updating action buttons for ride:', ride);
    
    if (selectedRide) {
        selectedRide.innerHTML = `
            <span class="trip1-selected-text">Selected: ${ride.type} - ${ride.price}</span>
        `;
    }
    
    // **FIX: Get current pickup and dropoff values from the main form inputs**
    const currentPickup = this.pickupInput ? this.pickupInput.value.trim() : '';
    const currentDropoff = this.dropoffInput ? this.dropoffInput.value.trim() : '';
    
    console.log('Current form values:', { pickup: currentPickup, dropoff: currentDropoff });
    
    if (paymentForm) {
        const rideIdInput = document.getElementById('trip1-ride-id');
        const rideTypeInput = document.getElementById('trip1-ride-type');
        const ridePriceInput = document.getElementById('trip1-ride-price');
        
        // **FIX: Add the missing pickup/dropoff inputs**
        const paymentPickupInput = document.getElementById('trip1-payment-pickup');
        const paymentDropoffInput = document.getElementById('trip1-payment-dropoff');
        
        if (rideIdInput) rideIdInput.value = ride.id;
        if (rideTypeInput) rideTypeInput.value = ride.type;
        if (ridePriceInput) ridePriceInput.value = ride.price;
        
        // **FIX: Populate pickup and dropoff values**
        if (paymentPickupInput) paymentPickupInput.value = currentPickup;
        if (paymentDropoffInput) paymentDropoffInput.value = currentDropoff;
        
        console.log('Payment form updated with:', {
            rideId: ride.id,
            rideType: ride.type,
            ridePrice: ride.price,
            pickup: currentPickup,
            dropoff: currentDropoff
        });
        
        paymentForm.style.display = 'block';
    }
    
    if (requestForm) {
        const requestRideIdInput = document.getElementById('trip1-request-ride-id');
        const requestRideTypeInput = document.getElementById('trip1-request-ride-type');
        const requestRidePriceInput = document.getElementById('trip1-request-ride-price');
        
        // **FIX: Add the missing pickup/dropoff inputs for request form too**
        const requestPickupInput = document.getElementById('trip1-request-pickup');
        const requestDropoffInput = document.getElementById('trip1-request-dropoff');
        
        if (requestRideIdInput) requestRideIdInput.value = ride.id;
        if (requestRideTypeInput) requestRideTypeInput.value = ride.type;
        if (requestRidePriceInput) requestRidePriceInput.value = ride.price;
        
        // **FIX: Populate pickup and dropoff values**
        if (requestPickupInput) requestPickupInput.value = currentPickup;
        if (requestDropoffInput) requestDropoffInput.value = currentDropoff;
        
        if (this.requestBtn) {
            this.requestBtn.textContent = `Request ${ride.type}`;
        }
        
        console.log('Request form updated with:', {
            rideId: ride.id,
            rideType: ride.type,
            ridePrice: ride.price,
            pickup: currentPickup,
            dropoff: currentDropoff
        });
        
        requestForm.style.display = 'block';
    }
    
    console.log('Action buttons updated successfully');
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
        
        try {
            this.showLoading(true);
            this.setButtonLoading(true);
            
            // Ensure we have location coordinates
            if (!this.pickupLocation) {
                this.pickupLocation = await this.geocodeLocation(pickup);
            }
            
            if (!this.dropoffLocation) {
                this.dropoffLocation = await this.geocodeLocation(dropoff);
            }
            
            // Update map markers
            if (this.mapHandler) {
                this.mapHandler.handleLocationUpdate('pickup', this.pickupLocation, pickup);
                this.mapHandler.handleLocationUpdate('destination', this.dropoffLocation, dropoff);
            }
            
            const rideData = await this.searchRides({
                pickup: this.pickupLocation,
                dropoff: this.dropoffLocation,
                pickupTime: formData.get('pickupTime'),
                rideFor: formData.get('rideFor')
            });
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
    
    async geocodeLocation(address) {
        if (window.google && window.google.maps) {
            return new Promise((resolve, reject) => {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ 
                    address: address,
                    region: 'NO' 
                }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const location = results[0].geometry.location;
                        resolve({
                            lat: location.lat(),
                            lng: location.lng(),
                            address: results[0].formatted_address
                        });
                    } else {
                        reject(new Error('Geocoding failed: ' + status));
                    }
                });
            });
        }
        
        return this.mockGeocode(address);
    }
    
    async geocodeAddress(address, type) {
        if (!address || address.length < 3) return;
        
        try {
            const location = await this.geocodeLocation(address);
            
            if (type === 'pickup') {
                this.pickupLocation = location;
                if (this.pickupInput) {
                    this.pickupInput.dataset.lat = location.lat;
                    this.pickupInput.dataset.lng = location.lng;
                }
            } else {
                this.dropoffLocation = location;
                if (this.dropoffInput) {
                    this.dropoffInput.dataset.lat = location.lat;
                    this.dropoffInput.dataset.lng = location.lng;
                }
            }
            
            if (this.mapHandler) {
                this.mapHandler.handleLocationUpdate(
                    type === 'pickup' ? 'pickup' : 'destination',
                    location,
                    address
                );
            }
            
            console.log(`${type} geocoded successfully:`, location);
            
        } catch (error) {
            console.error(`Geocoding failed for ${type}:`, error);
        }
    }
    
    mockGeocode(address) {
        // Mock geocoding for demo purposes - returns Oslo area coordinates
        const baseOslo = { lat: 59.9139, lng: 10.7522 };
        const variation = 0.05; // ~5km variation
        
        return {
            lat: baseOslo.lat + (Math.random() - 0.5) * variation,
            lng: baseOslo.lng + (Math.random() - 0.5) * variation,
            address: address
        };
    }
    
    async searchRides(searchParams) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Calculate distance for pricing
        const distance = this.calculateDistance(
            searchParams.pickup,
            searchParams.dropoff
        );
        
        // Generate mock ride options
        const basePrice = Math.max(50, distance * 12); // NOK, minimum 50
        
        const rides = [
            {
                id: 'uberx-' + Date.now(),
                type: 'UberX',
                category: 'Affordable, everyday rides',
                price: `${Math.round(basePrice)} kr`,
                eta: Math.floor(Math.random() * 8) + 2, // 2-10 minutes
                arrivalTime: this.getArrivalTime(Math.floor(Math.random() * 8) + 2),
                rating: '4.8',
                icon: 'car'
            },
            {
                id: 'comfort-' + Date.now(),
                type: 'Comfort',
                category: 'Newer cars with extra legroom',
                price: `${Math.round(basePrice * 1.3)} kr`,
                eta: Math.floor(Math.random() * 6) + 3,
                arrivalTime: this.getArrivalTime(Math.floor(Math.random() * 6) + 3),
                rating: '4.9',
                icon: 'car-luxury'
            },
            {
                id: 'xl-' + Date.now(),
                type: 'UberXL',
                category: 'Larger cars for up to 6 passengers',
                price: `${Math.round(basePrice * 1.6)} kr`,
                eta: Math.floor(Math.random() * 10) + 4,
                arrivalTime: this.getArrivalTime(Math.floor(Math.random() * 10) + 4),
                rating: '4.7',
                icon: 'car-suv'
            }
        ];
        
        // Sort by ETA
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
        // Haversine formula for distance calculation
        const R = 6371; // Earth radius in km
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
        
        // Update middle panel content with first/best ride
        const bestRide = rideData.rides[0];
        
        // Update ride card content
        const rideCard = document.querySelector('.trip1-ride-card');
        if (rideCard && bestRide) {
            // Set data attributes for selection
            rideCard.dataset.rideId = bestRide.id;
            rideCard.dataset.rideType = bestRide.type;
            rideCard.dataset.ridePrice = bestRide.price;
            
            // Update ride type
            const rideType = rideCard.querySelector('.trip1-ride-type');
            if (rideType) rideType.textContent = bestRide.type;
            
            // Update rating
            const ratingValue = rideCard.querySelector('.trip1-rating-value');
            if (ratingValue) ratingValue.textContent = bestRide.rating;
            
            // Update ETA
            const eta = rideCard.querySelector('.trip1-eta');
            if (eta) eta.textContent = `${bestRide.eta} mins away`;
            
            // Update arrival time
            const arrival = rideCard.querySelector('.trip1-arrival');
            if (arrival) arrival.textContent = bestRide.arrivalTime;
            
            // Update category
            const category = rideCard.querySelector('.trip1-ride-category');
            if (category) category.textContent = bestRide.category;
            
            // Update price
            const price = rideCard.querySelector('.trip1-price-amount');
            if (price) price.textContent = bestRide.price;
        }
        
        // Update request button
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
        
        // Smooth scroll to results on mobile
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
    
    const formData = new FormData(e.target);
    const data = {
        rideId: formData.get('rideId'),
        rideType: formData.get('rideType'),
        ridePrice: formData.get('ridePrice'),
        pickup: formData.get('pickup'),
        dropoff: formData.get('dropoff')
    };
    
    console.log('Payment form submission data:', data);
    
    // Validate data before sending
    if (!data.pickup || !data.dropoff) {
        this.showError('Pickup and dropoff locations are required');
        return;
    }
    
    if (!data.rideId || !data.rideType || !data.ridePrice) {
        this.showError('Please select a ride first');
        return;
    }
    
    try {
        this.setButtonLoading(true, this.paymentBtn);
        
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
            console.log('Redirecting to Stripe checkout:', result.checkoutUrl);
            window.location.href = result.checkoutUrl;
        } else {
            this.showError(result.message || 'Payment initialization failed');
        }
        
    } catch (error) {
        console.error('Payment form error:', error);
        this.showError('Failed to process payment. Please try again.');
    } finally {
        this.setButtonLoading(false, this.paymentBtn);
    }
}
    
    handleAddStop() {
        this.showNotification('Multiple stops coming soon!', 'info');
    }
    
    handlePaymentMethod() {
        // Mock payment method selection
        this.showNotification('Payment method added successfully', 'success');
        
        // Update button text
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
    
    async handleRequestRide() {
        if (!this.currentRideData) {
            this.showError('No ride selected. Please search for rides first.');
            return;
        }
        
        const rideId = this.requestBtn?.dataset.rideId;
        const selectedRide = this.currentRideData.rides.find(ride => ride.id === rideId);
        
        if (!selectedRide) {
            this.showError('Invalid ride selection. Please try again.');
            return;
        }
        
        try {
            this.setButtonLoading(true, this.requestBtn);
            
            // Simulate booking API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Mock booking success
            this.showBookingSuccess(selectedRide);
            
        } catch (error) {
            console.error('Booking error:', error);
            this.showError('Failed to book ride. Please try again.');
        } finally {
            this.setButtonLoading(false, this.requestBtn);
        }
    }
    
    showBookingSuccess(ride) {
        const message = `
            <div class="trip1-booking-success">
                <h3>Ride Booked Successfully!</h3>
                <p><strong>${ride.type}</strong> will arrive in <strong>${ride.eta} minutes</strong></p>
                <p>Driver will be at your pickup location by <strong>${ride.arrivalTime}</strong></p>
                <p>Total cost: <strong>${ride.price}</strong></p>
            </div>
        `;
        
        this.showNotification(message, 'success', 5000);
        
        // Update UI to show booking status
        if (this.requestBtn) {
            this.requestBtn.textContent = 'Ride Booked';
            this.requestBtn.disabled = true;
            this.requestBtn.style.background = '#10b981';
        }
    }
    
    handleTripUpdate(tripData) {
        console.log('Trip updated from map:', tripData);
        
        // Update any trip-related UI elements with real distance/duration
        if (tripData.distance && tripData.duration) {
            // Update price estimates based on real distance
            if (this.currentRideData) {
                this.updatePriceEstimates(tripData.distance);
            }
        }
    }
    
    updatePriceEstimates(distance) {
        const basePrice = Math.max(50, distance * 12);
        
        // Update displayed price
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
        // Clear existing suggestions when focusing on input
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
            // Fallback for buttons without spinner structure
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
        // Remove existing notifications
        document.querySelectorAll('.trip1-notification').forEach(el => el.remove());
        
        const notification = document.createElement('div');
        notification.className = `trip1-notification trip1-notification-${type}`;
        notification.innerHTML = message;
        
        // Styling
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
        
        // Type-specific styling
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
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
        
        // Add CSS animations if not already added
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
    
    // Public methods for external control
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

// Initialize trip handler
document.addEventListener('DOMContentLoaded', () => {
    window.tripHandler = new TripHandler();
    console.log('TripHandler initialized and attached to window');
});

// Also attach to window for global access
window.TripHandler = TripHandler;

// Export for form handler compatibility
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