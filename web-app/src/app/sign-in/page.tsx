"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Fish,
  Shield,
  Sparkles,
  Anchor,
  Waves,
  Ship,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import SFLLogo from "../../../../mobile/assets/images/SFLLogo.png";

import { signIn } from "@/lib/authApi";
import type { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function SignInPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginForm) {
    try {
      const user = await signIn({ email: data.email, password: data.password });
      setUser(user);
      toast.success("Successfully signed in!", {
        description: "Welcome back to Smart Fisher Lanka",
      });
      router.push("/admin");
    } catch (e) {
      const err = e as ApiError;
      toast.error("Authentication failed", {
        description:
          err.message ?? "Please check your credentials and try again.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="flex min-h-screen">
        {/* Left Side - Form */}
        <div className="flex w-full lg:w-5/12 items-center justify-center bg-white/80 backdrop-blur-sm p-8 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* Header with Logo */}
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="relative">
                  <Image
                    src={SFLLogo}
                    alt="Smart Fisher Lanka Logo"
                    width={128}
                    height={128}
                    className="relative rounded-xl"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Smart Fisher Lanka
                  </h1>
                  <p className="text-sm font-medium text-gray-500 tracking-wide">
                    Sustainable Fisheries Management
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  <Shield className="w-4 h-4" />
                  Admin Portal
                </div>
                <h2 className="text-4xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                    Welcome back
                  </span>
                </h2>
                <p className="text-gray-500 text-base leading-relaxed">
                  Sign in to access your dashboard and manage your fisheries operations
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-gray-700 tracking-wide"
                >
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="admin@fisheries.com"
                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 text-base"
                    suppressHydrationWarning
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1.5 flex items-center gap-1.5">
                    <span className="inline-block w-1 h-1 rounded-full bg-red-600" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-gray-700 tracking-wide"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 text-base"
                    suppressHydrationWarning
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1.5 flex items-center gap-1.5">
                    <span className="inline-block w-1 h-1 rounded-full bg-red-600" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20 focus:ring-2 transition-all"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                    Remember me
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-semibold py-3.5 px-6 rounded-xl hover:from-blue-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 flex items-center justify-center gap-2 group text-base"
                suppressHydrationWarning
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to dashboard</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="pt-6 text-center">
              <div className="flex items-center justify-center gap-3 text-xs">
                <Link
                  href="/privacy"
                  className="text-gray-400 hover:text-gray-600 transition-colors font-medium"
                >
                  Privacy Policy
                </Link>
                <span className="text-gray-300">•</span>
                <Link
                  href="/terms"
                  className="text-gray-400 hover:text-gray-600 transition-colors font-medium"
                >
                  Terms of Service
                </Link>
                <span className="text-gray-300">•</span>
                <span className="text-gray-400 font-medium">
                  © {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Hero Section */}
        <div className="hidden lg:flex lg:w-7/12 relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-emerald-800">
          {/* Abstract Wave Pattern */}
          <div className="absolute inset-0 opacity-10">
            <Waves className="w-full h-full text-white/20" />
          </div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-20 animate-float">
            <div className="w-20 h-20 bg-white/5 rounded-3xl backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <Ship className="w-10 h-10 text-white/40" />
            </div>
          </div>
          
          <div className="absolute bottom-20 right-20 animate-float-delayed">
            <div className="w-16 h-16 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <Anchor className="w-8 h-8 text-white/40" />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
            <div className="max-w-2xl text-center space-y-8">
              {/* Floating Icon */}
              <div className="inline-flex p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
                <Fish className="w-12 h-12 text-white" />
              </div>

              <div className="space-y-4">
                <h2 className="text-5xl font-bold leading-tight">
                  Sustainable Fisheries
                  <span className="block text-transparent bg-gradient-to-r from-emerald-200 to-blue-200 bg-clip-text">
                    Management Platform
                  </span>
                </h2>

                <p className="text-xl text-white/80 leading-relaxed max-w-lg mx-auto">
                  Empowering fishermen and administrators with real-time data,
                  sustainable practices, and community-driven insights.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-6 p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
                <div className="space-y-1">
                  <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-emerald-200 to-blue-200 bg-clip-text">
                    500+
                  </div>
                  <div className="text-sm font-medium text-white/60 uppercase tracking-wider">
                    Active Fishermen
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-emerald-200 to-blue-200 bg-clip-text">
                    50+
                  </div>
                  <div className="text-sm font-medium text-white/60 uppercase tracking-wider">
                    Communities
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-emerald-200 to-blue-200 bg-clip-text">
                    98%
                  </div>
                  <div className="text-sm font-medium text-white/60 uppercase tracking-wider">
                    Satisfaction
                  </div>
                </div>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  "Real-time Tracking",
                  "Sustainable Practices",
                  "Community Hub",
                  "Market Insights",
                  "Analytics Dashboard",
                  "Mobile App",
                ].map((feature) => (
                  <span
                    key={feature}
                    className="px-4 py-2 text-sm bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 transition-all cursor-default"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Testimonial */}
              <div className="pt-8">
                <div className="relative">
                  <div className="absolute -top-4 left-0 text-6xl text-white/10">"</div>
                  <p className="text-base text-white/70 italic max-w-md mx-auto">
                    This platform has revolutionized how we manage our fisheries. 
                    The insights are invaluable for sustainable practices.
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-sm font-medium">MC</span>
                    </div>
                    <span className="text-sm text-white/60">— Master Fisherman</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}
