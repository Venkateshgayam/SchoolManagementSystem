"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import PasswordInput from "@/components/ui/PasswordInput";
import PageHeader from "@/components/dashboard/PageHeader";

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function DashboardChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>();

  const onSubmit = async (data: ChangePasswordFormData) => {
    setLoading(true);
    try {
      await api.put("/auth/change-password", {
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
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <PageHeader title="Change Password" subtitle="Update your account password" icon={Lock} />
      <div className="card max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <PasswordInput
            id="current_password"
            label="Current Password"
            error={errors.current_password?.message}
            {...register("current_password")}
          />
          <PasswordInput
            id="new_password"
            label="New Password"
            error={errors.new_password?.message}
            {...register("new_password")}
          />
          <PasswordInput
            id="confirm_password"
            label="Confirm New Password"
            error={errors.confirm_password?.message}
            {...register("confirm_password")}
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}