'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Briefcase, MapPin, DollarSign,
    ChevronLeft, CheckCircle, FileText, Loader2, Clock, Upload, X
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import RichTextEditor from '@/components/dashboard/RichTextEditor';
import { isHtmlString, sanitizeHtml } from '@/lib/htmlUtils';

type Job = {
    id: string;
    title: string;
    company: string;
    description: string;
    employmentType: string;
    location: string;
    salary: string;
    currency: string;
    experienceMin?: number | null;
    experienceMax?: number | null;
};

const WORLD_CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal' },
    { code: 'OMR', symbol: '﷼', name: 'Omani Rial' },
    { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar' },
    { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
];

export default function ApplyPage() {
    const params = useParams();
    const router = useRouter();

    // State
    const [job, setJob] = useState<Job | null>(null);
    const [isFetching, setIsFetching] = useState(true);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resumeLink, setResumeLink] = useState('');
    const [profileResumeUrl, setProfileResumeUrl] = useState<string | null>(null);
    const [resumeLinkError, setResumeLinkError] = useState('');
    const [isUploadingResume, setIsUploadingResume] = useState(false);
    const resumeInputRef = useRef<HTMLInputElement>(null);
    const resumeSectionRef = useRef<HTMLDivElement>(null);
    const currentCTCRef = useRef<HTMLInputElement>(null);
    const expectedCTCRef = useRef<HTMLInputElement>(null);
    const cityRef = useRef<HTMLInputElement>(null);
    const [motivationData, setMotivationData] = useState<string>('');
    const [fetchError, setFetchError] = useState('');
    const [hasApplied, setHasApplied] = useState(false);
    const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

    // Form data
    const [formData, setFormData] = useState({
        currentCTC: '',
        currentCurrency: 'USD',
        expectedCTC: '',
        expectedCurrency: 'USD',
        noticePeriod: 'Immediate',
        city: '',
    });

    // Fetch Job Data
    useEffect(() => {
        const fetchJob = async () => {
            if (!params?.id) return;

            const jobId = Array.isArray(params.id) ? params.id[0] : params.id;

            try {
                // In a real scenario, you might have a dedicated endpoint for single job details
                // If /api/jobs returns a list, we might need to filter or fetch a specific one
                // Given previous context, let's assume we can fetch specific job or we fetch list and find.
                // Ideally: fetch(`/api/jobs/${jobId}`)

                // Let's rely on the public jobs API. If it doesn't support ID, we might need to update it. 
                // However, usually REST APIs support /api/jobs/:id.
                // Let's try to fetch all and find, OR if we made a specific endpoint. 
                // Looking at previous interactions, we haven't explicitly seen /api/jobs/[id] GET for public.
                // But typically it should be there. Let's try to fetch it.
                // If it fails, we will fallback to fetching all and filtering (backup plan).

                // Let's try fetching the specific job directly if the endpoint exists, 
                // otherwise we might need to use the 'GET /api/jobs' and filter.
                // Safest bet without checking backend code right now: Try specific known pattern first.

                const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });

                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        setJob(data);
                        // Pre-select currency from job
                        if (data.currency) {
                            setFormData(prev => ({
                                ...prev,
                                currentCurrency: data.currency,
                                expectedCurrency: data.currency
                            }));
                        }
                    } else {
                        setFetchError('Job not found');
                    }
                } else {
                    // Fallback: This might occur if the specific ID route isn't implemented for GET public
                    // Let's try fetching all active jobs and filtering (not efficient but works for MVP)
                    const resAll = await fetch("/api/jobs?pageSize=50");
                    if (resAll.ok) {
                        const body = await resAll.json();
                        const allJobs: Job[] = Array.isArray(body)
                            ? body
                            : (body.jobs ?? []);
                        const foundJob = allJobs.find(j => j.id === jobId);
                        if (foundJob) {
                            setJob(foundJob);
                            // Pre-select currency from job
                            if (foundJob.currency) {
                                setFormData(prev => ({
                                    ...prev,
                                    currentCurrency: foundJob.currency,
                                    expectedCurrency: foundJob.currency
                                }));
                            }
                        } else {
                            setFetchError('Job not found or not active');
                        }
                    } else {
                        throw new Error('Failed to load job details');
                    }
                }
            } catch (err) {
                console.error("Error fetching job:", err);
                setFetchError('Failed to load job details. Please try again.');
            } finally {
                setIsFetching(false);
            }
        };

        fetchJob();
    }, [params?.id]);

    // Fetch applications status
    useEffect(() => {
        const fetchStatus = async () => {
            if (!params?.id) return;
            const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
            // Reset state before fetch to avoid stale UI from previous job
            setHasApplied(false);
            setApplicationStatus(null);
            try {
                const res = await fetch(`/api/applications?jobId=${encodeURIComponent(jobId)}`);
                if (res.ok) {
                    const data = await res.json();
                    const myApp = data.find((a: any) => (a.jobId === jobId || a.job?.id === jobId));
                    if (myApp) {
                        setApplicationStatus(myApp.status);
                        if (myApp.status !== 'WITHDRAWN') {
                            setHasApplied(true);
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        };
        fetchStatus();
    }, [params?.id]);

    // Fetch profile to offer "Use my profile CV" (GCS-stored resume)
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/profile');
                if (res.ok) {
                    const data = await res.json();
                    if (data.resumeUrl) {
                        setProfileResumeUrl(data.resumeUrl);
                        setResumeLink(prev => prev || data.resumeUrl);
                    }
                }
            } catch {
                // ignore
            }
        };
        fetchProfile();
    }, []);

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
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File must be under 5MB.');
            return;
        }

        setIsUploadingResume(true);
        setResumeLinkError('');

        try {
            const fileUploadData = new FormData();
            fileUploadData.set('file', file);
            const res = await fetch('/api/upload/resume', { method: 'POST', body: fileUploadData, credentials: 'include' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Upload failed');
            }
            const data = await res.json();
            setProfileResumeUrl(data.resumeUrl ?? null);
            setResumeLink(data.resumeUrl ?? '');
            toast.success('Resume uploaded successfully.');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to upload resume.');
        } finally {
            setIsUploadingResume(false);
            e.target.value = '';
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        // Strip non-numeric characters for CTC fields
        if (name === 'currentCTC' || name === 'expectedCTC') {
            const numeric = value.replace(/[^0-9]/g, '');
            setFormData(prev => ({ ...prev, [name]: numeric }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCTCBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (!value) return;
        const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num)) {
            // Use Indian locale for INR, standard locale for other currencies
            const currency = name === 'currentCTC' ? formData.currentCurrency : formData.expectedCurrency;
            const locale = currency === 'INR' ? 'en-IN' : 'en-US';
            const formatted = num.toLocaleString(locale);
            setFormData(prev => ({ ...prev, [name]: formatted }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setResumeLinkError('');

        if (!params?.id) {
            toast.error("Invalid Job URL");
            return;
        }

        const jobId = Array.isArray(params.id) ? params.id[0] : params.id;

        // ── Validation: scroll to first invalid field ──
        const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
            // Small delay so React can render the error message before scrolling
            setTimeout(() => {
                ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        };

        if (!resumeLink?.trim()) {
            setResumeLinkError("Resume link or file is required.");
            scrollTo(resumeSectionRef);
            return;
        }

        let finalResumeUrl = resumeLink.trim();
        const INTERNAL_PREFIXES = ['/private-resumes/', '/uploads/resumes/', 'resumes/'];
        const isInternal = profileResumeUrl != null
            && finalResumeUrl === profileResumeUrl
            && INTERNAL_PREFIXES.some(p => finalResumeUrl.startsWith(p));

        if (!isInternal) {
            // Auto format bare domains
            if (!finalResumeUrl.startsWith('http://') && !finalResumeUrl.startsWith('https://')) {
                finalResumeUrl = 'https://' + finalResumeUrl;
                setResumeLink(finalResumeUrl);
            }

            if (!finalResumeUrl.startsWith('https://')) {
                setResumeLinkError("Please paste a valid public resume link (starts with https://). Make sure the link is public (Anyone with the link can view).");
                scrollTo(resumeSectionRef);
                return;
            }
        }

        if (!formData.currentCTC?.trim()) {
            currentCTCRef.current?.focus();
            scrollTo(currentCTCRef);
            toast.warning('Please enter your Current CTC.');
            return;
        }

        if (!formData.expectedCTC?.trim()) {
            expectedCTCRef.current?.focus();
            scrollTo(expectedCTCRef);
            toast.warning('Please enter your Expected CTC.');
            return;
        }

        if (!formData.city?.trim()) {
            cityRef.current?.focus();
            scrollTo(cityRef);
            toast.warning('Please enter your current city.');
            return;
        }

        setIsSubmitting(true);

        try {
            const submissionData = {
                ...formData,
                currentCTC: formData.currentCTC.replace(/[^0-9]/g, ''),
                expectedCTC: formData.expectedCTC.replace(/[^0-9]/g, ''),
            };

            const response = await fetch('/api/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: jobId,
                    resumeUrl: finalResumeUrl,
                    motivation: motivationData,
                    ...submissionData
                })
            });

            if (response.ok) {
                try {
                    // Update local storage for demo purposes (Applied state on Jobs list)
                    const applied: string[] = JSON.parse(localStorage.getItem('applied_jobs') || '[]');
                    if (!applied.includes(jobId)) {
                        applied.push(jobId);
                        localStorage.setItem('applied_jobs', JSON.stringify(applied));
                    }

                    // Also update the detailed applications list for the demo
                    const fullApps: { id: string; jobId: string; jobTitle: string; company: string; appliedAt: string; status: string; logo: string }[] = JSON.parse(localStorage.getItem('user_applications') || '[]');
                    const newApp = {
                        id: Math.random().toString(36).slice(2, 11),
                        jobId: jobId,
                        jobTitle: job?.title || 'Unknown Role',
                        company: job?.company || 'Unknown Company',
                        appliedAt: new Date().toISOString(),
                        status: "Applied",
                        logo: job?.company ? job.company.substring(0, 2).toUpperCase() : '??'
                    };

                    fullApps.push(newApp);
                    localStorage.setItem('user_applications', JSON.stringify(fullApps));
                } catch (e) {
                    console.error("Local storage update failed", e);
                }

                router.refresh(); // Invalidate Next.js client-side router cache
                setIsSubmitted(true);
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "Failed to submit application. Please try again.");
            }
        } catch (error) {
            console.error("Submission failed:", error);
            toast.error("Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    if (fetchError || !job) {
        return (
            <div className="p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                    <Briefcase size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Job Not Found</h2>
                <p className="text-gray-600 mb-6">{fetchError || "The job you are applying for is no longer available."}</p>
                <Link href="/dashboard/jobs" className="btn-primary inline-flex items-center gap-2">
                    <ChevronLeft size={18} /> Back to Jobs
                </Link>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="flex items-center justify-center min-vh-100" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="card text-center" style={{ maxWidth: '500px', padding: '48px', textAlign: 'center' }}>
                    <div style={{ color: '#10b981', marginBottom: '24px' }}>
                        <CheckCircle size={64} style={{ margin: '0 auto' }} />
                    </div>
                    <h1 className="page-title">Application Submitted Successfully</h1>
                    <p className="page-subtitle" style={{ marginBottom: '32px' }}>
                        Your application for <strong>{job.title}</strong> has been sent to the employer.
                    </p>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                        <Link href="/dashboard/applications" className="btn-primary">
                            View My Applications
                        </Link>
                        <Link href="/dashboard/jobs" className="btn-secondary">
                            Browse More Jobs
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="apply-page">
            <Link href="/dashboard/jobs" className="flex items-center gap-2 text-muted mb-6" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', textDecoration: 'none', marginBottom: '24px', fontSize: '14px' }}>
                <ChevronLeft size={16} /> Back to Jobs
            </Link>

            <div className="apply-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '40px' }}>
                {/* Left Side: Job Details */}
                <div className="job-details-section">
                    <div className="card" style={{ padding: '32px' }}>
                        <div className="mb-6" style={{ marginBottom: '24px' }}>
                            <h1 className="page-title" style={{ fontSize: '32px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{job.title}</h1>
                            <div className="flex gap-4 text-muted mt-2 apply-job-meta-row" style={{ display: 'flex', gap: '16px', color: '#6b7280', flexWrap: 'wrap' }}>
                                <span className="flex items-center gap-1"><Briefcase size={16} /> {job.company}</span>
                                <span className="flex items-center gap-1"><MapPin size={16} /> {job.location}</span>
                                <span className="flex items-center gap-1">
                                    {job.currency === 'USD' ? <DollarSign size={16} /> : <Briefcase size={16} />}
                                    {job.salary} {job.currency && job.currency !== 'USD' ? job.currency : ''}
                                </span>
                                <div
                                    className="apply-job-pill apply-job-type-pill"
                                >
                                    <Briefcase size={16} />
                                    <span>{job.employmentType}</span>
                                </div>
                                {(job.experienceMin !== null && job.experienceMin !== undefined) ? (
                                    <div className="apply-job-pill apply-job-exp-pill" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        backgroundColor: '#fffbeb',
                                        color: '#92400e',
                                        padding: '4px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        border: '1px solid #fef3c7'
                                    }}>
                                        <Clock size={16} />
                                        <span>Experience: {job.experienceMin}{job.experienceMax ? `–${job.experienceMax}` : '+'} years</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {(() => {
                            const sanitized = sanitizeHtml(job.description);
                            return isHtmlString(job.description) && sanitized.includes('<') ? (
                                <div
                                    className="job-desc-content rich-preview"
                                    style={{ color: '#4b5563', lineHeight: '1.7' }}
                                    dangerouslySetInnerHTML={{ __html: sanitized }}
                                />
                            ) : (
                                <div className="job-desc-content" style={{ color: '#4b5563', lineHeight: '1.7', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                    {job.description}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Right Side: Application Form */}
                <div className="application-form-section">
                    <div className="card" style={{ padding: '32px', position: 'sticky', top: '40px' }}>
                        {hasApplied ? (
                            <>
                                <h2 className="section-title">Application Status</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '16px 0' }}>
                                    <div style={{ color: '#10b981', marginBottom: '8px' }}>
                                        <CheckCircle size={48} />
                                    </div>
                                    <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>You've already applied</h3>
                                    <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '16px' }}>
                                        Your application is currently: <strong>{applicationStatus || 'Applied'}</strong>
                                    </p>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        disabled
                                        style={{
                                            width: '100%',
                                            height: '44px',
                                            borderRadius: '12px',
                                            backgroundColor: '#f1f5f9',
                                            color: '#94a3b8',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontSize: '15px',
                                            fontWeight: '600',
                                            cursor: 'not-allowed'
                                        }}
                                    >
                                        <CheckCircle size={18} />
                                        <span>Applied</span>
                                    </button>
                                    <Link
                                        href="/dashboard/applications"
                                        style={{
                                            fontSize: '14px',
                                            color: '#3b82f6',
                                            textDecoration: 'none',
                                            fontWeight: '600',
                                            marginTop: '8px'
                                        }}
                                    >
                                        View My Applications
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="section-title">Apply for this role</h2>

                                <form onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label className="form-label" style={{ color: resumeLinkError ? '#ef4444' : undefined, fontWeight: 'bold' }}>
                                            Resume / CV <span style={{ color: '#ef4444' }}>*</span>
                                        </label>

                                        <div ref={resumeSectionRef} style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '24px',
                                            background: 'var(--bg-surface, rgba(255,255,255,0.04))',
                                            padding: '24px',
                                            borderRadius: '16px',
                                            border: resumeLinkError ? '1px solid #ef4444' : '1px solid var(--border-soft, rgba(255,255,255,0.08))',
                                            marginTop: '8px'
                                        }}>

                                            {/* Option 1: Upload */}
                                            <div style={{ opacity: (!resumeLink || resumeLink.startsWith('/')) ? 1 : 0.4, pointerEvents: (!resumeLink || resumeLink.startsWith('/')) ? 'auto' : 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '8px', width: '100%' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => !isUploadingResume && resumeInputRef.current?.click()}
                                                        className="btn-secondary"
                                                        disabled={isUploadingResume}
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '10px 20px', fontWeight: '500', flex: 1, minWidth: '160px', height: '44px' }}
                                                    >
                                                        {isUploadingResume ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                                        {isUploadingResume ? 'Uploading...' : 'Upload Resume'}
                                                    </button>
                                                    <input
                                                        type="file"
                                                        ref={resumeInputRef}
                                                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                        style={{ display: 'none' }}
                                                        onChange={handleResumeUpload}
                                                    />
                                                    {profileResumeUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setResumeLink(profileResumeUrl); setResumeLinkError(''); }}
                                                            className="btn-secondary"
                                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', padding: '10px 20px', fontWeight: '500', flex: 1, minWidth: '160px', height: '44px' }}
                                                        >
                                                            Use my profile CV
                                                        </button>
                                                    )}
                                                </div>
                                                <p style={{ fontSize: '14px', color: '#000000', margin: 0, fontWeight: '500' }}>PDF, DOC, or DOCX up to 5MB.</p>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '4px 0' }}>
                                                <div style={{ height: '1px', flex: 1, backgroundColor: '#d1d5db' }} />
                                                <span style={{ fontSize: '14px', color: '#000000', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>OR</span>
                                                <div style={{ height: '1px', flex: 1, backgroundColor: '#d1d5db' }} />
                                            </div>

                                            {/* Option 2: Link */}
                                            <div style={{ opacity: (!resumeLink || !resumeLink.startsWith('/')) ? 1 : 0.4, pointerEvents: (!resumeLink || !resumeLink.startsWith('/')) ? 'auto' : 'none' }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="https://... (Google Drive, Dropbox, etc.)"
                                                    value={resumeLink.startsWith('/') ? '' : resumeLink}
                                                    onChange={(e) => {
                                                        setResumeLink(e.target.value);
                                                        if (e.target.value) setResumeLinkError('');
                                                    }}
                                                    style={{
                                                        borderColor: resumeLinkError ? '#ef4444' : undefined,
                                                        outlineColor: resumeLinkError ? '#ef4444' : undefined,
                                                        fontSize: '14px',
                                                        padding: '12px 16px',
                                                        marginBottom: '8px'
                                                    }}
                                                />
                                                <p style={{ fontSize: '14px', color: '#000000', margin: 0, fontWeight: '500' }}>Make sure the link is public (Anyone with the link can view).</p>
                                            </div>

                                            {/* Display Selected Resume */}
                                            {resumeLink && (
                                                <div style={{
                                                    marginTop: '8px',
                                                    padding: '16px 20px',
                                                    background: 'var(--bg-surface-hover, rgba(255,255,255,0.07))',
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    border: '1px solid var(--teal, #14b8a6)',
                                                    boxShadow: '0 4px 14px rgba(20,184,166,0.1)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
                                                        <FileText size={22} style={{ color: 'var(--teal, #1de9d5)', flexShrink: 0 }} />
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <span style={{ fontSize: '15px', color: 'var(--text-primary, #e8f1f5)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {resumeLink.startsWith('/') ? resumeLink.split('/').pop() : resumeLink}
                                                            </span>
                                                            <span style={{ fontSize: '13px', color: 'var(--teal, #14b8a6)' }}>
                                                                File ready to submit
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <a
                                                            href={(() => {
                                                                // Internal paths and bare GCS object names → proxy through /api/resume/view
                                                                if (resumeLink.startsWith('/') || resumeLink.startsWith('resumes/')) {
                                                                    return `/api/resume/view?url=${encodeURIComponent(resumeLink)}`;
                                                                }
                                                                try {
                                                                    const parsed = new URL(resumeLink);
                                                                    return (parsed.protocol === 'http:' || parsed.protocol === 'https:')
                                                                        ? resumeLink
                                                                        : '#';
                                                                } catch {
                                                                    return '#';
                                                                }
                                                            })()}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ fontSize: '14px', color: 'var(--teal, #14b8a6)', fontWeight: 600, textDecoration: 'underline' }}
                                                        >
                                                            View
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => setResumeLink('')}
                                                            style={{ color: 'white', cursor: 'pointer', background: '#ef4444', border: 'none', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                                                            title="Remove resume"
                                                            onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                                                            onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Error Validation */}
                                            {resumeLinkError && (
                                                <div style={{
                                                    color: '#ef4444',
                                                    fontSize: '14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    marginTop: '8px',
                                                    padding: '12px 16px',
                                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                                }}>
                                                    <span style={{ fontSize: '18px', lineHeight: 1 }}>⚠️</span>
                                                    <span style={{ lineHeight: 1.4, fontWeight: 500 }}>{resumeLinkError}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Motivation Letter / Why you? (Optional)</label>
                                        <RichTextEditor
                                            value={motivationData}
                                            onChange={setMotivationData}
                                            placeholder="Tell us why you're a great fit..."
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Current CTC (Annual) <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <select
                                                name="currentCurrency"
                                                className="form-input"
                                                style={{ width: '100px', flexShrink: 0 }}
                                                value={formData.currentCurrency}
                                                onChange={handleInputChange}
                                                aria-required="true"
                                            >
                                                {WORLD_CURRENCIES.map(c => (
                                                    <option key={c.code} value={c.code}>{c.code}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                ref={currentCTCRef}
                                                name="currentCTC"
                                                className="form-input"
                                                placeholder="e.g. 1,00,000"
                                                value={formData.currentCTC}
                                                onChange={handleInputChange}
                                                onBlur={handleCTCBlur}
                                                required
                                                aria-required="true"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Expected CTC (Annual) <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <select
                                                name="expectedCurrency"
                                                className="form-input"
                                                style={{ width: '100px', flexShrink: 0 }}
                                                value={formData.expectedCurrency}
                                                onChange={handleInputChange}
                                                aria-required="true"
                                            >
                                                {WORLD_CURRENCIES.map(c => (
                                                    <option key={c.code} value={c.code}>{c.code}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                ref={expectedCTCRef}
                                                name="expectedCTC"
                                                className="form-input"
                                                placeholder="e.g. 1,50,000"
                                                value={formData.expectedCTC}
                                                onChange={handleInputChange}
                                                onBlur={handleCTCBlur}
                                                required
                                                aria-required="true"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Notice Period <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select
                                            name="noticePeriod"
                                            className="form-input"
                                            value={formData.noticePeriod}
                                            onChange={handleInputChange}
                                            required
                                            aria-required="true"
                                        >
                                            <option value="Immediate">Immediate</option>
                                            <option value="15 Days">15 Days</option>
                                            <option value="30 Days">30 Days</option>
                                            <option value="60 Days">60 Days</option>
                                            <option value="90 Days">90 Days</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Current City <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input
                                            type="text"
                                            ref={cityRef}
                                            name="city"
                                            className="form-input"
                                            placeholder="e.g. New York, NY"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            required
                                            aria-required="true"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "Submitting..." : "Complete Submission"}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
