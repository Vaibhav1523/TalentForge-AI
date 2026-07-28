"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import RichTextEditor from "@/components/RichTextEditor";
import { useDashboardTheme } from "@/components/dashboard/DashboardThemeProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRecruiterBasePath } from "@/components/RecruiterBasePathContext";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  ArrowLeft,
  Save,
  Loader2,
  X,
  Plus,
  Building2,
  Globe,
} from "lucide-react";
import { Country, State } from "country-state-city";
import { WORLD_CURRENCIES, getCurrencySymbol } from "@/lib/currencies";
import {
  formatIndian,
  blurFormatIndian,
  toNumericString,
} from "@/lib/formatIndianNumber";

const LocationSelector = dynamic(
  () => import("@/components/dashboard/LocationSelector"),
  { ssr: false },
);

// Helpers
const getCountryName = (iso: string) =>
  Country.getCountryByCode(iso)?.name || iso;
const getStateName = (countryIso: string, stateIso: string) =>
  State.getStateByCodeAndCountry(stateIso, countryIso)?.name || stateIso;

interface JobFormData {
  title: string;
  company: string;
  location: string;
  description: string;
  employmentType: string;
  category: string;
  skills: string[];
  salaryMin: string;
  salaryMax: string;
  currency: string;
  status: string;
}

export default function EditJobPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const base = useRecruiterBasePath();
  const { theme } = useDashboardTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);

  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    company: "",
    location: "",
    description: "",
    employmentType: "Full-time",
    category: "",
    skills: [],
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
    status: "DRAFT",
  });

  // Global location state
  const [selectedCountryIso, setSelectedCountryIso] = useState("");
  const [selectedStateIso, setSelectedStateIso] = useState("");
  const [selectedCityName, setSelectedCityName] = useState("");
  const [locPincode, setLocPincode] = useState("");
  // Fallback names preserved when ISO lookup fails (prevents erasing stored metadata)
  const [fallbackCountryName, setFallbackCountryName] = useState("");
  const [fallbackStateName, setFallbackStateName] = useState("");

  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/company/jobs/${params.id}`, { signal: controller.signal });

        if (!res.ok) throw new Error("Failed to fetch job");

        const data = await res.json();

        if (controller.signal.aborted) return;

        // Parse Salary string if possible, format with Indian commas
        let min = "";
        let max = "";
        if (data.salary) {
          const parts = data.salary.split(" - ");
          if (parts.length === 2) {
            min = formatIndian(parts[0].trim());
            max = formatIndian(parts[1].trim());
          } else {
            min = formatIndian(data.salary.trim());
          }
        }

        setFormData({
          title: data.title ?? "",
          company: data.company ?? "",
          location: data.location ?? "",
          description: data.description ?? "",
          employmentType: data.employmentType ?? "Full-time",
          category: data.category ?? "",
          skills: Array.isArray(data.skills)
            ? Array.from(new Set(data.skills as string[]))
            : [],
          salaryMin: min,
          salaryMax: max,
          currency: data.currency ?? "USD",
          status: data.status ?? "DRAFT",
        });

        // Try to pre-populate LocationSelector from stored fields.
        // If ISO lookup fails we preserve the raw names as fallbacks so the
        // save payload never erases existing country/state metadata.
        if (data.country) {
          const allCountries = Country.getAllCountries();
          const foundCountry = allCountries.find(
            (c) => c.name === data.country,
          );
          if (foundCountry) {
            setSelectedCountryIso(foundCountry.isoCode);
            if (data.state) {
              const allStates = State.getStatesOfCountry(foundCountry.isoCode);
              const foundState = allStates.find((s) => s.name === data.state);
              if (foundState) {
                setSelectedStateIso(foundState.isoCode);
              } else {
                // ISO lookup for state failed — store raw name as fallback
                setFallbackStateName(data.state);
              }
            }
          } else {
            // ISO lookup for country failed — store raw names as fallbacks
            setFallbackCountryName(data.country);
            if (data.state) setFallbackStateName(data.state);
          }
        }
        if (data.city) setSelectedCityName(data.city);
        if (data.pincode) setLocPincode(data.pincode);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        toast.error("Failed to load job details");
        setHasLoadError(true); // Prevent form submission with blank defaults
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchJob();
    return () => controller.abort();
  }, [params.id]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev: JobFormData) => ({ ...prev, [name]: value }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData((prev: JobFormData) => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev: JobFormData) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Combine salary
      const hasMin = toNumericString(formData.salaryMin).trim() !== "";
      const hasMax = toNumericString(formData.salaryMax).trim() !== "";
      let finalSalary = "";
      if (hasMin && hasMax) {
        finalSalary = `${toNumericString(formData.salaryMin)} - ${toNumericString(formData.salaryMax)}`;
      } else if (hasMin) {
        finalSalary = toNumericString(formData.salaryMin);
      } else if (hasMax) {
        finalSalary = toNumericString(formData.salaryMax);
      }

      // Build resolved location fields.
      // Prefer ISO-resolved names; fall back to the raw names stored at load
      // time if ISO resolution returns an empty string (lookup had failed).
      const resolvedCountry =
        (selectedCountryIso ? getCountryName(selectedCountryIso) : "") ||
        fallbackCountryName;
      const resolvedState =
        (selectedStateIso
          ? getStateName(selectedCountryIso, selectedStateIso)
          : "") || fallbackStateName;
      const resolvedCity = selectedCityName;
      const resolvedLocation =
        [resolvedCity, resolvedState, resolvedCountry]
          .filter(Boolean)
          .join(", ") ||
        formData.location ||
        "Remote";

      const { salaryMin: _sMin, salaryMax: _sMax, ...rest } = formData;
      const payload = {
        ...rest,
        salary: finalSalary,
        location: resolvedLocation,
        country: resolvedCountry,
        state: resolvedState,
        city: resolvedCity,
        pincode: locPincode,
      };

      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      const res = await fetch(`/api/company/jobs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update job");

      router.push(`${base}/jobs`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "edit-job-status-badge status-active";
      case "DRAFT":
        return "edit-job-status-badge status-draft";
      default:
        return "edit-job-status-badge status-other";
    }
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  if (hasLoadError)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "16px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#ef4444", fontWeight: 600, fontSize: "16px" }}>
          Failed to load job details. Please go back and try again.
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.back()}
          style={{ padding: "10px 24px" }}
        >
          Go Back
        </button>
      </div>
    );

  return (
    <div
      className="edit-job-page"
      style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}
    >
      <Link
        href={`${base}/jobs`}
        className="edit-job-back-link"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "24px",
          textDecoration: "none",
          fontWeight: "500",
        }}
      >
        <ArrowLeft size={18} /> Back to Jobs
      </Link>

      <div
        className="card edit-job-card"
        style={{ overflow: "visible", padding: 0 }}
      >
        {/* Header */}
        <div
          className="edit-job-header"
          style={{
            padding: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1
            className="edit-job-heading"
            style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}
          >
            Edit Job Posting
          </h1>
          <span className={getStatusClass(formData.status)}>
            {formData.status}
          </span>
        </div>

        <form
          onSubmit={handleSave}
          className="edit-job-form"
          style={{
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* Basic Info */}
          <div className="edit-job-row edit-job-primary-row">
            <div className="edit-job-primary-block">
              <label
                className="edit-job-label"
                htmlFor="title"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                Job Title
              </label>
              <div style={{ position: "relative" }}>
                <Briefcase
                  size={18}
                  className="edit-job-input-icon"
                  style={{ position: "absolute", left: "12px", top: "12px" }}
                />
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="form-input"
                  style={{ width: "100%", paddingLeft: "40px" }}
                  placeholder="e.g. Senior Product Designer"
                  required
                />
              </div>
            </div>
          </div>

          <div
            className="edit-job-row"
            style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}
          >
            <div style={{ flex: "1 1 300px" }}>
              <label
                className="edit-job-label"
                htmlFor="employmentType"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                Employment Type
              </label>
              <div style={{ position: "relative" }}>
                <Clock
                  size={18}
                  className="edit-job-input-icon"
                  style={{ position: "absolute", left: "12px", top: "12px" }}
                />
                <select
                  id="employmentType"
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className="form-input"
                  style={{
                    width: "100%",
                    paddingLeft: "40px",
                    appearance: "none",
                  }}
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Internship</option>
                </select>
              </div>
            </div>

            <div style={{ flex: "1 1 300px" }}>
              <label
                className="edit-job-label"
                htmlFor="category"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                Category
              </label>
              <div style={{ position: "relative" }}>
                <Building2
                  size={18}
                  className="edit-job-input-icon"
                  style={{ position: "absolute", left: "12px", top: "12px" }}
                />
                <input
                  id="category"
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="form-input"
                  style={{ width: "100%", paddingLeft: "40px" }}
                  placeholder="e.g. Engineering"
                />
              </div>
            </div>
          </div>

          <div
            className="form-group full-width edit-job-location-section"
            style={{ marginTop: "4px", marginBottom: "4px" }}
          >
            <label
              className="form-label edit-job-location-title"
              style={{
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: "700",
                margin: 0,
              }}
            >
              Location Details (Optional)
            </label>
            <div
              className="edit-job-location-wrapper"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "16px",
                marginTop: "12px",
              }}
            >
              <LocationSelector
                selectedCountryIso={selectedCountryIso}
                setSelectedCountryIso={(iso) => {
                  setSelectedCountryIso(iso);
                  setSelectedStateIso("");
                  setSelectedCityName("");
                }}
                selectedStateIso={selectedStateIso}
                setSelectedStateIso={(iso) => {
                  setSelectedStateIso(iso);
                  setSelectedCityName("");
                }}
                selectedCityName={selectedCityName}
                setSelectedCityName={setSelectedCityName}
                pincode={locPincode}
                setPincode={setLocPincode}
              />
            </div>
          </div>

          {/* Salary Row */}
          <div
            className="edit-job-row"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: "1 1 150px" }}>
              <label
                htmlFor="salaryMin"
                className="edit-job-label"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                Salary Range
              </label>
              <div
                className="form-input"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  paddingLeft: "14px",
                  paddingRight: "14px",
                }}
              >
                <div style={{ fontWeight: "600", color: theme === "dark" ? "#9ca3af" : "#6b7280", flexShrink: 0 }}>
                  {getCurrencySymbol(formData.currency)}
                </div>
                <input
                  id="salaryMin"
                  type="text"
                  name="salaryMin"
                  value={formData.salaryMin}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setFormData((prev) => ({ ...prev, salaryMin: raw }));
                  }}
                  onBlur={(e) =>
                    blurFormatIndian(e.currentTarget.value, (val) =>
                      setFormData((prev) => ({ ...prev, salaryMin: val })),
                    )
                  }
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    padding: 0,
                    fontSize: "inherit",
                    color: "inherit",
                  }}
                  placeholder="e.g. 6,00,000"
                />
              </div>
            </div>
            <div style={{ flex: "1 1 150px" }}>
              <label htmlFor="salaryMax" className="sr-only">
                Maximum Salary
              </label>
              <div
                className="form-input"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  paddingLeft: "14px",
                  paddingRight: "14px",
                }}
              >
                <div style={{ fontWeight: "600", color: theme === "dark" ? "#9ca3af" : "#6b7280", flexShrink: 0 }}>
                  {getCurrencySymbol(formData.currency)}
                </div>
                <input
                  id="salaryMax"
                  aria-label="Maximum Salary"
                  type="text"
                  name="salaryMax"
                  value={formData.salaryMax}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setFormData((prev) => ({ ...prev, salaryMax: raw }));
                  }}
                  onBlur={(e) =>
                    blurFormatIndian(e.currentTarget.value, (val) =>
                      setFormData((prev) => ({ ...prev, salaryMax: val })),
                    )
                  }
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    padding: 0,
                    fontSize: "inherit",
                    color: "inherit",
                  }}
                  placeholder="e.g. 12,00,000 (Optional)"
                />
              </div>
            </div>
            <div style={{ flex: "1 1 120px" }}>
              <label htmlFor="currency" className="sr-only">
                Currency
              </label>
              <div style={{ position: "relative" }}>
                <Globe
                  size={18}
                  className="edit-job-input-icon"
                  style={{ position: "absolute", left: "12px", top: "12px" }}
                />
                <select
                  id="currency"
                  aria-label="Currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="form-input"
                  style={{
                    width: "100%",
                    paddingLeft: "40px",
                    appearance: "none",
                  }}
                >
                  {WORLD_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>{" "}
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="edit-job-label"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-input"
              style={{ width: "100%", appearance: "none" }}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="CLOSED">Closed (Hidden)</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label
              className="edit-job-label"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              Description
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(html) => setFormData((prev) => ({ ...prev, description: html }))}
              placeholder="Detailed job description..."
              minHeight={220}
              theme={theme}
            />
          </div>

          {/* Skills */}
          <div>
            <label
              htmlFor="skill-input"
              className="edit-job-label"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              Skills
            </label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              {formData.skills &&
                formData.skills.map((skill: string, index: number) => (
                  <span
                    key={`${skill}-${index}`}
                    className="edit-job-skill-chip"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      aria-label={`Remove ${skill}`}
                      className="edit-job-skill-chip-remove"
                    >
                      <X size={14} />
                    </button>{" "}
                  </span>
                ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                id="skill-input"
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addSkill())
                }
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Add skill and press Enter"
              />
              <button
                type="button"
                onClick={addSkill}
                className="edit-job-skill-add"
                style={{
                  padding: "0 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Actions */}
          {/* Actions */}
          <div className="form-actions-container">
            <Link
              href={`${base}/jobs`}
              className="btn-responsive edit-job-cancel-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: "48px",
                padding: "0 24px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary btn-responsive"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: "48px",
                padding: "0 24px",
                borderRadius: "8px",
                fontWeight: "600",
                gap: "8px",
                opacity: saving ? 0.7 : 1,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              Save Changes
            </button>
          </div>

          <style jsx>{`
            .form-actions-container {
              display: flex;
              justify-content: flex-end;
              gap: 12px;
              padding-top: 24px;
              margin-top: 12px;
              border-top: 1px solid #f3f4f6;
            }

            @media (max-width: 768px) {
              .form-actions-container {
                flex-direction: column;
                gap: 12px;
              }
              /* Use global selector strategy or specific class to force width */
              :global(.btn-responsive) {
                width: 100% !important;
              }
            }
          `}</style>
        </form>
      </div>
    </div>
  );
}
