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
        
        // Default center (Oslo, Norway based on the image)
        this.defaultCenter = { lat: 59.9139, lng: 10.7522 };
        this.userLocation = null;
        
        this.init();
    }
    
    init() {
        // Wait for Google Maps API to load
        if (typeof google === 'undefined' || !google.maps) {
            console.warn('Google Maps API not loaded');
            return;
        }
        
        this.initializeMap();
        this.setupEventListeners();
        this.getCurrentLocation();
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
            suppressMarkers: true,
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
        
        // Listen for form changes to update map
        const pickupInput = document.getElementById('pickup');
        const destinationInput = document.getElementById('destination');
        
        if (pickupInput) {
            pickupInput.addEventListener('input', window.debounce(() => {
                this.geocodeAndUpdatePickup(pickupInput.value);
            }, 500));
        }
        
        if (destinationInput) {
            destinationInput.addEventListener('input', window.debounce(() => {
                this.geocodeAndUpdateDestination(destinationInput.value);
            }, 500));
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
        
        // Reverse geocode to get address
        this.reverseGeocode(clickedLocation).then(address => {
            // Determine which input to fill based on current form state
            const pickupInput = document.getElementById('pickup');
            const destinationInput = document.getElementById('destination');
            
            if (!pickupInput.value) {
                pickupInput.value = address;
                pickupInput.dataset.lat = clickedLocation.lat;
                pickupInput.dataset.lng = clickedLocation.lng;
                this.updatePickupLocation(event.latLng);
            } else if (!destinationInput.value) {
                destinationInput.value = address;
                destinationInput.dataset.lat = clickedLocation.lat;
                destinationInput.dataset.lng = clickedLocation.lng;
                this.updateDestinationLocation(event.latLng);
            }
            
            // Trigger form validation
            if (window.formHandler) {
                window.formHandler.validateForm();
            }
        });
    }
    
    reverseGeocode(location) {
        return new Promise((resolve, reject) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: location }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].formatted_address);
                } else {
                    reject('Geocoder failed: ' + status);
                }
            });
        });
    }
    
    geocodeAndUpdatePickup(address) {
        if (!address || address.length < 3) return;
        
        this.geocodeAddress(address).then(location => {
            this.updatePickupLocation(location);
        }).catch(error => {
            console.warn('Geocoding failed for pickup:', error);
        });
    }
    
    geocodeAndUpdateDestination(address) {
        if (!address || address.length < 3) return;
        
        this.geocodeAddress(address).then(location => {
            this.updateDestinationLocation(location);
        }).catch(error => {
            console.warn('Geocoding failed for destination:', error);
        });
    }
    
    geocodeAddress(address) {
        return new Promise((resolve, reject) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ 
                address: address,
                componentRestrictions: { country: 'NO' }
            }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].geometry.location);
                } else {
                    reject('Geocoder failed: ' + status);
                }
            });
        });
    }
    
    updatePickupLocation(location) {
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
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="8" fill="#000000"/>
                        <circle cx="12" cy="12" r="3" fill="#ffffff"/>
                    </svg>
                `),
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 12)
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
        
        this.updateRoute();
    }
    
    updateDestinationLocation(location) {
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
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#000000"/>
                    </svg>
                `),
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 24)
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
        
        this.updateRoute();
    }
    
    updateRoute() {
        if (!this.pickupMarker || !this.destinationMarker) {
            return;
        }
        
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
                this.directionsRenderer.setDirections(result);
                
                // Fit map to show entire route
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(this.pickupMarker.getPosition());
                bounds.extend(this.destinationMarker.getPosition());
                this.map.fitBounds(bounds);
                
                // Add some padding
                setTimeout(() => {
                    this.map.panBy(0, -50);
                }, 100);
                
                // Update trip information
                this.updateTripInfo(result.routes[0]);
            } else {
                console.error('Directions request failed:', status);
            }
        });
    }
    
    updateTripInfo(route) {
        const leg = route.legs[0];
        const distance = leg.distance.value / 1000; // Convert to km
        const duration = Math.round(leg.duration.value / 60); // Convert to minutes
        
        // Update UI if trip estimate is shown
        const estimateDistance = document.querySelector('.estimate-item .estimate-value');
        const estimateDuration = document.querySelector('.estimate-item:nth-child(2) .estimate-value');
        
        if (estimateDistance) {
            estimateDistance.textContent = `${distance.toFixed(1)} km`;
        }
        if (estimateDuration) {
            estimateDuration.textContent = `~${duration} min`;
        }
        
        // Store data for form submission
        const form = document.getElementById('tripForm');
        if (form) {
            // Update hidden fields or data attributes
            form.dataset.distance = distance;
            form.dataset.duration = duration;
        }
    }
    
    closeAllInfoWindows() {
        this.infoWindows.forEach(infoWindow => {
            infoWindow.close();
        });
        this.infoWindows = [];
    }
    
    adjustMarkersForZoom() {
        const zoom = this.map.getZoom();
        const scale = Math.min(Math.max(zoom / 12, 0.8), 2);
        
        // Adjust marker sizes based on zoom
        if (this.pickupMarker) {
            const icon = this.pickupMarker.getIcon();
            icon.scaledSize = new google.maps.Size(24 * scale, 24 * scale);
            this.pickupMarker.setIcon(icon);
        }
        
        if (this.destinationMarker) {
            const icon = this.destinationMarker.getIcon();
            icon.scaledSize = new google.maps.Size(24 * scale, 24 * scale);
            this.destinationMarker.setIcon(icon);
        }
    }
    
    clearRoute() {
        this.directionsRenderer.setDirections({routes: []});
        
        if (this.pickupMarker) {
            this.pickupMarker.setMap(null);
            this.pickupMarker = null;
        }
        
        if (this.destinationMarker) {
            this.destinationMarker.setMap(null);
            this.destinationMarker = null;
        }
        
        this.closeAllInfoWindows();
    }
    
    resetMap() {
        this.clearRoute();
        this.map.setCenter(this.userLocation || this.defaultCenter);
        this.map.setZoom(12);
    }
    
    getMapStyles() {
        // Custom map styling for Uber-like appearance
        return [
            {
                "featureType": "administrative",
                "elementType": "geometry",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "poi",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "road",
                "elementType": "labels.icon",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "transit",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "water",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#a2daf2"}]
            },
            {
                "featureType": "landscape",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#f5f5f5"}]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#ffffff"}]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#e0e0e0"}]
            },
            {
                "featureType": "road.arterial",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#ffffff"}]
            },
            {
                "featureType": "road.arterial",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#e0e0e0"}]
            },
            {
                "featureType": "road.local",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#ffffff"}]
            }
        ];
    }
    
    // Public methods for external use
    showRoute(pickup, destination) {
        this.geocodeAddress(pickup).then(pickupLocation => {
            this.updatePickupLocation(pickupLocation);
            
            return this.geocodeAddress(destination);
        }).then(destinationLocation => {
            this.updateDestinationLocation(destinationLocation);
        }).catch(error => {
            console.error('Error showing route:', error);
        });
    }
    
    getMapInstance() {
        return this.map;
    }
}

// Global map initialization function (called by Google Maps API)
function initMap() {
    console.log('Initializing Google Maps...');
    window.mapHandler = new MapHandler();
}

// Initialize map when DOM is ready and Google Maps is loaded
document.addEventListener('DOMContentLoaded', () => {
    // If Google Maps is already loaded, initialize immediately
    if (typeof google !== 'undefined' && google.maps) {
        initMap();
    }
    
    // Set up error handling for map loading
    window.addEventListener('error', (e) => {
        if (e.message && e.message.includes('Google Maps')) {
            console.error('Google Maps failed to load:', e);
            
            // Show fallback message
            const mapElement = document.getElementById('map');
            if (mapElement) {
                mapElement.innerHTML = `
                    <div class="map-error">
                        <div class="map-error-content">
                            <h3>Map Unavailable</h3>
                            <p>Unable to load Google Maps. Please check your internet connection and try again.</p>
                            <button onclick="location.reload()" class="btn btn-primary">Retry</button>
                        </div>
                    </div>
                `;
            }
        }
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapHandler;
}