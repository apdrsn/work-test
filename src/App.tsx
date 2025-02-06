import { Route, Routes } from 'react-router';
import { About } from './screens/About/About';
import { Home } from './screens/Home/Home';
import './App.css';
import { Header } from './components/Header/Header';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function App() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <Header />
        <main className="main">
          <Routes>
            <Route index element={<Home />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
