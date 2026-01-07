import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './components/Layout/MainLayout';
import { ToastContainer } from './components/common/Toast';
import { UpdaterModal } from './components/common/UpdaterModal';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout />
      <UpdaterModal />
      <ToastContainer />
    </QueryClientProvider>
  );
}

export default App;
