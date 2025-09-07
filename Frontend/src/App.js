import { Copy, FileJson, FileSpreadsheet, FileText, HelpCircle, History, LogOut, PlayCircle, SquarePen, Table } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Joyride from 'react-joyride';
import { Notification } from './components/Notification';
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ResetPasswordForm } from './components/auth/ResetPasswordForm';
import { DataTable } from './components/data/DataTable';
import { GenerationForm } from './components/data/GenerationForm';
import { GettingStarted } from './components/views/GettingStarted';
import { HistoryView } from './components/views/HistoryView';
import { LandingPage } from './components/views/LandingPage';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';

const App = () => {
  const { user, loading, logout, token, API_BASE_URL } = useAuth();
  const [view, setView] = useState('generate');
  const [generatedData, setGeneratedData] = useState(null);
  const [generatedRelationalData, setGeneratedRelationalData] = useState(null);
  const [isRelationalOutput, setIsRelationalOutput] = useState(false);
  const [notification, setNotification] = useState(null);

  // Tour state
  const [runTour, setRunTour] = useState(false);
  const [tourSteps, setTourSteps] = useState([]);

  // Refs for tour targeting
  const generateButtonRef = useRef(null);
  const historyButtonRef = useRef(null);
  const gettingStartedButtonRef = useRef(null);
  const exportsButtonRef = useRef(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      setView('reset-password');
    }
  }, []);

  useEffect(() => {
    const steps = [
      {
        target: '.tour-step-1',
        content: "Let's begin! This is the main Generation form. You can select a domain and add your specific requirements here.",
        disableBeacon: true,
      },
      {
        target: '.tour-step-domains',
        content: "Choose from 5 pre-defined domains or a Custom prompt. You can describe your specific needs for each domain in the text box below.",
      },
      {
        target: '.tour-step-exports',
        content: "Once you've generated data, these buttons let you export it to JSON, CSV, or Excel.",
      },
      {
        target: '.tour-step-2',
        content: 'After generating data, your past datasets will be saved here for you to view or re-export.',
      },
      {
        target: '.tour-step-4',
        content: 'This is the Getting Started guide, where you can find more detailed information and documentation.',
      },
      {
        target: 'body',
        content: "That's the end of the tour! You are all set to start generating data.",
        placement: 'center',
      },
    ];
    setTourSteps(steps);

    if (user && !localStorage.getItem('onboarding_completed')) {
      setRunTour(true);
      localStorage.setItem('onboarding_completed', 'true');
    }
  }, [user]);

  const handleJoyrideCallback = (data) => {
    const { status, index, type } = data;
    if (['finished', 'skipped'].includes(status)) {
      setRunTour(false);
    }
    
    if (type === 'step:after') {
        if (index === 2) {
            setView('history');
        }
        if (index === 3) {
            setView('getting-started');
        }
        if (index === 4) {
            setView('generate');
        }
    }
  };

  const handleStartTour = () => {
    setRunTour(true);
    setView('generate');
  };

  const handleGenerateSuccess = (data) => {
    setGeneratedData(data.data);
    setGeneratedRelationalData(null);
    setIsRelationalOutput(false);
    setView('generate');
    setNotification({ message: 'Data generated successfully!', type: 'success' });
  };

  const handleRelationalGenerateSuccess = (data) => {
    setGeneratedRelationalData(data.data);
    setGeneratedData(null);
    setIsRelationalOutput(true);
    setView('generate');
    setNotification({ message: 'Relational data generated successfully!', type: 'success' });
  };

  const handleSelectHistoryEntry = (entry) => {
    try {
      const parsedData = JSON.parse(entry.data_json);
      if (entry.domain === "Relational") {
        setGeneratedRelationalData(parsedData);
        setGeneratedData(null);
        setIsRelationalOutput(true);
      } else {
        setGeneratedData(parsedData);
        setGeneratedRelationalData(null);
        setIsRelationalOutput(false);
      }
      setView('generate');
    } catch (e) {
      console.error("Error parsing history data:", e);
      setNotification({ message: 'Failed to load history data.', type: 'error' });
    }
  };

  const handleExport = async (format) => {
    if (!generatedData && !generatedRelationalData) {
      setNotification({ message: 'No data to export!', type: 'error' });
      return;
    }

    try {
      const rows = isRelationalOutput
        ? Object.values(generatedRelationalData).reduce((total, arr) => total + arr.length, 0)
        : (generatedData ? generatedData.length : 0);
      const domain = isRelationalOutput ? 'Relational' : 'Generated';

      const response = await api.exportData(format, domain, rows, null, token, API_BASE_URL);
      
      if (!response || !response.headers) {
        throw new Error("API call did not return a valid response object.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `dataset.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setNotification({ message: `Exported to ${format.toUpperCase()} successfully!`, type: 'success' });
    } catch (err) {
      if (err.message.includes('Could not validate credentials')) {
        setNotification({ message: 'Session expired. Please log in again.', type: 'error' });
        logout();
      } else {
        setNotification({ message: `Export failed: ${err.message}`, type: 'error' });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-charcoal text-light-gray">
        <svg className="animate-spin h-8 w-8 mr-3 text-vibrant-purple" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading user session...
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="flex min-h-screen bg-dark-charcoal text-light-gray">
        <div className="w-full flex flex-col items-center justify-center">
          {view === 'register' && <RegisterForm onRegisterSuccess={() => { setView('login'); setNotification({ message: 'Registration successful! Please log in.', type: 'success' }); }} onViewChange={setView} />}
          {view === 'forgot-password' && <ForgotPasswordForm onPasswordResetRequest={() => setView('login')} onViewChange={setView} />}
          {view === 'reset-password' && <ResetPasswordForm onPasswordResetSuccess={() => { setView('login'); setNotification({ message: 'Password reset successful! Please log in with your new password.', type: 'success' }); }} />}
          {view === 'login' && <LoginForm onLoginSuccess={() => setView('generate')} onForgotPassword={() => setView('forgot-password')} />}
          {view !== 'register' && view !== 'forgot-password' && view !== 'reset-password' && view !== 'login' && <LandingPage onViewChange={setView} onStartTour={handleStartTour} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-charcoal font-sans text-light-gray">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
      
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showSkipButton
        locale={{ last: 'Finish' }}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            arrowColor: '#282C34',
            backgroundColor: '#282C34',
            primaryColor: '#00F5D4',
            textColor: '#EAEAEA',
          },
          buttonNext: {
            backgroundColor: '#00F5D4',
            color: '#1A1A2E',
          },
          buttonSkip: {
            color: '#EAEAEA',
          },
        }}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <header className="bg-[#282C34] shadow-md py-4 px-6 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-vibrant-purple mr-6">GenAI Data</h1>
          <nav className="hidden md:flex space-x-4">
            <button
              ref={generateButtonRef}
              onClick={() => { setView('generate'); setGeneratedData(null); setGeneratedRelationalData(null); setIsRelationalOutput(false); }}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition duration-150 ${
                view === 'generate' ? 'bg-purple-900 text-bright-teal tour-step-1' : 'text-light-gray hover:bg-purple-900'
              }`}
            >
              <SquarePen size={18} className="mr-2" /> Generate
            </button>
            <button
              ref={historyButtonRef}
              onClick={() => setView('history')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition duration-150 ${
                view === 'history' ? 'bg-purple-900 text-bright-teal tour-step-2' : 'text-light-gray hover:bg-purple-900'
              }`}
            >
              <History size={18} className="mr-2" /> History
            </button>
            <button
              ref={gettingStartedButtonRef}
              onClick={() => setView('getting-started')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition duration-150 ${
                view === 'getting-started' ? 'bg-purple-900 text-bright-teal tour-step-4' : 'text-light-gray hover:bg-purple-900'
              }`}
            >
              <HelpCircle size={18} className="mr-2" /> Getting Started
            </button>
             <button
              onClick={handleStartTour}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition duration-150 text-bright-teal hover:bg-purple-900"
            >
              <PlayCircle size={18} className="mr-2" /> Start Tour
            </button>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-light-gray text-sm">Welcome, {user.username}!</span>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md flex items-center transition duration-150"
          >
            <LogOut size={18} className="mr-2" /> Logout
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {view === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="tour-step-1">
              <GenerationForm onGenerateSuccess={handleGenerateSuccess} onRelationalGenerateSuccess={handleRelationalGenerateSuccess} />
            </div>
            <div>
              {(generatedData || generatedRelationalData) ? (
                <>
                  <div ref={exportsButtonRef} className="flex justify-end space-x-2 mb-4 tour-step-3">
                    <button
                      onClick={() => {
                        const dataToCopy = isRelationalOutput ? generatedRelationalData : generatedData;
                        navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2))
                          .then(() => setNotification({ message: 'JSON copied to clipboard!', type: 'success' }))
                          .catch(err => setNotification({ message: 'Failed to copy JSON.', type: 'error' }));
                      }}
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-md flex items-center"
                    >
                      <Copy size={16} className="mr-2" /> Copy JSON
                    </button>
                    <button
                      onClick={() => handleExport('json')}
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-md flex items-center"
                    >
                      <FileJson size={16} className="mr-2" /> Export JSON
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-md flex items-center"
                    >
                      <FileText size={16} className="mr-2" /> Export CSV
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-md flex items-center"
                    >
                      <FileSpreadsheet size={16} className="mr-2" /> Export Excel
                    </button>
                  </div>
                  <DataTable data={isRelationalOutput ? generatedRelationalData : generatedData} isRelational={isRelationalOutput} />
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center text-gray-600 dark:text-gray-400 h-full flex flex-col items-center justify-center">
                  <Table size={48} className="mb-4 text-gray-400 dark:text-gray-600" />
                  <p className="text-lg">Your generated data will appear here.</p>
                  <p className="text-sm mt-2">Use the form on the left to get started!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="tour-step-2">
            <HistoryView onSelectHistoryEntry={handleSelectHistoryEntry} />
          </div>
        )}

        {view === 'getting-started' && (
          <div className="tour-step-4">
            <GettingStarted />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;