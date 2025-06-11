// Google Maps integration for Uber Clone
class MapHandler {
    constructor() {
        this.map = null;
        this.directionsService = null;
        this.directionsRenderer = null;
        this.pickupMarker = null;
        this.destinationMarker = null;
        this.userLocationMarker = null;
        this.infoWindows = [];
        
        // Default center (Oslo, Norway)
        this.defaultCenter = { lat: 59.9139, lng: 10.7522 };
        this.userLocation = null;
        
        this.init();
    }
    
    init() {
        // Wait for Google Maps API to load
        if (typeof google === 'undefined' || !google.maps) {
            console.warn('Google Maps API not loaded, retrying in 1 second...');
            setTimeout(() => this.init(), 1000);
            return;
        }
        
        this.initializeMap();
        this.setupEventListeners();
        this.getCurrentLocation();
        console.log('MapHandler initialized successfully');
    }
    
    initializeMap() {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.warn('Map element not found');
            return;
        }
        
        // Map options
        const mapOptions = {
            zoom: 12,
            center: this.defaultCenter,
            styles: this.getMapStyles(),
            zoomControl: true,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: true,
            gestureHandling: 'cooperative'
        };
        
        // Initialize map
        this.map = new google.maps.Map(mapElement, mapOptions);
        
        // Initialize directions service and renderer
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true, // We'll use custom markers
            polylineOptions: {
                strokeColor: '#000000',
                strokeWeight: 4,
                strokeOpacity: 0.8
            }
        });
        this.directionsRenderer.setMap(this.map);
        
        // Add traffic layer
        const trafficLayer = new google.maps.TrafficLayer();
        trafficLayer.setMap(this.map);
        
        console.log('Map initialized successfully');
    }
    
    setupEventListeners() {
        // Listen for map clicks
        if (this.map) {
            this.map.addListener('click', (e) => {
                this.handleMapClick(e);
            });
            
            // Listen for zoom changes
            this.map.addListener('zoom_changed', () => {
                this.adjustMarkersForZoom();
            });
        }
    }
    
    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    console.log('User location obtained:', this.userLocation);
                    
                    // Center map on user location if in Norway area
                    if (this.isInNorway(this.userLocation)) {
                        this.map.setCenter(this.userLocation);
                        this.addUserLocationMarker();
                    }
                },
                (error) => {
                    console.warn('Geolocation error:', error);
                    // Use default location (Oslo)
                    this.map.setCenter(this.defaultCenter);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        } else {
            console.warn('Geolocation not supported');
            this.map.setCenter(this.defaultCenter);
        }
    }
    
    isInNorway(location) {
        // Rough bounds for Norway
        return location.lat >= 58 && location.lat <= 72 && 
               location.lng >= 4 && location.lng <= 32;
    }
    
    addUserLocationMarker() {
        if (this.userLocationMarker) {
            this.userLocationMarker.setMap(null);
        }
        
        this.userLocationMarker = new google.maps.Marker({
            position: this.userLocation,
            map: this.map,
            title: 'Your Location',
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 8
            },
            zIndex: 1000
        });
    }
    
    handleMapClick(event) {
        const clickedLocation = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
        };
        
        console.log('Map clicked at:', clickedLocation);
        
        // Reverse geocode to get address
        this.reverseGeocode(clickedLocation).then(address => {
            console.log('Reverse geocoded address:', address);
            
            // Determine which input to fill based on current form state
            const pickupInput = document.getElementById('pickup');
            const destinationInput = document.getElementById('destination');
            
            if (!pickupInput.value) {
                // Fill pickup
                if (window.formHandler) {
                    window.formHandler.setPickupLocation(clickedLocation.lat, clickedLocation.lng, address);
                }
                this.updatePickupLocation(event.latLng);
            } else if (!destinationInput.value) {
                // Fill destination
                if (window.formHandler) {
                    window.formHandler.setDestinationLocation(clickedLocation.lat, clickedLocation.lng, address);
                }
                this.updateDestinationLocation(event.latLng);
            } else {
                // Both filled, replace destination
                if (window.formHandler) {
                    window.formHandler.setDestinationLocation(clickedLocation.lat, clickedLocation.lng, address);
                }
                this.updateDestinationLocation(event.latLng);
            }
        }).catch(error => {
            console.error('Reverse geocoding failed:', error);
        });
    }
    
    reverseGeocode(location) {
        return new Promise((resolve, reject) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ 
                location: location,
                region: 'NO'
            }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].formatted_address);
                } else {
                    reject('Geocoder failed: ' + status);
                }
            });
        });
    }
    
    updatePickupLocation(location) {
        console.log('Updating pickup location:', location);
        
        // Remove existing pickup marker
        if (this.pickupMarker) {
            this.pickupMarker.setMap(null);
        }
        
        // Add new pickup marker
        this.pickupMarker = new google.maps.Marker({
            position: location,
            map: this.map,
            title: 'Pickup Location',
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="16" cy="16" r="12" fill="#000000" stroke="#ffffff" stroke-width="2"/>
                        <circle cx="16" cy="16" r="4" fill="#ffffff"/>
                    </svg>
                `),
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 16)
            },
            zIndex: 100
        });
        
        // Add info window
        const infoWindow = new google.maps.InfoWindow({
            content: '<div class="map-info-window"><strong>Pickup Location</strong></div>'
        });
        
        this.pickupMarker.addListener('click', () => {
            this.closeAllInfoWindows();
            infoWindow.open(this.map, this.pickupMarker);
            this.infoWindows.push(infoWindow);
        });
        
        // Update route if both markers exist
        this.updateRoute();
    }
    
    updateDestinationLocation(location) {
        console.log('Updating destination location:', location);
        
        // Remove existing destination marker
        if (this.destinationMarker) {
            this.destinationMarker.setMap(null);
        }
        
        // Add new destination marker
        this.destinationMarker = new google.maps.Marker({
            position: location,
            map: this.map,
            title: 'Destination',
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 2C9.37 2 4 7.37 4 14c0 8.75 12 22 12 22s12-13.25 12-22c0-6.63-5.37-12-12-12zm0 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="#000000" stroke="#ffffff" stroke-width="1"/>
                    </svg>
                `),
                scaledSize: new google.maps.Size(32, 40),
                anchor: new google.maps.Point(16, 40)
            },
            zIndex: 200
        });
        
        // Add info window
        const infoWindow = new google.maps.InfoWindow({
            content: '<div class="map-info-window"><strong>Destination</strong></div>'
        });
        
        this.destinationMarker.addListener('click', () => {
            this.closeAllInfoWindows();
            infoWindow.open(this.map, this.destinationMarker);
            this.infoWindows.push(infoWindow);
        });
        
        // Update route if both markers exist
        this.updateRoute();
    }
    
    updateRoute() {
        if (!this.pickupMarker || !this.destinationMarker) {
            console.log('Cannot update route: missing markers');
            return;
        }
        
        console.log('Updating route between markers');
        
        const request = {
            origin: this.pickupMarker.getPosition(),
            destination: this.destinationMarker.getPosition(),
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            avoidHighways: false,
            avoidTolls: false
        };
        
        this.directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                console.log('Route calculated successfully');
                this.directionsRenderer.setDirections(result);
                
                // Fit map to show entire route with padding
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(this.pickupMarker.getPosition());
                bounds.extend(this.destinationMarker.getPosition());
                
                this.map.fitBounds(bounds, {
                    top: 50,
                    right: 50,
                    bottom: 50,
                    left: 50
                });
                
                // Update trip information
                this.updateTripInfo(result.routes[0]);
            } else {
                console.error('Directions request failed:', status);
                
                // Still try to fit bounds to show both markers
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(this.pickupMarker.getPosition());
                bounds.extend(this.destinationMarker.getPosition());
                this.map.fitBounds(bounds);
            }
        });
    }
    
    updateTripInfo(route) {
        const leg = route.legs[0];
        const distance = leg.distance.value / 1000; // Convert to km
        const duration = Math.round(leg.duration.value / 60); // Convert to minutes
        
        console.log('Trip info:', { distance: distance + 'km', duration: duration + 'min' });
        
        // Update UI if trip estimate elements exist
        const estimateDistance = document.querySelector('.estimate-distance');
        const estimateDuration = document.querySelector('.estimate-duration');
        
        if (estimateDistance) {
            estimateDistance.textContent = `${distance.toFixed(1)} km`;
        }
        if (estimateDuration) {
            estimateDuration.textContent = `~${duration} min`;
        }
        
        // Also try alternative selectors
        const altDistanceEl = document.querySelector('[data-trip="distance"]');
        const altDurationEl = document.querySelector('[data-trip="duration"]');
        
        if (altDistanceEl) {
            altDistanceEl.textContent = `${distance.toFixed(1)} km`;
        }
        if (altDurationEl) {
            altDurationEl.textContent = `${duration} min`;
        }
        
        // Store data for form submission
        this.tripData = {
            distance: distance,
            duration: duration,
            route: route
        };
        
        // Dispatch custom event with trip data
        const tripUpdateEvent = new CustomEvent('tripUpdated', {
            detail: {
                distance: distance,
                duration: duration,
                route: route
            }
        });
        document.dispatchEvent(tripUpdateEvent);
    }
    
    closeAllInfoWindows() {
        this.infoWindows.forEach(infoWindow => {
            infoWindow.close();
        });
        this.infoWindows = [];
    }
    
    adjustMarkersForZoom() {
        const zoom = this.map.getZoom();
        const scale = Math.max(0.5, Math.min(1.5, zoom / 12));
        
        if (this.pickupMarker) {
            const icon = this.pickupMarker.getIcon();
            if (icon && icon.scaledSize) {
                icon.scaledSize = new google.maps.Size(32 * scale, 32 * scale);
                this.pickupMarker.setIcon(icon);
            }
        }
        
        if (this.destinationMarker) {
            const icon = this.destinationMarker.getIcon();
            if (icon && icon.scaledSize) {
                icon.scaledSize = new google.maps.Size(32 * scale, 40 * scale);
                this.destinationMarker.setIcon(icon);
            }
        }
    }
    
    // Clear marker methods
    clearPickupMarker() {
        if (this.pickupMarker) {
            this.pickupMarker.setMap(null);
            this.pickupMarker = null;
        }
        this.clearRoute();
        console.log('Pickup marker cleared');
    }
    
    clearDestinationMarker() {
        if (this.destinationMarker) {
            this.destinationMarker.setMap(null);
            this.destinationMarker = null;
        }
        this.clearRoute();
        console.log('Destination marker cleared');
    }
    
    clearRoute() {
        if (this.directionsRenderer) {
            this.directionsRenderer.setDirections({routes: []});
        }
        
        // Clear trip info
        const estimateDistance = document.querySelector('.estimate-distance');
        const estimateDuration = document.querySelector('.estimate-duration');
        const altDistanceEl = document.querySelector('[data-trip="distance"]');
        const altDurationEl = document.querySelector('[data-trip="duration"]');
        
        if (estimateDistance) estimateDistance.textContent = '';
        if (estimateDuration) estimateDuration.textContent = '';
        if (altDistanceEl) altDistanceEl.textContent = '';
        if (altDurationEl) altDurationEl.textContent = '';
        
        this.tripData = null;
        console.log('Route cleared');
    }
    
    clearAllMarkers() {
        this.clearPickupMarker();
        this.clearDestinationMarker();
        this.closeAllInfoWindows();
        console.log('All markers cleared');
    }
    
    // Map styling
    getMapStyles() {
        return [
            {
                "featureType": "all",
                "elementType": "geometry.fill",
                "stylers": [{"weight": "2.00"}]
            },
            {
                "featureType": "all",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#9c9c9c"}]
            },
            {
                "featureType": "all",
                "elementType": "labels.text",
                "stylers": [{"visibility": "on"}]
            },
            {
                "featureType": "landscape",
                "elementType": "all",
                "stylers": [{"color": "#f2f2f2"}]
            },
            {
                "featureType": "landscape",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#ffffff"}]
            },
            {
                "featureType": "landscape.man_made",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#ffffff"}]
            },
            {
                "featureType": "poi",
                "elementType": "all",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "road",
                "elementType": "all",
                "stylers": [{"saturation": -100}, {"lightness": 45}]
            },
            {
                "featureType": "road",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#eeeeee"}]
            },
            {
                "featureType": "road",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#7b7b7b"}]
            },
            {
                "featureType": "road",
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#ffffff"}]
            },
            {
                "featureType": "road.highway",
                "elementType": "all",
                "stylers": [{"visibility": "simplified"}]
            },
            {
                "featureType": "road.arterial",
                "elementType": "labels.icon",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "transit",
                "elementType": "all",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "water",
                "elementType": "all",
                "stylers": [{"color": "#46bcec"}, {"visibility": "on"}]
            },
            {
                "featureType": "water",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#c8d7d4"}]
            },
            {
                "featureType": "water",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#070707"}]
            },
            {
                "featureType": "water",
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#ffffff"}]
            }
        ];
    }
    
    // Public methods for external control
    recenterMap() {
        if (this.pickupMarker && this.destinationMarker) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(this.pickupMarker.getPosition());
            bounds.extend(this.destinationMarker.getPosition());
            this.map.fitBounds(bounds);
        } else if (this.userLocation) {
            this.map.setCenter(this.userLocation);
        } else {
            this.map.setCenter(this.defaultCenter);
        }
    }
    
    setMapMode(mode) {
        switch (mode) {
            case 'satellite':
                this.map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
                break;
            case 'hybrid':
                this.map.setMapTypeId(google.maps.MapTypeId.HYBRID);
                break;
            case 'terrain':
                this.map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
                break;
            default:
                this.map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        }
    }
    
    getTripData() {
        return this.tripData;
    }
    
    // Method to handle form location updates from external sources
    handleLocationUpdate(type, location, address = '') {
        const latLng = new google.maps.LatLng(location.lat, location.lng);
        
        if (type === 'pickup') {
            this.updatePickupLocation(latLng);
        } else if (type === 'destination') {
            this.updateDestinationLocation(latLng);
        }
    }
}

// Initialize map handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if map element exists before initializing
    if (document.getElementById('map')) {
        window.mapHandler = new MapHandler();
        console.log('MapHandler initialized and attached to window');
    } else {
        console.warn('Map element not found, MapHandler not initialized');
    }
});

// Handle Google Maps API load callback
window.initMap = function() {
    console.log('Google Maps API loaded');
    // If MapHandler hasn't been initialized yet, initialize it
    if (!window.mapHandler && document.getElementById('map')) {
        window.mapHandler = new MapHandler();
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapHandler;
}