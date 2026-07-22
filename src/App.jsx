import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, PermissionProvider } from './auth.jsx';
import AppRoutes from './routes.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermissionProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{ style: { borderRadius: '10px', fontSize: '14px' } }}
          />
        </PermissionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}