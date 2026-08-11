"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthGate } from "@/hooks/useAuthGate";
import { getDashboardPath } from "@/lib/auth";
import AuthCard from "@/components/auth/AuthCard";
import PasswordInput from "@/components/ui/PasswordInput";
import toast from "react-hot-toast";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface RoleLoginFormProps {
  role: string;
  title: string;
  subtitle: string;
  placeholder: string;
}

export default function RoleLoginForm({ role, title, subtitle, placeholder }: RoleLoginFormProps) {
  const router = useRouter();
  const gate = useAuthGate();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setServerError(null);
    try {
      const response = await api.post("/auth/login", data);
      const user = response.data.user;
      if (!user || !user.role) {
        setServerError("Login failed. Please check your credentials.");
        return;
      }
      if (user.role !== role) {
        setServerError(`This portal is for ${title} accounts only.`);
        return;
      }
      localStorage.setItem("user", JSON.stringify(user));
      router.replace(getDashboardPath(user.role));
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      if (status === 401) {
        setServerError(detail || "Invalid email or password");
      } else {
        setServerError(detail || "Login failed. Please try again.");
      }
      toast.error(detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (gate !== "guest") {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" aria-label="Loading" role="status" />
      </div>
    );
  }

  return (
    <AuthCard title={title} subtitle={subtitle}>
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {serverError && (
          <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-sm text-danger-700" role="alert">
            {serverError}
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            className="input-field"
            placeholder={placeholder}
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-danger-500">{errors.email.message}</p>
          )}
        </div>
        <PasswordInput
          id="password"
          label="Password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              {...register("rememberMe")}
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-all duration-200 hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </AuthCard>
  );
}