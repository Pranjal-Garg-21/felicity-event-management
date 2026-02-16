import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';
import OrganizerDashboard from './pages/OrganizerDashboard';
import ParticipantDashboard from './pages/ParticipantDashboard';
import Signup from './pages/Signup'; 
import CreateEvent from './pages/CreateEvent';
import Onboarding from './pages/Onboarding';
import TeamManagement from './pages/TeamManagement';
import JoinTeam from './pages/JoinTeam';
import QRScanner from './pages/QRScanner';

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <Routes>
        {/* 1. Landing / Role Selection Page: Publicly accessible root */}
        <Route path="/" element={<LandingPage />} />

        {/* 2. Login Page: Redirects to dashboard logic if already authenticated */}
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/determine-dashboard" />} 
        />

        {/* 3. Traffic Controller: Redirects users based on their specific role */}
        <Route path="/determine-dashboard" element={
          user ? (
            user.role === 'Admin' ? <Navigate to="/admin-dashboard" /> :
            user.role === 'Organizer' ? <Navigate to="/organizer-dashboard" /> :
            user.role === 'Participant' ? <Navigate to="/dashboard" /> :
            <Navigate to="/dashboard" />
          ) : <Navigate to="/" />
        } />

        {/* 4. Protected Admin Route: Exclusive access for club provisioning and password resets */}
        <Route 
          path="/admin-dashboard" 
          element={user?.role === 'Admin' ? <AdminDashboard /> : <Navigate to="/" />} 
        />
        
        {/* 5. Protected Organizer Route: Access for club event management */}
        <Route 
          path="/organizer-dashboard" 
          element={user?.role === 'Organizer' ? <OrganizerDashboard /> : <Navigate to="/" />} 
        />

        {/* 6. Protected Participant Route: General dashboard for registered students */}
        <Route 
          path="/dashboard" 
          element={user?.role === 'Participant' ? <ParticipantDashboard /> : <Navigate to="/" />} 
        />

        {/* 7. Team Management Routes */}
        <Route 
          path="/teams" 
          element={user?.role === 'Participant' ? <TeamManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/join-team/:inviteCode" 
          element={user ? <JoinTeam /> : <Navigate to="/login" />} 
        />

        {/* 8. QR Scanner Route for Organizers */}
        <Route 
          path="/qr-scanner/:eventId" 
          element={user?.role === 'Organizer' ? <QRScanner /> : <Navigate to="/login" />} 
        />

        {/* 9. Catch-all: Redirect any unknown routes to the landing page */}
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={user?.role === 'Participant' ? <Onboarding /> : <Navigate to="/" />} />
        <Route path="/create-event" element={user?.role === 'Organizer'? <CreateEvent/> : <Navigate to="/login"/>} />
      </Routes>
    </Router>
  );
}

export default App;