// distance-slider.js
// Gestionează funcționalitatea slider-ului de distanță pentru filtrarea evenimentelor

document.addEventListener('DOMContentLoaded', function() {
    const distanceSlider = document.getElementById('distance-slider');
    const distanceValue = document.getElementById('distance-value');
    
    if (!distanceSlider || !distanceValue) return;
    
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

/**
 * Filtrează evenimentele în funcție de distanța față de locația curentă
 * @param {number} maxDistanceInKm - Distanța maximă în kilometri
 */
function filterEventsByDistance(maxDistanceInKm) {
    // Actualizăm filtrul global de distanță
    window.currentDistanceFilter = maxDistanceInKm;
    
    // Obținem orașul curent
    const currentCity = document.getElementById('currentCity')?.textContent || 'Cluj-Napoca';
    
    // Reafișăm evenimentele pentru a aplica noul filtru
    if (window.EventsFilterModule && typeof window.EventsFilterModule.showEventsForCity === 'function') {
        // Obținem filtrul curent de timp
        const activeTimeFilter = document.querySelector('.events-filter .filter-btn.active')?.getAttribute('data-filter') || 'today';
        
        // Reafișăm evenimentele cu filtrul de timp curent
        window.EventsFilterModule.showEventsForCity(currentCity, activeTimeFilter);
    }
    
    // Actualizăm vizual elementele din listă
    const eventElements = document.querySelectorAll('.event-card, .event-item');
    eventElements.forEach(eventEl => {
        const eventDistance = parseFloat(eventEl.dataset.distance) || 0;
        if (eventDistance <= maxDistanceInKm) {
            eventEl.style.display = '';
        } else {
            eventEl.style.display = 'none';
        }
    });
}

/**
 * Calculează distanța dintre două puncte geografice folosind formula Haversine
 * @param {number} lat1 - Latitudinea primului punct
 * @param {number} lon1 - Longitudinea primului punct
 * @param {number} lat2 - Latitudinea celui de-al doilea punct
 * @param {number} lon2 - Longitudinea celui de-al doilea punct
 * @returns {number} Distanța în kilometri
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raza Pământului în km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distanța în km
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
