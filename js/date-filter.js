class DateFilter {
    constructor() {
        this.container = document.querySelector('.date-filter-container');
        this.daysToShow = 30; // Numărul de zile de afișat
        this.currentDate = new Date();
        this.init();
    }
    
    init() {
        this.generateDateButtons();
        this.setupEventListeners();
        // Selectează data curentă implicit
        this.selectDate(new Date());
    }

    generateDateButtons() {
        this.container.innerHTML = ''; // Ștergem conținutul existent
        
        // Folosim data curentă locală
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Resetăm ora la începutul zilei
        
        for (let i = 0; i < this.daysToShow; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            const dateElement = document.createElement('button');
            dateElement.className = 'date-btn';
            dateElement.dataset.date = formatDate(date);
            
            // Adăugăm clasa 'weekend' pentru sâmbătă și duminică
            if (date.getDay() === 0 || date.getDay() === 6) {
                dateElement.classList.add('weekend');
            }
            
            // Formatare afișare: Luni, 13 Noi
            const dayName = date.toLocaleDateString('ro-RO', { weekday: 'short' });
            const dayNumber = date.getDate();
            const monthName = date.toLocaleDateString('ro-RO', { month: 'short' });
            
            dateElement.innerHTML = `
                <span class="day-name">${dayName}</span>
                <span class="day-number">${dayNumber}</span>
                <span class="month">${monthName}</span>
            `;
            
            this.container.appendChild(dateElement);
        }
    }

    // Folosim funcția globală formatDate definită mai jos

    selectDate(selectedDate) {
        // Asigurăm că data este corectă prin resetarea orelor
        const normalizedDate = new Date(selectedDate);
        normalizedDate.setHours(0, 0, 0, 0);
        
        // Eliminăm clasa 'active' de pe toate butoanele
        document.querySelectorAll('.date-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Găsim și selectăm butonul corespunzător datei
        const dateStr = formatDate(normalizedDate);
        const selectedBtn = document.querySelector(`.date-btn[data-date="${dateStr}"]`);
        
        if (selectedBtn) {
            selectedBtn.classList.add('active');
            // Facem scroll pentru a aduce butonul în vizibil dacă este cazul
            selectedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            
            // Declanșăm evenimentul de filtrare
            this.dispatchDateSelectedEvent(selectedDate);
        }
    }

    dispatchDateSelectedEvent(date) {
        const event = new CustomEvent('dateSelected', {
            detail: {
                date: formatDate(date)
            }
        });
        document.dispatchEvent(event);
    }

    setupEventListeners() {
        this.container.addEventListener('click', (e) => {
            const dateBtn = e.target.closest('.date-btn');
            if (dateBtn) {
                const dateStr = dateBtn.dataset.date;
                const [year, month, day] = dateStr.split('-').map(Number);
                const selectedDate = new Date(year, month - 1, day);
                this.selectDate(selectedDate);
            }
        });
    }
}

// Funcție pentru formatarea datei ca YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

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

function isDateInRange(date, startDate, endDate) {
    const d = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Setăm orele la 00:00:00 pentru comparare corectă
    d.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999); // Până la sfârșitul zilei

    return d >= start && d <= end;
}

function isWeekend(date) {
    const day = new Date(date).getDay();
    return day === 0 || day === 6; // 0 = Duminică, 6 = Sâmbătă
}

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


// Exportăm funcțiile necesare
const DateFilterModule = {
    DateFilter,
    formatDate,
    getWeekRange,
    isDateInRange,
    isWeekend,
    getNextWeekend,
    filterEventsByDate
};

// Inițializare când DOM-ul este încărcat
document.addEventListener('DOMContentLoaded', () => {
    window.dateFilter = new DateFilter();
});

// Export pentru Node.js sau module ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DateFilterModule;
} else {
    window.DateFilterModule = DateFilterModule;
}