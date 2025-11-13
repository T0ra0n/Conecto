// Variabile globale
let sunriseTime = 6; // Ora implicită de răsărit (6:00)
let sunsetTime = 20; // Ora implicită de apus (20:00)
let locationUpdateInterval;
let marker;
let circle;
let watchId;
let currentPosition = null;

// Lista orașelor principale din România cu coordonatele lor
const romanianCities = [
    { name: 'București', lat: 44.4268, lng: 26.1025 },
    { name: 'Cluj-Napoca', lat: 46.7712, lng: 23.6236 },
    { name: 'Timișoara', lat: 45.7489, lng: 21.2087 },
    { name: 'Iași', lat: 47.1585, lng: 27.6014 },
    { name: 'Constanța', lat: 44.181, lng: 28.6348 },
    { name: 'Craiova', lat: 44.3302, lng: 23.7949 },
    { name: 'Brașov', lat: 45.6576, lng: 25.6012 },
    { name: 'Galați', lat: 45.4353, lng: 28.007 },
    { name: 'Ploiești', lat: 44.9567, lng: 26.0125 },
    { name: 'Oradea', lat: 47.0722, lng: 21.9217 },
    { name: 'Brăila', lat: 45.2652, lng: 27.9595 },
    { name: 'Arad', lat: 46.1866, lng: 21.3123 },
    { name: 'Pitești', lat: 44.8565, lng: 24.8692 },
    { name: 'Sibiu', lat: 45.7936, lng: 24.1526 },
    { name: 'Bacău', lat: 46.5675, lng: 26.9142 },
    { name: 'Târgu Mureș', lat: 46.5391, lng: 24.5573 },
    { name: 'Baia Mare', lat: 47.6567, lng: 23.5845 },
    { name: 'Buzău', lat: 45.1371, lng: 26.8171 },
    { name: 'Botoșani', lat: 47.7407, lng: 26.6391 },
    { name: 'Satu Mare', lat: 47.8017, lng: 22.8573 }
];

// Variabile pentru gestionarea căutării
let searchInput, searchButton, searchResults;
let cityMarkers = [];

// Limitele maxime ale hărții (coordonatele extreme ale Pământului)
const southWest = L.latLng(-85, -180);
const northEast = L.latLng(85, 180);
const bounds = L.latLngBounds(southWest, northEast);

// Inițializare hartă cu opțiuni de performanță
const map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    preferCanvas: true,  // Folosește Canvas în loc de SVG pentru performanță sporită
    fadeAnimation: false,  // Dezactivează animația de fade la schimbarea straturilor
    zoomAnimation: true,  // Activează animația de zoom pentru o experiență mai fluidă
    markerZoomAnimation: true,  // Activează animația markerilor la zoom pentru o experiență mai bună
    worldCopyJump: true,  // Permite derularea continuă a hărții
    maxZoom: 20,  // Limita maximă de zoom
    minZoom: 3,  // Limita minimă de zoom
    zoomSnap: 0.5,  // Zoom-ul se face în pași de 0.5
    zoomDelta: 0.5,  // Viteză de zoom mai precisă
    wheelPxPerZoomLevel: 60,  // Sensibilitate la scroll
    maxNativeZoom: 15,  // Zoom maxim pentru straturile de bază
    updateWhenIdle: false,  // Actualizează și în timpul interacțiunii
    updateWhenZooming: true,  // Actualizează la fiecare modificare de zoom
    maxBounds: bounds,  // Limitează harta la zona cu imagini
    maxBoundsViscosity: 1.0,  // Forțează limitele hărții
    worldCopyJump: true  // Permite derularea orizontală infinită a hărții
}).setView([45.9432, 24.9668], 7);  // Centrat pe România

// Evenimentul de zoomend fără funcționalitate suplimentară
map.on('zoomend', function() {
    // Nivelul de zoom este gestionat automat de Leaflet
});

// Opțiuni comune pentru toate straturile de hartă
const baseTileOptions = {
    reuseTiles: true,      // Reutilizează tile-urile deja încărcate
    updateWhenIdle: false, // Actualizare mai frecventă
    updateWhenZooming: true, // Actualizează în timpul zoom-ului
    maxNativeZoom: 23,     // Zoom maxim pentru tile-uri
    detectRetina: false    // Dezactivează detectarea Retina pentru performanță
};

// Straturi de hartă cu optimizări de performanță
const lightMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    ...baseTileOptions,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 23,
    minZoom: 3
});

const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    ...baseTileOptions,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 23,
    minZoom: 3
});

// Hartă satelită optimizată
const satelliteMap = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    ...baseTileOptions,
    attribution: 'Imagery &copy; Google',
    maxZoom: 23,
    minZoom: 3,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

// Funcții pentru gestionarea temei
async function getSunTimes(lat, lon) {
    try {
        const response = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`);
        const data = await response.json();
        
        if (data.status === 'OK') {
            const sunrise = new Date(data.results.sunrise);
            const sunset = new Date(data.results.sunset);
            
            sunriseTime = sunrise.getHours() + (sunrise.getMinutes() / 60);
            sunsetTime = sunset.getHours() + (sunset.getMinutes() / 60);
            
            // Ora răsăritului și apusului este setată
            
            showMapWithTheme();
            scheduleNextUpdate();
        }
    } catch (error) {
        console.error('Eroare la obținerea orelor de răsărit/apus:', error);
        showMapWithTheme();
    }
}

function showMapWithTheme() {
    const now = new Date();
    const currentHour = now.getHours() + (now.getMinutes() / 60);
    const isNight = currentHour < sunriseTime || currentHour > sunsetTime;
    
    if (isNight) {
        darkMap.addTo(map);
        document.body.classList.add('dark-theme');
    } else {
        lightMap.addTo(map);
        document.body.classList.remove('dark-theme');
    }
}

function scheduleNextUpdate() {
    if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
    }
    
    const now = new Date();
    const nextSunrise = new Date(now);
    nextSunrise.setHours(Math.floor(sunriseTime), (sunriseTime % 1) * 60, 0, 0);
    if (nextSunrise <= now) {
        nextSunrise.setDate(nextSunrise.getDate() + 1);
    }
    
    const nextSunset = new Date(now);
    nextSunset.setHours(Math.floor(sunsetTime), (sunsetTime % 1) * 60, 0, 0);
    if (nextSunset <= now) {
        nextSunset.setDate(nextSunset.getDate() + 1);
    }
    
    const nextEvent = nextSunrise < nextSunset ? nextSunrise : nextSunset;
    const timeUntilNextEvent = nextEvent - now;
    
    setTimeout(() => {
        showMapWithTheme();
        scheduleNextUpdate();
    }, timeUntilNextEvent);
    
    locationUpdateInterval = setInterval(showMapWithTheme, 3600000);
}


// Funcție pentru schimbarea hărții
function toggleMapType() {
    const mapIcon = document.querySelector('.map-icon');
    const satelliteIcon = document.querySelector('.satellite-icon');
    const toggleButton = document.getElementById('mapToggle');
    
    if (map.hasLayer(lightMap) || map.hasLayer(darkMap)) {
        // Schimbă pe harta satelit
        if (map.hasLayer(lightMap)) lightMap.remove();
        if (map.hasLayer(darkMap)) darkMap.remove();
        satelliteMap.addTo(map);
        document.body.classList.add('satellite-theme');
        
        // Schimbă iconița și titlul
        mapIcon.style.display = 'none';
        satelliteIcon.style.display = 'block';
        toggleButton.setAttribute('title', 'Afișează harta standard');
    } else {
        // Revino la harta normală (cu tema corespunzătoare orei zilei)
        satelliteMap.remove();
        showMapWithTheme();
        document.body.classList.remove('satellite-theme');
        
        // Schimbă iconița și titlul înapoi
        mapIcon.style.display = 'block';
        satelliteIcon.style.display = 'none';
        toggleButton.setAttribute('title', 'Afișează harta satelit');
    }
}

// Funcții pentru gestionarea căutării
function initSearch() {
    searchInput = document.getElementById('citySearch');
    searchResults = document.getElementById('searchResults');

    // Funcție pentru afișarea rezultatelor căutării
    const performSearch = () => {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm) {
            showSearchResults(searchTerm);
        } else {
            // Dacă câmpul este gol, afișează toate orașele
            showAllCities();
        }
    };

    // La tastare în câmpul de căutare
    searchInput.addEventListener('input', performSearch);

    // La focus pe câmpul de căutare
    searchInput.addEventListener('focus', () => {
        // Afișăm toate orașele indiferent de conținutul câmpului
        showAllCities();
        searchResults.style.display = 'block';
    });

    // Ascunde rezultatele când se face click în afara căsuței de căutare
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && e.target !== searchInput) {
            hideSearchResults();
        }
    });
}

function toggleSearchResults() {
    // Dacă lista este deja vizibilă, o ascundem
    if (searchResults.classList.contains('visible')) {
        hideSearchResults();
        return;
    }
    
    // Altfel, o afișăm cu toate orașele
    showAllCities();
    
    // Ne asigurăm că input-ul primește focus
    if (searchInput) searchInput.focus();
}

function showSearchResults(searchTerm) {
    const filteredCities = romanianCities.filter(city => 
        city.name.toLowerCase().includes(searchTerm)
    );
    
    displaySearchResults(filteredCities);
    document.body.classList.add('search-active');
}

function showAllCities() {
    displaySearchResults(romanianCities);
    document.body.classList.add('search-active');
}

function displaySearchResults(cities) {
    searchResults.innerHTML = '';
    
    if (cities.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'city-item';
        noResults.textContent = 'Niciun rezultat găsit';
        searchResults.appendChild(noResults);
    } else {
        cities.forEach(city => {
            const cityElement = document.createElement('div');
            cityElement.className = 'city-item';
            cityElement.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <span>${city.name}</span>
            `;
            
            cityElement.addEventListener('click', () => {
                flyToCity(city);
                hideSearchResults();
                searchInput.value = city.name;
            });
            
            searchResults.appendChild(cityElement);
        });
    }
    
    searchResults.classList.add('visible');
}

function hideSearchResults() {
    searchResults.classList.remove('visible');
    document.body.classList.remove('search-active');
}


function flyToCity(city) {
    // Centrăm harta pe orașul selectat fără a modifica zoom-ul
    const currentZoom = map.getZoom();
    map.flyTo([city.lat, city.lng], currentZoom, {
        duration: 1, // Durată mai scurtă pentru animație rapidă
        easeLinearity: 0.25
    });

    // Ștergem markerii existenți
    clearCityMarkers();

    // Adăugăm un marker simplu pentru orașul selectat
    const cityMarker = L.marker([city.lat, city.lng], {
        icon: L.divIcon({
            html: '<div class="pulse-marker"></div>',
            iconSize: [20, 20],
            className: 'pulse-marker-container'
        }),
        // Dezactivăm zoom-ul la click pe marker
        interactive: false
    }).addTo(map);

    cityMarkers.push(cityMarker);

    // Afișăm evenimentele pentru orașul selectat folosind modulul de evenimente
    if (window.EventsFilterModule && typeof window.EventsFilterModule.showEventsForCity === 'function') {
        window.EventsFilterModule.showEventsForCity(city.name);
    }
}

function clearCityMarkers() {
    // Ștergem markerii orașelor
    cityMarkers.forEach(marker => map.removeLayer(marker));
    cityMarkers = [];
    
    // Ștergem markerii evenimentelor folosind modulul de evenimente
    if (window.EventsFilterModule && typeof window.EventsFilterModule.clearEventMarkers === 'function') {
        window.EventsFilterModule.clearEventMarkers();
    }
}

// Funcție pentru a găsi cel mai apropiat oraș de o anumită poziție
function findNearestCity(lat, lng) {
    let nearestCity = null;
    let minDistance = Infinity;
    
    romanianCities.forEach(city => {
        const distance = Math.sqrt(
            Math.pow(city.lat - lat, 2) + 
            Math.pow(city.lng - lng, 2)
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestCity = city;
        }
    });
    
    return nearestCity;
}



// Adăugăm eveniment pentru a ascunde lista de orașe când începem să glisăm harta
if (map) {
    map.on('dragstart', function() {
        const searchResults = document.querySelector('.search-results');
        if (searchResults && searchResults.classList.contains('visible')) {
            searchResults.classList.remove('visible');
            document.body.classList.remove('search-active');
        }
    });
}

// Inițializare
document.addEventListener('DOMContentLoaded', () => {
    // Inițializare căutare
    initSearch();
    
    
    // Adăugare eveniment pentru butonul de localizare
    document.getElementById('locateMe').addEventListener('click', centerOnLocation);
    
    // Funcție pentru afișarea unui oraș implicit
    function showDefaultCity() {
        const defaultCity = romanianCities.find(city => city.name === 'Cluj-Napoca');
        if (defaultCity) {
            map.setView([defaultCity.lat, defaultCity.lng], 12);
            if (window.EventsFilterModule && typeof window.EventsFilterModule.showEventsForCity === 'function') {
                window.EventsFilterModule.showEventsForCity(defaultCity.name);
            }
        }
    }
    
    // Inițializare hartă
    map.whenReady(showDefaultCity);
    
    // Adăugare eveniment pentru butonul de schimbare a hărții
    document.getElementById('mapToggle').addEventListener('click', toggleMapType);

    
// Funcții pentru localizare
function updateLocation(position) {
    const { latitude, longitude, accuracy } = position.coords;
    currentPosition = position;
    
    // Șterge markerul și cercul vechi dacă există
    if (marker) {
        map.removeLayer(marker);
    }
    if (circle) {
        map.removeLayer(circle);
    }
    
    // Adaugă marker la poziția curentă
    marker = L.marker([latitude, longitude]).addTo(map);
        
    // Adaugă un cerc de precizie
    circle = L.circle([latitude, longitude], {
        color: '#0078ff',
        fillColor: '#0078ff',
        fillOpacity: 0.2,
        radius: accuracy
    }).addTo(map);
    
    map.setView([latitude, longitude], 16);
}

function handleLocationError(error) {
    let message = "Eroare la obținerea locației: ";
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message += "Ai refuzat cererea de localizare.";
            break;
        case error.POSITION_UNAVAILABLE:
            message += "Informațiile despre locație nu sunt disponibile.";
            break;
        case error.TIMEOUT:
            message += "S-a depășit timpul de așteptare pentru obținerea locației.";
            break;
        case error.UNKNOWN_ERROR:
            message += "A apărut o eroare necunoscută.";
            break;
    }
}

function centerOnLocation() {
    // Închidem orice popup deschis
    map.closePopup();
    
    if (currentPosition) {
        const { latitude, longitude } = currentPosition.coords;
        map.setView([latitude, longitude], 16, {
            animate: true,
            duration: 1
        });
    } else if (navigator.geolocation) {
        console.log('Geolocation API este disponibil');
        const geoOptions = {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000,
            desiredAccuracy: 10
        };

        // Adăugăm un handler pentru erori
        const errorCallback = (error) => {
            let errorMessage = 'Eroare la obținerea locației: ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Utilizatorul a refuzat cererea de geolocație.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Informațiile despre locație nu sunt disponibile.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Cererea de geolocație a expirat.';
                    break;
                case error.UNKNOWN_ERROR:
                    errorMessage += 'A apărut o eroare necunoscută.';
                    break;
            }
            console.error(errorMessage, error);
            // Poți adăuga aici o notificare pentru utilizator
            alert(errorMessage);
        };

        console.log('Încercăm să obținem locația...');
        
        // Funcție pentru a gestiona succesul obținerii locației
        const success = (pos) => {
            console.log('Locație obținută cu succes:', pos);
            currentPosition = pos;
            map.flyTo([pos.coords.latitude, pos.coords.longitude], 14, {
                duration: 0.5,
                easeLinearity: 0.25,
            });
        };

        // Funcție pentru a gestiona erorile
        const error = (err) => {
            console.error('Eroare la obținerea locației:', err);
            let errorMessage = 'Nu s-a putut obține locația curentă. ';
            
            switch(err.code) {
                case err.PERMISSION_DENIED:
                    errorMessage += 'Ai refuzat cererea de acces la geolocație. Te rugăm să activezi permisiunile în setările browser-ului.';
                    break;
                case err.POSITION_UNAVAILABLE:
                    errorMessage += 'Informațiile despre locație nu sunt disponibile.';
                    break;
                case err.TIMEOUT:
                    errorMessage += 'Cererea a expirat. Verifică conexiunea la internet.';
                    break;
                default:
                    errorMessage += 'Eroare necunoscută.';
            }
            
            // Afișează un mesaj mai prietenos pe mobil
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                alert('Pentru a folosi funcționalitatea de localizare pe iOS, te rugăm să:\n\n' +
                    '1. Deschide Safari\n' +
                    '2. Apasă pe butonul de partajare (patrat cu săgeată în sus)\n' +
                    '3. Alege "Setări pentru acest site web"\n' +
                    '4. Activează "Locație"\n' +
                    '5. Reîncarcă pagina');
            } else {
                alert(errorMessage);
            }
        };

        // Încercăm să obținem locația cu opțiuni specifice
        try {
            navigator.geolocation.getCurrentPosition(success, error, {
                enableHighAccuracy: true,
                timeout: 10000,        // 10 secunde timeout
                maximumAge: 0,         // Forțează obținerea unei noi locații
                distanceFilter: 10      // 10 metri distanță minimă pentru update
            });
        } catch (e) {
            console.error('Eroare la apelul getCurrentPosition:', e);
            alert('A apărut o eroare la accesarea serviciului de geolocație.');
        }
    } else {
        alert('Geolocația nu este suportată de acest browser.');
    }
}

    // Funcție pentru obținerea locației combinate (GPS + IP)
    async function getCombinedLocation() {
        try {
            // Încercăm mai întâi cu geolocația precisă
            const geoOptions = {
                enableHighAccuracy: true,  // Folosește GPS-ul dacă este disponibil
                maximumAge: 0,            // Forțează obținerea unei poziții noi
                timeout: 10000             // Timeout de 10 secunde
            };

            // Obținem poziția curentă
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, geoOptions);
            });

            if (position) {
                const { latitude, longitude, accuracy } = position.coords;
                // Locația GPS a fost actualizată
                return { coords: { latitude, longitude, accuracy }, source: 'gps' };
            }
        } catch (gpsError) {
            console.warn('Eroare la obținerea locației GPS:', gpsError);
            
            // Dacă GPS-ul eșuează, încercăm cu IP-ul
            try {
                const ipLocation = await getLocationByIP();
                if (ipLocation) {
                        return { ...ipLocation, source: 'ip' };
                }
            } catch (ipError) {
                console.error('Eroare la obținerea locației prin IP:', ipError);
            }
        }

        // Dacă ambele metode eșuează, returnăm o eroare
        throw new Error('Nu s-a putut obține locația');
    }

    // Afișăm orașul implicit imediat
    showDefaultCity();
    
    // Adăugăm un strat pentru markerul de localizare
    const locationLayer = L.layerGroup().addTo(map);
    
    // Localizare în fundal
    (async () => {
        try {
            const location = await getCombinedLocation();
            if (!location) {
                return;
            }
            
            // Salvăm poziția curentă pentru a putea calcula distanța până la evenimente
            window.currentPosition = location;
            
            // Reafișăm evenimentele pentru a actualiza distanțele
            const currentNearestCity = findNearestCity(location.coords.latitude, location.coords.longitude);
            if (currentNearestCity && window.EventsFilterModule && window.EventsFilterModule.showEventsForCity) {
                const activeFilter = document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'today';
                window.EventsFilterModule.showEventsForCity(currentNearestCity.name, activeFilter);
            }
            
            // Adăugăm cercul de precizie
            if (location.coords.accuracy) {
                L.circle([location.coords.latitude, location.coords.longitude], {
                    radius: location.coords.accuracy,
                    color: '#136AEC',
                    fillColor: '#136AEC',
                    fillOpacity: 0.15,
                    weight: 1,
                    interactive: false
                }).addTo(locationLayer);
            }
            
            // Adăugăm markerul de localizare
            const locationMarker = L.marker([location.coords.latitude, location.coords.longitude], {
                icon: L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                    shadowSize: [41, 41]
                }),
                zIndexOffset: 1000
            });
            locationMarker.addTo(locationLayer);
            
            // Actualizăm orașul curent dacă este cazul
            const cityForDisplay = findNearestCity(location.coords.latitude, location.coords.longitude);
            if (cityForDisplay) {
                currentCity = cityForDisplay.name;
                const cityElement = document.getElementById('currentCity');
                if (cityElement) cityElement.textContent = currentCity;
            }
            
            getSunTimes(location.coords.latitude, location.coords.longitude);
            
        } catch (error) {
        }
    })();
    
    // Inițializare filtre evenimente
    document.addEventListener('dateFilterApplied', (e) => {
        const selectedDate = e.detail.date;
        const activeCity = document.getElementById('currentCity')?.textContent || 'Cluj-Napoca';
        
        if (window.EventsFilterModule && window.EventsFilterModule.showEventsForCity) {
            // Setăm un flag special pentru a indica că filtrăm după dată
            window.EventsFilterModule.setCurrentFilter('calendar', selectedDate);
            window.EventsFilterModule.showEventsForCity(activeCity, 'calendar', selectedDate);
        }
    });
});

// Funcție pentru formatarea datei în format YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// Funcție pentru a verifica dacă o dată este în weekend
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Duminică, 6 = Sâmbătă
}

// Adăugăm un listener pentru evenimentul de selectare a datei
document.addEventListener('dateSelected', (e) => {
    const selectedDate = e.detail.date;
    const activeCity = document.getElementById('currentCity')?.textContent || 'Cluj-Napoca';
    
    if (window.EventsModule && window.EventsModule.showEventsForCity) {
        window.EventsModule.setCurrentFilter('calendar', selectedDate);
        window.EventsModule.showEventsForCity(activeCity, 'calendar', selectedDate);
    }
});

// Funcție pentru a verifica dacă o dată se potrivește cu filtrul selectat
function matchesDateFilter(eventDate, filterType, selectedDate = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const dayOfWeek = today.getDay();
    const daysUntilWeekend = 6 - dayOfWeek; // Sâmbătă
    const weekendStart = new Date(today);
    weekendStart.setDate(weekendStart.getDate() + (dayOfWeek === 0 ? 0 : daysUntilWeekend));
    const weekendEnd = new Date(weekendStart);
    weekendEnd.setDate(weekendEnd.getDate() + 1); // Duminică

    switch(filterType) {
        case 'today':
            return eventDay.getTime() === today.getTime();
        case 'tomorrow':
            return eventDay.getTime() === tomorrow.getTime();
        case 'weekend':
            return eventDay >= weekendStart && eventDay <= weekendEnd;
        case 'next-week':
            return eventDay > tomorrow && eventDay <= nextWeek;
        case 'calendar':
            if (!selectedDate) return false;
            const selected = new Date(selectedDate);
            selected.setHours(0, 0, 0, 0);
            return eventDay.getTime() === selected.getTime();
        default:
            return true;
    }
}
