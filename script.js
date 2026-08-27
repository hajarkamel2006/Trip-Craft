
const palColors = ['#0B192C', '#C5A880', '#2A9D8F', '#E76F51', '#457B9D', '#6D597A'];
Chart.defaults.font.family = '"Plus Jakarta Sans", sans-serif';
Chart.defaults.font.size = 11;
Chart.defaults.color = '#64748B';


function switchTab(tabId) {
    document.querySelectorAll('.tab-view').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const activeView = document.getElementById(`view-${tabId}`);
    const activeNav = document.getElementById(`nav-${tabId}`);

    if (activeView) activeView.classList.add('active');
    if (activeNav) activeNav.classList.add('active');

    if (tabId === 'map' && map) {
        setTimeout(() => map.invalidateSize(), 250);
    }
    if (tabId === 'compare') {
        renderComparisonCharts();
    }
}


let map;
const destinationsDB = [
    { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300" },
    { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, img: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=300" },
    { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964, img: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=300" },
    { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=300" },
    { name: "New York", country: "USA", lat: 40.7128, lng: -74.0060, img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300" },
    { name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357, img: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=300" },
    { name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278, img: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300" },
    { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, img: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=300" },
    { name: "Barcelona", country: "Spain", lat: 41.3879, lng: 2.1699, img: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=300" }
];

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([25.0, 15.0], 3);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    destinationsDB.forEach(dest => addCustomMarker(dest));
}

async function addCustomMarker(dest) {
    const marker = L.marker([dest.lat, dest.lng]).addTo(map);
    let tempDisplay = "Loading weather...";

    try {
        const targetUrl = `https://api.open-meteo.com/v1/forecast?latitude=${dest.lat}&longitude=${dest.lng}&current_weather=true`;
        const res = await fetch(targetUrl);
        const data = await res.json();
        if (data.current_weather) {
            tempDisplay = `${data.current_weather.temperature}°C, Wind ${data.current_weather.windspeed} km/h`;
        }
    } catch (e) {
        tempDisplay = "22°C, Pleasant";
    }

    const popupContent = `
        <div style="width: 240px; padding: 2px;">
            <img src="${dest.img}" class="rounded-3 mb-2 shadow-sm" style="width: 100%; height: 110px; object-fit: cover;" />
            <span class="badge-category text-gold-dark">${dest.country}</span>
            <h4 class="brand-font fs-6 fw-bold text-navy mb-1 mt-0">${dest.name}</h4>
            <p class="small text-muted mb-2"><i class="fa-solid fa-cloud-sun text-gold me-1"></i> ${tempDisplay}</p>
            <button onclick="switchTab('builder')" class="btn btn-navy btn-sm w-100 rounded-2 py-1 text-xs">Plan Trip Here</button>
        </div>
    `;
    marker.bindPopup(popupContent);
}

async function searchMapCity() {
    const query = document.getElementById('map-search-input').value.trim();
    if (!query) return;

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data && data.length > 0) {
            const { lat, lon, display_name } = data[0];
            map.flyTo([lat, lon], 12, { duration: 1.8 });

            addCustomMarker({
                name: display_name.split(',')[0],
                country: display_name.split(',').pop(),
                lat: parseFloat(lat),
                lng: parseFloat(lon),
                img: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300"
            });
        } else {
            alert("Destination not found. Please try another city.");
        }
    } catch (e) {
        alert("Error locating the destination.");
    }
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            map.flyTo([latitude, longitude], 12);
            L.circle([latitude, longitude], { color: '#C5A880', fillColor: '#C5A880', fillOpacity: 0.25, radius: 1000 })
                .addTo(map)
                .bindPopup("Your Current Location").openPopup();
        }, () => alert("Could not retrieve current location."));
    }
}

let itineraryState = JSON.parse(localStorage.getItem('tc_itinerary_en')) || [
    { id: 1, name: "Day 1 — Arrival & Highlights", items: [] },
    { id: 2, name: "Day 2 — Heritage & Culture", items: [] }
];

function saveState() {
    localStorage.setItem('tc_itinerary_en', JSON.stringify(itineraryState));
}

function renderItineraryDays() {
    const container = document.getElementById('itinerary-days-container');
    container.innerHTML = "";

    itineraryState.forEach((day, index) => {
        const col = document.createElement('div');
        col.className = "col-12 col-md-6";
        col.innerHTML = `
            <div class="glass-card p-4 h-100 d-flex flex-column border" style="min-height: 280px;">
                <div class="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-sand-200">
                    <h3 class="brand-font fs-6 fw-bold text-navy mb-0">${day.name}</h3>
                    <span class="badge bg-sand-100 text-muted border border-sand-200">${day.items.length} items</span>
                </div>
                <div class="day-drop-zone flex-grow-1 d-flex flex-column gap-2"
                     ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event, ${index})">
                    ${day.items.length === 0 ? `<div class="p-4 border border-2 border-dashed border-sand-200 rounded-3 text-center small text-muted my-auto">Drop activities here</div>` : ''}
                    ${day.items.map((item, itemIdx) => `
                        <div class="itinerary-item-card p-2.5 d-flex align-items-center gap-3 shadow-sm">
                            <img src="${item.img}" class="rounded-3 object-cover" style="width: 44px; height: 44px;" />
                            <div class="flex-grow-1 min-w-0">
                                <h4 class="text-xs fw-bold text-navy text-truncate mb-1">${item.title}</h4>
                                <input type="text" value="${item.time || '10:00 AM'}" onchange="updateItemTime(${index}, ${itemIdx}, this.value)" 
                                       class="form-control form-control-sm py-0 px-1 text-muted" style="font-size: 11px; width: 85px;" />
                            </div>
                            <button onclick="removeItineraryItem(${index}, ${itemIdx})" class="btn btn-link text-muted p-1 hover-danger"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

let currentDraggedItem = null;

function handleDragStart(e) {
    currentDraggedItem = {
        title: e.currentTarget.dataset.title,
        category: e.currentTarget.dataset.category,
        img: e.currentTarget.dataset.img,
        time: "10:00 AM"
    };
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e, dayIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (currentDraggedItem) {
        itineraryState[dayIndex].items.push({ ...currentDraggedItem });
        saveState();
        renderItineraryDays();
        currentDraggedItem = null;
    }
}

function updateItemTime(dayIdx, itemIdx, time) {
    itineraryState[dayIdx].items[itemIdx].time = time;
    saveState();
}

function removeItineraryItem(dayIdx, itemIdx) {
    itineraryState[dayIdx].items.splice(itemIdx, 1);
    saveState();
    renderItineraryDays();
}

function addNewDay() {
    itineraryState.push({ id: Date.now(), name: `Day ${itineraryState.length + 1} — Leisure & Discovery`, items: [] });
    saveState();
    renderItineraryDays();
}

function resetItinerary() {
    if (confirm("Are you sure you want to reset your itinerary?")) {
        itineraryState = [
            { id: 1, name: "Day 1 — Arrival & Highlights", items: [] },
            { id: 2, name: "Day 2 — Heritage & Culture", items: [] }
        ];
        saveState();
        renderItineraryDays();
    }
}


let hotelRate = 400;
let transRate = 80;
let budgetChartInstance;
let conversionRates = { USD: 1, EGP: 48.5, EUR: 0.92, GBP: 0.79, AED: 3.67, JPY: 154.0 };

async function fetchRates() {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const data = await res.json();
        if (data && data.rates) {
            conversionRates.EGP = data.rates.EGP || 48.5;
            conversionRates.EUR = data.rates.EUR || 0.92;
            conversionRates.GBP = data.rates.GBP || 0.79;
            conversionRates.AED = data.rates.AED || 3.67;
            conversionRates.JPY = data.rates.JPY || 154.0;
        }
    } catch (e) {
        console.warn("Using fallback conversion rates.");
    }
}

function selectHotelTier(rate, btn) {
    hotelRate = rate;
    document.querySelectorAll('#view-budget .row:first-of-type .tier-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateBudgetCalculations();
}

function selectTransTier(rate, btn) {
    transRate = rate;
    document.querySelectorAll('#view-budget .d-flex .tier-btn').forEach(b => {
        if (b.innerText.includes('Standard') || b.innerText.includes('Private Car') || b.innerText.includes('Chauffeur')) {
            b.classList.remove('active');
        }
    });
    btn.classList.add('active');
    updateBudgetCalculations();
}

function updateBudgetCalculations() {
    const travelers = parseInt(document.getElementById('budget-travelers').value) || 1;
    const days = parseInt(document.getElementById('budget-days').value) || 1;
    const foodPerson = parseInt(document.getElementById('budget-food').value) || 180;
    const currency = document.getElementById('budget-currency').value;
    const exRate = conversionRates[currency] || 1;

    document.getElementById('budget-food-val').innerText = `$${foodPerson}`;

    const stayUSD = hotelRate * days * Math.ceil(travelers / 2);
    const foodUSD = foodPerson * days * travelers;
    const transUSD = transRate * days * travelers;
    const actUSD = 100 * days * travelers;

    const totalUSD = stayUSD + foodUSD + transUSD + actUSD;
    const splitUSD = totalUSD / travelers;

    const symbols = { USD: '$', EUR: '€', GBP: '£', EGP: 'E£', AED: 'AED ', JPY: '¥' };
    const sym = symbols[currency] || '$';

    document.getElementById('budget-total-cost').innerText = `${sym}${(totalUSD * exRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('budget-split-cost').innerText = `${sym}${(splitUSD * exRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    document.getElementById('summary-hotel').innerText = `${sym}${(stayUSD * exRate).toFixed(0)}`;
    document.getElementById('summary-food').innerText = `${sym}${(foodUSD * exRate).toFixed(0)}`;
    document.getElementById('summary-trans').innerText = `${sym}${(transUSD * exRate).toFixed(0)}`;
    document.getElementById('summary-act').innerText = `${sym}${(actUSD * exRate).toFixed(0)}`;

    updateChart([stayUSD * exRate, foodUSD * exRate, transUSD * exRate, actUSD * exRate]);
}

function initChart() {
    const ctx = document.getElementById('budgetBreakdownChart').getContext('2d');
    budgetChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Accommodation', 'Gastronomy & Dining', 'Transit & Chauffeur', 'Experiences & Tours'],
            datasets: [{
                data: [1200, 720, 320, 610],
                backgroundColor: palColors.slice(0, 4),
                borderWidth: 0,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } }
            },
            cutout: '72%'
        }
    });
}

function updateChart(data) {
    if (budgetChartInstance) {
        budgetChartInstance.data.datasets[0].data = data;
        budgetChartInstance.update();
    }
}


const comparisonDB = {
    "Paris": { temp: [6, 7, 12, 16, 20, 23, 26, 25, 21, 16, 10, 7], cost: [90, 80, 75], radar: [88, 95, 90, 80, 85] },
    "Rome": { temp: [12, 13, 16, 19, 24, 28, 31, 31, 27, 22, 17, 13], cost: [75, 70, 85], radar: [82, 88, 95, 75, 90] },
    "Tokyo": { temp: [5, 6, 9, 14, 19, 22, 26, 27, 23, 18, 12, 7], cost: [85, 65, 80], radar: [99, 92, 95, 98, 88] },
    "Dubai": { temp: [20, 21, 24, 28, 33, 36, 38, 38, 36, 31, 26, 22], cost: [88, 85, 90], radar: [96, 78, 65, 99, 98] },
    "London": { temp: [5, 6, 9, 12, 16, 19, 22, 21, 18, 14, 9, 6], cost: [95, 92, 88], radar: [90, 98, 92, 86, 94] },
    "Cairo": { temp: [14, 15, 18, 22, 26, 29, 30, 30, 28, 25, 20, 16], cost: [45, 35, 50], radar: [76, 96, 68, 70, 78] },
    "Barcelona": { temp: [10, 11, 13, 16, 19, 23, 26, 26, 23, 19, 14, 11], cost: [72, 68, 80], radar: [89, 94, 98, 88, 92] }
};

let activeCities = ["Paris", "Tokyo", "Rome"];
let chartTemp, chartCost, chartRadar;

function renderComparisonPills() {
    const container = document.getElementById('compare-cities-pills');
    container.innerHTML = "";

    Object.keys(comparisonDB).forEach(city => {
        const isActive = activeCities.includes(city);
        const pill = document.createElement('button');
        pill.className = `btn btn-sm rounded-pill border py-1 px-3 ${isActive ? 'bg-navy text-white fw-bold shadow-sm' : 'bg-white text-muted border-sand-200'}`;
        pill.innerHTML = `${city} ${isActive ? '<i class="fa-solid fa-check ms-1.5 text-gold"></i>' : ''}`;
        pill.onclick = () => toggleCompareCity(city);
        container.appendChild(pill);
    });
}

function toggleCompareCity(city) {
    if (activeCities.includes(city)) {
        if (activeCities.length > 2) {
            activeCities = activeCities.filter(c => c !== city);
        } else {
            alert("Please select at least 2 cities for comparison.");
        }
    } else {
        if (activeCities.length < 4) {
            activeCities.push(city);
        } else {
            alert("You can select up to 4 cities at a time.");
        }
    }
    renderComparisonPills();
    renderComparisonCharts();
}

function addWildcardCity() {
    const available = Object.keys(comparisonDB).filter(c => !activeCities.includes(c));
    if (available.length > 0) {
        const randomCity = available[Math.floor(Math.random() * available.length)];
        if (activeCities.length >= 4) activeCities.pop();
        activeCities.push(randomCity);
        renderComparisonPills();
        renderComparisonCharts();
    }
}

function renderComparisonCharts() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


    if (chartTemp) chartTemp.destroy();
    const ctxTemp = document.getElementById('chart-temp').getContext('2d');
    chartTemp = new Chart(ctxTemp, {
        type: 'line',
        data: {
            labels: months,
            datasets: activeCities.map((city, idx) => ({
                label: city,
                data: comparisonDB[city].temp,
                borderColor: palColors[idx % palColors.length],
                backgroundColor: 'transparent',
                tension: 0.35,
                borderWidth: 2.5
            }))
        },
        options: { responsive: true, maintainAspectRatio: false }
    });


    if (chartCost) chartCost.destroy();
    const ctxCost = document.getElementById('chart-cost').getContext('2d');
    chartCost = new Chart(ctxCost, {
        type: 'bar',
        data: {
            labels: ['Groceries & Retail', 'Luxury Rental', 'Fine Dining'],
            datasets: activeCities.map((city, idx) => ({
                label: city,
                data: comparisonDB[city].cost,
                backgroundColor: palColors[idx % palColors.length],
                borderRadius: 6
            }))
        },
        options: { responsive: true, maintainAspectRatio: false }
    });


    if (chartRadar) chartRadar.destroy();
    const ctxRadar = document.getElementById('chart-radar').getContext('2d');
    chartRadar = new Chart(ctxRadar, {
        type: 'radar',
        data: {
            labels: ['Safety & Security', 'Arts & Culture', 'Walkability', 'Healthcare & Cleanliness', 'Nightlife & Dining'],
            datasets: activeCities.map((city, idx) => ({
                label: city,
                data: comparisonDB[city].radar,
                borderColor: palColors[idx % palColors.length],
                backgroundColor: `${palColors[idx % palColors.length]}1A`,
                borderWidth: 2
            }))
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}


window.onload = () => {
    initMap();
    renderItineraryDays();
    initChart();
    fetchRates().then(() => updateBudgetCalculations());
    renderComparisonPills();
    renderComparisonCharts();
};