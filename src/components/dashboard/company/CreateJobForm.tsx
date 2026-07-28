'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import RichTextEditor from '@/components/RichTextEditor';
import { useDashboardTheme } from '@/components/dashboard/DashboardThemeProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRecruiterBasePath } from '@/components/RecruiterBasePathContext';
import { Briefcase, MapPin, DollarSign, Clock, CheckCircle, ChevronRight, X, Plus, Search, Globe, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeHtml } from '@/lib/htmlUtils';
import { Country, State } from 'country-state-city';
import { WORLD_CURRENCIES, getCurrencySymbol } from '@/lib/currencies';
import { blurFormatIndian, toNumericString } from '@/lib/formatIndianNumber';

const LocationSelector = dynamic(() => import('@/components/dashboard/LocationSelector'), { ssr: false });

type JobData = {
    title: string;
    company: string;
    employmentType: string;
    country: string;
    state: string;
    city: string;
    pincode: string;
    salaryMin: string;
    salaryMax: string;
    currency: string;
    workMode: 'Remote' | 'Onsite' | 'Hybrid';
    skills: string[];
    description: string;
    expMin: string;
    expMax: string;
    requirements: string;
    category: string;
};

const STEPS = [
    { number: 1, title: 'Job Details', subtitle: 'Basic information' },
    { number: 2, title: 'Review & Publish', subtitle: 'Final check' },
];



const SKILLS_DB = [
    "Python", "JavaScript", "React", "Node.js", "Next.js", "Java", "C#", "C++", "AWS", "Docker", "Kubernetes",
    "PostgreSQL", "MongoDB", "TypeScript", "Angular", "Vue.js", "Django", "Flask", "Spring Boot", "Go", "Rust",
    "Product Management", "UI/UX Design", "Figma", "Adobe XD", "Marketing", "SEO", "Growth Hacking",
    "Project Management", "Agile", "Scrum", "Business Analysis", "Financial Modeling", "Data Analysis",
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "Tableau", "Power BI",
    "Problem Solving", "Teamwork", "Communication", "Leadership", "Spanish", "German", "French", "Japanese"
];

// Location helpers
const getCountryName = (iso: string) => Country.getCountryByCode(iso)?.name || iso;
const getStateName = (countryIso: string, stateIso: string) => State.getStateByCodeAndCountry(stateIso, countryIso)?.name || stateIso;

export default function CreateJobForm() {
    const router = useRouter();
    const { data: session } = useSession();
    const base = useRecruiterBasePath();
    const { theme } = useDashboardTheme();
    const isDark = theme === 'dark';
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Form State
    const [formData, setFormData] = useState<JobData>({
        title: '',
        company: '',
        employmentType: 'Full-time',
        country: '',
        state: '',
        city: '',
        pincode: '',
        salaryMin: '',
        salaryMax: '',
        currency: 'USD',
        workMode: 'Remote',
        skills: [],
        description: '',
        expMin: '',
        expMax: '',
        requirements: '',
        category: 'Engineering'
    });

    // Global location state (ISO codes)
    const [selectedCountryIso, setSelectedCountryIso] = useState('');
    const [selectedStateIso, setSelectedStateIso] = useState('');
    const [selectedCityName, setSelectedCityName] = useState('');
    const [pincode, setPincode] = useState('');

    const [skillInput, setSkillInput] = useState('');
    const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
    const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const skillInputRef = useRef<HTMLDivElement>(null);
    const companySeededRef = useRef(false);

    useEffect(() => {
        if (!session?.user || companySeededRef.current) return;
        const fromProfile = session.user.companyName?.trim();
        const fromName = session.user.name?.trim();
        const def = fromProfile || fromName || "";
        if (!def) return;
        setFormData((prev) => ({ ...prev, company: def }));
        companySeededRef.current = true;
    }, [session]);

    useEffect(() => {
        if (skillInput.trim()) {
            const filtered = SKILLS_DB.filter(s =>
                s.toLowerCase().includes(skillInput.toLowerCase()) &&
                !formData.skills.includes(s)
            ).slice(0, 5);
            setSkillSuggestions(filtered);
            setShowSkillSuggestions(true);
        } else {
            setSkillSuggestions([]);
            setShowSkillSuggestions(false);
        }
    }, [skillInput, formData.skills]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (skillInputRef.current && !skillInputRef.current.contains(event.target as Node)) {
                setShowSkillSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Sync location ISO codes -> formData strings
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            country: getCountryName(selectedCountryIso),
            state: getStateName(selectedCountryIso, selectedStateIso),
            city: selectedCityName,
            pincode: pincode,
        }));
    }, [selectedCountryIso, selectedStateIso, selectedCityName, pincode]);

    const addSkill = (skillToAdd?: string) => {
        const skill = (skillToAdd || skillInput).trim();
        if (skill && !formData.skills.includes(skill)) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, skill] }));
            setSkillInput('');
            setShowSkillSuggestions(false);
        }
    };

    const removeSkill = (skill: string) => {
        setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
    };

    const handleNext = () => {
        if (currentStep < 2) setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async () => {
        if (!session?.user) {
            toast.error("Please sign in to post a job.");
            router.push("/sign-in");
            return;
        }
        setIsSubmitting(true);
        try {
            const profileCompany = session?.user?.companyName?.trim();
            const companyName =
                formData.company?.trim() ||
                profileCompany ||
                session?.user?.name?.trim() ||
                "My Company";

            // Range Validations
            const salaryMinNum = Number(toNumericString(formData.salaryMin));
            const salaryMaxNum = Number(toNumericString(formData.salaryMax));
            if (formData.salaryMax && salaryMinNum > salaryMaxNum) {
                toast.warning("Min salary cannot be greater than Max salary");
                setIsSubmitting(false);
                return;
            }
            if (formData.expMax && Number(formData.expMin) > Number(formData.expMax)) {
                toast.warning("Min experience cannot be greater than Max experience");
                setIsSubmitting(false);
                return;
            }

            // Construct payload
            const payload = {
                title: formData.title,
                company: companyName, // From user profile
                description: formData.description,
                employmentType: formData.employmentType,

                // Location Handling
                location: [formData.city, formData.state, formData.country].filter(Boolean).join(", ") || "Remote",
                country: formData.country,
                state: formData.state,
                city: formData.city,
                pincode: formData.pincode,

                // Salary Handling - strip commas before sending
                salary: toNumericString(formData.salaryMax)
                    ? `${toNumericString(formData.salaryMin)} - ${toNumericString(formData.salaryMax)}`
                    : toNumericString(formData.salaryMin) ? `${toNumericString(formData.salaryMin)}` : '',
                currency: formData.currency,

                // Other fields
                category: formData.category,
                skills: formData.skills,
                workMode: formData.workMode,
                experienceMin: formData.expMin,
                experienceMax: formData.expMax,
                requirements: formData.requirements,

                // Critical: Set status to ACTIVE
                status: 'ACTIVE'
            };

            const response = await fetch('/api/jobs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorMessage = `Request failed (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    const text = await response.text().catch(() => '');
                    errorMessage = text || response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            // Redirect to jobs page
            router.push(`${base}/jobs`);
            router.refresh(); // Refresh data
        } catch (error: unknown) {
            console.error('[API] Error creating job:', error instanceof Error ? error.message : 'Unknown error');
            const msg =
                error instanceof Error && error.message?.trim()
                    ? error.message
                    : 'Failed to publish job. Please try again.';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGenerateAI = async () => {
        if (!formData.title?.trim()) {
            toast.warning('Please enter a job title first.');
            return;
        }
        setIsGeneratingAI(true);
        try {
            const res = await fetch('/api/ai/generate-jd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    company: formData.company,
                    employmentType: formData.employmentType,
                    workMode: formData.workMode,
                    category: formData.category,
                    skills: formData.skills,
                    expMin: formData.expMin,
                    expMax: formData.expMax,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to generate');
            }
            const { html } = await res.json();
            if (typeof html === "string" && html.trim().length > 0) {
                setFormData(prev => ({ ...prev, description: html }));
                toast.success('Job description generated! Review and edit as needed.');
            } else {
                console.error("[AI Generate] Received invalid html from API:", html);
                toast.error('AI returned an empty or invalid response. Please try again.');
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to generate description.');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const isStep1Valid = formData.title?.trim() && formData.description?.trim() && formData.expMin;

    const missingRequired: string[] = [];
    if (!formData.title?.trim()) missingRequired.push("Job Title");
    if (!formData.description?.trim()) missingRequired.push("Job Description");
    if (!formData.expMin) missingRequired.push("Min Experience (years)");

    return (
        <div className="create-job-page-wrapper" style={{ maxWidth: '960px', margin: '0 auto', padding: '0 20px 40px' }}>
            {/* Stepper Header */}
            <div style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', maxWidth: '500px', margin: '0 auto' }}>
                    <div style={{ position: 'absolute', left: 0, top: '20px', width: '100%', height: '2px', backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb', zIndex: 0 }}></div>
                    <div
                        style={{
                            position: 'absolute', left: 0, top: '20px', height: '2px', backgroundColor: '#3b82f6', zIndex: 0, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            width: currentStep === 1 ? '0%' : '100%'
                        }}
                    ></div>

                    {STEPS.map((step) => {
                        const isActive = currentStep >= step.number;
                        const isCurrent = currentStep === step.number;

                        return (
                            <div key={step.number} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div
                                    style={{
                                        width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', border: '2px solid', transition: 'all 0.3s ease',
                                        backgroundColor: isActive ? '#3b82f6' : (isDark ? 'rgba(255,255,255,0.06)' : 'white'),
                                        borderColor: isActive ? '#3b82f6' : (isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db'),
                                        color: isActive ? 'white' : (isDark ? '#8ab4c8' : '#6b7280'),
                                        boxShadow: isCurrent ? '0 0 0 4px rgba(59, 130, 246, 0.15)' : 'none'
                                    }}
                                >
                                    {isActive && step.number < currentStep ? <CheckCircle size={20} /> : step.number}
                                </div>
                                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: isActive ? (isDark ? '#e2f4fc' : '#111827') : (isDark ? '#5a8ca0' : '#9ca3af') }}>{step.title}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="card create-job-card" style={{ padding: '0', overflow: 'visible', border: '1px solid #e5e7eb', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                {/* Step 1: Job Details */}
                {currentStep === 1 && (
                    <div className="animate-fadeIn">
                        <div className="create-job-step-header" style={{ padding: '32px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6'}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#fcfdfe' }}>
                            <h2 style={{ fontSize: '22px', fontWeight: '800', color: isDark ? '#e2f4fc' : '#111827', marginBottom: '6px' }}>Job Information</h2>
                            <p style={{ color: isDark ? '#7aaec2' : '#6b7280', fontSize: '15px' }}>Fill in the details about the position.</p>
                        </div>

                        <div style={{ padding: '32px' }} className="form-grid">
                            {/* Job Title */}
                            <div className="form-group full-width">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <label className="form-label" style={{ fontWeight: '700', margin: 0 }}>Job Title <span className="text-danger">*</span></label>
                                    <span style={{ fontSize: '12px', color: formData.title.length >= 50 ? '#ef4444' : '#6b7280', fontWeight: '600' }}>
                                        {formData.title.length}/50
                                    </span>
                                </div>
                                <div className="input-wrapper">
                                    <Briefcase size={18} />
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Senior Frontend Engineer"
                                        className="form-input"
                                        maxLength={50}
                                    />
                                </div>
                            </div>

                            {/* Company: from recruiter profile (companyName), not re-entered per job */}
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: '700', margin: 0 }}>
                                    Company
                                </label>
                                {session?.user?.companyName?.trim() ? (
                                    <>
                                        <input
                                            type="text"
                                            className="form-input"
                                            name="company"
                                            readOnly
                                            aria-readonly="true"
                                            value={formData.company}
                                            style={{
                                                cursor: 'default',
                                                opacity: isDark ? 0.95 : 1,
                                                background: isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb',
                                            }}
                                            maxLength={100}
                                        />
                                        <p
                                            style={{
                                                fontSize: 13,
                                                marginTop: 8,
                                                color: isDark ? '#8fb8c8' : '#6b7280',
                                                lineHeight: 1.45,
                                            }}
                                        >
                                            This is your company name from your profile. To change it for all jobs,{' '}
                                            <Link href={`${base}/settings`} className="name-link" style={{ fontWeight: 600 }}>
                                                open Settings
                                            </Link>
                                            .
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. Acme Inc. (set permanently in Settings after onboarding)"
                                            name="company"
                                            value={formData.company}
                                            onChange={(e) =>
                                                setFormData((prev) => ({ ...prev, company: e.target.value }))
                                            }
                                            maxLength={100}
                                        />
                                        <p
                                            style={{
                                                fontSize: 12,
                                                marginTop: 6,
                                                color: isDark ? '#7aaec2' : '#6b7280',
                                            }}
                                        >
                                            Add your company name in{' '}
                                            <Link href={`${base}/settings`} className="name-link" style={{ fontWeight: 600 }}>
                                                Settings
                                            </Link>{' '}
                                            so you don&apos;t have to type it for each job.
                                        </p>
                                    </>
                                )}
                            </div>

                            {formData.title.length >= 50 && (
                                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>
                                    Character limit reached (max 50)
                                </p>
                            )}

                            {/* Employment Type */}
                            <div className="form-group">
                                <label className="form-label">Employment Type</label>
                                <select
                                    name="employmentType"
                                    value={formData.employmentType}
                                    onChange={handleInputChange}
                                    className="form-input"
                                >
                                    <option>Full-time</option>
                                    <option>Part-time</option>
                                    <option>Contract</option>
                                    <option>Internship</option>
                                    <option>Freelance</option>
                                </select>
                            </div>

                            {/* Work Mode */}
                            <div className="form-group">
                                <label className="form-label">Work Mode</label>
                                <select
                                    name="workMode"
                                    value={formData.workMode}
                                    onChange={handleInputChange}
                                    className="form-input"
                                >
                                    <option>Remote</option>
                                    <option>Onsite</option>
                                    <option>Hybrid</option>
                                </select>
                            </div>

                            {/* Category */}
                            <div className="form-group">
                                <label className="form-label">Job Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="form-input"
                                >
                                    <option>Engineering</option>
                                    <option>Marketing</option>
                                    <option>Sales</option>
                                    <option>Design</option>
                                    <option>Finance</option>
                                    <option>Human Resources</option>
                                    <option>Operations</option>
                                    <option>Product</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            {/* Location Section - Global Country/State/City */}
                            <div className="form-group full-width" style={{ marginTop: '8px' }}>
                                <label className="form-label" style={{ color: '#3b82f6', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location Details (Optional)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '12px' }}>
                                    <LocationSelector
                                        selectedCountryIso={selectedCountryIso}
                                        setSelectedCountryIso={(iso) => { setSelectedCountryIso(iso); setSelectedStateIso(''); setSelectedCityName(''); }}
                                        selectedStateIso={selectedStateIso}
                                        setSelectedStateIso={(iso) => { setSelectedStateIso(iso); setSelectedCityName(''); }}
                                        selectedCityName={selectedCityName}
                                        setSelectedCityName={setSelectedCityName}
                                        pincode={pincode}
                                        setPincode={setPincode}
                                    />
                                </div>
                            </div>

                            {/* Salary Section */}
                            <div className="form-group full-width" style={{ marginTop: '8px' }}>
                                <label className="form-label" style={{ color: '#3b82f6', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compensation</label>
                                <div className="compensation-grid">
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '13px' }}>Min Salary <span style={{ fontWeight: 500, color: isDark ? '#6b8f9e' : '#94a3b8' }}>(optional)</span></label>
                                        <div className="salary-input-group">
                                            <div className="currency-symbol">
                                                {getCurrencySymbol(formData.currency)}
                                            </div>
                                            <input
                                                type="text"
                                                name="salaryMin"
                                                value={formData.salaryMin}
                                                onChange={(e) => {
                                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                                    setFormData(prev => ({ ...prev, salaryMin: raw }));
                                                }}
                                                onBlur={(e) => blurFormatIndian(e.currentTarget.value, (val) => setFormData(prev => ({ ...prev, salaryMin: val })))}
                                                placeholder="e.g. 6,00,000"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '13px' }}>Max Salary</label>
                                        <div className="salary-input-group">
                                            <div className="currency-symbol">
                                                {getCurrencySymbol(formData.currency)}
                                            </div>
                                            <input
                                                type="text"
                                                name="salaryMax"
                                                value={formData.salaryMax}
                                                onChange={(e) => {
                                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                                    setFormData(prev => ({ ...prev, salaryMax: raw }));
                                                }}
                                                onBlur={(e) => blurFormatIndian(e.currentTarget.value, (val) => setFormData(prev => ({ ...prev, salaryMax: val })))}
                                                placeholder="e.g. 12,00,000"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '13px' }}>Currency</label>
                                        <select
                                            name="currency"
                                            value={formData.currency}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            style={{ height: '48px' }}
                                        >
                                            {WORLD_CURRENCIES.map(c => (
                                                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Experience Section */}
                            <div className="form-group full-width" style={{ marginTop: '8px' }}>
                                <label className="form-label" style={{ color: '#3b82f6', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Experience (in years)</label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '16px',
                                    marginTop: '12px'
                                }}>
                                    <div>
                                        <label className="form-label" style={{ fontSize: '13px' }}>Min Experience <span className="text-danger">*</span></label>
                                        <div className="input-wrapper">
                                            <Clock size={16} />
                                            <input
                                                type="number"
                                                name="expMin"
                                                value={formData.expMin}
                                                onChange={handleInputChange}
                                                placeholder="e.g. 2"
                                                className="form-input"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ fontSize: '13px' }}>Max Experience</label>
                                        <div className="input-wrapper">
                                            <Clock size={16} />
                                            <input
                                                type="number"
                                                name="expMax"
                                                value={formData.expMax}
                                                onChange={handleInputChange}
                                                placeholder="e.g. 5"
                                                className="form-input"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Skills Tag Section */}
                            <div className="form-group full-width" style={{ marginTop: '28px' }}>
                                <label className="form-label" style={{
                                    color: '#3b82f6',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    marginBottom: '16px',
                                    display: 'block'
                                }}>
                                    Required Skills
                                </label>
                                <div className="skills-outer-container" ref={skillInputRef}>
                                    {formData.skills.length > 0 && (
                                        <div className="skills-chip-area">
                                            {formData.skills.map(skill => (
                                                <span key={skill} className="skill-chip">
                                                    {skill}
                                                    <button type="button" onClick={() => removeSkill(skill)}>
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="skill-search-bar" style={{ borderColor: isSearchFocused ? '#3b82f6' : '#d1d5db', backgroundColor: isSearchFocused ? 'white' : '#f9fafb' }}>
                                        <Search size={18} style={{ color: isSearchFocused ? '#3b82f6' : '#9ca3af' }} />
                                        <input
                                            type="text"
                                            value={skillInput}
                                            onChange={(e) => setSkillInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addSkill();
                                                }
                                            }}
                                            placeholder="Search or add a custom skill..."
                                            onFocus={() => {
                                                setIsSearchFocused(true);
                                                if (skillInput.trim()) setShowSkillSuggestions(true);
                                            }}
                                            onBlur={() => setIsSearchFocused(false)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => addSkill()}
                                            className="create-job-skill-add-btn"
                                            aria-label="Add skill"
                                            title="Add skill"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>

                                    {showSkillSuggestions && skillSuggestions.length > 0 && (
                                        <div className="create-job-skill-suggestions" style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0,
                                            backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                                            marginTop: '4px', zIndex: 100, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                            overflow: 'hidden'
                                        }}>
                                            {skillSuggestions.map(s => (
                                                <div
                                                    key={s}
                                                    className="create-job-skill-suggestion-item"
                                                    onClick={() => addSkill(s)}
                                                    style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '14px', transition: 'background 0.2s' }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                                                >
                                                    {s}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="form-group full-width" style={{ marginTop: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <label className="form-label" style={{ fontWeight: '700', margin: 0 }}>Job Description <span className="text-danger">*</span></label>
                                    <button
                                        type="button"
                                        onClick={handleGenerateAI}
                                        disabled={isGeneratingAI}
                                        aria-busy={isGeneratingAI}
                                        aria-disabled={isGeneratingAI}
                                        aria-label={isGeneratingAI ? "Generating job description, please wait" : "Write job description with AI"}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            padding: '7px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                            background: isGeneratingAI ? 'rgba(139, 92, 246, 0.15)' : 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(59, 130, 246, 0.12))',
                                            color: '#a78bfa',
                                            cursor: isGeneratingAI ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                            opacity: isGeneratingAI ? 0.7 : 1,
                                        }}
                                        onMouseEnter={e => { if (!isGeneratingAI) { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)'; e.currentTarget.style.background = isDark ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25))' : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))'; } }}
                                        onMouseLeave={e => { if (!isGeneratingAI) { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'; e.currentTarget.style.background = isDark ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15))' : 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(59, 130, 246, 0.12))'; } }}                                    >
                                        {isGeneratingAI ? (
                                            <><Loader2 size={14} className="animate-spin" /> Generating...</>
                                        ) : (
                                            <><Sparkles size={14} /> Write with AI</>
                                        )}
                                    </button>
                                </div>
                                {isGeneratingAI && (
                                    <div style={{
                                        padding: '16px', marginBottom: '10px', borderRadius: '10px',
                                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.08))',
                                        border: '1px solid rgba(139, 92, 246, 0.15)',
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        fontSize: '13px', color: '#a78bfa',
                                    }}>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>AI is writing your job description based on the details you provided. This usually takes a few seconds...</span>
                                    </div>
                                )}
                                <RichTextEditor
                                    value={formData.description}
                                    onChange={(html) => setFormData(prev => ({ ...prev, description: html }))}
                                    placeholder="Briefly describe the role, responsibilities, and who you're looking for..."
                                    theme={theme}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Review */}
                {currentStep === 2 && (
                    <div className="animate-fadeIn">
                        <div className="create-job-step-header" style={{ padding: '32px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6'}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#fcfdfe' }}>
                            <h2 style={{ fontSize: '22px', fontWeight: '800', color: isDark ? '#e2f4fc' : '#111827', marginBottom: '6px' }}>Review &amp; Publish</h2>
                            <p style={{ color: isDark ? '#7aaec2' : '#6b7280', fontSize: '15px' }}>Check if everything looks correct before going live.</p>
                        </div>

                        <div className="create-job-review-content" style={{ padding: '32px' }}>
                            <div className="create-job-review-card" style={{ backgroundColor: isDark ? 'rgba(8,28,42,0.7)' : '#ffffff', borderRadius: '16px', border: `1px solid ${isDark ? 'rgba(99,183,211,0.22)' : '#e5e7eb'}`, padding: '32px' }}>
                                <div className="create-job-review-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '32px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6'}`, paddingBottom: '32px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '28px', fontWeight: '800', color: isDark ? '#e2f4fc' : '#111827', marginBottom: '12px' }}>{formData.title}</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: isDark ? '#a8ccd8' : '#4b5563', padding: '6px 14px', borderRadius: '10px', background: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                                                <Briefcase size={16} /> {formData.employmentType}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: '#3b82f6', padding: '6px 14px', borderRadius: '10px', background: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }}>
                                                <MapPin size={16} /> {formData.city ? `${formData.city}, ` : ''}{formData.state ? `${formData.state}, ` : ''}{formData.country || 'Remote'}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: '800', color: isDark ? '#5a8ca0' : '#9ca3af', marginBottom: '4px' }}>Salary Range</p>
                                        <p style={{ fontSize: '20px', fontWeight: '800', color: isDark ? '#e2f4fc' : '#111827' }}>
                                            {(() => {
                                                const sym = getCurrencySymbol(formData.currency);
                                                const hasMin = formData.salaryMin.trim() !== '';
                                                const hasMax = formData.salaryMax.trim() !== '';
                                                if (hasMin && hasMax) return `${sym}${formData.salaryMin} - ${sym}${formData.salaryMax}`;
                                                if (hasMin) return `${sym}${formData.salaryMin}`;
                                                if (hasMax) return `Up to ${sym}${formData.salaryMax}`;
                                                return 'Not specified';
                                            })()}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '40px' }}>
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: isDark ? '#5a8ca0' : '#9ca3af', marginBottom: '16px', letterSpacing: '0.05em' }}>Required Skills</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {formData.skills.map(skill => (
                                                <span key={skill} style={{ fontSize: '13px', fontWeight: '700', color: isDark ? '#cce8f4' : '#111827', background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${isDark ? 'rgba(99,183,211,0.25)' : '#e2e8f0'}` }}>
                                                    {skill}
                                                </span>
                                            ))}
                                            {formData.skills.length === 0 && <span style={{ color: isDark ? '#4a7a8e' : '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>None listed</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: isDark ? '#5a8ca0' : '#9ca3af', marginBottom: '16px', letterSpacing: '0.05em' }}>Experience</h4>
                                        <p style={{ fontSize: '16px', fontWeight: '700', color: isDark ? '#d6f0f8' : '#111827' }}>
                                            {formData.expMin}{formData.expMax ? ` - ${formData.expMax}` : '+'} Years
                                        </p>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: isDark ? '#5a8ca0' : '#9ca3af', marginBottom: '16px', letterSpacing: '0.05em' }}>Work Mode</h4>
                                        <p style={{ fontSize: '16px', fontWeight: '700', color: isDark ? '#d6f0f8' : '#111827' }}>{formData.workMode}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: isDark ? '#5a8ca0' : '#9ca3af', marginBottom: '16px', letterSpacing: '0.05em' }}>Detailed Description</h4>
                                    <div
                                        className="create-job-review-description rich-preview"
                                        style={{ fontSize: '15px', color: isDark ? '#b8dce8' : '#374151', lineHeight: '1.8', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fcfdfe', padding: '24px', borderRadius: '12px', border: `1px solid ${isDark ? 'rgba(99,183,211,0.15)' : '#f1f5f9'}` }}
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.description) }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="form-footer" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                }}>
                    {/* Back button — left side */}
                    {currentStep > 1 ? (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="btn-back"
                            style={{
                                border: `1px solid ${isDark ? 'rgba(99,183,211,0.3)' : '#e5e7eb'}`, background: isDark ? 'rgba(255,255,255,0.07)' : 'white', color: isDark ? '#a8ccd8' : '#4b5563',
                                padding: '12px 24px', borderRadius: '12px', fontSize: '15px', fontWeight: '700',
                                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#d1d5db'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                        >
                            <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back
                        </button>
                    ) : (
                        <div /> /* spacer to keep right-side button pushed right on step 1 */
                    )}

                    {/* Next / Publish button — right side */}
                    {currentStep < 2 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            {!isStep1Valid && missingRequired.length > 0 && (
                                <p className="create-job-required-note" style={{ fontSize: '13px', color: '#6b7280', margin: 0, textAlign: 'right' }}>
                                    Complete required fields: {missingRequired.join(", ")}
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!isStep1Valid}
                                className="create-job-footer-next"
                                style={{
                                    border: 'none', background: !isStep1Valid ? '#94a3b8' : '#3b82f6', color: 'white',
                                    padding: '12px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '700',
                                    cursor: !isStep1Valid ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    boxShadow: !isStep1Valid ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)'
                                }}
                                onMouseEnter={e => !isStep1Valid ? null : e.currentTarget.style.background = '#2563eb'}
                                onMouseLeave={e => !isStep1Valid ? null : e.currentTarget.style.background = '#3b82f6'}
                            >
                                Review Posting <ChevronRight size={18} />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="create-job-footer-publish"
                            style={{
                                border: 'none', background: '#10b981', color: 'white',
                                padding: '12px 40px', borderRadius: '12px', fontSize: '15px', fontWeight: '700',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                            onMouseEnter={e => isSubmitting ? null : e.currentTarget.style.background = '#059669'}
                            onMouseLeave={e => isSubmitting ? null : e.currentTarget.style.background = '#10b981'}
                        >
                            {isSubmitting ? (
                                <>Going Live <Loader2 className="animate-spin" size={18} /></>
                            ) : (
                                <>Publish Now <CheckCircle size={18} /></>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
