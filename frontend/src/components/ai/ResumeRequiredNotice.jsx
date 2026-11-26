import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';

export default function ResumeRequiredNotice({ compact = false }) {
  return (
    <div
      className={`bg-blue-50 border border-blue-200 text-blue-800 rounded-lg ${
        compact ? 'p-3 text-sm' : 'p-4'
      }`}
    >
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Upload your resume to get an AI fit check, resume tips and cover
          letters.{' '}
          <Link to="/profile" className="font-medium underline">
            Go to profile
          </Link>
        </p>
      </div>
    </div>
  );
}
