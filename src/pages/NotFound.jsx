import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '../components.jsx';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <FileQuestion className="h-6 w-6 text-gray-400" />
      </div>
      <h1 className="text-xl font-semibold text-gray-900">Page not found</h1>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to="/dashboard" className="mt-6">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}