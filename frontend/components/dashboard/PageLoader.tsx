import { Loader2 } from "lucide-react";

export default function PageLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[50vh] animate-fade-in-up">
      <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-4" />
      <p className="text-sm font-medium text-gray-500">{label}</p>
    </div>
  );
}
