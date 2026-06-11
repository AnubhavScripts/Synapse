import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/Layout/AppLayout';
import OpportunityCenter from './pages/OpportunityCenter';
import AIStrategist from './pages/AIStrategist';
import Campaigns from './pages/Campaigns';
import Customers from './pages/Customers';
import Segments from './pages/Segments';
import Analytics from './pages/Analytics';
import ActivityCenter from './pages/ActivityCenter';

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
          <Route element={<AppLayout />}>
            <Route path="/" element={<OpportunityCenter />} />
            <Route path="/strategist" element={<AIStrategist />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/segments" element={<Segments />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/activity" element={<ActivityCenter />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
