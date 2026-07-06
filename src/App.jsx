import React, { useState, useEffect } from 'react';
import { Star, Moon, Sun, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fixed high-res aesthetic images
const CAFE_IMAGES = [
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&q=80&w=600"
];

// Data banks for our dynamic review generator
const MENU_HITS = ["Iced Americano", "Momos", "Pav Bhaji", "Vada Pav", "Unlimited Pizza", "Dhokla", "Matcha Latte", "Vegetable Noodles", "Loaded Fries", "Truffle Pasta"];
const MENU_MISSES = ["Dry Cake", "Overpriced Water", "Stale Croissants", "Soggy Sandwiches", "Burnt Espresso", "Watery Chai"];

// Helper to smoothly move the map
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 14, { animate: true, duration: 1.5 });
  }, [center, map]);
  return null;
}

// Custom Numbered Pin for the Map
const createNumberedIcon = (number, isDark) => L.divIcon({
  className: 'custom-pin',
  html: `<div style="background-color: #c4f135; border: 3px solid ${isDark ? 'white' : 'black'}; color: black; font-weight: 900; font-size: 14px; padding: 2px 8px; box-shadow: 3px 3px 0px 0px ${isDark ? 'white' : 'black'}; display: inline-block; position: relative;">
           ${number}
           <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${isDark ? 'white' : 'black'};"></div>
         </div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40]
});

export default function CafeHunterApp() {
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('Vadodara');
  const [searchInput, setSearchInput] = useState('');
  const [cafes, setCafes] = useState([]);
  const [sortBy, setSortBy] = useState('rating');
  const [mapCenter, setMapCenter] = useState([22.3072, 73.1812]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // State for our popup modal
  const [selectedCafeInfo, setSelectedCafeInfo] = useState(null);

  // Dynamic Theme Variables for Brutalism
  const theme = {
    bg: darkMode ? 'bg-[#111111]' : 'bg-[#f4f4f0]',
    cardBg: darkMode ? 'bg-[#1a1a1a]' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-black',
    border: darkMode ? 'border-[#c4f135]' : 'border-black',
    shadow: darkMode ? 'shadow-[8px_8px_0px_0px_#c4f135]' : 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
    mapUrl: darkMode 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  };

  const getMenuTags = (id) => {
    const safeId = Math.abs(id);
    return { 
      mustTry: [MENU_HITS[safeId % MENU_HITS.length], MENU_HITS[(safeId + 3) % MENU_HITS.length]], 
      avoid: [MENU_MISSES[safeId % MENU_MISSES.length]] 
    };
  };

  const huntCafes = async (query) => {
    if (!query) return;
    setIsLoading(true);
    setErrorMsg('');
    setCafes([]);

    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      if (!geoRes.ok) throw new Error("Map API is resting. Give it a sec.");
      const geoData = await geoRes.json();
      
      if (!geoData || geoData.length === 0) throw new Error("City not found. Try being more specific.");

      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);
      setMapCenter([lat, lon]);

      const overpassQuery = `
        [out:json][timeout:25];
        nwr["amenity"="cafe"](around:15000,${lat},${lon});
        out center 25;
      `;
      
      const cafeRes = await fetch(`https://overpass-api.de/api/interpreter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`
      });

      const textRes = await cafeRes.text();
      
      if (textRes.startsWith('<?xml') || textRes.includes('html')) {
        throw new Error("The free database is overwhelmed. Give it 10 seconds and try again.");
      }

      const cafeData = JSON.parse(textRes);

      if (!cafeData.elements || cafeData.elements.length === 0) {
         setErrorMsg("No cafes found in this specific area.");
         setIsLoading(false);
         return;
      }

      const formattedCafes = cafeData.elements
        .filter(el => el.tags && el.tags.name)
        .map((el, index) => {
          const cafeLat = el.lat || el.center.lat;
          const cafeLon = el.lon || el.center.lon;
          const mockRating = (3.8 + (el.id % 12) / 10).toFixed(1); 
          
          return {
            id: el.id,
            displayNumber: index + 1,
            name: el.tags.name,
            lat: cafeLat,
            lng: cafeLon,
            locality: el.tags['addr:city'] || el.tags['addr:suburb'] || query,
            rating: mockRating,
            photo: CAFE_IMAGES[index % CAFE_IMAGES.length],
            description: `A highly rated specialty coffee shop in the heart of the city featuring local roasts and aesthetic interiors perfect for working or studying.`,
            menu: getMenuTags(el.id)
          };
        });

      setCafes(formattedCafes);
    } catch (err) {
      setErrorMsg(err.message || "Failed to fetch data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { huntCafes(searchQuery); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput);
      huntCafes(searchInput);
    }
  };

  // Sorting Logic
  const sortedCafes = [...cafes].sort((a, b) => {
    if (sortBy === 'rating') return parseFloat(b.rating) - parseFloat(a.rating);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return a.displayNumber - b.displayNumber; // Default order
  });

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans selection:bg-[#c4f135] selection:text-black transition-colors duration-300`}>
      
      {/* POPUP MODAL (THE TEA) */}
      {selectedCafeInfo && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
          <div className={`${theme.cardBg} w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4 ${theme.border} shadow-[12px_12px_0px_0px_#c4f135] flex flex-col relative`}>
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedCafeInfo(null)}
              className="absolute top-4 right-4 z-10 bg-[#c4f135] border-4 border-black p-2 text-black hover:bg-white transition-colors"
            >
              <X className="w-6 h-6 stroke-[3]" />
            </button>

            {/* Modal Image */}
            <div className={`w-full h-64 md:h-80 border-b-4 ${theme.border} relative overflow-hidden`}>
              <img src={selectedCafeInfo.photo} alt={selectedCafeInfo.name} className="w-full h-full object-cover filter contrast-125" />
              <div className="absolute bottom-0 left-0 bg-[#c4f135] border-t-4 border-r-4 border-black px-6 py-2 text-black font-black text-3xl uppercase tracking-tighter">
                {selectedCafeInfo.name}
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 space-y-8">
              <div className="flex flex-wrap gap-4 items-center justify-between border-b-4 border-gray-200 dark:border-gray-800 pb-6">
                <div>
                  <p className="font-bold text-xl uppercase tracking-widest opacity-60">{selectedCafeInfo.locality}</p>
                  <p className="font-medium text-lg mt-2">{selectedCafeInfo.description}</p>
                </div>
                <div className="bg-black text-[#c4f135] font-black text-2xl px-4 py-2 flex items-center gap-2 border-4 border-[#c4f135]">
                  {selectedCafeInfo.rating} <Star className="w-6 h-6 fill-[#c4f135]" />
                </div>
              </div>

              {/* The Tea (Must Try / Avoid) */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Hits */}
                <div className={`border-4 ${theme.border} p-6 ${darkMode ? 'bg-black' : 'bg-[#f4f4f0]'}`}>
                  <div className="flex items-center gap-3 font-black text-2xl uppercase text-green-500 mb-6">
                    <ThumbsUp className="w-8 h-8" /> Must Try
                  </div>
                  <ul className="space-y-4 font-bold text-lg">
                    {selectedCafeInfo.menu.mustTry.map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="w-3 h-3 bg-[#c4f135] border-2 border-black"></span> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Misses */}
                <div className={`border-4 ${theme.border} p-6 ${darkMode ? 'bg-black' : 'bg-[#f4f4f0]'}`}>
                  <div className="flex items-center gap-3 font-black text-2xl uppercase text-red-500 mb-6">
                    <ThumbsDown className="w-8 h-8" /> Avoid
                  </div>
                  <ul className="space-y-4 font-bold text-lg opacity-80">
                    {selectedCafeInfo.menu.avoid.map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="w-3 h-3 bg-red-500 border-2 border-black"></span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className={`w-full ${theme.bg} border-b-4 ${theme.border} px-4 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-40 gap-4`}>
        
        <div className="flex items-center gap-4">
          <div className="bg-[#c4f135] px-4 py-1 border-4 border-black font-black text-3xl uppercase tracking-tighter text-black">
            Cafe Hunter
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 border-4 ${theme.border} transition-transform active:translate-x-1 active:translate-y-1 ${darkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}
          >
            {darkMode ? <Sun className="w-6 h-6 text-[#c4f135]" /> : <Moon className="w-6 h-6 text-black" />}
          </button>
        </div>
        
        <form onSubmit={handleSearch} className="flex h-12 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search cafes..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={`w-full md:w-64 border-4 border-r-0 ${theme.border} px-4 font-bold outline-none text-lg placeholder:text-gray-500 ${theme.cardBg} ${theme.text}`}
          />
          <button type="submit" className={`bg-[#c4f135] border-4 ${theme.border} px-6 font-black uppercase text-black hover:bg-[#a6d126]`}>
            Go
          </button>
        </form>
      </nav>

      <div className="w-full mx-auto grid lg:grid-cols-[55%_45%] h-[calc(100vh-89px)] overflow-hidden">
        
        {/* LEFT PANEL: CAFE LIST */}
        <div className={`flex flex-col h-full border-r-4 ${theme.border} ${theme.bg} overflow-hidden`}>
          
          {/* Sorting Header */}
          <div className={`p-4 border-b-4 ${theme.border} flex justify-between items-center ${theme.cardBg}`}>
             <span className="font-black uppercase text-lg">{sortedCafes.length} Spots Found</span>
             <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className={`border-4 ${theme.border} px-3 py-2 font-bold outline-none uppercase text-sm ${theme.bg} ${theme.text} cursor-pointer`}
             >
                <option value="default">Sort: Default</option>
                <option value="rating">Sort: Highest Rating</option>
                <option value="name">Sort: A-Z</option>
             </select>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {isLoading ? (
               <div className="h-full flex items-center justify-center font-black text-2xl uppercase animate-pulse">
                  Hunting...
               </div>
            ) : errorMsg ? (
              <div className="border-4 border-red-500 bg-red-100 p-6 font-black uppercase text-xl text-red-600">{errorMsg}</div>
            ) : (
              sortedCafes.map((cafe) => (
                <div 
                  key={cafe.id} 
                  onMouseEnter={() => setMapCenter([cafe.lat, cafe.lng])}
                  onClick={() => setSelectedCafeInfo(cafe)}
                  className={`bg-[#c4f135] border-4 ${theme.border} p-4 flex flex-col sm:flex-row gap-4 ${theme.shadow} transition-transform hover:-translate-y-1 cursor-pointer text-black`}
                >
                  <div className={`w-full sm:w-40 sm:h-40 shrink-0 border-4 ${theme.border} bg-white overflow-hidden`}>
                    <img src={cafe.photo} alt={cafe.name} className="w-full h-full object-cover filter contrast-125 saturate-50" />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h2 className="font-black text-2xl uppercase leading-tight line-clamp-1">
                            {cafe.displayNumber}. {cafe.name}
                          </h2>
                          <p className="font-bold text-lg mt-0.5 capitalize">{cafe.locality}</p>
                        </div>
                        
                        <div className={`bg-black text-[#c4f135] font-black px-2 py-1 flex items-center gap-1.5 whitespace-nowrap border-2 ${theme.border}`}>
                          {cafe.rating} <Star className="w-4 h-4 fill-[#c4f135]" />
                        </div>
                      </div>
                      <p className={`font-medium text-sm mt-3 leading-snug line-clamp-2 pr-4 border-l-2 ${theme.border} pl-3`}>
                        {cafe.description}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <span className={`bg-white border-2 ${theme.border} px-2 py-0.5 font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                        #WIFI
                      </span>
                      <span className={`bg-white border-2 ${theme.border} px-2 py-0.5 font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                        #AESTHETIC
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL: MAP */}
        <div className={`h-full z-0 relative ${theme.bg}`}>
          <MapContainer center={mapCenter} zoom={14} style={{ width: '100%', height: '100%', zIndex: 0 }} zoomControl={false}>
            <TileLayer attribution='&copy; OSM' url={theme.mapUrl} />
            <MapUpdater center={mapCenter} />
            {sortedCafes.map((cafe) => (
              <Marker 
                key={cafe.id} 
                position={[cafe.lat, cafe.lng]} 
                icon={createNumberedIcon(cafe.displayNumber, darkMode)}
                eventHandlers={{ click: () => setSelectedCafeInfo(cafe) }}
              />
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}