'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from "next-auth/react";
import {
    UploadCloud, Camera, User, Phone, MapPin,
    Linkedin, Github, Twitter, Trash2, Eye, FileText, Image as ImageIcon,
    ChevronDown, Search
} from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { formatIndian, blurFormatIndian, toNumericString } from '@/lib/formatIndianNumber';

const LocationSelector = dynamic(() => import('@/components/dashboard/LocationSelector'), {
    loading: () => (
        <div className="space-y-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 bg-slate-100/50 animate-pulse rounded-xl border border-slate-200/50"></div>
                ))}
            </div>
        </div>
    ),
    ssr: false
});


const MAX_RESUME_MB = 5;
const MAX_RESUME_BYTES = MAX_RESUME_MB * 1024 * 1024;

const COUNTRIES = [
    // North America
    { name: 'United States', code: '+1', flag: '🇺🇸' },
    { name: 'Canada', code: '+1', flag: '🇨🇦' },
    { name: 'Mexico', code: '+52', flag: '🇲🇽' },

    // South America
    { name: 'Brazil', code: '+55', flag: '🇧🇷' },
    { name: 'Argentina', code: '+54', flag: '🇦🇷' },
    { name: 'Chile', code: '+56', flag: '🇨🇱' },
    { name: 'Colombia', code: '+57', flag: '🇨🇴' },
    { name: 'Peru', code: '+51', flag: '🇵🇪' },

    // Europe
    { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
    { name: 'Germany', code: '+49', flag: '🇩🇪' },
    { name: 'France', code: '+33', flag: '🇫🇷' },
    { name: 'Italy', code: '+39', flag: '🇮🇹' },
    { name: 'Spain', code: '+34', flag: '🇪🇸' },
    { name: 'Netherlands', code: '+31', flag: '🇳🇱' },
    { name: 'Belgium', code: '+32', flag: '🇧🇪' },
    { name: 'Switzerland', code: '+41', flag: '🇨🇭' },
    { name: 'Austria', code: '+43', flag: '🇦🇹' },
    { name: 'Sweden', code: '+46', flag: '🇸🇪' },
    { name: 'Norway', code: '+47', flag: '🇳🇴' },
    { name: 'Denmark', code: '+45', flag: '🇩🇰' },
    { name: 'Finland', code: '+358', flag: '🇫🇮' },
    { name: 'Poland', code: '+48', flag: '🇵🇱' },
    { name: 'Czech Republic', code: '+420', flag: '🇨🇿' },
    { name: 'Hungary', code: '+36', flag: '🇭🇺' },
    { name: 'Romania', code: '+40', flag: '🇷🇴' },
    { name: 'Russia', code: '+7', flag: '🇷🇺' },
    { name: 'Turkey', code: '+90', flag: '🇹🇷' },
    { name: 'Greece', code: '+30', flag: '🇬🇷' },
    { name: 'Portugal', code: '+351', flag: '🇵🇹' },
    { name: 'Ireland', code: '+353', flag: '🇮🇪' },

    // Asia
    { name: 'India', code: '+91', flag: '🇮🇳' },
    { name: 'China', code: '+86', flag: '🇨🇳' },
    { name: 'Japan', code: '+81', flag: '🇯🇵' },
    { name: 'South Korea', code: '+82', flag: '🇰🇷' },
    { name: 'Singapore', code: '+65', flag: '🇸🇬' },
    { name: 'Malaysia', code: '+60', flag: '🇲🇾' },
    { name: 'Indonesia', code: '+62', flag: '🇮🇩' },
    { name: 'Thailand', code: '+66', flag: '🇹🇭' },
    { name: 'Vietnam', code: '+84', flag: '🇻🇳' },
    { name: 'Philippines', code: '+63', flag: '🇵🇭' },
    { name: 'Pakistan', code: '+92', flag: '🇵🇰' },
    { name: 'Bangladesh', code: '+880', flag: '🇧🇩' },
    { name: 'Sri Lanka', code: '+94', flag: '🇱🇰' },
    { name: 'Hong Kong', code: '+852', flag: '🇭🇰' },
    { name: 'Taiwan', code: '+886', flag: '🇹🇼' },

    // Middle East
    { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
    { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
    { name: 'Qatar', code: '+974', flag: '🇶🇦' },
    { name: 'Kuwait', code: '+965', flag: '🇰🇼' },
    { name: 'Bahrain', code: '+973', flag: '🇧🇭' },
    { name: 'Oman', code: '+968', flag: '🇴🇲' },
    { name: 'Israel', code: '+972', flag: '🇮🇱' },
    { name: 'Jordan', code: '+962', flag: '🇯🇴' },
    { name: 'Lebanon', code: '+961', flag: '🇱🇧' },

    // Africa
    { name: 'South Africa', code: '+27', flag: '🇿🇦' },
    { name: 'Egypt', code: '+20', flag: '🇪🇬' },
    { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
    { name: 'Kenya', code: '+254', flag: '🇰🇪' },
    { name: 'Morocco', code: '+212', flag: '🇲🇦' },

    // Oceania
    { name: 'Australia', code: '+61', flag: '🇦🇺' },
    { name: 'New Zealand', code: '+64', flag: '🇳🇿' },
].sort((a, b) => a.name.localeCompare(b.name));

import { CURRENCIES } from '@/lib/constants/currencies';

export default function ProfilePage() {
    const { data: session, status } = useSession();

    // Form States
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedCountryName, setSelectedCountryName] = useState('United States');
    const [selectedCountryCode, setSelectedCountryCode] = useState('+1');

    // Location States - using ISO codes for proper linking
    const [selectedCountryIso, setSelectedCountryIso] = useState('');
    const [selectedStateIso, setSelectedStateIso] = useState('');
    const [selectedCityName, setSelectedCityName] = useState('');
    const [pincode, setPincode] = useState('');


    const [linkedin, setLinkedin] = useState('');
    const [github, setGithub] = useState('');
    const [twitter, setTwitter] = useState('');
    const [noticePeriod, setNoticePeriod] = useState('Immediate');

    // CTC States - Store only currency codes, derive objects when needed
    const [currentCurrencyCode, setCurrentCurrencyCode] = useState('USD');
    const [currentCTC, setCurrentCTC] = useState('');
    const [expectedCurrencyCode, setExpectedCurrencyCode] = useState('USD');
    const [expectedCTC, setExpectedCTC] = useState('');

    // Derive currency objects from codes
    const currentCurrency = CURRENCIES.find(c => c.code === currentCurrencyCode) || CURRENCIES[0];
    const expectedCurrency = CURRENCIES.find(c => c.code === expectedCurrencyCode) || CURRENCIES[0];

    // Derive country object from unique name first (code can be shared, e.g. +1)
    const countryCode =
        COUNTRIES.find(c => c.name === selectedCountryName && c.code === selectedCountryCode) ||
        COUNTRIES.find(c => c.name === selectedCountryName) ||
        COUNTRIES.find(c => c.code === selectedCountryCode) ||
        COUNTRIES[0];

    // Media States
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [profileResumeUrl, setProfileResumeUrl] = useState<string | null>(null);
    const [isUploadingResume, setIsUploadingResume] = useState(false);

    // UI States
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const resumeInputRef = useRef<HTMLInputElement>(null);
    const countryDropdownRef = useRef<HTMLDivElement>(null);

    // Initialize data from API
    useEffect(() => {
        const fetchProfile = async () => {
            if (status === "authenticated") {
                try {
                    const res = await fetch('/api/profile');
                    if (res.ok) {
                        const data = await res.json();
                        setFullName(data.name || '');
                        setPhoneNumber(data.phoneNumber || '');
                        const incomingCountryCode = data.phoneCountryCode || '+1';
                        const matchByName = data.phoneCountryName
                            ? COUNTRIES.find((c) => c.name === data.phoneCountryName)
                            : undefined;
                        const matchingByCode = COUNTRIES.filter((c) => c.code === incomingCountryCode);
                        const matched =
                            matchByName ||
                            (matchingByCode.length === 1 ? matchingByCode[0] : undefined) ||
                            COUNTRIES[0];
                        setSelectedCountryName(matched.name);
                        setSelectedCountryCode(matched.code);
                        setSelectedCountryIso(data.countryIso || '');
                        setSelectedStateIso(data.state || '');
                        setSelectedCityName(data.city || '');
                        setLinkedin(data.linkedin || '');
                        setGithub(data.github || '');
                        setTwitter(data.twitter || '');

                        setCurrentCTC(data.currentCTC ? formatIndian(String(data.currentCTC)) : '');
                        setExpectedCTC(data.expectedCTC ? formatIndian(String(data.expectedCTC)) : '');

                        setCurrentCurrencyCode(data.currentCurrencyCode || localStorage.getItem('hookstep_curr_currency') || 'USD');
                        setExpectedCurrencyCode(data.expectedCurrencyCode || localStorage.getItem('hookstep_exp_currency') || 'USD');

                        setNoticePeriod(data.noticePeriod || 'Immediate');
                        setProfileImage(data.profileImageUrl || session?.user?.image || null);
                        setProfileResumeUrl(data.resumeUrl || null);
                    }
                } catch (error) {
                    console.error("Failed to load profile", error);
                }
            }
        };
        fetchProfile();
    }, [status, session]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
                setShowCountryDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const MAX_IMAGE_MB = 2;
    const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                toast.error('Only JPEG, PNG, WebP, and GIF images are allowed.');
                return;
            }
            if (file.size > MAX_IMAGE_BYTES) {
                toast.error(`Image must be under ${MAX_IMAGE_MB}MB.`);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ALLOWED_TYPES = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error('Only PDF, DOC, and DOCX files are allowed.');
            return;
        }
        if (file.size > MAX_RESUME_BYTES) {
            toast.error(`File must be under ${MAX_RESUME_MB}MB.`);
            return;
        }
        setIsUploadingResume(true);
        try {
            const formData = new FormData();
            formData.set('file', file);
            const res = await fetch('/api/upload/resume', { method: 'POST', body: formData, credentials: 'include' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Upload failed');
            }
            const data = await res.json();
            setProfileResumeUrl(data.resumeUrl ?? null);
            toast.success('Resume updated. Your profile CV is replaced.');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to upload resume.');
        } finally {
            setIsUploadingResume(false);
            e.target.value = '';
        }
    };

    const removeResume = async () => {
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeUrl: '' }),
            });
            if (!res.ok) throw new Error('Failed to remove');
            setProfileResumeUrl(null);
            toast.success('Resume removed.');
        } catch {
            toast.error('Failed to remove resume.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: fullName,
                    phoneNumber,
                    country: selectedCountryIso,
                    state: selectedStateIso,
                    city: selectedCityName,
                    linkedin,
                    github,
                    twitter,
                    currentCTC: toNumericString(currentCTC),
                    expectedCTC: toNumericString(expectedCTC),
                    currentCurrencyCode,
                    expectedCurrencyCode,
                    noticePeriod,
                    profileImageUrl: profileImage
                })
            });
            if (!response.ok) throw new Error('Failed to update profile');

            localStorage.setItem('hookstep_curr_currency', currentCurrencyCode);
            localStorage.setItem('hookstep_exp_currency', expectedCurrencyCode);

            alert('Profile updated successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    if (status === "loading") return <div className="p-8 text-center text-muted">Loading profile...</div>;

    return (
        <div className="profile-page profile-page-ref">
            <div className="page-header">
                <h1 className="page-title">Edit Profile</h1>
                <p className="page-subtitle">Manage your personal and professional information.</p>
            </div>

            <div className="profile-section card">
                {/* Profile Picture Section */}
                <div className="profile-header">
                    <div className="profile-avatar profile-avatar-clickable" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {profileImage ? (
                            <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div className="profile-empty-avatar">
                                <User size={48} />
                            </div>
                        )}
                        <div className="upload-overlay">
                            <Camera size={16} />
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            accept="image/*"
                            onChange={handleProfileImageUpload}
                        />
                    </div>
                    <div>
                        <h2 className="font-bold mb-1" style={{ fontSize: '20px' }}>
                            {fullName || 'Your Name'}
                        </h2>
                        <p className="text-muted">User Profile</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Personal Information */}
                    <div className="section-title">Personal Information</div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <div className="input-wrapper">
                                <User size={18} />
                                <input
                                    type="text"
                                    className="form-input"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Enter your full name"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <div className="phone-input-group">
                                <div className="country-selector" ref={countryDropdownRef}>
                                    <button
                                        type="button"
                                        className="form-input country-code-btn"
                                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                    >
                                        <span>{countryCode.flag} {countryCode.code}</span>
                                        <ChevronDown size={14} className="text-muted" />
                                    </button>

                                    {showCountryDropdown && (
                                        <div className="country-dropdown">
                                            {COUNTRIES.map((country) => (
                                                <div
                                                    key={country.name}
                                                    className="country-option"
                                                    role="option"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            setSelectedCountryName(country.name);
                                                            setSelectedCountryCode(country.code);
                                                            setShowCountryDropdown(false);
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        setSelectedCountryName(country.name);
                                                        setSelectedCountryCode(country.code);
                                                        setShowCountryDropdown(false);
                                                    }}
                                                >
                                                    <span>{country.flag}</span>
                                                    <span>{country.name}</span>
                                                    <span className="country-option-code">{country.code}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="input-wrapper phone-input-field">
                                    <Phone size={18} />
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Enter phone number"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group full-width profile-location-section">
                            <label className="form-label profile-location-title">Location Details (Optional)</label>
                            <LocationSelector
                                selectedCountryIso={selectedCountryIso}
                                setSelectedCountryIso={setSelectedCountryIso}
                                selectedStateIso={selectedStateIso}
                                setSelectedStateIso={setSelectedStateIso}
                                selectedCityName={selectedCityName}
                                setSelectedCityName={setSelectedCityName}
                                pincode={pincode}
                                setPincode={setPincode}
                            />
                        </div>
                    </div>

                    {/* Social Links */}
                    <div className="section-title mt-8">Social Links</div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">LinkedIn (Optional)</label>
                            <div className="input-wrapper">
                                <Linkedin size={18} />
                                <input
                                    type="url"
                                    className="form-input"
                                    value={linkedin}
                                    onChange={(e) => setLinkedin(e.target.value)}
                                    placeholder="https://linkedin.com/in/yourprofile"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">GitHub (Optional)</label>
                            <div className="input-wrapper">
                                <Github size={18} />
                                <input
                                    type="url"
                                    className="form-input"
                                    value={github}
                                    onChange={(e) => setGithub(e.target.value)}
                                    placeholder="https://github.com/yourusername"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Twitter/X (Optional)</label>
                            <div className="input-wrapper">
                                <Twitter size={18} />
                                <input
                                    type="url"
                                    className="form-input"
                                    value={twitter}
                                    onChange={(e) => setTwitter(e.target.value)}
                                    placeholder="https://twitter.com/yourusername"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Professional Information */}
                    <div className="section-title mt-8">Professional Information</div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Current CTC (Annual) - Optional</label>
                            {/* Clean flex layout: [currency badge] [amount input] */}
                            <div className="ctc-input-shell">
                                {/* Currency selector */}
                                <select
                                    className="ctc-currency-select"
                                    value={currentCurrencyCode}
                                    onChange={(e) => setCurrentCurrencyCode(e.target.value)}
                                >
                                    {CURRENCIES.map(c => (
                                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                                    ))}
                                </select>
                                {/* Symbol badge */}
                                <span className="ctc-symbol">
                                    {currentCurrency.symbol}
                                </span>
                                {/* Amount input — no padding needed, symbol is external */}
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="ctc-amount-input"
                                    placeholder="e.g. 6,00,000"
                                    value={currentCTC}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9]/g, '');
                                        setCurrentCTC(raw);
                                    }}
                                    onBlur={(e) => blurFormatIndian(e.currentTarget.value, setCurrentCTC)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Expected CTC - Optional</label>
                            {/* Clean flex layout: [currency badge] [amount input] */}
                            <div className="ctc-input-shell">
                                {/* Currency selector */}
                                <select
                                    className="ctc-currency-select"
                                    value={expectedCurrencyCode}
                                    onChange={(e) => setExpectedCurrencyCode(e.target.value)}
                                >
                                    {CURRENCIES.map(c => (
                                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                                    ))}
                                </select>
                                {/* Symbol badge */}
                                <span className="ctc-symbol">
                                    {expectedCurrency.symbol}
                                </span>
                                {/* Amount input */}
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="ctc-amount-input"
                                    placeholder="e.g. 8,00,000"
                                    value={expectedCTC}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9]/g, '');
                                        setExpectedCTC(raw);
                                    }}
                                    onBlur={(e) => blurFormatIndian(e.currentTarget.value, setExpectedCTC)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notice Period</label>
                            <select
                                className="form-input"
                                value={noticePeriod}
                                onChange={(e) => setNoticePeriod(e.target.value)}
                            >
                                <option>Immediate</option>
                                <option>15 Days</option>
                                <option>30 Days</option>
                                <option>60 Days</option>
                                <option>90 Days</option>
                            </select>
                        </div>
                    </div>

                    {/* Resume / CV — one per user, stored in GCS; new upload replaces old */}
                    <div className="section-title mt-8">Resume / CV</div>
                    {profileResumeUrl ? (
                        <div className="resume-list" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            <div className="file-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FileText size={24} className="text-primary" />
                                <div>
                                    <span className="font-semibold">Current CV</span>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Stored in your profile</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <a
                                    href={`/api/resume/view?url=${encodeURIComponent(profileResumeUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-secondary"
                                    style={{ padding: '8px 16px', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    title="Open PDF in browser"
                                >
                                    <Eye size={16} /> View
                                </a>
                                <a
                                    href={`/api/resume/view?url=${encodeURIComponent(profileResumeUrl)}&download=1`}
                                    className="btn-secondary"
                                    style={{ padding: '8px 14px', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    title="Download resume"
                                    download
                                >
                                    <FileText size={16} />
                                </a>
                                <button type="button" className="action-btn delete" title="Remove CV" onClick={removeResume} style={{ padding: '8px 16px' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ) : null}
                    <div className="resume-upload-area" onClick={() => !isUploadingResume && resumeInputRef.current?.click()} style={{ cursor: isUploadingResume ? 'wait' : 'pointer', opacity: isUploadingResume ? 0.7 : 1 }}>
                        <UploadCloud size={48} className="text-muted" style={{ margin: '0 auto 16px' }} />
                        <h3 className="font-bold" style={{ fontSize: '16px', color: '#374151', marginBottom: '8px' }}>
                            {isUploadingResume ? 'Uploading…' : 'Upload Resume'}
                        </h3>
                        <p className="text-muted" style={{ fontSize: '14px' }}>PDF, DOC, or DOCX · Max {MAX_RESUME_MB}MB · One CV per profile — new upload replaces previous.</p>
                        <input
                            type="file"
                            ref={resumeInputRef}
                            hidden
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleResumeUpload}
                            disabled={isUploadingResume}
                        />
                    </div>

                    <div className="form-actions mt-8 flex justify-between gap-4">
                        <button type="button" className="btn-secondary" disabled={isSaving} onClick={() => window.history.back()}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
