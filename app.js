// HeatUp PWA Prototype - app.js
const mapEl = document.getElementById('map');
const modeEl = document.getElementById('mode');
const radiusEl = document.getElementById('radius');
const rlabel = document.getElementById('rlabel');
const btnScan = document.getElementById('btn-scan');
const matchesEl = document.getElementById('matches');

let map, marker, userPos = null, circle=null;
let mockProfiles = [];

radiusEl.addEventListener('input', ()=>{ rlabel.textContent = radiusEl.value + ' km' })

function initMap(){
  map = L.map('map').setView([46.15, 25.3], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);
}

function showUser(lat,lng){
  if(marker) map.removeLayer(marker);
  marker = L.marker([lat,lng]).addTo(map).bindPopup('You are here').openPopup();
  if(circle) map.removeLayer(circle);
  const rmeters = parseFloat(radiusEl.value)*1000;
  circle = L.circle([lat,lng], {radius:rmeters, color:'#FF9500', fillOpacity:0.08}).addTo(map);
  map.setView([lat,lng], determineZoom(radiusEl.value));
}

function determineZoom(km){
  if(km<=1) return 15;
  if(km<=5) return 13;
  if(km<=20) return 11;
  if(km<=100) return 8;
  return 6;
}

function haversine(lat1, lon1, lat2, lon2){
  const toRad = v => v*Math.PI/180;
  const R = 6371;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}

function randomOffset(maxKm){
  const r = Math.random()*maxKm;
  const angle = Math.random()*2*Math.PI;
  const dx = r*Math.cos(angle)/111;
  const dy = r*Math.sin(angle)/111;
  return [dx, dy];
}

function generateMockProfiles(lat,lng,count=12, maxKm=50){
  mockProfiles = [];
  const modes = ['casual','events','short_term','long_term','collab','services'];
  for(let i=0;i<count;i++){
    const [ox,oy] = randomOffset(maxKm);
    const pLat = lat + ox;
    const pLon = lng + oy;
    const name = ['Alex','Maria','Ioana','Andrei','Sergiu','Laura','Mihai','Elena','Cristi','Roxana'][Math.floor(Math.random()*10)];
    const age = 20 + Math.floor(Math.random()*20);
    const mode = modes[Math.floor(Math.random()*modes.length)];
    const bio = ['Out tonight','Looking to collaborate','Available for gigs','Travel buddy','Quick meetup','Local helper'][Math.floor(Math.random()*6)];
    mockProfiles.push({id:'p'+i, name, age, lat:pLat, lon:pLon, mode, bio});
  }
}

function renderMatches(filtered){
  matchesEl.innerHTML = '';
  filtered.forEach(p=>{
    const li = document.createElement('li');
    li.className='match';
    li.innerHTML = `<div class="avatar">${p.name[0]}</div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between"><strong>${p.name}, ${p.age}</strong><small>${p.distance.toFixed(1)} km</small></div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7)">${p.mode} · ${p.bio}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn small" onclick="openProfile('${p.id}')">Chat</button>
        <button class="btn" style="background:#333" onclick="ping('${p.id}')">Ping</button>
      </div>`;
    matchesEl.appendChild(li);
  });
}

function openProfile(id){
  const p = mockProfiles.find(x=>x.id===id);
  alert(`${p.name}, ${p.age}\n${p.mode}\n${p.bio}\n(${p.distance.toFixed(1)} km)`);
}

function ping(id){
  const p = mockProfiles.find(x=>x.id===id);
  notifyDetailed(`${p.name}, ${p.age} — ${p.distance.toFixed(1)} km`, `Looking for: ${p.mode}`);
}

function notifyDetailed(title, body){
  if(!("Notification" in window)) return;
  if(Notification.permission==="granted"){
    navigator.serviceWorker.getRegistration().then(reg=>{
      if(reg) reg.showNotification(title, {body, icon:'icons/icon-192.png', tag:'heatup-prox'});
      else alert(title+"\n"+body);
    });
  } else {
    alert(title+"\n"+body);
  }
}

btnScan.addEventListener('click', ()=>{
  if(!userPos){ alert('Location not set — allow location access'); return; }
  const maxKm = parseFloat(radiusEl.value);
  generateMockProfiles(userPos.lat, userPos.lng, 20, Math.max(5, Math.min(200,maxKm)));
  mockProfiles.forEach(p=> p.distance = haversine(userPos.lat,userPos.lng,p.lat,p.lon));
  const filtered = mockProfiles.filter(p=> p.mode===modeEl.value && p.distance <= maxKm);
  renderMatches(filtered.sort((a,b)=>a.distance-b.distance));
  mockProfiles.forEach(p=>{
    L.circleMarker([p.lat,p.lon], {radius:8, color:'#FF3B30'}).addTo(map).bindPopup(`${p.name}, ${p.age} — ${p.mode}`);
  });
  const near = mockProfiles.find(p=> p.mode===modeEl.value && p.distance <= Math.min(0.5, maxKm));
  if(near) notifyDetailed(`${near.name}, ${near.age} — ${near.distance.toFixed(2)} km`, `Looking for: ${near.mode}`);
});

function start(){
  initMap();
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      userPos = {lat: pos.coords.latitude, lng: pos.coords.longitude};
      showUser(userPos.lat, userPos.lng);
      generateMockProfiles(userPos.lat, userPos.lng, 20, 50);
    }, err=>{
      userPos = {lat:45.1555, lng:23.3489};
      showUser(userPos.lat, userPos.lng);
      generateMockProfiles(userPos.lat, userPos.lng, 20, 50);
    }, {enableHighAccuracy:true});
  } else {
    userPos = {lat:45.1555, lng:23.3489};
    showUser(userPos.lat, userPos.lng);
    generateMockProfiles(userPos.lat, userPos.lng, 20, 50);
  }
}

start();
