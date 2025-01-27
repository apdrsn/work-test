import { Route, Routes } from 'react-router';
import { About } from './screens/About/About';
import { Home } from './screens/Home/Home';
import './App.css';
import { Header } from './components/Header/Header';


function App() {

  return (
    <div className="App">
      <Header />
      <Routes>
        <Route index element={<Home />} />
        <Route path='/about' element={<About />} />
      </Routes>
    </div >
  );
}

export default App;
