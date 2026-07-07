const huntCafes = async (query) => {
    if (!query) return;
    setIsLoading(true);
    setErrorMsg('');
    setCafes([]);

    try {
      // FIX 1: Removed custom headers to avoid Vercel CORS blocking
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&email=hello@cafehunter.local`);
      
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
      
      // FIX 2: Only using the CORS-safelisted Content-Type header
      const cafeRes = await fetch(`https://overpass-api.de/api/interpreter`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded'
        },
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