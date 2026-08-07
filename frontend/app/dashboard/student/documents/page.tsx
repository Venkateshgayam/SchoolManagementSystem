"use client";

import { useState, useEffect } from "react";
import { Folder, FileText, Download } from "lucide-react";
import api from "@/lib/api";

interface DocumentRecord {
  id: number;
  title: string;
  description: string | null;
  file_url: string | null;
  document_type: string | null;
  uploaded_by: number | null;
  student_id: number | null;
  created_at: string;
}

export default function StudentDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await api.get("/documents").catch(() => ({ data: [] }));
        setDocuments(res.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load documents");
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Documents</h1>

      {documents.length === 0 ? (
        <div className="card text-center py-8">
          <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No documents available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="card">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="h-8 w-8 text-primary-600" />
                <h3 className="font-semibold text-gray-900">{doc.title}</h3>
              </div>
              {doc.description && (
                <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
              )}
              {doc.document_type && (
                <p className="text-xs text-gray-400 mb-2">{doc.document_type}</p>
              )}
              {doc.file_url ? (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Download className="h-4 w-4" /> Download
                </a>
              ) : (
                <p className="text-sm text-gray-400">No file attached</p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                {new Date(doc.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}