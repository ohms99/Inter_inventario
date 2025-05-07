import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Tracker from './Tracker';
import Dashboard from './Dashboard';
import BeerTracker from './BeerTracker';
import './app.css';

export function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Tracker />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/beer-tracker" element={<BeerTracker />} />
        </Routes>
      </div>
    </Router>
  );
}
