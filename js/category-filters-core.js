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

// Funcție pentru a crea conținutul popup-ului evenimentului
function createEventPopup(event) {
    // Calculăm distanța până la eveniment dacă avem locația curentă
    let distanceInfo = '';
    let navigationButton = '';

    if (window.currentPosition) {
        const distance = calculateDistance(
            window.currentPosition.coords.latitude,
            window.currentPosition.coords.longitude,
            event.lat,
            event.lng
        );
        distanceInfo = `<p><i class="fas fa-route"></i> La ${distance.toFixed(1)} km de tine</p>`;
    }

    return `
        <div class="event-popup">
            <div class="event-header">
                <h3>${event.title}</h3>
                <div class="event-category">${event.category}</div>
            </div>
            <div class="event-body">
                <div class="event-details">
                    <p><i class="far fa-calendar-alt"></i> ${event.date} • ${event.time}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                    <p><i class="fas fa-tag"></i> ${event.price}</p>
                    ${distanceInfo}
                </div>
                <p class="event-description">${event.description}</p>
                <div class="event-address">
                    <i class="fas fa-info-circle"></i> ${event.address}
                </div>
                ${navigationButton}
                </div>
            </div>
        </div>
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
