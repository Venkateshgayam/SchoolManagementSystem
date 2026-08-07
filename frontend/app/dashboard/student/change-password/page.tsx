"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function StudentChangePasswordPage() {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>();

  const onSubmit = async (data: ChangePasswordFormData) => {
    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success("Password changed successfully");
      reset();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h1>
      <div className="card max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="current_password" className="label">Current Password</label>
            <input id="current_password" type="password" className="input-field" {...register("current_password")} />
            {errors.current_password && (
              <p className="mt-1 text-sm text-danger-500">{errors.current_password.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="new_password" className="label">New Password</label>
            <input id="new_password" type="password" className="input-field" {...register("new_password")} />
            {errors.new_password && (
              <p className="mt-1 text-sm text-danger-500">{errors.new_password.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="confirm_password" className="label">Confirm New Password</label>
            <input id="confirm_password" type="password" className="input-field" {...register("confirm_password")} />
            {errors.confirm_password && (
              <p className="mt-1 text-sm text-danger-500">{errors.confirm_password.message}</p>
            )}
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}