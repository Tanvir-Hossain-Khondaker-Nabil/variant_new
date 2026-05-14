import React, { useState } from "react";
import GuestLayout from "../../layouts/GuestLayout";
import { Head, useForm } from "@inertiajs/react";

const GRADIENT = "linear-gradient(180deg, #1e4d2b 0%, #35a952 100%)";

const EyeIcon = ({ open, className = "" }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {open ? (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M10.733 5.08A10.784 10.784 0 0 1 12 5c7 0 10 7 10 7a18.343 18.343 0 0 1-3.162 4.431" />
        <path d="M6.61 6.61A16.893 16.893 0 0 0 2 12s3 7 10 7a10.62 10.62 0 0 0 5.389-1.57" />
        <path d="M8.71 8.71A3 3 0 0 0 12 15a3 3 0 0 0 3.29-3.29" />
        <path d="M3 3l18 18" />
      </>
    )}
  </svg>
);

function Login() {
  const [showPass, setShowPass] = useState(false);

  const { data, setData, post, processing, errors, reset } = useForm({
    email: "",
    password: "",
    remember: false,
  });

  const handleLogin = (e) => {
    e.preventDefault();

    post(route("login.post"), {
      preserveScroll: true,
      onFinish: () => reset("password"),
    });
  };

  return (
    <div className="bg-white rounded-[22px] shadow-xl border border-black/10 overflow-hidden">
      <Head title="Login" />

      {/* Top accent */}
      <div className="h-2" style={{ background: GRADIENT }} />

      <div className="p-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 bg-white">
            <span className="h-2.5 w-2.5 rounded-full bg-green-700" />
            <span className="text-xs font-semibold text-gray-700">Variant</span>
          </div>

          <h1 className="mt-4 text-2xl font-extrabold text-gray-900 tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Please login to your account
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-7 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-800">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              value={data.email}
              onChange={(e) => setData("email", e.target.value)}
              type="email"
              name="email"
              className={`mt-2 h-12 w-full rounded-2xl bg-[#FAFBF7] px-4 text-sm border focus:outline-none focus:ring-2 ${
                errors.email
                  ? "border-red-300 focus:ring-red-200"
                  : "border-black/10 focus:ring-green-200"
              }`}
              placeholder="Enter email"
              autoComplete="email"
              required
            />
            {errors.email && (
              <div className="mt-2 text-red-600 text-sm">{errors.email}</div>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-800">
              Password <span className="text-red-500">*</span>
            </label>

            <div className="mt-2 relative">
              <input
                value={data.password}
                onChange={(e) => setData("password", e.target.value)}
                type={showPass ? "text" : "password"}
                name="password"
                className={`h-12 w-full rounded-2xl bg-[#FAFBF7] px-4 pr-12 text-sm border focus:outline-none focus:ring-2 ${
                  errors.password
                    ? "border-red-300 focus:ring-red-200"
                    : "border-black/10 focus:ring-green-200"
                }`}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl border border-black/10 bg-white hover:bg-gray-50 flex items-center justify-center"
                title={showPass ? "Hide" : "Show"}
              >
                <EyeIcon open={showPass} className="text-gray-700" />
              </button>
            </div>

            {errors.password && (
              <div className="mt-2 text-red-600 text-sm">{errors.password}</div>
            )}
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 select-none">
              <input
                type="checkbox"
                name="remember"
                onChange={(e) => setData("remember", e.target.checked)}
                checked={data.remember}
                className="h-4 w-4 rounded border-black/20 accent-green-700"
              />
              <span className="text-sm text-gray-700">Remember me</span>
            </label>

            <a
              href="#"
              className="text-sm font-semibold text-[#1e4d2b] hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              Forgot password?
            </a>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={processing}
            className="w-full h-12 rounded-2xl text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition"
            style={{ background: GRADIENT }}
          >
            {processing ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Variant • All rights reserved
        </div>
      </div>
    </div>
  );
}

Login.layout = (page) => <GuestLayout>{page}</GuestLayout>;
export default Login;
