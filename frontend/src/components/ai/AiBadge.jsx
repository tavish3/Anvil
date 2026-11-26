import { Sparkles } from 'lucide-react';

export default function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
      <Sparkles className="w-3 h-3" />
      AI
    </span>
  );
}
