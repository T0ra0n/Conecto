// === 1. Setup evenimente (date globale de evenimente) ===
function setEvents(data) {
    events = data;
}

// Exportăm funcțiile necesare
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setEvents };
} else {
    window.eventManager = { setEvents };
}

// === 2. Variabile globale și acces la filtrele de dată ===
let currentSelectedDate = null; // Stochează data selectată din DateFilter
let currentActiveEventId = null;
let carouselInteractionsAttached = false;
let carouselScrollListenerAttached = false;
let carouselScrollRaf = null;

const EventsViewModes = {
    HORIZONTAL: 'horizontal',
    MARKERS: 'markers'
};

const EventsViewModeConfig = {
    [EventsViewModes.HORIZONTAL]: {
        label: 'Carusel orizontal',
        icon: 'fa-th-large'
    },
    [EventsViewModes.MARKERS]: {
        label: 'Doar markeri',
        icon: 'fa-map-marker-alt'
    }
};
let currentEventsViewMode = EventsViewModes.HORIZONTAL;
let eventsViewSwitchInitialized = false;

// === Utilitare sincronizare hartă <-> carusel ===
function refreshMarkerReference() {
    if (typeof window !== 'undefined' && typeof eventMarkers !== 'undefined') {
        window.eventMarkers = eventMarkers;
    }
}

function syncCarouselViewState() {
    const carousel = document.getElementById('eventsCarousel');
    if (!carousel) {
        return;
    }
    carousel.setAttribute('data-view-mode', currentEventsViewMode);
}

function configureMarkerPopup(marker, popupContent = null) {
    if (!marker) {
        return;
    }

    if (popupContent) {
        marker._eventPopupContent = popupContent;
    }

    const hasPopup = typeof marker.getPopup === 'function' && !!marker.getPopup();

    // Popups sunt activate doar în modul MARKERS
    if (currentEventsViewMode === EventsViewModes.MARKERS) {
        if (!hasPopup && marker._eventPopupContent) {
            marker.bindPopup(marker._eventPopupContent);
        }
    } else if (hasPopup) {
        marker.closePopup();
        marker.unbindPopup();
    }
}

function refreshMarkersPopupState() {
    const markersCollection = (typeof eventMarkers !== 'undefined' && eventMarkers) || window.eventMarkers;
    if (!Array.isArray(markersCollection)) {
        return;
    }

    markersCollection.forEach(marker => {
        if (!marker) {
            return;
        }
        configureMarkerPopup(marker);
    });
}

function updateEventsViewToggleButton(view) {
    const toggleButton = document.getElementById('eventsViewToggle');
    if (!toggleButton) return;

    // Ascunde toate iconițele
    document.querySelectorAll('.view-toggle-icon').forEach(icon => {
        icon.style.display = 'none';
    });

    // Cu doar 2 moduri, următorul este celălalt
    const nextView = view === EventsViewModes.HORIZONTAL ? EventsViewModes.MARKERS : EventsViewModes.HORIZONTAL;
    
    // Afișează iconița pentru următoarea vizualizare
    const iconToShow = nextView === EventsViewModes.HORIZONTAL 
        ? document.querySelector('.view-toggle-icon.fa-grip-lines')
        : document.querySelector('.view-toggle-icon.fa-map-marker-alt');

    if (iconToShow) {
        iconToShow.style.display = 'inline-block';
    }

    // Actualizează titlul butonului
    const nextConfig = EventsViewModeConfig[nextView] || {};
    const currentConfig = EventsViewModeConfig[view] || {};
    
    toggleButton.setAttribute('title', `Schimbă în modul: ${nextConfig.label}`);
    toggleButton.setAttribute('aria-label', `Schimbă în modul: ${nextConfig.label} (acum: ${currentConfig.label})`);
}

function setEventsViewMode(view) {
    if (!Object.values(EventsViewModes).includes(view)) {
        view = EventsViewModes.HORIZONTAL;
    }

    currentEventsViewMode = view;

    if (document?.body) {
        document.body.setAttribute('data-events-view', view);
    }

    const carousel = document.querySelector('.events-carousel');
    
    switch(view) {
        case EventsViewModes.HORIZONTAL:
            if (carousel) {
                carousel.style.display = 'flex';
            }
            break;
            
        case EventsViewModes.MARKERS:
            if (carousel) {
                carousel.style.display = 'none';
            }
            break;
    }

    syncCarouselViewState();
    updateEventsViewToggleButton(view);
    refreshMarkersPopupState();
}

function initEventsViewSwitch() {
    if (eventsViewSwitchInitialized) {
        return;
    }

    const toggleButton = document.getElementById('eventsViewToggle');
    if (!toggleButton) {
        return;
    }

    toggleButton.addEventListener('click', () => {
        // Cu doar 2 moduri, simplificăm logica
        const nextView = currentEventsViewMode === EventsViewModes.HORIZONTAL ? EventsViewModes.MARKERS : EventsViewModes.HORIZONTAL;
        setEventsViewMode(nextView);
    });

    const defaultView = toggleButton.dataset.view || EventsViewModes.HORIZONTAL;
    setEventsViewMode(defaultView);

    eventsViewSwitchInitialized = true;
}

function setActiveEvent(eventId, { scrollCard = true, panMap = true } = {}) {
    if (!eventId) {
        return;
    }

    // Dacă evenimentul este deja activ, nu facem nimic pentru a evita repoziționarea inutilă
    if (eventId === currentActiveEventId) {
        return;
    }

    // Dezactivăm temporar handler-ul de scroll pentru a preveni activarea în lanț
    if (scrollCard) {
        disableCarouselScrollSync();
    }
    
    currentActiveEventId = eventId;
    highlightCarouselCard(eventId, scrollCard);
    highlightMapMarker(eventId, panMap);
    
    // Reactivăm handler-ul de scroll după o întârziere mai lungă pentru a lăsa scroll-ul să se termine
    if (scrollCard) {
        setTimeout(() => {
            enableCarouselScrollSync();
            // Resetăm flag-ul de debouncing după reactivare
            this.lastActivationTime = Date.now();
        }, 800);
    }
}

function highlightCarouselCard(eventId, scrollIntoView = true) {
    const cards = document.querySelectorAll('.event-card');
    let targetCard = null;

    cards.forEach(card => {
        const isActive = eventId && card.dataset.eventId === String(eventId);
        card.classList.toggle('active', isActive);
        if (isActive) {
            targetCard = card;
        }
    });

    if (scrollIntoView && targetCard) {
        const scrollOptions = {
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        };
        targetCard.scrollIntoView(scrollOptions);
    }
}

function flyToMarker(marker) {
    if (!marker || typeof map === 'undefined' || !map) {
        return;
    }

    const latLng = marker.getLatLng?.();
    if (!latLng) {
        return;
    }

    // Aplicăm offset în funcție de modul de vizualizare
    if (currentEventsViewMode === EventsViewModes.MARKERS) {
        const targetPoint = map.latLngToContainerPoint(latLng);
        targetPoint.y += 150; // Offset în jos pentru a face loc popup-ului
        const newLatLng = map.containerPointToLatLng(targetPoint);
        
        map.flyTo(newLatLng, Math.max(map.getZoom(), 14), {
            duration: 0.6,
            easeLinearity: 0.25
        });
    } else {
        // În modul HORIZONTAL, centrăm markerul mai sus
        const targetPoint = map.latLngToContainerPoint(latLng);
        targetPoint.y += 75; // Offset în sus pentru a face loc card-ului
        const newLatLng = map.containerPointToLatLng(targetPoint);
        
        map.flyTo(newLatLng, Math.max(map.getZoom(), 14), {
            duration: 0.6,
            easeLinearity: 0.25
        });
    }
}

function highlightMapMarker(eventId, panToMarker = false) {
    refreshMarkerReference();
    const markersCollection = (typeof eventMarkers !== 'undefined' && eventMarkers) || window.eventMarkers;
    if (!Array.isArray(markersCollection) || markersCollection.length === 0) {
        return;
    }

    // Eliminăm clasa 'marker-active' de la toți markerii mai întâi
    markersCollection.forEach(marker => {
        if (!marker) return;
        
        const iconElement = marker._icon;
        if (iconElement) {
            iconElement.classList.remove('marker-active');
            const customMarker = iconElement.querySelector('.custom-marker');
            if (customMarker) {
                customMarker.classList.remove('active', 'marker-bounce');
            }
        }
    });

    // Acum activăm doar markerul specificat
    const targetMarker = markersCollection.find(marker => {
        if (!marker) return false;
        const markerEventId = marker.eventId || marker.options?.eventId;
        return markerEventId === eventId;
    });

    if (targetMarker) {
        const iconElement = targetMarker._icon;
        if (iconElement) {
            iconElement.classList.add('marker-active');
            const customMarker = iconElement.querySelector('.custom-marker');
            if (customMarker) {
                customMarker.classList.add('active', 'marker-bounce');
            }
        }

        if (panToMarker) {
            flyToMarker(targetMarker);
        }
    }
}

function attachCarouselInteractions() {
    const carousel = document.getElementById('eventsCarousel');
    if (!carousel || carouselInteractionsAttached) {
        return;
    }

    carousel.addEventListener('click', (event) => {
        const card = event.target.closest('.event-card');
        if (!card) {
            return;
        }
        const eventId = card.dataset.eventId;
        if (!eventId) {
            return;
        }
        setActiveEvent(eventId, { scrollCard: true, panMap: true });
    });

    carouselInteractionsAttached = true;

    attachCarouselScrollSync(carousel);
}

function syncActiveEventState(eventList) {
    if (!eventList || eventList.length === 0) {
        currentActiveEventId = null;
        highlightCarouselCard(null, false);
        highlightMapMarker(null, false);
        return;
    }

    const hasCurrent = currentActiveEventId && eventList.some(evt => evt.id === currentActiveEventId);
    if (!hasCurrent) {
        if (eventList.length === 1) {
            currentActiveEventId = eventList[0].id;
        } else {
            currentActiveEventId = null;
            highlightCarouselCard(null, false);
            highlightMapMarker(null, false);
            return;
        }
    }

    // Actualizăm doar card-ul din carusel, nu și markerii
    requestAnimationFrame(() => highlightCarouselCard(currentActiveEventId, false));
}

function attachCarouselScrollSync(carousel) {
    if (carouselScrollListenerAttached || !carousel) {
        return;
    }

    const handleCarouselScroll = () => {
        if (carouselScrollRaf) {
            cancelAnimationFrame(carouselScrollRaf);
        }
        carouselScrollRaf = requestAnimationFrame(() => {
            carouselScrollRaf = null;
            syncActiveEventWithCenteredCard();
        });
    };

    carousel.addEventListener('scroll', handleCarouselScroll, { passive: true });
    carouselScrollListenerAttached = true;
    carouselScrollHandler = handleCarouselScroll; // Salvăm referința
}

function disableCarouselScrollSync() {
    const carousel = document.getElementById('eventsCarousel');
    if (carousel && carouselScrollHandler) {
        carousel.removeEventListener('scroll', carouselScrollHandler);
        carouselScrollListenerAttached = false;
    }
}

function enableCarouselScrollSync() {
    const carousel = document.getElementById('eventsCarousel');
    if (carousel && !carouselScrollListenerAttached && carouselScrollHandler) {
        carousel.addEventListener('scroll', carouselScrollHandler, { passive: true });
        carouselScrollListenerAttached = true;
    }
}

function getCenteredCarouselCard() {
    const carousel = document.getElementById('eventsCarousel');
    if (!carousel) {
        return null;
    }

    const cards = carousel.querySelectorAll('.event-card');
    if (!cards.length) {
        return null;
    }

    const carouselRect = carousel.getBoundingClientRect();
    const targetX = carouselRect.left + (carouselRect.width / 2);
    let closestCard = null;
    let minDistance = Infinity;

    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + (rect.width / 2);
        const distance = Math.abs(targetX - cardCenter);
        if (distance < minDistance) {
            minDistance = distance;
            closestCard = card;
        }
    });

    return closestCard;
}

function syncActiveEventWithCenteredCard() {
    const centeredCard = getCenteredCarouselCard();
    if (!centeredCard) {
        return;
    }

    const eventId = centeredCard.dataset.eventId;
    if (!eventId || eventId === currentActiveEventId) {
        return;
    }

    // Debouncing puternic - prevenim activarea multiplă și în lanț
    const now = Date.now();
    if (this.lastActivationTime && (now - this.lastActivationTime < 200)) {
        return;
    }

    // Verificăm dacă nu suntem deja în proces de activare
    if (this.isActivating) {
        return;
    }

    this.isActivating = true;
    this.lastActivationTime = now;

    // Folosim setTimeout pentru a preveni activarea în lanț
    setTimeout(() => {
        setActiveEvent(eventId, { scrollCard: false, panMap: true });
        this.isActivating = false;
    }, 50);
}

window.setActiveEvent = setActiveEvent;
window.eventMarkers = window.eventMarkers || [];

// === 3. UI pentru filtrele de categorie (butoane + badge număr evenimente) ===
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

    // Actualizează numărul de evenimente (fără paranteze)
    countElement.textContent = String(filteredEvents.length);
}

function initCategoryFilters() {
    // Verificăm dacă inițializarea a fost deja făcută
    if (window.categoryFiltersInitialized) {
        return;
    }

    const categoryButtons = document.querySelectorAll('.category-btn');
    let currentCategory = 'all';

    // Marcam că am făcut inițializarea
    window.categoryFiltersInitialized = true;

    // Verificăm dacă există deja un buton activ definit în HTML
    const existingActiveButton = document.querySelector('.category-btn.active');
    if (existingActiveButton) {
        currentCategory = existingActiveButton.getAttribute('data-category') || 'all';
    }

    categoryButtons.forEach(button => {
        // Verificăm dacă butonul are deja evenimente atașate
        const hasClickHandler = button.getAttribute('data-has-click-handler') === 'true';

        if (hasClickHandler) {
            return;
        }

        // Dacă NU există buton activ din HTML, setăm 'all' ca activ implicit
        if (!existingActiveButton && button.getAttribute('data-category') === 'all') {
            button.classList.add('active');
            currentCategory = 'all';
        }

        // Marcam butonul ca având handler de click
        button.setAttribute('data-has-click-handler', 'true');

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
                            if (window.EventsFilterModule && window.EventsFilterModule.showEventsForCity) {
                                window.EventsFilterModule.showEventsForCity(nearestCity.name);
                            }
                        } else {
                            if (window.EventsFilterModule && window.EventsFilterModule.applyCategoryFilter) {
                                window.EventsFilterModule.applyCategoryFilter(nearestCity.name, newCategory);
                            }
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
                    if (window.EventsFilterModule && window.EventsFilterModule.showEventsForCity) {
                        window.EventsFilterModule.showEventsForCity(nearestCity.name, activeTimeFilter);
                    }
                } else {
                    if (window.EventsFilterModule && window.EventsFilterModule.applyCategoryFilter) {
                        window.EventsFilterModule.applyCategoryFilter(nearestCity.name, newCategory);
                    }
                }
            }

            // Resetăm starea de actualizare după o scurtă întârziere
            setTimeout(() => {
                isUpdating = false;
            }, 100);
        });
    });
}


// === 4. Stare filtrare și aplicarea filtrului de categorie pe hartă ===
let isUpdating = false;

function applyCategoryFilter(cityName, category) {
    // Verificăm dacă o actualizare este deja în desfășurare
    if (isUpdating) {
        return;
    }

    // Verificăm dacă avem parametri valizi
    if (!cityName || !category) {
        return;
    }

    // Setăm flag-ul de actualizare
    isUpdating = true;

    // Marcam că am trecut prin inițializare
    isInitialized = true;

    // Salvăm ultimii parametri folosiți
    window.lastCategoryFilter = { cityName, category };

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
    // Nu mai aplicăm filtrare după perioadă, deci nu mai avem nevoie de această logică

    // Actualizăm clasa activă pe butoanele de filtrare categorie
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });

    // Ștergem markerii existenți
    clearEventMarkers();

    // Creăm un nou grup pentru markeri
    const markersGroup = L.featureGroup();
    // Adăugăm markeri pentru fiecare eveniment filtrat
    filteredEvents.forEach(event => {
        try {
            // Folosim markerul default din Leaflet
            const marker = L.marker([event.lat, event.lng], {
                title: event.title,
                alt: event.title,
                riseOnHover: true,
                eventId: event.id
            });

            const popupContent = typeof createEventPopup === 'function'
                ? createEventPopup(event)
                : `
                    <div class="event-popup">
                        <h3>${event.title}</h3>
                        <p>${event.description || ''}</p>
                        <p><i class="far fa-calendar-alt"></i> ${event.date} • ${event.time}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${event.location || 'Locație nespecificată'}</p>
                    </div>`;

            configureMarkerPopup(marker, popupContent);
            marker.eventId = event.id;
            marker.on('click', () => {
            // Verificăm dacă markerul este deja activ pentru a evita repoziționarea inutilă
            if (event.id === currentActiveEventId) {
                return; // Markerul este deja activ, nu facem nimic
            }
            
            setActiveEvent(event.id, { scrollCard: true, panMap: false });
            
            // În modul MARKERS, centrăm markerul mai jos pentru a face loc popup-ului
            if (currentEventsViewMode === EventsViewModes.MARKERS) {
                const targetLatLng = L.latLng(event.lat, event.lng);
                const targetPoint = map.latLngToContainerPoint(targetLatLng);
                targetPoint.y += 150; // Offset în jos pentru a face loc popup-ului
                const newLatLng = map.containerPointToLatLng(targetPoint);
                
                map.flyTo(newLatLng, Math.max(map.getZoom(), 14), {
                    duration: 0.6,
                    easeLinearity: 0.25
                });
            } else {
                // În modul HORIZONTAL, centrăm markerul mai sus
                const targetLatLng = L.latLng(event.lat, event.lng);
                const targetPoint = map.latLngToContainerPoint(targetLatLng);
                targetPoint.y += 75; // Offset în sus pentru a face loc card-ului
                const newLatLng = map.containerPointToLatLng(targetPoint);
                
                map.flyTo(newLatLng, Math.max(map.getZoom(), 14), {
                    duration: 0.6,
                    easeLinearity: 0.25
                });
            }

            if (currentEventsViewMode === EventsViewModes.MARKERS) {
                configureMarkerPopup(marker);
                marker.openPopup();
            }
        });

            markersGroup.addLayer(marker);
            eventMarkers.push(marker);
        } catch (error) {
        }
    });

    refreshMarkerReference();

    updateEventsCarousel(filteredEvents);

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

// === 5. Listeneri globali (dată selectată, inițializare la încărcarea paginii) ===
function updateAllCategoryCounts() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(updateCategoryCount);
}

function updateEventsCarousel(eventList = []) {
    const carousel = document.getElementById('eventsCarousel');
    if (!carousel) {
        return;
    }

    syncCarouselViewState();

    if (!eventList || eventList.length === 0) {
        carousel.innerHTML = `
            <div class="events-carousel-empty">
                <i class="far fa-calendar-times"></i>
                <span>Niciun eveniment pentru filtrele curente.</span>
            </div>
        `;
        return;
    }

    const cardsMarkup = eventList.map(createEventCard).join('');
    carousel.innerHTML = cardsMarkup;
    syncActiveEventState(eventList);
    attachCarouselInteractions();
}

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

document.addEventListener('DOMContentLoaded', () => {
    // Inițializăm ambele tipuri de filtre
    if (typeof initEventFilters === 'function') {
        initEventFilters();
    }
    if (typeof initCategoryFilters === 'function') {
        initCategoryFilters();
    }

    initEventsViewSwitch();
});


// === 6. API public (modulul EventsFilterModule folosit de map.js și restul aplicației) ===
let currentFilter = {
    type: 'today',
    value: null
};

function setCurrentFilter(type, value = null) {
    currentFilter = { type, value };
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
        // Afișăm toate evenimentele, fără filtrare suplimentară
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

        updateEventsCarousel(filteredEvents);

        if (!filteredEvents || filteredEvents.length === 0) {
            return;
        }

        const markersGroup = L.featureGroup();

        filteredEvents.forEach(event => {
            try {
                // Obținem iconița corespunzătoare categoriei
                const iconClass = getCategoryIcon(event.category);
                const categoryKey = event.category ? event.category.toLowerCase() : 'default';

                // Creăm un marker personalizat cu iconița categoriei
                const marker = L.marker([event.lat, event.lng], {
                    title: event.title,
                    alt: event.title,
                    riseOnHover: true,
                    eventId: event.id,
                    icon: L.divIcon({
                        html: `<div class="custom-marker" data-category="${categoryKey}"><i class="${iconClass}"></i></div>`,
                        className: 'custom-marker-container',
                        iconSize: [32, 32],
                        iconAnchor: [16, 32],
                        popupAnchor: [0, -32]
                    })
                });

                marker.eventId = event.id;
                const popupContent = typeof createEventPopup === 'function'
                    ? createEventPopup(event)
                    : `
                        <div class="event-popup">
                            <h3>${event.title}</h3>
                            <p>${event.description || ''}</p>
                            <p><i class="far fa-calendar-alt"></i> ${event.date} • ${event.time}</p>
                            <p><i class="fas fa-map-marker-alt"></i> ${event.location || 'Locație nespecificată'}</p>
                        </div>`;

                configureMarkerPopup(marker, popupContent);

                marker.on('click', function () {
                    // Verificăm dacă markerul este deja activ pentru a evita repoziționarea inutilă
                    if (event.id === currentActiveEventId) {
                        return; // Markerul este deja activ, nu facem nimic
                    }
                    
                    setActiveEvent(event.id, { scrollCard: true, panMap: false });
                    
                    // În modul MARKERS, centrăm markerul mai jos pentru a face loc popup-ului
                    if (currentEventsViewMode === EventsViewModes.MARKERS) {
                        const targetLatLng = L.latLng(event.lat, event.lng);
                        const targetPoint = map.latLngToContainerPoint(targetLatLng);
                        targetPoint.y += -150; // Offset în jos pentru a face loc popup-ului
                        const newLatLng = map.containerPointToLatLng(targetPoint);
                        
                        map.flyTo(newLatLng, Math.max(map.getZoom(), 14), {
                            duration: 0.5,
                            easeLinearity: 0.25
                        });
                        
                        // Deschidem popup-ul după ce animația se termină
                        setTimeout(() => {
                            configureMarkerPopup(marker);
                            marker.openPopup();
                        }, 600); // Puțin mai mult decât duration pentru a ne asigura că animația a terminat
                    } else {

                        
                        // În modul HORIZONTAL, centrăm markerul mai sus
                        const targetLatLng = L.latLng(event.lat, event.lng);
                        const targetPoint = map.latLngToContainerPoint(targetLatLng);
                        targetPoint.y += 75; // Offset în sus pentru a face loc card-ului
                        const newLatLng = map.containerPointToLatLng(targetPoint);
                        
                        map.flyTo(newLatLng, Math.max(map.getZoom(), 14), {
                            duration: 0.6,
                            easeLinearity: 0.25
                        });
                    }
                });

                markersGroup.addLayer(marker);
                eventMarkers.push(marker);
            } catch (error) {
            }
        });

        refreshMarkerReference();

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

                // Nu mai deschidem popup-uri automat
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

    clearEventMarkers: function () {
        clearEventMarkers();
    },

    applyCategoryFilter: function (cityName, category) {
        applyCategoryFilter(cityName, category);
    }
};



