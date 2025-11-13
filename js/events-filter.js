// Funcție pentru a seta evenimentele (folosită pentru testare)
function setEvents(data) {
    events = data;
}

// Exportăm funcțiile necesare
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setEvents };
} else {
    window.eventManager = { setEvents };
}

// Variabile globale
let eventMarkers = [];
let currentSelectedDate = null; // Stochează data selectată din DateFilter

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

// Funcție pentru a formata data ca YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// Funcție pentru a obține data de început și sfârșit a săptămânii
function getWeekRange(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustare pentru luni ca primă zi a săptămânii

    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
        start: formatDate(monday),
        end: formatDate(sunday)
    };
}

// Funcție pentru a verifica dacă o dată se află într-un interval
function isDateInRange(date, startDate, endDate) {
    const d = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Setăm orele la 00:00:00 pentru comparare corectă
    d.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return d >= start && d <= end;
}


// Grup pentru markerii evenimentelor
let eventMarkersGroup = L.featureGroup();

// Funcție pentru afișarea evenimentelor pe hartă
function showEventsForCity(cityName, filter = 'today') {
    // Ștergem markerii existenți
    clearEventMarkers();

    // Resetăm grupul de markeri
    if (eventMarkersGroup) {
        map.removeLayer(eventMarkersGroup);
    }
    eventMarkersGroup = L.featureGroup().addTo(map);

    console.log('Afisare evenimente pentru:', cityName, 'cu filtrul:', filter);

    // Verificăm dacă avem evenimente pentru orașul respectiv
    const cityEvents = events[cityName];
    if (!cityEvents || cityEvents.length === 0) {
        console.log('Nu există evenimente pentru orașul:', cityName);
        return;
    }

    // Filtrăm evenimentele după perioadă
    const filteredEvents = filterEventsByPeriod(cityEvents, filter);
    console.log('Evenimente filtrate:', filteredEvents.length, 'din', cityEvents.length);

    if (filteredEvents.length === 0) {
        console.log('Nu s-au găsit evenimente pentru filtrul selectat:', filter);
        return;
    }

    // Adăugăm markeri pentru fiecare eveniment filtrat
    filteredEvents.forEach(event => {
        try {
            const eventIcon = L.divIcon({
                html: `<div class="event-marker" style="background-color: ${getCategoryColor(event.category)}">
                         <i class="${getCategoryIcon(event.category)}"></i>
                       </div>`,
                className: 'event-marker-container',
                iconSize: [32, 32]
            });

            const marker = L.marker([event.lat, event.lng], {
                icon: eventIcon,
                title: event.title
            });

            marker.bindPopup(createEventPopup(event));
            eventMarkersGroup.addLayer(marker);
            eventMarkers.push(marker);

            console.log('Adăugat marker pentru:', event.title, 'la', [event.lat, event.lng]);
        } catch (error) {
            console.error('Eroare la adăugarea markerului pentru evenimentul:', event, error);
        }
    });

    // Re-centrăm harta pentru a afișa toți markerii
    if (filteredEvents.length > 0) {
        map.fitBounds(eventMarkersGroup.getBounds().pad(0.1));
    }
}

// Funcție pentru a șterge markerii evenimentelor
function clearEventMarkers() {
    // Ștergem toți markerii din grup
    if (eventMarkersGroup) {
        eventMarkersGroup.eachLayer(function (layer) {
            eventMarkersGroup.removeLayer(layer);
        });
        eventMarkersGroup.clearLayers();

        // Ștergem grupul de pe hartă dacă există
        if (map.hasLayer(eventMarkersGroup)) {
            map.removeLayer(eventMarkersGroup);
        }
    }

    // Ștergem toți markerii individuali
    if (eventMarkers && eventMarkers.length > 0) {
        eventMarkers.forEach(marker => {
            if (marker && map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });
        eventMarkers = [];
    }
}


// Aceeași culoare pentru toate categoriile
function getCategoryColor(category) {
    return '#7c4dff';
}

// Funcție pentru a obține o iconiță în funcție de categorie
function getCategoryIcon(category) {
    const icons = {
        'muzica': 'fas fa-music',
        'film': 'fas fa-film',
        'jocuri': 'fas fa-gamepad',
        'social': 'fas fa-users',
        'sport': 'fas fa-futbol',
        'arta': 'fas fa-palette',
        'tehnic': 'fas fa-laptop-code',
        'educatie': 'fas fa-graduation-cap',
        'default': 'fas fa-star'
    };
    return icons[category.toLowerCase()] || icons.default;
}

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

// Funcție pentru a deschide navigația
function openNavigation(lat, lng) {
    // Verificăm dacă este un dispozitiv iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Verificăm dacă este un dispozitiv Android
    const isAndroid = /Android/i.test(navigator.userAgent);

    // Construim URL-ul pentru navigație
    let url;

    if (isIOS) {
        // Pentru iOS încercăm mai întâi cu Apple Maps
        if (navigator.standalone) {
            // Dacă aplicația este instalată pe ecranul de start
            url = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
        } else {
            // Altfel folosim Google Maps în Safari
            url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        }
    } else if (isAndroid) {
        // Pentru Android folosim intent-ul Google Maps
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        // Alternativ, pentru a deschide direct în aplicația Google Maps:
        // url = `google.navigation:q=${lat},${lng}`;
    } else {
        // Pentru desktop sau alte dispozitive
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    }

    // Deschidem URL-ul
    const newWindow = window.open(url, '_blank');

    // Dacă newWindow este null, înseamnă că a fost blocat de popup blocker
    if (!newWindow) {
        // Sugerăm utilizatorului să deschidă manual link-ul
        alert('Pentru navigație, te rugăm să deschizi acest link: ' + url);
    }
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

        // Adăugăm butonul de navigație
        navigationButton = `
            <button class="navigation-btn" 
                    onclick="event.stopPropagation(); openNavigation(${event.lat}, ${event.lng});">
                <i class="fas fa-directions"></i> Navighează
            </button>`;
    }

    return `
        <div class="event-popup">
            <div class="event-header" style="background-color: ${getCategoryColor(event.category)};">
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
// Funcție pentru a actualiza numărul de evenimente pentru o categorie
function updateCategoryCount(button) {
    const category = button.getAttribute('data-category');
    const cityName = document.getElementById('currentCity')?.textContent || 'Cluj-Napoca';
    let cityEvents = events[cityName] || [];
    
    // Facem o copie a evenimentelor pentru a nu modifica array-ul original
    let filteredEvents = [...cityEvents];
    
    // Aplicăm filtrul de dată dacă există o dată selectată
    if (currentSelectedDate) {
        filteredEvents = filterEventsByDate(filteredEvents, currentSelectedDate);
    } 
    // Altfel, aplicăm filtrul de timp activ (astăzi, mâine, weekend, etc.)
    else {
        const activeTimeFilter = document.querySelector('.events-filter .filter-btn.active')?.getAttribute('data-filter');
        if (activeTimeFilter) {
            filteredEvents = filterEventsByPeriod(filteredEvents, activeTimeFilter);
        }
    }
    
    // Aplicăm filtrul de categorie
    if (category !== 'all') {
        filteredEvents = filterEventsByCategory(filteredEvents, category);
    }
    
    // Găsește sau creează elementul pentru număr
    let countElement = button.querySelector('.event-count');
    if (!countElement) {
        // Dacă nu există un container pentru text, îl creăm
        let textContainer = button.querySelector('.category-text-container');
        if (!textContainer) {
            textContainer = document.createElement('div');
            textContainer.className = 'category-text-container';
            button.appendChild(textContainer);
        }
        
        countElement = document.createElement('span');
        countElement.className = 'event-count';
        textContainer.appendChild(countElement);
    }
    
    // Actualizează numărul de evenimente
    countElement.textContent = ` (${filteredEvents.length})`;
}

// Inițializare filtre categorie
function initCategoryFilters() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    let currentCategory = 'all';
    
    // Actualizăm structura HTML pentru fiecare buton de categorie
    categoryButtons.forEach(button => {
        const icon = button.querySelector('i');
        const text = button.textContent.trim();
        
        // Reconstruim structura butonului
        button.innerHTML = '';
        
        // Adăugăm iconița
        if (icon) {
            button.appendChild(icon);
        }
        
        // Adăugăm container pentru text și număr
        const textContainer = document.createElement('div');
        textContainer.className = 'category-text-container';
        
        // Adăugăm textul categoriei
        const textSpan = document.createElement('span');
        textSpan.className = 'category-text';
        textSpan.textContent = text.replace(/\(\d+\)/g, '').trim();
        
        // Adăugăm containerul pentru număr
        const countSpan = document.createElement('span');
        countSpan.className = 'event-count';
        
        // Asamblăm structura
        textContainer.appendChild(textSpan);
        textContainer.appendChild(countSpan);
        button.appendChild(textContainer);
        
        // Actualizăm numărul de evenimente
        updateCategoryCount(button);
    });

    categoryButtons.forEach(button => {
        // Setăm butonul 'Toate' ca implicit activ
        if (button.getAttribute('data-category') === 'all') {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }

        button.addEventListener('click', function () {
            if (isUpdating) return;

            const newCategory = this.getAttribute('data-category');

            // Dacă s-a apăsat pe aceeași categorie, reaplicăm filtrele
            if (currentCategory === newCategory) {
                const currentCity = map.getCenter();
                const nearestCity = findNearestCity(currentCity.lat, currentCity.lng);
                
                if (nearestCity) {
                    // Dacă avem o dată selectată, o folosim pentru filtrare
                    if (currentSelectedDate) {
                        // Creăm un eveniment de selectare a datei pentru a declanșa filtrarea corectă
                        const event = new CustomEvent('dateSelected', {
                            detail: { date: currentSelectedDate },
                            bubbles: true
                        });
                        document.dispatchEvent(event);
                    } else {
                        // Dacă nu avem dată selectată, aplicăm doar filtrul de categorie
                        if (newCategory === 'all') {
                            window.EventsModule.showEventsForCity(nearestCity.name);
                        } else {
                            applyCategoryFilter(nearestCity.name, newCategory);
                        }
                    }
                }
                return;
            }

            // Actualizăm categoria curentă
            currentCategory = newCategory;

            // Actualizăm starea butoanelor
            categoryButtons.forEach(btn => {
                btn.classList.remove('active');
                // Actualizăm numărul de evenimente pentru fiecare categorie
                updateCategoryCount(btn);
            });
            this.classList.add('active');

    
            // Aplicăm filtrul de categorie
            const currentCity = map.getCenter();
            const nearestCity = findNearestCity(currentCity.lat, currentCity.lng);

            if (nearestCity) {
                // Dacă avem o dată selectată, o folosim pentru filtrare
                if (currentSelectedDate) {
                    // Creăm un eveniment de selectare a datei pentru a declanșa filtrarea corectă
                    const event = new CustomEvent('dateSelected', {
                        detail: { date: currentSelectedDate },
                        bubbles: true
                    });
                    document.dispatchEvent(event);
                } else if (newCategory === 'all') {
                    // Dacă nu avem dată selectată și e selectat 'all', afișăm toate evenimentele
                    const activeTimeFilter = document.querySelector('.events-filter .filter-btn.active')?.getAttribute('data-filter') || 'today';
                    window.EventsModule.showEventsForCity(nearestCity.name, activeTimeFilter);
                } else {
                    window.EventsModule.applyCategoryFilter(nearestCity.name, newCategory);
                }
            }

            // Resetăm starea de actualizare după o scurtă întârziere
            setTimeout(() => {
                isUpdating = false;
            }, 100);
        });
    });
}

// Inițializare filtre timp 
function initEventFilters() {
    const filterButtons = document.querySelectorAll('.events-filter .filter-btn');

    filterButtons.forEach(button => {
        // Setăm butonul 'Astăzi' ca implicit activ
        if (button.getAttribute('data-filter') === 'today') {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }

        button.addEventListener('click', function () {
            if (isUpdating) return;

            const filterType = this.getAttribute('data-filter');

            // Actualizăm starea butoanelor
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            
            // Declanșăm evenimentul pentru actualizarea calendarului
            const timeFilterEvent = new CustomEvent('timeFilterChanged', {
                detail: { filterType }
            });
            document.dispatchEvent(timeFilterEvent);

            // Actualizăm afișajul evenimentelor
            const currentCity = map.getCenter();
            const nearestCity = findNearestCity(currentCity.lat, currentCity.lng);

            if (nearestCity) {
                // Verificăm dacă avem un filtru de categorie activ
                const activeCategoryBtn = document.querySelector('.categories-filter .category-btn.active');
                const activeCategory = activeCategoryBtn?.getAttribute('data-category');

                if (activeCategory && activeCategory !== 'all') {
                    // Dacă avem un filtru de categorie activ, aplicăm ambele filtre
                    // Mai întâi obținem evenimentele filtrate după timp
                    const cityEvents = events[nearestCity.name] || [];
                    let filteredEvents = filterEventsByPeriod(cityEvents, filterType);

                    // Apoi aplicăm filtrul de categorie
                    filteredEvents = filterEventsByCategory(filteredEvents, activeCategory);

                    // Actualizăm harta cu evenimentele filtrate
                    updateMapWithFilteredEvents(filteredEvents);
                } else {
                    // Altfel, aplicăm doar filtrul de timp
                    window.EventsModule.showEventsForCity(nearestCity.name, filterType);
                }
            }

            // Resetăm starea de actualizare după o scurtă întârziere
            setTimeout(() => {
                isUpdating = false;
            }, 100);
        });
    });

    return true;
}



// Funcție pentru a verifica dacă o dată este în weekend
function isWeekend(date) {
    const day = new Date(date).getDay();
    return day === 0 || day === 6; // 0 = Duminică, 6 = Sâmbătă
}

// Funcție pentru a obține următorul weekend
function getNextWeekend() {
    const today = new Date();
    const day = today.getDay();
    const daysUntilSaturday = 6 - day; // 6 = Sâmbătă

    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSaturday);

    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);

    return {
        start: formatDate(saturday),
        end: formatDate(sunday)
    };
}

// Funcție pentru a filtra evenimentele după perioadă
function filterEventsByPeriod(events, period) {
    if (!events || events.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeekStart = new Date(today);
    nextWeekStart.setDate(today.getDate() + 2); // Începând de peste 2 zile (după mâine)

    const nextWeekEnd = new Date(today);
    nextWeekEnd.setDate(today.getDate() + 30); // Următoarele 30 de zile

    const weekend = getNextWeekend();
    const todayStr = formatDate(today);
    const tomorrowStr = formatDate(tomorrow);

    return events.filter(event => {
        if (!event || !event.date) return false;

        const eventDate = new Date(event.date);
        const eventDateStr = formatDate(eventDate);

        switch (period) {
            case 'today':
                return eventDateStr === todayStr;

            case 'tomorrow':
                return eventDateStr === tomorrowStr;

            case 'weekend': {
                const isInWeekend = isDateInRange(eventDateStr, weekend.start, weekend.end);
                return isInWeekend;
            }

            case 'next-week': {
                const isInNextWeek = eventDate >= nextWeekStart && eventDate <= nextWeekEnd;
                const isInWeekend = isDateInRange(eventDateStr, weekend.start, weekend.end);
                const isTodayOrTomorrow = (eventDateStr === todayStr || eventDateStr === tomorrowStr);

                return isInNextWeek && !isInWeekend && !isTodayOrTomorrow;
            }

            default:
                return false;
        }
    });
}

// Variabilă pentru a urmări dacă o actualizare este în desfășurare
let isUpdating = false;

// Funcție pentru actualizarea hărții cu evenimente filtrate
function updateMapWithFilteredEvents(filteredEvents) {
    if (!map) {
        return;
    }


    // Obținem toți markerii existenți
    const existingMarkers = [];
    eventMarkersGroup.eachLayer(layer => {
        existingMarkers.push(layer);
    });

    // Ștergem toți markerii din grup
    eventMarkersGroup.clearLayers();
    
    // Actualizăm array-ul de markeri cu noii markeri
    eventMarkers = [];

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
                }).bindPopup(createEventPopup(event));
                
                // Adăugăm eveniment de click pentru a centra harta pe marker
                marker.on('click', function() {
                    map.flyTo([event.lat, event.lng], 15, {
                        duration: 0.5,
                        easeLinearity: 0.25,
                        animate: true
                    });
                    // Deschidem popup-ul după o scurtă întârziere pentru a asigura animația
                    setTimeout(() => marker.openPopup(), 300);
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
        
        // Deschidem popup-ul pentru primul marker dacă există
        if (eventMarkers.length === 1) {
            setTimeout(() => {
                eventMarkers[0].openPopup();
            }, 300);
        }
    }
}

// Funcție pentru aplicarea filtrului de categorie
function applyCategoryFilter(cityName, category) {
    if (isUpdating) {
            return;
    }
    isUpdating = true;
    
    // Obținem evenimentele pentru orașul selectat
    const cityEvents = events[cityName] || [];

    // Aplicăm filtrul de categorie (dacă nu e selectat 'toate')
    let filteredEvents = category === 'toate' 
        ? [...cityEvents] 
        : filterEventsByCategory(cityEvents, category);
    
    // Verificăm dacă avem o dată selectată (are prioritate maximă)
    if (currentSelectedDate) {
        filteredEvents = filterEventsByDate(filteredEvents, currentSelectedDate);
    } 
    // Dacă nu avem dată selectată, verificăm filtrele de timp
    else {
        const activeTimeFilterBtn = document.querySelector('.events-filter .filter-btn.active');
        
        // Dacă avem un filtru de timp activ, îl aplicăm
        if (activeTimeFilterBtn) {
            const activeTimeFilter = activeTimeFilterBtn.getAttribute('data-filter');
            if (activeTimeFilter) {
                filteredEvents = filterEventsByPeriod(filteredEvents, activeTimeFilter);
            }
        }
        // Dacă nu avem nici dată, nici filtru de timp activ, afișăm toate evenimentele
        else {
        }
    }

    // Actualizăm clasa activă pe butoanele de filtrare categorie
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });

    // Actualizăm vizibilitatea markerilor existenți
    const visibleEventIds = new Set(filteredEvents.map(e => e.id));

    // Ștergem markerii existenți
    clearEventMarkers();

    // Creăm un nou grup pentru markeri
    const markersGroup = L.featureGroup();

    // Adăugăm markerii pentru evenimentele filtrate
    filteredEvents.forEach(event => {
        try {
            const eventIcon = L.divIcon({
                html: `<div class="event-marker" style="background-color: ${getCategoryColor(event.category)}">
                         <i class="${getCategoryIcon(event.category)}"></i>
                       </div>`,
                className: 'event-marker-container',
                iconSize: [32, 32]
            });

            const marker = L.marker([event.lat, event.lng], {
                icon: eventIcon,
                title: event.title,
                riseOnHover: true,
                eventId: event.id
            }).bindPopup(createEventPopup(event));

            markersGroup.addLayer(marker);
            eventMarkers.push(marker);
        } catch (error) {
            console.error('Eroare la adăugarea markerului:', error);
        }
    });

    // Adăugăm grupul pe hartă
    markersGroup.addTo(map);

    // Centrăm harta pe markerii vizibili
    if (filteredEvents.length > 0) {
        map.fitBounds(markersGroup.getBounds().pad(0.1), {
            padding: [50, 50],
            maxZoom: MAP_SETTINGS.MAX_ZOOM,
            animate: true,
            duration: MAP_SETTINGS.FLY_TO_DURATION
        });
    }

    // Resetăm starea de actualizare
    isUpdating = false;
}

// Funcție pentru a actualiza numărul de evenimente pentru toate categoriile
function updateAllCategoryCounts() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(updateCategoryCount);
}

// Ascultător pentru evenimentul de selectare a datei
document.addEventListener('dateSelected', (e) => {
    currentSelectedDate = e.detail.date;
    // Actualizăm numărul de evenimente pentru toate categoriile
    updateAllCategoryCounts();
    
    // Reaplicăm filtrele curente pentru a actualiza afișarea
    const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'toate';
    const currentCity = document.querySelector('.city-selector')?.value || 'Cluj-Napoca';
    
    if (activeCategory && currentCity) {
        applyCategoryFilter(currentCity, activeCategory);
    }
});

// Inițializare module la încărcarea paginii
document.addEventListener('DOMContentLoaded', () => {
    // Inițializăm ambele tipuri de filtre
    if (typeof initEventFilters === 'function') {
        initEventFilters();
    }
    if (typeof initCategoryFilters === 'function') {
        initCategoryFilters();
    }
});


// Variabilă pentru a stoca filtrul curent
let currentFilter = {
    type: 'today',
    value: null
};

// Funcție pentru a seta filtrul curent
function setCurrentFilter(type, value = null) {
    currentFilter = { type, value };
}

// Funcție pentru a filtra evenimentele după dată specifică
function filterEventsByDate(events, dateString) {
    if (!dateString) return events;

    const selectedDate = new Date(dateString);
    selectedDate.setHours(0, 0, 0, 0);

    return events.filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === selectedDate.getTime();
    });
}

// Exportăm funcțiile necesare pentru a fi folosite în alte fișiere
window.EventsFilterModule = {
    // Actualizăm filtrul curent dacă este specificat
    setCurrentFilter: function (type, value = null) {
        currentFilter = { type, value };
        return this; // Returnăm this pentru a permite chaining
    },

    showEventsForCity: function (cityName, filter = 'today', filterValue = null) {
        // Actualizăm filtrul curent dacă este specificat
        if (filter) {
            currentFilter = { type: filter, value: filterValue };
        }
        clearEventMarkers();

        const cityEvents = events[cityName];
        if (!cityEvents || cityEvents.length === 0) return;

        // Facem o copie a evenimentelor pentru a nu modifica array-ul original
        let filteredEvents = [...cityEvents];
        
        // Aplicăm filtrul de dată dacă există o dată selectată
        if (currentSelectedDate) {
            filteredEvents = filterEventsByDate(filteredEvents, currentSelectedDate);
        } 
        // Altfel, aplicăm filtrul de timp activ (astăzi, mâine, weekend, etc.)
        else if (currentFilter?.type && currentFilter.type !== 'calendar') {
            filteredEvents = filterEventsByPeriod(filteredEvents, currentFilter.type);
        }
        
        // Dacă nu avem nici dată selectată, nici filtru de timp, afișăm toate evenimentele
        if (!currentSelectedDate && (!currentFilter?.type || currentFilter.type === 'all')) {
            filteredEvents = [...cityEvents];
        }

        // Aplicăm filtrul de categorie dacă există o categorie activă
        const activeCategory = document.querySelector('.category-btn.active')?.dataset.category;
        if (activeCategory) {
            filteredEvents = filterEventsByCategory(filteredEvents, activeCategory);
        }
        
        // Aplicăm filtrul de distanță dacă există
        const currentDistance = window.currentDistanceFilter;
        if (currentDistance) {
            filteredEvents = filteredEvents.filter(event => {
                const eventDistance = parseFloat(event.distance) || 0;
                return eventDistance <= currentDistance;
            });
        }

        if (!filteredEvents || filteredEvents.length === 0) {
            return;
        }

        const markersGroup = L.featureGroup();

        filteredEvents.forEach(event => {
            try {
                const eventIcon = L.divIcon({
                    html: `<div class="event-marker" style="background-color: ${getCategoryColor(event.category)}">
                             <i class="${getCategoryIcon(event.category)}"></i>
                           </div>`,
                    className: 'event-marker-container',
                    iconSize: [32, 32]
                });

                const marker = L.marker([event.lat, event.lng], {
                    icon: eventIcon,
                    title: event.title,
                    riseOnHover: true,
                    eventId: event.id // Adăugăm ID-ul evenimentului în opțiunile markerului
                }).bindPopup(createEventPopup(event));

                marker.on('click', function () {
                    const targetLatLng = L.latLng(event.lat, event.lng);
                    const targetPoint = map.project(targetLatLng);
                    const offsetPoint = L.point(
                        targetPoint.x, 
                        targetPoint.y + MAP_SETTINGS.FLY_TO_OFFSET_Y
                    );
                    const offsetLatLng = map.unproject(offsetPoint);

                    map.flyTo(offsetLatLng, MAP_SETTINGS.DEFAULT_ZOOM, {
                        duration: MAP_SETTINGS.FLY_TO_DURATION,
                        easeLinearity: 0.25,
                        animate: true
                    });

                    setTimeout(() => marker.openPopup(), 300);
                });

                markersGroup.addLayer(marker);
                eventMarkers.push(marker);
            } catch (error) {
                console.error('Eroare la adăugarea markerului pentru evenimentul:', event, error);
            }
        });

        markersGroup.addTo(map);

        if (filteredEvents.length > 0) {
            if (filteredEvents.length === 1) {
                // Pentru un singur eveniment, folosim un zoom fixat
                const event = filteredEvents[0];
                map.flyTo([event.lat, event.lng], 14, {
                    duration: 0.5,
                    easeLinearity: 0.25,
                    animate: true
                });
                
                // Deschidem popup-ul pentru primul marker
                setTimeout(() => {
                    const marker = eventMarkers[0];
                    if (marker) marker.openPopup();
                }, 300);
            } else {
                // Pentru mai multe evenimente, facem zoom pentru a le afișa pe toate
                map.fitBounds(markersGroup.getBounds(), { 
                    padding: [50, 50],
                    maxZoom: 15,
                    duration: 0.5,
                    easeLinearity: 0.25,
                    animate: true
                });
            }
        }
    },
    clearEventMarkers,
    initEventFilters,
    initCategoryFilters,
    applyCategoryFilter,
    setCurrentFilter
};



