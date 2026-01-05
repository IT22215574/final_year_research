"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, User, Mail, Phone, MapPin, Lock, Fish, AlertCircle, CheckCircle } from "lucide-react";
import { completeSignup } from "@/lib/authApi";
import type { ApiError } from "@/lib/api";

export default function SignUpPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    role: "customer",
    district: "",
    zone: "",
    medium: "English",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  const sriLankaDistricts = [
    "Colombo", "Gampaha", "Kalutara", "Galle", "Matara", "Hambantota",
    "Kandy", "Kurunegala", "Puttalam", "Jaffna", "Trincomalee", "Batticaloa",
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }

    if (!formData.district) newErrors.district = "District is required";
    if (!formData.zone.trim()) newErrors.zone = "Zone is required";

    if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 10) value = value.slice(0, 10);
    
    // Format as 077 123 4567
    if (value.length > 3) {
      value = `${value.slice(0, 3)} ${value.slice(3)}`;
    }
    if (value.length > 7) {
      value = `${value.slice(0, 7)} ${value.slice(7)}`;
    }
    
    handleChange({ ...e, target: { ...e.target, value } });
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setPending(true);
    setErrors({});

    try {
      await completeSignup({ 
        ...formData, 
        phone: formData.phone.replace(/\s/g, ''),
        password: formData.password 
      });
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/sign-in");
      }, 2000);
    } catch (e) {
      const apiError = e as ApiError;
      if (apiError.field) {
        setErrors({ [apiError.field]: apiError.message });
      } else {
        setErrors({ general: apiError.message ?? "Signup failed. Please try again." });
      }
    } finally {
      setPending(false);
    }
  }

  const Input = ({ label, icon, error, ...props }: any) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </span>
        <input
          {...props}
          className={`w-full px-4 py-3 pl-10 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent ${
            error 
              ? 'border-red-500 focus:ring-red-200' 
              : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
          }`}
        />
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
            <AlertCircle size={18} />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
    </div>
  );

  const PasswordInput = ({ label, show, toggle, error, ...props }: any) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          {...props}
          type={show ? "text" : "password"}
          className={`w-full px-4 py-3 pr-10 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent ${
            error 
              ? 'border-red-500 focus:ring-red-200' 
              : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
          }`}
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 hover:shadow-3xl">
        {/* LEFT - FORM */}
        <div className="p-8 md:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <Fish className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Smart Fisher Lanka</h1>
              <p className="text-gray-500 text-sm">Create your account</p>
            </div>
          </div>

          {success ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-green-600" size={48} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created Successfully!</h2>
              <p className="text-gray-600 mb-6">Redirecting to login page...</p>
              <div className="w-16 h-1 bg-gradient-to-r from-green-400 to-blue-500 mx-auto rounded-full"></div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="firstName"
                  icon={<User size={18} />}
                  value={formData.firstName}
                  onChange={handleChange}
                  error={errors.firstName}
                  required
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  icon={<User size={18} />}
                  value={formData.lastName}
                  onChange={handleChange}
                  error={errors.lastName}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  icon={<Mail size={18} />}
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                />
                <Input
                  label="Phone"
                  name="phone"
                  icon={<Phone size={18} />}
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="077 123 4567"
                  error={errors.phone}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">District</label>
                  <div className="relative">
                    <select
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent appearance-none ${
                        errors.district 
                          ? 'border-red-500 focus:ring-red-200' 
                          : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
                      }`}
                    >
                      <option value="">Select District</option>
                      {sriLankaDistricts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      ▼
                    </div>
                  </div>
                  {errors.district && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.district}
                    </p>
                  )}
                </div>
                <Input
                  label="Zone"
                  name="zone"
                  icon={<MapPin size={18} />}
                  value={formData.zone}
                  onChange={handleChange}
                  error={errors.zone}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PasswordInput
                  label="Password"
                  value={formData.password}
                  show={showPassword}
                  toggle={() => setShowPassword(!showPassword)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setFormData(p => ({ ...p, password: e.target.value }))
                  }
                  error={errors.password}
                  required
                />
                <PasswordInput
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  show={showConfirmPassword}
                  toggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setFormData(p => ({ ...p, confirmPassword: e.target.value }))
                  }
                  error={errors.confirmPassword}
                  required
                />
              </div>

              {errors.general && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="text-red-500 mt-0.5" size={20} />
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white py-3.5 rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl"
              >
                {pending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>

        {/* RIGHT - INFO */}
        <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600 text-white p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-20 translate-y-20"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-6 leading-snug">
              Empowering Sri Lankan Fisheries
            </h2>
            <p className="text-lg opacity-90 mb-8 leading-relaxed">
              Join thousands of fishers making smarter decisions with real-time data
              and sustainable practices.
            </p>
            <ul className="space-y-4">
              {[
                "🌤️ Real-time weather & fishing zone alerts",
                "📈 Live market price insights & trends",
                "🤝 Community network & expert support",
                "📱 Mobile-first, easy-to-use platform",
                "🌊 Sustainable fishing practices guidance",
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-base">
                  <div className="w-2 h-2 bg-emerald-300 rounded-full"></div>
                  {item}
                </li>
              ))}
            </ul>
            
            <div className="mt-10 pt-8 border-t border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Fish size={24} />
                </div>
                <div>
                  <p className="font-semibold">Trusted by 5,000+ fishers</p>
                  <p className="text-sm opacity-80">Across 12 districts in Sri Lanka</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}