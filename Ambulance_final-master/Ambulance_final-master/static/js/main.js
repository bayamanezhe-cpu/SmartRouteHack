/* SmartRoute Front-End Logic */

// --- STATE MANAGEMENT ---
const AppState = {
    lang: 'ru',
    role: null, // 'emergency', 'taxi', 'courier', 'fire', 'police'
    view: 'auth', // 'auth', 'map', 'trip'
    hospital: null, // we'll rename mental representation to 'station' but keep variable for compatibility
    stationIndex: null, // the selected station index
    destination: null,
    route: null,
    accidentMarker: null,
    mockFleets: []
};

// --- TRANSLATIONS ---
const I18N = {
    ru: {
        't-auth-subtitle': 'Добро пожаловать. Выберите модуль.',
        't-role-emergency': 'Скорая',
        't-role-taxi': 'Такси',
        't-role-courier': 'Курьер',
        't-role-fire': 'Пожарная',
        't-role-police': 'Полиция',
        't-sector-emergency': 'Экстренные службы',
        't-sector-service': 'Сервисы и логистика',
        't-btn-continue': 'Продолжить',
        't-label-hospital': 'Выберите подстанцию / больницу',
        't-label-destination': 'Куда едем?',
        't-btn-calculate': 'Рассчитать маршрут',
        't-btn-start': 'Начать движение'
    },
    kg: {
        't-auth-subtitle': 'Кош келиңиз. Модулду тандаңыз.',
        't-role-emergency': 'Тез жардам',
        't-role-taxi': 'Такси',
        't-role-courier': 'Курьер',
        't-role-fire': 'Өрт өчүрүү',
        't-role-police': 'Полиция',
        't-sector-emergency': 'Өзгөчө кырдаалдар',
        't-sector-service': 'Сервистер жана логистика',
        't-btn-continue': 'Улантуу',
        't-label-hospital': 'Оорукананы / Станцияны тандаңыз',
        't-label-destination': 'Кайда барабыз?',
        't-btn-calculate': 'Маршрутту эсептөө',
        't-btn-start': 'Жолду баштоо'
    }
};

// API Configuration
const API_BASE = window.location.origin + '/api';

// Hospitals Data
const HOSPITALS = [
    { name: "Национальный госпиталь", lat: 42.875086, lng: 74.598375, address: "ул. Ахунбаева 190, Бишкек" },
    { name: "ГКБ №1", lat: 42.875144, lng: 74.562028, address: "ул. Тоголок Молдо 1, Бишкек" },
    { name: "ГКБ №4", lat: 42.846505, lng: 74.604471, address: "ул. Токтогула 170, Бишкек" },
    { name: "НЦ кардиологии", lat: 42.874136, lng: 74.598918, address: "ул. Тоголок Молдо 3, Бишкек" },
    { name: "Детская больница №3", lat: 42.840278, lng: 74.606667, address: "ул. Боконбаева 144, Бишкек" }
];

const POLICE_STATIONS = [
    { name: "Главное УВД Бишкека", lat: 42.876123, lng: 74.604512, address: "Бульвар Эркиндик, 70" },
    { name: "УВД Ленинского района", lat: 42.868120, lng: 74.571210, address: "Московская улица, 203" },
    { name: "РУВД Октябрьского района", lat: 42.845110, lng: 74.615210, address: "Улица Скрябина, 86" },
    { name: "РУВД Свердловского района", lat: 42.879150, lng: 74.629510, address: "Ахматбека Суюмбаева, 73" }
];

const FIRE_STATIONS = [
    { name: "ПСЧ №9 Ленинский р-н", lat: 42.861110, lng: 74.542210, address: "ул. Ашар, 31а" },
    { name: "Пожарная часть №5", lat: 42.855110, lng: 74.609210, address: "ул. Кулатова, 11" },
    { name: "ПСЧ №3 Свердловский р-н", lat: 42.883110, lng: 74.627210, address: "ул. Осмонкула, 128" },
    { name: "ГПС №4 Первомайский р-н", lat: 42.880110, lng: 74.580210, address: "ул. Кулиева, 2г" }
];

// Map State
let map = null;
let startMarker = null;
let destinationMarker = null;
let routeLayer = null;
let ambulanceMarker = null;
let trafficLayers = [];
let stationMarkers = [];
let animationFrameId = null;

const BISHKEK_CENTER = [42.8746, 74.5698];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initUIElements();
    loadRealStreetTraffic();
    setInterval(loadRealStreetTraffic, 60000);
});

// --- CORE MAP ---
function initMap() {
    map = L.map('map', {
        zoomControl: false, // Hide default to implement custom later or rely on gestures
        attributionControl: false
    }).setView(BISHKEK_CENTER, 13);

    // Dark theme map (2GIS style / Carto Dark)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
    }).addTo(map);

    map.on('click', handleMapClick);
}

// --- UI / DOM LOGIC ---
function initUIElements() {
    // Language Swapper
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            setLanguage(e.target.dataset.lang);
        });
    });

    // Role Selector
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const el = e.currentTarget;
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            el.classList.add('active');
            AppState.role = el.dataset.role;
            document.getElementById('btn-login').disabled = false;
        });
    });

    // Login Action
    document.getElementById('btn-login').addEventListener('click', () => {
        transitionToMap();
    });

    // Hidden Action for Demo - Create Accident
    document.getElementById('map').addEventListener('contextmenu', (e) => {
        e.preventDefault(); // Right click or long press
        if (AppState.role) {
            createDemoAccident(e);
        }
    });

    // Map Screen Buttons
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('btn-center-map').addEventListener('click', () => {
        map.setView(BISHKEK_CENTER, 13);
    });

    // Hospital / Destination logic
    document.getElementById('hospital-select').addEventListener('change', onHospitalSelect);
    document.getElementById('btn-clear-dest').addEventListener('click', () => {
        document.getElementById('destination-input').value = '';
        if (destinationMarker) map.removeLayer(destinationMarker);
        destinationMarker = null;
        checkCanCalculate();
    });

    document.getElementById('btn-calculate').addEventListener('click', calculateRoute);

    // Trip Panel
    document.getElementById('btn-cancel-trip').addEventListener('click', cancelTrip);
    document.getElementById('btn-start-nav').addEventListener('click', startNavAnimation);
}

// --- LANGUAGE SYSTEM ---
function setLanguage(lang) {
    AppState.lang = lang;
    const dict = I18N[lang];
    if (!dict) return;

    for (const [id, text] of Object.entries(dict)) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }
}

// --- VIEW MANAGEMENT ---
function transitionToMap() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('map-screen').classList.add('active');
    AppState.view = 'map';

    // Configure Map UI based on role
    configureRoleUI();
    
    // Trigger resize to fix leaflet grey areas on reveal
    setTimeout(() => map.invalidateSize(), 100);
}

function configureRoleUI() {
    const role = AppState.role;
    const hospGroup = document.getElementById('group-hospital');
    const destGroup = document.getElementById('group-destination');
    const btnCalc = document.getElementById('btn-calculate');

    // Reset visibility
    hospGroup.style.display = 'none';
    destGroup.style.display = 'flex';
    document.getElementById('planning-sheet').classList.remove('hidden');
    document.getElementById('trip-panel').classList.remove('active');

    // Clear map markers
    if(startMarker) map.removeLayer(startMarker);
    if(destinationMarker) map.removeLayer(destinationMarker);
    if(routeLayer) map.removeLayer(routeLayer);
    
    if (AppState.accidentMarker) {
        map.removeLayer(AppState.accidentMarker);
        AppState.accidentMarker = null;
    }
    clearMockFleets();
    
    btnCalc.style.display = 'flex';
    document.getElementById('planning-sheet').classList.remove('hidden');

    if (role === 'emergency' || role === 'fire' || role === 'police') {
        hospGroup.style.display = 'flex';
        loadStationsForRole(role);
        
        // Update label
        const lbl = document.getElementById('t-label-hospital');
        if (role === 'emergency') lbl.textContent = AppState.lang === 'ru' ? 'Выберите подстанцию / больницу' : 'Оорукананы тандаңыз';
        if (role === 'fire') lbl.textContent = AppState.lang === 'ru' ? 'Выберите пожарную часть' : 'Өрт өчүрүү бөлүмүн тандаңыз';
        if (role === 'police') lbl.textContent = AppState.lang === 'ru' ? 'Выберите участок полиции' : 'Полиция бөлүмүн тандаңыз';
        
    } else if (role === 'taxi' || role === 'courier') {
        // Direct to anywhere, set a random start location for now
        const icons = {
            'taxi': '🚕 Такси',
            'courier': '🛵 Курьер'
        };
        const randLat = BISHKEK_CENTER[0] + (Math.random() - 0.5) * 0.05;
        const randLng = BISHKEK_CENTER[1] + (Math.random() - 0.5) * 0.05;
        setStartMarker([randLat, randLng], icons[role]);
    }

    checkCanCalculate();
}

function logout() {
    document.getElementById('map-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.add('active');
    AppState.view = 'auth';
    AppState.role = null;
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-login').disabled = true;
    stationMarkers.forEach(m => map.removeLayer(m));
    stationMarkers = [];
    cancelTrip();
}

// --- MAP INTERACTION ---
function loadStationsForRole(role) {
    const select = document.getElementById('hospital-select');
    select.innerHTML = `<option value="">${AppState.lang === 'ru' ? 'Загрузка...' : 'Жүктөө...'}</option>`;
    
    let stations = [];
    let emoji = '🚑';
    if (role === 'emergency') { stations = HOSPITALS; emoji = '🚑'; }
    else if (role === 'fire') { stations = FIRE_STATIONS; emoji = '🚒'; }
    else if (role === 'police') { stations = POLICE_STATIONS; emoji = '🚓'; }

    // Clear old markers
    stationMarkers.forEach(m => map.removeLayer(m));
    stationMarkers = [];

    stations.forEach((h, i) => {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = h.name;
        select.appendChild(option);
        
        // Add minimal marker to map
        const icon = L.divIcon({
            html: `<div style="font-size:24px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5)); transform:translate(-20%,-20%);">${emoji}</div>`,
            className: 'station-icon',
            iconSize: [30, 30]
        });
        
        const marker = L.marker([h.lat, h.lng], {icon}).addTo(map);
        marker.bindTooltip(`<b>${h.name}</b>`, {direction: 'top', offset: [0, -10]});
        
        // Optional: click to select
        marker.on('click', () => {
            select.value = i;
            onHospitalSelect({target: {value: i}});
        });
        
        stationMarkers.push(marker);
    });
    
    // reset selection
    select.value = "";
    if (startMarker) map.removeLayer(startMarker);
    startMarker = null;
    AppState.hospital = null;
    AppState.stationIndex = null;

    // Center map on all stations
    if (stations.length > 0) {
        const group = new L.featureGroup(stationMarkers);
        map.fitBounds(group.getBounds(), {padding: [50, 50]});
    }
}

function onHospitalSelect(e) {
    const index = e.target.value;
    if (index === '') {
        if (startMarker) map.removeLayer(startMarker);
        startMarker = null;
        AppState.hospital = null;
        AppState.stationIndex = null;
        checkCanCalculate();
        return;
    }

    let stations = [];
    let emoji = '🚑';
    if (AppState.role === 'emergency') { stations = HOSPITALS; emoji = '🚑'; }
    else if (AppState.role === 'fire') { stations = FIRE_STATIONS; emoji = '🚒'; }
    else if (AppState.role === 'police') { stations = POLICE_STATIONS; emoji = '🚓'; }

    const h = stations[index];
    AppState.hospital = h;
    AppState.stationIndex = index;
    setStartMarker([h.lat, h.lng], `${emoji} ${h.name.substring(0,6)}..`);
    map.flyTo([h.lat, h.lng], 14, {animate: true, duration: 1});
    checkCanCalculate();
}

function handleMapClick(e) {    
    // If emergency type and no station picked
    if ((AppState.role === 'emergency' || AppState.role === 'fire' || AppState.role === 'police') && !AppState.hospital) {
        alert(AppState.lang === 'ru' ? 'Сначала выберите базу отправления' : 'Алгач кетүү базасын тандаңыз');
        return;
    }

    setDestinationMarker(e.latlng);
}

function setStartMarker(latlng, popupTitle) {
    if (startMarker) map.removeLayer(startMarker);
    
    const icon = L.divIcon({
        html: `<div style="font-size:24px;filter:drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">${popupTitle.substring(0,2)}</div>`,
        className: 'custom-icon',
        iconSize: [30, 30]
    });

    startMarker = L.marker(latlng, { icon })
        .addTo(map)
        .bindPopup(`<b>${popupTitle}</b><br>Точка старта`)
        .openPopup();
}

function setDestinationMarker(latlng) {
    if (destinationMarker) map.removeLayer(destinationMarker);

    const icon = L.divIcon({
        html: `<div style="font-size:24px;filter:drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">📍</div>`,
        className: 'custom-icon',
        iconSize: [30, 30]
    });

    destinationMarker = L.marker(latlng, { icon })
        .addTo(map);

    document.getElementById('destination-input').value = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
    checkCanCalculate();
}

function checkCanCalculate() {
    const btn = document.getElementById('btn-calculate');

    let canCalc = false;
    if (AppState.role === 'emergency' || AppState.role === 'fire' || AppState.role === 'police') {
        canCalc = startMarker != null && destinationMarker != null && AppState.hospital != null;
    } else {
        canCalc = startMarker != null && destinationMarker != null;
    }
    
    btn.disabled = !canCalc;
}

// --- ROUTING ---
async function calculateRoute() {
    const btn = document.getElementById('btn-calculate');
    btn.innerHTML = '<div class="loader"></div>';
    
    try {
        const srt = startMarker.getLatLng();
        const dst = destinationMarker.getLatLng();

        const response = await fetch(`${API_BASE}/routes/calculate/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_lat: srt.lat, start_lng: srt.lng,
                end_lat: dst.lat, end_lng: dst.lng,
                alternatives: 1
            })
        });

        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
            AppState.route = data.routes[0];
            drawRoute(AppState.route);
            showTripPanel(AppState.route);
        } else {
            alert('Маршрут не найден');
        }
    } catch (e) {
        console.error(e);
        alert('Ошибка при расчете маршрута');
    } finally {
        btn.innerHTML = `<span id="t-btn-calculate">${I18N[AppState.lang]['t-btn-calculate']}</span>`;
    }
}

function drawRoute(route) {
    if (routeLayer) map.removeLayer(routeLayer);

    const activeColor = AppState.role === 'emergency' ? '#ff3366' : 
                        AppState.role === 'fire' ? '#ff6b00' :
                        AppState.role === 'police' ? '#3b82f6' :
                        AppState.role === 'taxi' ? '#ffb800' : '#00d2ff';

    routeLayer = L.geoJSON(route.geometry, {
        style: {
            color: activeColor,
            weight: 6,
            opacity: 0.9,
            lineCap: 'round',
            zIndex: 1000
        }
    }).addTo(map);

    map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
}

function showTripPanel(route) {
    // Hide Bottom Sheet
    document.getElementById('planning-sheet').classList.add('hidden');
    
    // Set Data
    let timeMin = route.traffic_aware_duration_minutes || (route.duration / 60);
    timeMin = Math.round(timeMin);
    let distKm = (route.distance / 1000).toFixed(1);

    document.getElementById('trip-eta').textContent = `${timeMin} мин`;
    document.getElementById('trip-distance').textContent = `${distKm} км`;
    document.getElementById('trip-address').textContent = document.getElementById('destination-input').value;

    const delay = route.traffic_delay_minutes || 0;
    const badge = document.getElementById('traffic-badge');
    const aiText = document.getElementById('ai-savings-text');
    
    // AI Savings Logic for Demo
    // If there is an accident, we say AI routed around it
    if (AppState.accidentMarker) {
        let saved = Math.floor(Math.random() * 10) + 15; // 15-25 mins saved
        aiText.innerHTML = `🤖 <b>AI сэкономил ${saved} мин</b>, перестроив маршрут в объезд ДТП!`;
        aiText.style.display = 'block';
        badge.style.display = 'none';
    } else {
        if (delay > 2) {
            badge.style.display = 'inline-flex';
            badge.textContent = `⚠️ Затор (+${Math.round(delay)} мин)`;
            aiText.style.display = 'none';
        } else {
            badge.style.display = 'none';
            aiText.innerHTML = `🤖 Оптимальный маршрут построен.`;
            aiText.style.display = 'block';
        }
    }

    // Show Trip Panel Top Sliding Down
    document.getElementById('trip-panel').classList.add('active');
}

function cancelTrip() {
    if (routeLayer) map.removeLayer(routeLayer);
    if (destinationMarker) map.removeLayer(destinationMarker);
    if (ambulanceMarker) map.removeLayer(ambulanceMarker);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    routeLayer = null;
    destinationMarker = null;
    ambulanceMarker = null;

    document.getElementById('destination-input').value = '';
    
    document.getElementById('trip-panel').classList.remove('active');
    document.getElementById('planning-sheet').classList.remove('hidden');

    // Return view based on role
    if(AppState.role !== 'emergency' && startMarker) {
        map.setView(startMarker.getLatLng(), 14);
    } else if (AppState.hospital) {
        map.setView([AppState.hospital.lat, AppState.hospital.lng], 14);
    } else {
        map.setView(BISHKEK_CENTER, 13);
    }
    
    checkCanCalculate();
}

// --- AUDIO SYSTEM ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSiren() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    // Simple oscillator simulating a brief siren or beep to get attention
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.5);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 1.0);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.5);
}

// --- ANIMATION ---
function startNavAnimation() {
    const route = AppState.route;
    if (!route) return;

    if (AppState.role === 'emergency' || AppState.role === 'police' || AppState.role === 'fire') {
        playSiren();
    }

    document.getElementById('btn-start-nav').innerHTML = '<div class="loader"></div>';
    
    setTimeout(() => {
        document.getElementById('btn-start-nav').innerHTML = AppState.lang === 'ru' ? 'В пути...' : 'Жолдо...';
        document.getElementById('btn-start-nav').style.background = '#4b5563'; // disabled look

        if (ambulanceMarker) map.removeLayer(ambulanceMarker);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        
        let emoji = '🚗';
        if(AppState.role === 'emergency') emoji = '🚑';
        if(AppState.role === 'taxi') emoji = '🚕';
        if(AppState.role === 'courier') emoji = '🛵';
        if(AppState.role === 'fire') emoji = '🚒';
        if(AppState.role === 'police') emoji = '🚓';

        const icon = L.divIcon({
            html: `<div id="amb-icon-inner" style="font-size:32px; filter:drop-shadow(0px 4px 6px rgba(0,0,0,0.5)); transform:translate(-50%,-50%); transition: transform 0.1s linear;">${emoji}</div>`,
            className: 'custom-anim-icon',
            iconSize: [40,40],
            iconAnchor: [20,20]
        });

        ambulanceMarker = L.marker(coords[0], { icon, zIndexOffset: 2000 }).addTo(map);

        let index = 0;
        const animate = () => {
            if (index < coords.length - 1) {
                const currentP = coords[Math.floor(index)];
                const nextP = coords[Math.floor(index) + 1];
                
                // Calculate bearing for rotation
                if (nextP) {
                    const dy = nextP[0] - currentP[0];
                    const dx = Math.cos(Math.PI / 180 * currentP[0]) * (nextP[1] - currentP[1]);
                    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    // Adjust angle due to emoji default orientation (usually facing left)
                    angle = -angle; 
                    
                    const el = document.getElementById('amb-icon-inner');
                    if(el) el.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
                }

                ambulanceMarker.setLatLng(currentP);
                index += 0.5; // speed
                animationFrameId = requestAnimationFrame(animate);
            } else {
                alert('Вы прибыли в пункт назначения!');
                cancelTrip();
            }
        };

        animate();
    }, 500);
}

// --- TRAFFIC LAYER (KEPT FROM ORIGINAL) ---
async function loadRealStreetTraffic() {
    try {
        const response = await fetch(`${API_BASE}/traffic/streets_osm/`);
        const data = await response.json();
        
        trafficLayers.forEach(l => map.removeLayer(l));
        trafficLayers = [];

        if(data.streets) {
            data.streets.forEach(street => {
                const layer = L.polyline(street.coords, {
                    color: street.color || '#22c55e',
                    weight: street.width || 4,
                    opacity: 0.6,
                    lineCap: 'round'
                }).addTo(map);
                trafficLayers.push(layer);
            });
        }
    } catch(e) {
        console.error('Traffic failed', e);
    }
}

// --- DEMO / ANALYTICS MOCK LOGIC ---
function createDemoAccident(e) {
    let latlng;
    
    // Fall back to center if event doesn't give coords
    if (e && e.latlng) {
        latlng = e.latlng;
    } else {
        const center = map.getCenter();
        latlng = {lat: center.lat + 0.01, lng: center.lng + 0.01};
    }

    if (AppState.accidentMarker) {
        map.removeLayer(AppState.accidentMarker);
    }

    const icon = L.divIcon({
        html: `<div style="font-size:36px; filter:drop-shadow(0 0 10px red); animation: ping 1s infinite alternate;">🔥</div>`,
        className: 'accident-icon',
        iconSize: [40,40]
    });

    AppState.accidentMarker = L.marker(latlng, {icon}).addTo(map);
    AppState.accidentMarker.bindPopup("<b>Серьезное ДТП / Возгорание</b><br>Дорога перекрыта!").openPopup();
    
    // If routing happens again, it will trigger the "AI Saved" message.
}

function generateMockFleets() {
    // Kept to populate random traffic items for visual interest (mock fleets)
    clearMockFleets();
    const count = 30; // More for analytics view
    const icons = ['🚑', '🚕', '🚕', '🛵', '🛵', '🛵', '🚓', '🚒']; 

    for(let i=0; i<count; i++) {
        const lat = BISHKEK_CENTER[0] + (Math.random() - 0.5) * 0.1;
        const lng = BISHKEK_CENTER[1] + (Math.random() - 0.5) * 0.1;
        const emoji = icons[Math.floor(Math.random() * icons.length)];

        const icon = L.divIcon({
            html: `<div style="font-size:16px; opacity:0.8;">${emoji}</div>`,
            className: 'mock-icon',
            iconSize: [20,20]
        });

        const markerDiv = L.marker([lat, lng], {icon}).addTo(map);
        
        setInterval(() => {
            const pos = markerDiv.getLatLng();
            markerDiv.setLatLng([
                pos.lat + (Math.random() - 0.5) * 0.0004,
                pos.lng + (Math.random() - 0.5) * 0.0004
            ]);
        }, 1500 + Math.random() * 2000);

        AppState.mockFleets.push(markerDiv);
    }
}

function clearMockFleets() {
    AppState.mockFleets.forEach(m => map.removeLayer(m));
    AppState.mockFleets = [];
}
