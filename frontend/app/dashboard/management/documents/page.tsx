"use client";

import { useEffect, useState } from "react";
import { FileText, AlertCircle } from "lucide-react";
import api from "@/lib/api";

export default function ManagementDocumentsPage() {
  const [checked, setChecked] = useState(false);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/documents/").then(() => setAvailable(true)).catch((err) => setError(err?.message || "Documents API is not available")).finally(() => setChecked(true));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Documents</h1>
      <div className="card max-w-lg mx-auto text-center py-10">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        {!checked ? (
          <p className="text-gray-600">Checking Documents API…</p>
        ) : available ? (
          <p className="text-gray-600">The Documents service is available. This page is not yet implemented.</p>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 text-amber-800 bg-amber-50 px-4 py-2 rounded-md mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">No Documents API is registered on the backend (`GET /documents/` returned an error).</span>
            </div>
            {error && <p className="text-xs text-gray-500">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
