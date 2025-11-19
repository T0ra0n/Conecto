// Funcții core pentru filtrarea pe categorii și helperi generali

// Listă de categorii valide pentru filtrare cu mapări pentru potriviri parțiale
const CATEGORY_MAPPINGS = {
    'muzica': ['Muzica', 'Muzica Clasica', 'Concerte', 'Concert'],
    'film': ['Film', 'Cinema', 'Filme'],
    'jocuri': ['Jocuri', 'Gaming', 'Joc'],
    'social': ['Social', 'Evenimente Sociale', 'Petrecere', 'Intalnire'],
    'sport': ['Sport', 'Sporturi', 'Fotbal', 'Baschet', 'Tenis'],
    'arta': ['Arta', 'Expozitii', 'Cultura', 'Muzeu', 'Galerie'],
    'tehnic': ['Tehnic', 'Tehnologie', 'IT', 'Programare', 'Tehnic'],
    'educatie': ['Educatie', 'Workshop', 'Conferinte', 'Curs', 'Scoala']
};

// Mapare categorii la iconițe Font Awesome
const CATEGORY_ICONS = {
    'muzica': 'fas fa-music',
    'film': 'fas fa-film',
    'jocuri': 'fas fa-gamepad',
    'social': 'fas fa-users',
    'sport': 'fas fa-futbol',
    'arta': 'fas fa-palette',
    'tehnic': 'fas fa-laptop-code',
    'educatie': 'fas fa-graduation-cap',
    'default': 'fas fa-map-marker-alt'
};

// Funcție pentru a obține iconița corespunzătoare unei categorii
function getCategoryIcon(category) {
    if (!category) return CATEGORY_ICONS.default;
    
    const lowerCategory = category.toLowerCase();
    
    // Căutăm categoria exactă
    if (CATEGORY_ICONS[lowerCategory]) {
        return CATEGORY_ICONS[lowerCategory];
    }
    
    // Căutăm în mapările de categorii
    for (const [key, values] of Object.entries(CATEGORY_MAPPINGS)) {
        if (values.some(v => v.toLowerCase() === lowerCategory)) {
            return CATEGORY_ICONS[key] || CATEGORY_ICONS.default;
        }
    }
    
    return CATEGORY_ICONS.default;
}

// Funcție pentru a calcula distanța dintre două puncte în km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raza Pământului în km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distanța în km
}

function buildEventContent(event, isPopup = false) {
    let distanceInfo = '';

    if (window.currentPosition) {
        const distance = calculateDistance(
            window.currentPosition.coords.latitude,
            window.currentPosition.coords.longitude,
            event.lat,
            event.lng
        );
        distanceInfo = `<p><i class="fas fa-route"></i> La ${distance.toFixed(1)} km de tine</p>`;
    }

    const destinationParams = (event.lat && event.lng)
        ? `destination=${event.lat},${event.lng}`
        : `destination=${encodeURIComponent(event.location || event.address || event.title)}`;

    const originParams = window.currentPosition
        ? `&origin=${window.currentPosition.coords.latitude},${window.currentPosition.coords.longitude}`
        : '';

    const navigationLink = `https://www.google.com/maps/dir/?api=1&${destinationParams}${originParams}`;

    const navigationButton = `
        <a class="navigation-btn" href="${navigationLink}" target="_blank" rel="noopener">
            <i class="fas fa-location-arrow"></i>
            Navigheaza
        </a>
    `;

    const eventImage = event.image
        ? `<img src="${event.image}" alt="${event.title}" class="event-details-image" />`
        : '<div class="event-details-image event-image-fallback"></div>';

    // Construim detaliile în funcție de tipul de afișare
    let detailsHTML = `
        <p><i class="far fa-calendar-alt"></i> ${event.date} • ${event.time}</p>
        <p class="event-location">
            <i class="fas fa-map-marker-alt"></i>
            <span class="event-location-text">
                <span class="event-location-name">${event.location}</span>
                ${isPopup ? `<span class="event-address">${event.address}</span>` : ''}
            </span>
        </p>
    `;

    // Adăugăm prețul doar în popup-uri
    if (isPopup) {
        detailsHTML += `<p><i class="fas fa-tag"></i> ${event.price}</p>`;
    }

    // Adăugăm informația de distanță doar în popup-uri
    if (isPopup) {
        detailsHTML += distanceInfo;
    }

    return `
        <div class="event-body">
            <div class="event-details-layout">
                <div class="event-details-text">
                    <div class="event-header-content">
                        <h3>${event.title}</h3>
                    </div>
                    <div class="event-details">
                        ${detailsHTML}
                    </div>
                </div>
                <div class="event-details-media" data-event-id="${event.id}">
                    ${eventImage}
                </div>
            </div>
            <div class="event-description-container">
                <p class="event-description">${event.description}</p>
            </div>
            ${navigationButton}
        </div>
    `;
}

// Funcție pentru a crea conținutul popup-ului evenimentului
function createEventPopup(event) {
    return `
        <div class="event-popup">
            ${buildEventContent(event, true)}
        </div>
    `;
}

// Funcție pentru cardul din carusel
function createEventCard(event) {
    return `
        <article class="event-card" data-event-id="${event.id}">
            ${buildEventContent(event, false)}
        </article>
    `;
}

// Funcție pentru filtrarea evenimentelor după categorie
function filterEventsByCategory(events, category) {
    if (category === 'all' || !category) {
        return [...events]; // Returnăm o copie a listei de evenimente
    }

    // Obținem toate variantele posibile pentru categoria selectată
    const categoryVariants = CATEGORY_MAPPINGS[category.toLowerCase()] || [];

    return events.filter(event => {
        // Verificăm dacă categoria evenimentului se potrivește cu vreuna dintre variante
        return categoryVariants.some(variant =>
            event.category.toLowerCase().includes(variant.toLowerCase())
        );
    });
}
