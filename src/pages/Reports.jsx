import { BarChart3 } from 'lucide-react';
import { PageHeader } from '../components.jsx';

export default function Reports() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Analytics and reporting for parish growth, attendance, and activity."
      />
      <div className="bg-white border border-gray-100 rounded-xl py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Reports coming soon</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
          This module is waiting on backend reporting endpoints. It'll be built once those are available.
        </p>
      </div>
    </div>
  );
}