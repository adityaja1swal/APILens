import Navbar from './components/Navbar';
import AgentDashboard from './components/agents/AgentDashboard';

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="app-content">
        <AgentDashboard />
      </main>
    </div>
  );
}

export default App;
