"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone_number: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      full_name: user?.full_name || "",
      phone_number: user?.phone_number || "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      await api.put("/users/profile", data);
      localStorage.setItem("user", JSON.stringify({ ...user, ...data }));
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
      <div className="card max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input-field" value={user?.email || ""} disabled />
          </div>
          <div>
            <label className="label">Username</label>
            <input type="text" className="input-field" value={user?.username || ""} disabled />
          </div>
          <div>
            <label className="label">Role</label>
            <input type="text" className="input-field" value={user?.role || ""} disabled />
          </div>
          <div>
            <label htmlFor="full_name" className="label">Full Name</label>
            <input id="full_name" type="text" className="input-field" {...register("full_name")} />
            {errors.full_name && <p className="mt-1 text-sm text-danger-500">{errors.full_name.message}</p>}
          </div>
          <div>
            <label htmlFor="phone_number" className="label">Phone Number</label>
            <input id="phone_number" type="text" className="input-field" {...register("phone_number")} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}