/**
 * Google Maps Integration for Uber Clone
 * Handles map initialization, autocomplete, and route display
 */

class UberMap {
    constructor() {
        this.map = null;
        this.directionsService = null;
        this.directionsRenderer = null;
        this.pickupAutocomplete = null;
        this.destinationAutocomplete = null;
        this.markers = {
            pickup: null,
            destination: null
        };
        
        // Default map center (Oslo, Norway based on screenshot)
        this.defaultCenter = { lat: 59.9139, lng: 10.7522 };
        this.currentRoute = null;
        
        this.init();
    }

    /**
     * Initialize the map and set up event listeners
     */
    init() {
        this.initMap();
        this.setupAutocomplete();
        this.bindEvents();
    }

    /**
     * Initialize Google Map
     */
    initMap() {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.warn('Map element not found');
            return;
        }

        // Map configuration
        const mapOptions = {
            zoom: 10,
            center: this.defaultCenter,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                },
                {
                    featureType: 'transit',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER
            }
        };

        this.map = new google.maps.Map(mapElement, mapOptions);
        
        // Initialize directions service and renderer
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true, // We'll add custom markers
            polylineOptions: {
                strokeColor: '#000000',
                strokeWeight: 4,
                strokeOpacity: 0.8
            }
        });
        
        this.directionsRenderer.setMap(this.map);
        
        console.log('Map initialized successfully');
    }

    /**
     * Setup Google Places Autocomplete for input fields
     */
    setupAutocomplete() {
        const pickupInput = document.getElementById('pickup');
        const destinationInput = document.getElementById('destination');
        
        if (!pickupInput || !destinationInput) {
            console.warn('Input elements not found');
            return;
        }

        // Autocomplete options - restrict to Norway based on screenshot
        const autocompleteOptions = {
            componentRestrictions: { country: 'no' }, // Norway
            fields: ['place_id', 'geometry', 'name', 'formatted_address'],
            types: ['establishment', 'geocode']
        };

        // Initialize autocomplete for pickup
        this.pickupAutocomplete = new google.maps.places.Autocomplete(
            pickupInput, 
            autocompleteOptions
        );

        // Initialize autocomplete for destination
        this.destinationAutocomplete = new google.maps.places.Autocomplete(
            destinationInput, 
            autocompleteOptions
        );

        // Add event listeners for place selection
        this.pickupAutocomplete.addListener('place_changed', () => {
            this.handlePlaceSelection('pickup');
        });

        this.destinationAutocomplete.addListener('place_changed', () => {
            this.handlePlaceSelection('destination');
        });

        console.log('Autocomplete initialized');
    }

    /**
     * Handle place selection from autocomplete
     * @param {string} type - 'pickup' or 'destination'
     */
    handlePlaceSelection(type) {
        const autocomplete = type === 'pickup' ? this.pickupAutocomplete : this.destinationAutocomplete;
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
            console.warn(`No geometry found for ${type} location`);
            return;
        }

        // Update marker
        this.updateMarker(type, place.geometry.location, place.name || place.formatted_address);
        
        // If both locations are set, calculate route
        this.calculateRoute();
        
        console.log(`${type} location selected:`, place.name || place.formatted_address);
    }

    /**
     * Update marker on map
     * @param {string} type - 'pickup' or 'destination'
     * @param {google.maps.LatLng} location - Marker location
     * @param {string} title - Marker title
     */
    updateMarker(type, location, title) {
        // Remove existing marker
        if (this.markers[type]) {
            this.markers[type].setMap(null);
        }

        // Create new marker with custom styling
        const markerIcon = {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: type === 'pickup' ? '#000000' : '#000000',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 8
        };

        this.markers[type] = new google.maps.Marker({
            position: location,
            map: this.map,
            title: title,
            icon: markerIcon,
            zIndex: type === 'pickup' ? 1000 : 1001
        });

        // Add info window
        const infoWindow = new google.maps.InfoWindow({
            content: `<div style="font-weight: 500; color: #000;">${title}</div>`
        });

        this.markers[type].addListener('click', () => {
            infoWindow.open(this.map, this.markers[type]);
        });
    }

    /**
     * Calculate and display route between pickup and destination
     */
    calculateRoute() {
        if (!this.markers.pickup || !this.markers.destination) {
            return; // Need both markers to calculate route
        }

        const request = {
            origin: this.markers.pickup.getPosition(),
            destination: this.markers.destination.getPosition(),
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            avoidHighways: false,
            avoidTolls: false
        };

        this.directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                this.directionsRenderer.setDirections(result);
                this.currentRoute = result;
                
                // Update map bounds to show entire route
                this.fitMapToRoute();
                
                // Dispatch custom event with route data
                this.dispatchRouteEvent(result);
                
                console.log('Route calculated successfully');
            } else {
                console.error('Directions request failed:', status);
                this.showError('Unable to calculate route. Please try different locations.');
            }
        });
    }

    /**
     * Fit map to show entire route
     */
    fitMapToRoute() {
        if (!this.currentRoute) return;

        const bounds = new google.maps.LatLngBounds();
        
        // Add pickup and destination to bounds
        if (this.markers.pickup) {
            bounds.extend(this.markers.pickup.getPosition());
        }
        if (this.markers.destination) {
            bounds.extend(this.markers.destination.getPosition());
        }

        // Fit map to bounds with padding
        this.map.fitBounds(bounds, {
            top: 50,
            right: 50,
            bottom: 50,
            left: 50
        });
    }

    /**
     * Dispatch route calculation event
     * @param {google.maps.DirectionsResult} result - Route result
     */
    dispatchRouteEvent(result) {
        const route = result.routes[0];
        const leg = route.legs[0];
        
        const routeData = {
            distance: leg.distance.text,
            duration: leg.duration.text,
            distanceValue: leg.distance.value, // in meters
            durationValue: leg.duration.value, // in seconds
            startAddress: leg.start_address,
            endAddress: leg.end_address
        };

        // Dispatch custom event
        const event = new CustomEvent('routeCalculated', {
            detail: routeData
        });
        
        document.dispatchEvent(event);
    }

    /**
     * Clear all markers and route
     */
    clearMap() {
        // Clear markers
        Object.keys(this.markers).forEach(key => {
            if (this.markers[key]) {
                this.markers[key].setMap(null);
                this.markers[key] = null;
            }
        });

        // Clear directions
        this.directionsRenderer.setDirections({routes: []});
        this.currentRoute = null;

        // Reset map view
        this.map.setCenter(this.defaultCenter);
        this.map.setZoom(10);
        
        console.log('Map cleared');
    }

    /**
     * Set pickup location programmatically
     * @param {string} address - Address string
     */
    setPickupLocation(address) {
        this.geocodeAddress(address, 'pickup');
    }

    /**
     * Set destination location programmatically
     * @param {string} address - Address string
     */
    setDestinationLocation(address) {
        this.geocodeAddress(address, 'destination');
    }

    /**
     * Geocode address and set marker
     * @param {string} address - Address to geocode
     * @param {string} type - 'pickup' or 'destination'
     */
    geocodeAddress(address, type) {
        const geocoder = new google.maps.Geocoder();
        
        geocoder.geocode({
            address: address,
            componentRestrictions: { country: 'NO' }
        }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const location = results[0].geometry.location;
                this.updateMarker(type, location, results[0].formatted_address);
                this.calculateRoute();
            } else {
                console.warn(`Geocoding failed for ${address}:`, status);
            }
        });
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        // This would typically integrate with a notification system
        console.error(message);
        
        // For now, show simple alert
        if (window.showNotification) {
            window.showNotification(message, 'error');
        }
    }

    /**
     * Bind additional event listeners
     */
    bindEvents() {
        // Listen for form submissions to clear any previous routes
        const form = document.getElementById('tripForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                // Don't prevent default, just log
                console.log('Form submitted');
            });
        }

        // Listen for window resize to resize map
        window.addEventListener('resize', () => {
            if (this.map) {
                google.maps.event.trigger(this.map, 'resize');
            }
        });
    }

    /**
     * Get current route data
     * @returns {Object|null} Route data or null
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Check if both locations are set
     * @returns {boolean} True if both pickup and destination are set
     */
    hasBothLocations() {
        return this.markers.pickup !== null && this.markers.destination !== null;
    }
}

// Global map instance
let uberMap = null;

/**
 * Initialize map when Google Maps API is loaded
 * This function is called by the Google Maps API
 */
function initMap() {
    try {
        uberMap = new UberMap();
        
        // Make map instance globally available
        window.uberMap = uberMap;
        
        console.log('Uber Map initialized successfully');
    } catch (error) {
        console.error('Failed to initialize map:', error);
    }
}

/**
 * Handle case where Google Maps fails to load
 */
window.addEventListener('load', () => {
    // Check if Google Maps loaded
    setTimeout(() => {
        if (typeof google === 'undefined') {
            console.error('Google Maps failed to load');
            
            // Show fallback message
            const mapElement = document.getElementById('map');
            if (mapElement) {
                mapElement.innerHTML = `
                    <div style="
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        height: 100%; 
                        background-color: #f6f6f6;
                        color: #666;
                        font-size: 14px;
                        text-align: center;
                        padding: 20px;
                    ">
                        <div>
                            <div style="margin-bottom: 8px;">Map temporarily unavailable</div>
                            <div style="font-size: 12px;">Please check your internet connection</div>
                        </div>
                    </div>
                `;
            }
        }
    }, 5000);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UberMap, initMap };
}