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
            dateElement.dataset.date = this.formatDate(date);
            
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

    formatDate(date) {
        // Folosim metoda de formatare care ia în considerare fusul orar local
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    selectDate(selectedDate) {
        // Asigurăm că data este corectă prin resetarea orelor
        const normalizedDate = new Date(selectedDate);
        normalizedDate.setHours(0, 0, 0, 0);
        
        // Eliminăm clasa 'active' de pe toate butoanele
        document.querySelectorAll('.date-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Găsim și selectăm butonul corespunzător datei
        const dateStr = this.formatDate(normalizedDate);
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
                date: this.formatDate(date)
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

// Inițializare când DOM-ul este încărcat
document.addEventListener('DOMContentLoaded', () => {
    window.dateFilter = new DateFilter();
});
