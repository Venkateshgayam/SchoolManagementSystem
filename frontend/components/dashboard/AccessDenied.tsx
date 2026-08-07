import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="card max-w-lg mx-auto text-center py-12">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-50 text-danger-600">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="mt-2 text-gray-600">You don&apos;t have permission to view this page.</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 btn-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>
    </div>
  );
}