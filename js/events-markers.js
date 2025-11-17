// Funcții pentru gestionarea markerilor pe hartă

// Constante pentru setări harta
const MAP_SETTINGS = {
    DEFAULT_ZOOM: 14,          // Zoom-ul implicit la afișarea evenimentelor
    MIN_ZOOM: 12,              // Zoom-ul minim permis
    MAX_ZOOM: 18,              // Zoom-ul maxim permis
    MIN_DISTANCE_KM: 0.5,       // Distanța minimă pentru filtrare (km)
    MAX_DISTANCE_KM: 20,        // Distanța maximă pentru filtrare (km)
    FLY_TO_DURATION: 0.5,       // Durata animației de zoom (secunde)
    FLY_TO_OFFSET_Y: -150       // Offset vertical pentru centrare (px)
};

// Variabile globale pentru markerii evenimentelor
let eventMarkers = [];
let eventMarkersGroup = L.featureGroup();

function syncEventMarkersReference() {
    if (typeof window !== 'undefined') {
        window.eventMarkers = eventMarkers;
    }
}

syncEventMarkersReference();

// Funcție pentru a șterge markerii evenimentelor
function clearEventMarkers() {
    try {
        // Ștergem markerii din grup, dacă există
        if (eventMarkersGroup) {
            eventMarkersGroup.clearLayers();

            if (map && map.hasLayer(eventMarkersGroup)) {
                map.removeLayer(eventMarkersGroup);
            }

            eventMarkersGroup = L.featureGroup();
        }

        // Ștergem markerii individuali din array, dacă au rămas
        if (eventMarkers && eventMarkers.length > 0) {
            const markersToRemove = [...eventMarkers];

            markersToRemove.forEach(marker => {
                if (marker && marker._map && map) {
                    map.removeLayer(marker);
                }
            });

            eventMarkers = [];
            syncEventMarkersReference();
        }
    } catch (e) {
    }
}

// Funcție pentru actualizarea hărții cu evenimente filtrate
function updateMapWithFilteredEvents(filteredEvents) {
    if (!map) {
        return;
    }

    // Ștergem toți markerii din grup
    eventMarkersGroup.clearLayers();

    // Actualizăm array-ul de markeri cu noii markeri
    eventMarkers = [];
    syncEventMarkersReference();

    // Adăugăm markerii la hartă și la grup
    filteredEvents.forEach(event => {
        try {
            const eventIcon = L.divIcon({
                html: `<div class="event-marker" style="background-color: ${getCategoryColor(event.category)}">
                         <i class="${getCategoryIcon(event.category)}"></i>
                       </div>`,
                className: 'event-marker-container',
                iconSize: [32, 32]
            });

            // Verificăm dacă există deja un marker pentru acest eveniment
            let marker = existingMarkers.find(m => m.options.eventId === event.id);

            if (!marker) {
                // Dacă nu există, creăm un marker nou
                marker = L.marker([event.lat, event.lng], {
                    icon: eventIcon,
                    title: event.title,
                    riseOnHover: true,
                    eventId: event.id
                });

                // Eveniment de click pentru a centra harta pe marker
                marker.on('click', function () {
                    map.flyTo([event.lat, event.lng], 15, {
                        duration: 0.5,
                        easeLinearity: 0.25,
                        animate: true
                    });
                });
            }

            // Adăugăm markerul la grupul de markeri
            marker.addTo(eventMarkersGroup);
            eventMarkers.push(marker);
        } catch (error) {
            return;
        }
    });

    // Adăugăm grupul de markeri pe hartă dacă nu este deja adăugat
    if (!map.hasLayer(eventMarkersGroup)) {
        eventMarkersGroup.addTo(map);
    }

    // Facem zoom la markeri dacă avem evenimente
    if (eventMarkers.length > 0) {
        if (eventMarkers.length === 1) {
            // Pentru un singur marker, folosim un zoom fixat
            const marker = eventMarkers[0];
            // Folosim flyTo pentru o tranziție mai lină
            map.flyTo(marker.getLatLng(), 14, {
                duration: 0.5,
                easeLinearity: 0.25,
                animate: true
            });
        } else {
            // Pentru mai mulți markeri, folosim fitBounds
            map.fitBounds(eventMarkersGroup.getBounds(), {
                padding: [50, 50],
                maxZoom: 15 // Limităm zoom-ul maxim pentru a nu fi prea aproape
            });
        }

        // Nu mai deschidem popup-uri automat
    }
}
