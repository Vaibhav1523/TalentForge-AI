"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { Country, State, City } from 'country-state-city';

interface LocationSelectorProps {
    selectedCountryIso: string;
    setSelectedCountryIso: (iso: string) => void;
    selectedStateIso: string;
    setSelectedStateIso: (iso: string) => void;
    selectedCityName: string;
    setSelectedCityName: (name: string) => void;
    pincode: string;
    setPincode: (code: string) => void;
}

export default function LocationSelector({
    selectedCountryIso,
    setSelectedCountryIso,
    selectedStateIso,
    setSelectedStateIso,
    selectedCityName,
    setSelectedCityName,
    pincode,
    setPincode
}: LocationSelectorProps) {

    const allCountries = useMemo(() => {
        const seen = new Set<string>();
        return Country.getAllCountries()
            .filter((country) => {
                const key = country.isoCode.trim().toUpperCase();
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, []);

    const allStates = useMemo(() => {
        if (!selectedCountryIso) return [];
        const seen = new Set<string>();
        return State.getStatesOfCountry(selectedCountryIso)
            .filter((state) => {
                const key = (state.isoCode || state.name).trim().toUpperCase();
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedCountryIso]);

    const allCities = useMemo(() => {
        if (!selectedStateIso) return [];
        const seen = new Set<string>();
        return City.getCitiesOfState(selectedCountryIso, selectedStateIso)
            .filter((city) => {
                const key = city.name.trim().toLowerCase();
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedCountryIso, selectedStateIso]);

    const [countryInput, setCountryInput] = useState('');
    const [stateInput, setStateInput] = useState('');
    const [cityInput, setCityInput] = useState('');

    const [countryOpen, setCountryOpen] = useState(false);
    const [stateOpen, setStateOpen] = useState(false);
    const [cityOpen, setCityOpen] = useState(false);

    const rootRef = useRef<HTMLDivElement>(null);

    const normalize = (value: string) => value.trim().toLowerCase();

    const selectedCountryName = useMemo(
        () => allCountries.find((country) => country.isoCode === selectedCountryIso)?.name ?? '',
        [allCountries, selectedCountryIso]
    );

    const selectedStateName = useMemo(
        () => allStates.find((state) => state.isoCode === selectedStateIso)?.name ?? '',
        [allStates, selectedStateIso]
    );

    useEffect(() => {
        if (!countryOpen) {
            setCountryInput(selectedCountryName);
        }
    }, [selectedCountryName, countryOpen]);

    useEffect(() => {
        if (!stateOpen) {
            setStateInput(selectedStateName);
        }
    }, [selectedStateName, stateOpen]);

    useEffect(() => {
        if (!cityOpen) {
            setCityInput(selectedCityName || '');
        }
    }, [selectedCityName, cityOpen]);

    useEffect(() => {
        const closeIfOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (rootRef.current?.contains(target)) return;
            setCountryOpen(false);
            setStateOpen(false);
            setCityOpen(false);
        };

        document.addEventListener('mousedown', closeIfOutside);
        document.addEventListener('touchstart', closeIfOutside);

        return () => {
            document.removeEventListener('mousedown', closeIfOutside);
            document.removeEventListener('touchstart', closeIfOutside);
        };
    }, []);

    const filteredCountries = useMemo(() => {
        const term = normalize(countryInput);
        return term ? allCountries.filter((country) => country.name.toLowerCase().includes(term)) : allCountries;
    }, [allCountries, countryInput]);

    const filteredStates = useMemo(() => {
        const term = normalize(stateInput);
        return term ? allStates.filter((state) => state.name.toLowerCase().includes(term)) : allStates;
    }, [allStates, stateInput]);

    const filteredCities = useMemo(() => {
        const term = normalize(cityInput);
        return term ? allCities.filter((city) => city.name.toLowerCase().includes(term)) : allCities;
    }, [allCities, cityInput]);

    const selectCountry = (country: { name: string; isoCode: string }) => {
        const changed = selectedCountryIso !== country.isoCode;
        setCountryInput(country.name);
        setSelectedCountryIso(country.isoCode);
        if (changed) {
            setSelectedStateIso('');
            setSelectedCityName('');
            setStateInput('');
            setCityInput('');
        }
        setCountryOpen(false);
    };

    const selectState = (state: { name: string; isoCode: string }) => {
        const changed = selectedStateIso !== state.isoCode;
        setStateInput(state.name);
        setSelectedStateIso(state.isoCode);
        if (changed) {
            setSelectedCityName('');
            setCityInput('');
        }
        setStateOpen(false);
    };

    const selectCity = (cityName: string) => {
        setCityInput(cityName);
        setSelectedCityName(cityName);
        setCityOpen(false);
    };

    return (
        <div className="location-selector-root" ref={rootRef}>
            {/* Country */}
            <div className="form-group">
                <label className="form-label" htmlFor="location-country">Country</label>
                <div className="input-wrapper location-input-shell">
                    <MapPin size={18} />
                    <div className="location-field-shell">
                        <input
                            id="location-country"
                            type="text"
                            className="form-input"
                            value={countryInput}
                            autoComplete="off"
                            onFocus={() => {
                                setCountryOpen(true);
                                setStateOpen(false);
                                setCityOpen(false);
                            }}
                            onClick={() => setCountryOpen(true)}
                            onChange={(e) => {
                                const val = e.target.value;
                                setCountryInput(val);
                                setCountryOpen(true);

                                const exactCountry = allCountries.find((country) => normalize(country.name) === normalize(val));
                                if (exactCountry) {
                                    if (selectedCountryIso !== exactCountry.isoCode) {
                                        setSelectedCountryIso(exactCountry.isoCode);
                                        setSelectedStateIso('');
                                        setSelectedCityName('');
                                        setStateInput('');
                                        setCityInput('');
                                    }
                                } else {
                                    setSelectedCountryIso('');
                                    setSelectedStateIso('');
                                    setSelectedCityName('');
                                    setStateInput('');
                                    setCityInput('');
                                }
                            }}
                            placeholder="Search or select country..."
                        />
                        <button
                            type="button"
                            className="location-dropdown-trigger"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setCountryOpen((prev) => !prev);
                                setStateOpen(false);
                                setCityOpen(false);
                            }}
                            aria-label="Toggle countries list"
                        >
                            <ChevronDown size={16} className={`location-dropdown-chevron ${countryOpen ? 'open' : ''}`} />
                        </button>
                        {countryOpen && (
                            <div className="location-dropdown-menu" role="listbox">
                                {filteredCountries.length > 0 ? (
                                    filteredCountries.map((country) => (
                                        <button
                                            key={country.isoCode}
                                            type="button"
                                            className={`location-dropdown-option ${selectedCountryIso === country.isoCode ? 'active' : ''}`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                selectCountry(country);
                                            }}
                                        >
                                            <span>{country.name}</span>
                                            <span className="location-dropdown-meta">{country.isoCode}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="location-dropdown-empty">No countries found</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* State */}
            <div className="form-group">
                <label className="form-label">State / Province</label>
                <div className="input-wrapper location-input-shell">
                    <MapPin size={18} />
                    <div className="location-field-shell">
                        <input
                            type="text"
                            className="form-input"
                            value={stateInput}
                            autoComplete="off"
                            onFocus={() => {
                                if (!selectedCountryIso) return;
                                setStateOpen(true);
                                setCountryOpen(false);
                                setCityOpen(false);
                            }}
                            onClick={() => {
                                if (!selectedCountryIso) return;
                                setStateOpen(true);
                            }}
                            onChange={(e) => {
                                const val = e.target.value;
                                setStateInput(val);
                                if (!selectedCountryIso) return;
                                setStateOpen(true);
                                const exactState = allStates.find((state) => normalize(state.name) === normalize(val));
                                if (exactState) {
                                    if (selectedStateIso !== exactState.isoCode) {
                                        setSelectedStateIso(exactState.isoCode);
                                        setSelectedCityName('');
                                        setCityInput('');
                                    }
                                } else {
                                    setSelectedStateIso('');
                                    setSelectedCityName('');
                                    setCityInput('');
                                }
                            }}
                            placeholder={selectedCountryIso ? "Search or select state..." : "Select country first"}
                            disabled={!selectedCountryIso}
                        />
                        <button
                            type="button"
                            className="location-dropdown-trigger"
                            disabled={!selectedCountryIso}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                if (!selectedCountryIso) return;
                                setStateOpen((prev) => !prev);
                                setCountryOpen(false);
                                setCityOpen(false);
                            }}
                            aria-label="Toggle states list"
                        >
                            <ChevronDown size={16} className={`location-dropdown-chevron ${stateOpen ? 'open' : ''}`} />
                        </button>
                        {stateOpen && selectedCountryIso && (
                            <div className="location-dropdown-menu" role="listbox">
                                {filteredStates.length > 0 ? (
                                    filteredStates.map((state) => (
                                        <button
                                            key={state.isoCode}
                                            type="button"
                                            className={`location-dropdown-option ${selectedStateIso === state.isoCode ? 'active' : ''}`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                selectState(state);
                                            }}
                                        >
                                            <span>{state.name}</span>
                                            <span className="location-dropdown-meta">{state.isoCode}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="location-dropdown-empty">No states found</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* City */}
            <div className="form-group">
                <label className="form-label">City</label>
                <div className="input-wrapper location-input-shell">
                    <MapPin size={18} />
                    <div className="location-field-shell">
                        <input
                            type="text"
                            className="form-input"
                            value={cityInput}
                            autoComplete="off"
                            onFocus={() => {
                                if (!selectedStateIso) return;
                                setCityOpen(true);
                                setCountryOpen(false);
                                setStateOpen(false);
                            }}
                            onClick={() => {
                                if (!selectedStateIso) return;
                                setCityOpen(true);
                            }}
                            onChange={(e) => {
                                const val = e.target.value;
                                setCityInput(val);
                                setSelectedCityName(val);
                                if (!selectedStateIso) return;
                                setCityOpen(true);
                            }}
                            placeholder={selectedStateIso ? "Search or select city..." : "Select state first"}
                            disabled={!selectedStateIso}
                        />
                        <button
                            type="button"
                            className="location-dropdown-trigger"
                            disabled={!selectedStateIso}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                if (!selectedStateIso) return;
                                setCityOpen((prev) => !prev);
                                setCountryOpen(false);
                                setStateOpen(false);
                            }}
                            aria-label="Toggle cities list"
                        >
                            <ChevronDown size={16} className={`location-dropdown-chevron ${cityOpen ? 'open' : ''}`} />
                        </button>
                        {cityOpen && selectedStateIso && (
                            <div className="location-dropdown-menu" role="listbox">
                                {filteredCities.length > 0 ? (
                                    filteredCities.map((city, index) => (
                                        <button
                                            key={`${city.name}-${index}`}
                                            type="button"
                                            className={`location-dropdown-option ${normalize(selectedCityName) === normalize(city.name) ? 'active' : ''}`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                selectCity(city.name);
                                            }}
                                        >
                                            <span>{city.name}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="location-dropdown-empty">No cities found</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Pincode */}
            <div className="form-group">
                <label className="form-label">Pincode / ZIP Code</label>
                <div className="input-wrapper location-input-shell">
                    <MapPin size={18} />
                    <div className="location-field-shell">
                        <input
                            type="text"
                            className="form-input"
                            value={pincode}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '');
                                setPincode(value);
                            }}
                            placeholder="Enter postal code"
                            maxLength={10}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
