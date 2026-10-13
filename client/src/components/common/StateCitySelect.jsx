import React, { useMemo } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { NIGERIA_STATES_AND_CITIES, getCitiesByState } from '../../data/nigeriaLocations';

/**
 * Reusable Cascading State & City/Town Dropdown Selector for Nigeria (36 States + FCT Abuja).
 */
export default function StateCitySelect({
  selectedState = '',
  selectedCity = '',
  onStateChange,
  onCityChange,
  stateLabel = 'State *',
  cityLabel = 'City / Town / Territory *',
  stateRequired = true,
  cityRequired = true,
  disabled = false,
  className = '',
  layout = 'grid' // 'grid' (2 columns) | 'stacked'
}) {
  const cities = useMemo(() => {
    return getCitiesByState(selectedState);
  }, [selectedState]);

  const handleStateSelect = (e) => {
    const newState = e.target.value;
    onStateChange?.(newState);
    // If current city is not in the new state's cities, reset or suggest the first city
    const newCities = getCitiesByState(newState);
    if (newCities.length > 0 && !newCities.includes(selectedCity)) {
      onCityChange?.(newCities[0]);
    } else if (!newState) {
      onCityChange?.('');
    }
  };

  const handleCitySelect = (e) => {
    onCityChange?.(e.target.value);
  };

  return (
    <div className={layout === 'grid' ? `grid md:grid-cols-2 gap-3 ${className}` : `space-y-3 ${className}`}>
      {/* State Selector */}
      <div>
        <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1">
          <MapPin size={13} className="text-orange-500" />
          <span>{stateLabel}</span>
        </label>
        <select
          value={selectedState}
          onChange={handleStateSelect}
          required={stateRequired}
          disabled={disabled}
          className="form-input bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs"
        >
          <option value="">-- Select Nigerian State --</option>
          {NIGERIA_STATES_AND_CITIES.map((item) => (
            <option key={item.state} value={item.state}>
              {item.state} ({item.geo_zone})
            </option>
          ))}
        </select>
      </div>

      {/* City / Town / Hub Selector */}
      <div>
        <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1">
          <Navigation size={13} className="text-amber-500" />
          <span>{cityLabel}</span>
        </label>
        {cities.length > 0 ? (
          <select
            value={selectedCity}
            onChange={handleCitySelect}
            required={cityRequired}
            disabled={disabled || !selectedState}
            className="form-input bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs"
          >
            <option value="">-- Select Town / City --</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            placeholder={selectedState ? `Enter town in ${selectedState}` : 'First select a state'}
            value={selectedCity}
            onChange={handleCitySelect}
            required={cityRequired}
            disabled={disabled || !selectedState}
            className="form-input bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs"
          />
        )}
      </div>
    </div>
  );
}
