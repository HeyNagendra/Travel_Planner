import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap, useMapsLibrary, InfoWindow } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, MapPin, Info, Star, Trash2, Search, Calendar, Moon, Sun, Menu, X, Youtube, CalendarDays } from 'lucide-react';
import PlaceActionsPanel from './PlaceActionsPanel';

interface MapComponentProps {
  apiKey: string;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
}

const POPULAR_CITIES = [
  { name: 'Paris, France', lat: 48.8566, lng: 2.3522 },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
  { name: 'New York City, New York', lat: 40.7128, lng: -74.0060 },
  { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Rome, Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Barcelona, Spain', lat: 41.3851, lng: 2.1734 },
  { name: 'Amsterdam, Netherlands', lat: 52.3676, lng: 4.9041 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Los Angeles, USA', lat: 34.0522, lng: -118.2437 },
  { name: 'Berlin, Germany', lat: 52.5200, lng: 13.4050 },
  { name: 'Bangkok, Thailand', lat: 13.7563, lng: 100.5018 },
  { name: 'Istanbul, Turkey', lat: 41.0082, lng: 28.9784 },
  { name: 'Seoul, South Korea', lat: 37.5665, lng: 126.9780 },
  { name: 'San Francisco, California', lat: 37.7749, lng: -122.4194 },
  { name: 'Milan, Italy', lat: 45.4642, lng: 9.1900 },
  { name: 'Ho Chi Minh City, Vietnam', lat: 10.7626, lng: 106.6602 },
  { name: 'Hanoi, Vietnam', lat: 21.0285, lng: 105.8542 },
  { name: 'Mexico City, Mexico', lat: 19.4326, lng: -99.1332 },
  { name: 'Mumbai, India', lat: 19.0760, lng: 72.8777 },
  { name: 'Toronto, Canada', lat: 43.6532, lng: -79.3832 },
];


/**
 * DEVELOPER NOTE:
 * This app uses a hardcoded city list for navigation because the demo API key 
 * may not have the "Geocoding API" or "Places API (Autocomplete)" enabled.
 * 
 * To enable arbitrary text search (searching for any address):
 * 1. Enable "Geocoding API" and "Places API" in your Google Cloud Console.
 * 2. Update handleLocationSearch to use google.maps.Geocoder.
 */

// Component to handle Places search using UI Kit
const PlacesSearch = ({ 
  itinerary, 
  setItinerary, 
  activeTab, 
  setActiveTab,
  places,
  setPlaces,
  selectedPlace,
  setSelectedPlace,
  selectedType,
  setSelectedType,
  removeFromItinerary,
  citySearch,
  handleCitySelect,
  isStreetViewActive,
  setIsStreetViewActive,
  isDarkMode,
  setIsDarkMode,
  isSidebarOpen,
  setIsSidebarOpen,
}: {
  itinerary: any[];
  setItinerary: (itinerary: any[]) => void;
  activeTab: 'search' | 'saved';
  setActiveTab: (tab: 'search' | 'saved') => void;
  places: any[];
  setPlaces: (places: any[]) => void;
  selectedPlace: any | null;
  setSelectedPlace: (place: any | null) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  removeFromItinerary: (placeId: string) => void;
  citySearch: string;
  handleCitySelect: (map: any, cityName: string) => void;
  isStreetViewActive: boolean;
  setIsStreetViewActive: (active: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const coreLib = useMapsLibrary('core');
  const geometryLib = useMapsLibrary('geometry');
  
  const placeSearchRef = useRef<HTMLDivElement>(null);
  const isManualSelectionRef = useRef(false);
  const [showInfo, setShowInfo] = useState(false);

  const panToWithOffset = (location: google.maps.LatLngLiteral) => {
    if (!map) return;
    isManualSelectionRef.current = true;
    // Single smooth pan. InfoWindow's autoPan will handle the rest.
    map.panTo(location);
  };

  useEffect(() => {
    if (!map || !coreLib || !geometryLib || !placesLib || !placeSearchRef.current) return;

    // Create elements only if they don't exist
    let placeSearch = placeSearchRef.current.querySelector('gmp-place-search');
    let nearbyRequest: any;

    if (!placeSearch) {
      placeSearch = document.createElement('gmp-place-search');
      placeSearch.setAttribute('selectable', '');
      
      const allContent = document.createElement('gmp-place-all-content');
      nearbyRequest = document.createElement('gmp-place-nearby-search-request');
      
      placeSearch.appendChild(allContent);
      placeSearch.appendChild(nearbyRequest);
      
      placeSearchRef.current.appendChild(placeSearch);

      const handleLoad = () => {
        const newPlaces = (placeSearch as any).places || [];
        setPlaces(newPlaces);
      };

      const handleSelect = (event: any) => {
          const place = event.place;
          setSelectedPlace(place);
          if (place?.location && map) {
              panToWithOffset(place.location);
          }
          // Auto-close sidebar on mobile after selection
          if (window.innerWidth < 640) {
            setIsSidebarOpen(false);
          }
      };

      placeSearch.addEventListener('gmp-load', handleLoad);
      placeSearch.addEventListener('gmp-select', handleSelect);
    } else {
      nearbyRequest = placeSearch.querySelector('gmp-place-nearby-search-request');
    }
    
    placeSearch.setAttribute('style', `color-scheme: ${isDarkMode ? 'dark' : 'light'}`);

    const updateSearch = () => {
      if (isManualSelectionRef.current) {
        isManualSelectionRef.current = false;
        return;
      }
      const bounds = map.getBounds();
      const center = map.getCenter();
      if (!bounds || !center || !nearbyRequest) return;

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const diameter = geometryLib.spherical.computeDistanceBetween(ne, sw);
      const radius = Math.min((diameter / 2), 50000);

      nearbyRequest.maxResultCount = 20;
      nearbyRequest.locationRestriction = { center, radius };
      nearbyRequest.includedTypes = [selectedType];
    };

    // Initial update
    updateSearch();

    // Update on map idle with debounce
    const debounceTimer = { current: null as NodeJS.Timeout | null };
    
    const debouncedUpdateSearch = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        updateSearch();
      }, 300);
    };

    const idleListener = map.addListener('idle', debouncedUpdateSearch);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      google.maps.event.removeListener(idleListener);
    };
  }, [map, coreLib, geometryLib, placesLib, selectedType, isDarkMode]);

  const onCityInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      handleCitySelect(map, val);
    }
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`sm:hidden absolute ${isStreetViewActive ? 'top-20' : 'top-4'} left-4 z-30 p-3 rounded-full shadow-xl bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 transition-all duration-300 active:scale-90`}
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar for Search Results - Absolute positioned over map */}
      <motion.div
        role="complementary"
        aria-label="Place search and itinerary"
        initial={{ x: -400, opacity: 0 }}
        animate={{
          x: isStreetViewActive ? -400 : (isSidebarOpen ? 0 : -400),
          opacity: isStreetViewActive ? 0 : 1,
          pointerEvents: isStreetViewActive ? 'none' : 'auto'
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`left-panel absolute top-4 left-4 bottom-8 w-[calc(100%-2rem)] sm:w-80 shadow-2xl z-20 flex flex-col border overflow-hidden transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl font-sans`}
      >
        <div className="p-4 border-b shrink-0 transition-colors duration-200 bg-white dark:bg-linear-to-br dark:from-indigo-900 dark:to-slate-950 text-slate-900 dark:text-white shadow-sm dark:shadow-lg border-slate-100 dark:border-indigo-900/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2 text-indigo-600 dark:text-white">
              <MapPin className="w-5 h-5" />
              Travel Planner
            </h2>
            <div className="relative group">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-full transition-all active:scale-90 border bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-white border-slate-200 dark:border-white/10"
                aria-label="Toggle dark mode"
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-bold rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-white/10">
                {isDarkMode ? "Light Mode" : "Dark Mode"}
              </div>
            </div>
          </div>
          
          <div className="mb-4 relative">
            <div className="flex items-center gap-1 mb-1">
              <label className="text-[10px] uppercase tracking-wider font-bold block text-slate-400 dark:text-white/70">Jump to City</label>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfo(!showInfo);
                }}
                className="transition-colors p-1 text-slate-400 dark:text-white/70 hover:text-indigo-600 dark:hover:text-white"
                aria-label="More information about city search"
                title="Why is this a fixed list?"
              >
                <Info className="w-3 h-3" />
              </button>
            </div>

            <AnimatePresence>
              {showInfo && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="absolute left-0 top-4 mt-2 p-3 rounded-lg shadow-xl z-50 text-xs border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                  <p>
                    This applet uses a fixed city list. To search for any address, get a <a href="https://developers.google.com/maps/get-started" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">standard API Key</a> with Geocoding API and Places API enable to add this functionality.
                  </p>
                  <button 
                    onClick={() => setShowInfo(false)}
                    className="mt-2 font-bold uppercase text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                  >
                    Close
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <select 
                value={citySearch}
                onChange={onCityInputChange}
                aria-label="Select a city to explore"
                className="w-full p-2 rounded text-sm outline-none shadow-inner cursor-pointer transition-colors duration-200 border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400"
              >
                <option value="" disabled>Select a city...</option>
                {POPULAR_CITIES.map(city => (
                  <option key={city.name} value={city.name}>{city.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {['Paris', 'London', 'NYC', 'Tokyo', 'SF', 'Milan'].map(name => (
                <button
                  key={name}
                  onClick={() => {
                    let searchName = name;
                    if (name === 'NYC') searchName = 'New York';
                    if (name === 'SF') searchName = 'San Francisco';
                    const fullName = POPULAR_CITIES.find(c => c.name.includes(searchName))?.name;
                    if (fullName) handleCitySelect(map, fullName);
                  }}
                  className="text-[10px] px-2 py-1 rounded transition-colors font-medium bg-slate-100 dark:bg-white/20 hover:bg-slate-200 dark:hover:bg-white/30 text-slate-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-white/50"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex rounded-lg p-1 transition-colors duration-200 bg-slate-100 dark:bg-indigo-950/50 backdrop-blur-sm">
            <button 
              onClick={() => {
                setActiveTab('search');
                setSelectedPlace(null);
              }}
              aria-label="Discover places"
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all duration-300 ${activeTab === 'search' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md scale-[1.02]' : 'text-slate-500 dark:text-white/70 hover:text-slate-700 dark:hover:text-white'}`}
            >
              <Search className="w-3.5 h-3.5" />
              Discover
            </button>
            <button 
              onClick={() => {
                setActiveTab('saved');
                setSelectedPlace(null);
              }}
              aria-label={`View saved places with ${itinerary.length} items`}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all duration-300 ${activeTab === 'saved' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md scale-[1.02]' : 'text-slate-500 dark:text-white/70 hover:text-slate-700 dark:hover:text-white'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Saved ({itinerary.length})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative flex flex-col transition-colors duration-200 bg-white dark:bg-slate-900">
          {/* Search Tab Content */}
          <div className={`flex-1 flex flex-col overflow-hidden ${activeTab !== 'search' ? 'hidden' : ''}`}>
            <div className="p-3 border-b transition-colors duration-200 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800">
              <label className="text-[10px] uppercase tracking-wider font-bold mb-1 block text-slate-500 dark:text-slate-400">Explore Nearby</label>
              <select 
                className="w-full p-2 rounded border text-sm outline-none cursor-pointer transition-colors duration-200 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400"
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setSelectedPlace(null);
                }}
                aria-label="Filter places by type"
              >
                <option value="tourist_attraction">Tourist Attractions</option>
                <option value="museum">Museums</option>
                <option value="park">Parks</option>
                <option value="restaurant">Restaurants</option>
                <option value="cafe">Cafes</option>
              </select>
            </div>
            <div ref={placeSearchRef} className="flex-1 overflow-y-auto custom-scrollbar"></div>
          </div>

          {/* Saved Tab Content */}
          <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 ${activeTab !== 'saved' ? 'hidden' : ''}`}>
            {itinerary.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 px-4"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-slate-100 dark:bg-slate-800">
                  <Star className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Your saved list is empty.</p>
                <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">Discover places and click "Save" to keep them here.</p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {itinerary.map((place) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={place.id || place.name} 
                    className="group rounded-xl border transition-all relative overflow-hidden bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 shadow-sm hover:shadow-md"
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromItinerary(place.id || place.name);
                      }}
                      className="absolute top-2 right-2 p-1.5 transition-all rounded-md z-10 backdrop-blur-sm shadow-sm bg-white/80 dark:bg-slate-800/80 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      aria-label={`Remove ${place.displayName} from itinerary`}
                      title="Remove from itinerary"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div 
                      className="cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => {
                        if (place.location && map) {
                          panToWithOffset(place.location);
                          setSelectedPlace(place);
                          // Auto-close sidebar on mobile after selection
                          if (window.innerWidth < 640) {
                            setIsSidebarOpen(false);
                          }
                        }
                      }}
                    >
                      {/* @ts-ignore */}
                      <gmp-place-details-compact
                          internal-usage-attribution-ids="gmp_mcp_codeassist_v1_aistudio,ais_demo_api_key_applet_x7b2c9d4e1"
                          className="saved-list-item"
                          orientation="HORIZONTAL"
                          style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                      >
                        {/* @ts-ignore */}
                        <gmp-place-details-place-request
                          place={place.id || place.name}
                        ></gmp-place-details-place-request>
                        {/* @ts-ignore */}
                        <gmp-place-all-content></gmp-place-all-content>
                      </gmp-place-details-compact>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};

const MapMarkers = ({
  places,
  selectedPlace,
  setSelectedPlace,
  itinerary,
  addToItinerary,
  isStreetViewActive,
  isDarkMode,
  onShowVlogs,
  onShowCalendar,
}: {
  places: any[];
  selectedPlace: any | null;
  setSelectedPlace: (place: any | null) => void;
  itinerary: any[];
  addToItinerary: (place: any) => void;
  isStreetViewActive: boolean;
  isDarkMode: boolean;
  onShowVlogs: () => void;
  onShowCalendar: () => void;
}) => {
  const map = useMap();
  
  const panToWithOffset = (location: google.maps.LatLngLiteral) => {
    if (!map) return;
    // Single smooth pan. InfoWindow's autoPan will handle the rest.
    map.panTo(location);
  };

  // Combine places from search and itinerary to ensure all are marked
  // We use a Map to avoid duplicates by ID
  const allPlacesMap = new Map<string, any>();
  
  // Add search results first
  places.forEach(p => {
    const id = p.id || p.name;
    if (id) allPlacesMap.set(id, p);
  });
  
  // Add itinerary items (they might overwrite search results with their simplified versions, 
  // but that's okay for markers, or we can prefer search results if they exist)
  itinerary.forEach(p => {
    const id = p.id || p.name;
    if (id && !allPlacesMap.has(id)) {
      allPlacesMap.set(id, p);
    }
  });

  const allPlaces = Array.from(allPlacesMap.values()) as any[];

  return (
    <>
      {/* Markers on Map */}
      {allPlaces.map((place: any) => {
        const isSelected = selectedPlace && (selectedPlace.id || selectedPlace.name) === (place.id || place.name);
        const isInItinerary = itinerary.some(p => (p.id || p.name) === (place.id || place.name));
        
        // Color logic:
        // 1. Selected (Active) -> Rose
        // 2. In Itinerary -> Amber (Gold)
        // 3. Just a search result -> Indigo
        let markerColor = 'bg-indigo-500';
        if (isSelected) {
          markerColor = 'bg-rose-500';
        } else if (isInItinerary) {
          markerColor = 'bg-amber-500';
        }

        return (
          place.location && (
            <AdvancedMarker
              key={place.id || place.name}
              position={place.location}
              title={typeof place.displayName === 'object' ? place.displayName.text : place.displayName}
              onClick={() => {
                setSelectedPlace(place);
                if (place.location && map) {
                  panToWithOffset(place.location);
                }
              }}
            >
               <div className={`p-2 rounded-full border-2 border-white shadow-lg transition-all cursor-pointer ${isSelected ? 'scale-125 z-50 ring-4 ring-rose-500/20' : 'hover:scale-110'} ${markerColor}`}>
                  <MapPin className="w-4 h-4 text-white fill-current" />
               </div>
            </AdvancedMarker>
          )
        );
      })}

      {/* Place Details Popup */}
      {selectedPlace && (selectedPlace.id || selectedPlace.name) && !isStreetViewActive && (
        <InfoWindow
          position={selectedPlace.location}
          onCloseClick={() => setSelectedPlace(null)}
          pixelOffset={[0, -30]}
          disableAutoPan={false}
        >
          <div className="w-[320px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans" style={{maxWidth: "100%", colorScheme: isDarkMode ? 'dark' : 'light'}}>
             {/* @ts-ignore */}
            <gmp-place-details-compact
                key={selectedPlace.id || selectedPlace.name}
                internal-usage-attribution-ids="gmp_mcp_codeassist_v1_aistudio,ais_demo_api_key_applet_x7b2c9d4e1"
                className="info-window-compact"
                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
            >
              {/* @ts-ignore */}
              <gmp-place-details-place-request
                place={selectedPlace.id || selectedPlace.name}
              ></gmp-place-details-place-request>
              {/* @ts-ignore */}
              <gmp-place-all-content></gmp-place-all-content>
            </gmp-place-details-compact>
            
            <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2">
                {/* Save button */}
                <button
                  onClick={() => addToItinerary(selectedPlace)}
                  disabled={itinerary.some(p => (p.id || p.name) === (selectedPlace.id || selectedPlace.name))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md ${
                    itinerary.some(p => (p.id || p.name) === (selectedPlace.id || selectedPlace.name))
                      ? 'bg-amber-500 text-white cursor-default shadow-amber-200/50 dark:shadow-none'
                      : 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-amber-200/50 dark:shadow-none'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${itinerary.some(p => (p.id || p.name) === (selectedPlace.id || selectedPlace.name)) ? 'fill-current' : ''}`} />
                  {itinerary.some(p => (p.id || p.name) === (selectedPlace.id || selectedPlace.name)) ? 'Saved' : 'Save'}
                </button>

                {/* Vlogs button */}
                <button
                  onClick={onShowVlogs}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all bg-rose-500 hover:bg-rose-600 active:scale-95 text-white shadow-md shadow-rose-200/50 dark:shadow-none"
                  aria-label="Watch travel vlogs for this place"
                  title="Watch travel vlogs"
                >
                  <Youtube className="w-3.5 h-3.5" aria-hidden="true" />
                  Vlogs
                </button>

                {/* Calendar button */}
                <button
                  onClick={onShowCalendar}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-md shadow-indigo-200/50 dark:shadow-none"
                  aria-label="Plan your visit to this place"
                  title="Plan your visit"
                >
                  <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                  Plan
                </button>
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const StreetViewObserver = ({ setIsStreetViewActive }: { setIsStreetViewActive: (active: boolean) => void }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const streetView = map.getStreetView();
    const listener = streetView.addListener('visible_changed', () => {
      setIsStreetViewActive(streetView.getVisible());
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, setIsStreetViewActive]);
  return null;
};

export default function MapComponent({ apiKey, isDarkMode, setIsDarkMode }: MapComponentProps) {
  const [places, setPlaces] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [selectedType, setSelectedType] = useState('tourist_attraction');
  const [itinerary, setItinerary] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search');
  const [citySearch, setCitySearch] = useState('');
  const [isStreetViewActive, setIsStreetViewActive] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 600);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'vlogs' | 'calendar'>('vlogs');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 600) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Controlled map state
  const [mapCenter, setMapCenter] = useState({ lat: 48.8566, lng: 2.3522 });
  const [mapZoom, setMapZoom] = useState(13);

  const handleCitySelect = (map: any, cityName: string) => {
    if (!map) {
      return
    }
    const city = POPULAR_CITIES.find(c => c.name === cityName);
    if (city) {
      map.setCenter({ lat: city.lat, lng: city.lng });
      setMapZoom(12);
      setSelectedPlace(null);
      setCitySearch(cityName);
    }
  };

  const addToItinerary = (place: any) => {
    if (!place) return;
    const placeId = place.id || place.name || (place.place_id);
    if (!placeId) return;

    if (!itinerary.find(p => (p.id || p.name) === placeId)) {
      // Create a simplified object for the itinerary to ensure persistence
      const name = typeof place.displayName === 'object' ? place.displayName.text : (place.displayName || place.name || 'Selected Place');
      const address = place.formattedAddress || place.vicinity || '';
      
      let lat = 0;
      let lng = 0;
      if (place.location) {
        lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat;
        lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng;
      }

      const itineraryItem = {
        id: placeId,
        displayName: name,
        formattedAddress: address,
        location: { lat, lng }
      };
      setItinerary([...itinerary, itineraryItem]);
      setActiveTab('saved');
    }
  };

  const removeFromItinerary = (placeId: string) => {
    setItinerary(itinerary.filter(p => (p.id || p.name) !== placeId));
  };

  return (
    <div className="w-full h-full relative overflow-hidden font-sans">
      <APIProvider apiKey={apiKey} libraries={['places', 'marker', 'geometry', 'core']} version="weekly">
        <GoogleMap
          defaultCenter={mapCenter}
          zoom={mapZoom}
          renderingType="VECTOR"
          onCenterChanged={(ev) => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
              setMapCenter(ev.detail.center);
            }, 300);
          }}
          onZoomChanged={(ev) => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
              setMapZoom(ev.detail.zoom);
            }, 300);
          }}
          mapId="DEMO_MAP_ID"
          colorScheme={isDarkMode ? 'DARK' : 'LIGHT'}
          className="w-full h-full"
          disableDefaultUI={false}
          mapTypeControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio', 'ais_demo_api_key_applet_x7b2c9d4e1']}
          clickableIcons={false}
        >
          <StreetViewObserver setIsStreetViewActive={setIsStreetViewActive} />
          <PlacesSearch 
            itinerary={itinerary}
            setItinerary={setItinerary}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            places={places}
            setPlaces={setPlaces}
            selectedPlace={selectedPlace}
            setSelectedPlace={setSelectedPlace}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            removeFromItinerary={removeFromItinerary}
            citySearch={citySearch}
            handleCitySelect={handleCitySelect}
            isStreetViewActive={isStreetViewActive}
            setIsStreetViewActive={setIsStreetViewActive}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
          <MapMarkers
            places={places}
            selectedPlace={selectedPlace}
            setSelectedPlace={setSelectedPlace}
            itinerary={itinerary}
            addToItinerary={addToItinerary}
            isStreetViewActive={isStreetViewActive}
            isDarkMode={isDarkMode}
            onShowVlogs={() => { setPanelTab('vlogs'); setPanelOpen(true); }}
            onShowCalendar={() => { setPanelTab('calendar'); setPanelOpen(true); }}
          />
        </GoogleMap>
      </APIProvider>

      {/* Place Actions Panel — YouTube Vlogs + Google Calendar */}
      <AnimatePresence>
        {panelOpen && selectedPlace && (
          <PlaceActionsPanel
            place={selectedPlace}
            initialTab={panelTab}
            onClose={() => setPanelOpen(false)}
            isDarkMode={isDarkMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
