// distance-slider.js
// Gestionează funcționalitatea slider-ului de distanță pentru filtrarea evenimentelor

// Funcție pentru a obține poziția utilizatorului
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userPos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    window.userPosition = userPos;
                    resolve(userPos);
                },
                (error) => {
                    console.error('Eroare la obținerea locației:', error);
                    // Folosim Cluj-Napoca ca locație implicită
                    window.userPosition = { lat: 46.770439, lng: 23.591423 };
                    resolve(window.userPosition);
                }
            );
        } else {
            console.log('Geolocația nu este suportată de acest browser');
            // Folosim Cluj-Napoca ca locație implicită
            window.userPosition = { lat: 46.770439, lng: 23.591423 };
            resolve(window.userPosition);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const distanceSlider = document.getElementById('distance-slider');
    const distanceValue = document.getElementById('distance-value');
    
    if (!distanceSlider || !distanceValue) return;
    
    // Obținem poziția utilizatorului și apoi inițializăm slider-ul
    getUserLocation().then(() => {
        // Actualizează doar valoarea afișată când se trage slider-ul
        distanceSlider.addEventListener('input', function() {
            distanceValue.textContent = this.value;
        });
        
        // Aplică filtrarea doar când se eliberează mouse-ul
        distanceSlider.addEventListener('change', function() {
            filterEventsByDistance(parseInt(this.value));
        });
        
        // Aplică filtrarea inițială
        filterEventsByDistance(parseInt(distanceSlider.value));
    });
});

/**
 * Filtrează evenimentele în funcție de distanța față de locația curentă
 * @param {number} maxDistanceInKm - Distanța maximă în kilometri
 */
function filterEventsByDistance(maxDistanceInKm) {
    console.log('=== FILTRARE DUPĂ DISTANȚĂ ===');
    console.log('Distanță maximă setată la:', maxDistanceInKm, 'km');
    
    // Actualizăm filtrul global de distanță
    window.currentDistanceFilter = maxDistanceInKm;
    
    // Obținem poziția curentă a utilizatorului (dacă este disponibilă)
    const userPosition = window.userPosition || { lat: 46.7730432, lng: 23.576576 };
    console.log('Poziția utilizatorului:', userPosition);
    
    // Obținem toți markerii de pe hartă
    const markers = [];
    
    // Căutăm în toate panourile Leaflet care conțin markeri
    const markerPanes = document.querySelectorAll('.leaflet-marker-pane > *');
    console.log('Am găsit', markerPanes.length, 'markeri în panoul de markeri');
    
    // Adăugăm fiecare marker în lista noastră
    markerPanes.forEach(markerElement => {
        // Obținem coordonatele din atributul style
        const style = markerElement.getAttribute('style') || '';
        const transformMatch = style.match(/translate3d\((\d+)px, (\d+)px/);
        
        if (transformMatch) {
            const x = parseInt(transformMatch[1]);
            const y = parseInt(transformMatch[2]);
            
            // Obținem titlul markerului (dacă există)
            const title = markerElement.getAttribute('title') || 'Fără titlu';
            
            // Adăugăm markerul în listă
            markers.push({
                element: markerElement,
                x: x,
                y: y,
                title: title
            });
        }
    });
    
    console.log('Am procesat', markers.length, 'markeri');
    
    if (markers.length === 0) {
        console.error('Nu s-au găsit markeri pe hartă');
        return;
    }
    
    // Parcurgem fiecare marker
    markers.forEach(marker => {
        try {
            // Obținem elementul părinte care conține coordonatele
            const markerContainer = marker.element.closest('[data-lat][data-lng]') || 
                                 document.querySelector(`[title="${marker.title}"][data-lat][data-lng]`);
            
            let distance = 0;
            
            if (markerContainer) {
                // Dacă avem coordonate în atributul data-
                const lat = parseFloat(markerContainer.dataset.lat);
                const lng = parseFloat(markerContainer.dataset.lng);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    // Calculăm distanța reală folosind formula Haversine
                    distance = calculateDistance(
                        userPosition.lat,
                        userPosition.lng,
                        lat,
                        lng
                    );
                    
                    // Actualizăm afișajul distanței în card (dacă există)
                    const distanceElement = markerContainer.querySelector('.distance');
                    if (distanceElement) {
                        distanceElement.textContent = `${distance.toFixed(1)} km`;
                    }
                }
            } else {
                // Dacă nu găsim coordonate, folosim o aproximare bazată pe poziția pe ecran
                distance = Math.sqrt(
                    Math.pow(marker.x - 0, 2) + 
                    Math.pow(marker.y - 0, 2)
                ) / 100;
            }
            
            console.log(`Eveniment: ${marker.title} la ${distance.toFixed(1)}km`);
            
            // Actualizăm vizibilitatea markerului
            const isVisible = distance <= maxDistanceInKm;
            marker.element.style.display = isVisible ? '' : 'none';
            
            // Actualizăm și vizibilitatea cardului corespunzător (dacă există)
            if (markerContainer) {
                markerContainer.style.display = isVisible ? '' : 'none';
            }
            
        } catch (error) {
            console.error('Eroare la procesarea markerului:', error, marker);
        }
    });
    
    console.log('Am actualizat vizibilitatea markerilor');
    
    console.log('=== SFÂRȘIT FILTRARE ===');
}

/**
 * Calculează distanța dintre două puncte geografice folosind aceeași metodă ca în carduri (L.latLng().distanceTo())
 * @param {number} lat1 - Latitudinea primului punct (în grade zecimale)
 * @param {number} lon1 - Longitudinea primului punct (în grade zecimale)
 * @param {number} lat2 - Latitudinea celui de-al doilea punct (în grade zecimale)
 * @param {number} lon2 - Longitudinea celui de-al doilea punct (în grade zecimale)
 * @returns {number} Distanța în kilometri, rotunjită la o zecimală
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    try {
        // Folosim aceeași metodă ca în carduri
        const point1 = L.latLng(lat1, lon1);
        const point2 = L.latLng(lat2, lon2);
        const distanceInMeters = point1.distanceTo(point2);
        const distanceInKm = distanceInMeters / 1000;
        
        console.log('=== CALCUL DISTANȚĂ ===');
        console.log('Punctul A (tine):', point1);
        console.log('Punctul B (eveniment):', point2);
        console.log('Distanța calculată:', distanceInKm.toFixed(3), 'km');
        console.log('=== SFÂRȘIT CALCUL ===');
        
        return parseFloat(distanceInKm.toFixed(1));
    } catch (error) {
        console.error('Eroare la calculul distanței cu Leaflet:', error);
        // Revenim la formula anterioară dacă apare vreo eroare
        return calculateDistanceFallback(lat1, lon1, lat2, lon2);
    }
}

/**
 * Funcție de rezervă pentru calculul distanței (folosită doar dacă L.latLng nu este disponibil)
 */
function calculateDistanceFallback(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raza Pământului în km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(1));
}

/**
 * Converteste grade în radiani
 * @param {number} value - Valoarea în grade
 * @returns {number} Valoarea în radiani
 */
function toRad(value) {
    return value * Math.PI / 180;
}

// Exportă funcțiile pentru a putea fi folosite în alte fișiere
window.distanceSliderModule = {
    filterEventsByDistance,
    calculateDistance
};
