import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/Layout/AppLayout';
import LandingPage from './pages/LandingPage';
import SignIn from './pages/SignIn';
import OpportunityCenter from './pages/OpportunityCenter';
import AIStrategist from './pages/AIStrategist';
import Campaigns from './pages/Campaigns';
import Customers from './pages/Customers';
import Segments from './pages/Segments';
import Analytics from './pages/Analytics';
import ActivityCenter from './pages/ActivityCenter';
import SystemArchitecture from './pages/SystemArchitecture';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public marketing pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignIn />} />

          {/* Internal authenticated dashboard pages */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<OpportunityCenter />} />
            <Route path="/dashboard/strategist" element={<AIStrategist />} />
            <Route path="/dashboard/campaigns" element={<Campaigns />} />
            <Route path="/dashboard/customers" element={<Customers />} />
            <Route path="/dashboard/segments" element={<Segments />} />
            <Route path="/dashboard/analytics" element={<Analytics />} />
            <Route path="/dashboard/activity" element={<ActivityCenter />} />
            <Route path="/dashboard/system" element={<SystemArchitecture />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
