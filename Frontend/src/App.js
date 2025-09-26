import { FileJson, FileSpreadsheet, FileText, HelpCircle, History, LogOut, PlayCircle, SquarePen, Table } from 'lucide-react';
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
    console.log('🔍 HISTORY ENTRY CLICKED!', entry);  // ← Add this line first
    console.log('🔍 Full entry received:', entry);
    console.log('🔍 data_json field:', entry.data_json);
    console.log('🔍 preview field:', entry.preview);
    
   try {
    let parsedData;
    
    // Try to use full data_json first (this contains ALL the data)
    if (entry.data_json && entry.data_json !== 'null' && entry.data_json !== 'undefined') {
      console.log('🔍 Using data_json for full dataset');
      if (typeof entry.data_json === 'string') {
        parsedData = JSON.parse(entry.data_json);
      } else {
        parsedData = entry.data_json;
      }
    } else {
      // Fallback to preview (only 1 record)
      console.log('🔍 Falling back to preview (limited data)');
      parsedData = entry.preview;
      setNotification({ 
        message: 'Only preview available - showing first record only', 
        type: 'warning' 
      });
    }
    
    console.log('🔍 Final parsed data:', parsedData);
    console.log('🔍 Number of records:', Array.isArray(parsedData) ? parsedData.length : 'Not an array');
    
    // Check if we have any data
    if (!parsedData || (Array.isArray(parsedData) && parsedData.length === 0)) {
      setNotification({ message: 'No data found for this history entry.', type: 'error' });
      return;
    }
    
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
    setNotification({ message: 'History data loaded successfully!', type: 'success' });
  } catch (e) {
    console.error("Error loading history data:", e);
    setNotification({ message: `Failed to load history data: ${e.message}`, type: 'error' });
  }
};

  // Add the missing onStartAugmentation function
  const handleStartAugmentation = (historyId, data) => {
    // Placeholder for augmentation functionality
    // You can implement this based on your backend's augmentation endpoint
    console.log('Starting augmentation for history ID:', historyId, 'with data:', data);
    setNotification({ message: 'Augmentation feature coming soon!', type: 'info' });
  };

  // FIXED handleExport function
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
      
      if (!response || !response.ok) {
        throw new Error("Export request failed");
      }

      // Create blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set proper filename with extension
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      let filename = `dataset_${domain}_${timestamp}.${format}`;
      
      // Try to get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      link.setAttribute('download', filename);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setNotification({ message: `Successfully exported to ${format.toUpperCase()}!`, type: 'success' });
    } catch (err) {
      console.error('Export error:', err);
      if (err.message && err.message.includes('Could not validate credentials')) {
        setNotification({ message: 'Session expired. Please log in again.', type: 'error' });
        logout();
      } else {
        setNotification({ message: `Export failed: ${err.message || 'Unknown error'}`, type: 'error' });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading user session...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div>
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
        {view === 'register' && <RegisterForm onRegisterSuccess={() => { setView('login'); setNotification({ message: 'Registration successful! Please log in.', type: 'success' }); }} onViewChange={setView} />}
        {view === 'forgot-password' && <ForgotPasswordForm onPasswordResetRequest={() => setView('login')} onViewChange={setView} />}
        {view === 'reset-password' && <ResetPasswordForm onPasswordResetSuccess={() => { setView('login'); setNotification({ message: 'Password reset successful! Please log in with your new password.', type: 'success' }); }} />}
        {view === 'login' && <LoginForm onLoginSuccess={() => setView('generate')} onForgotPassword={() => setView('forgot-password')} />}
        {view !== 'register' && view !== 'forgot-password' && view !== 'reset-password' && view !== 'login' && <LandingPage onViewChange={setView} />}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Joyride
        steps={tourSteps}
        run={runTour}
        callback={handleJoyrideCallback}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        styles={{
          options: {
            primaryColor: '#7C3AED',
          }
        }}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-md">
        <div className="p-4 border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Dataset Generator</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Welcome, {user?.username}!</p>
        </div>
        
        <nav className="mt-4">
          <button
            ref={generateButtonRef}
            onClick={() => setView('generate')}
            className={`tour-step-1 w-full text-left px-4 py-3 flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              view === 'generate' ? 'bg-purple-100 dark:bg-purple-900 border-r-4 border-purple-600' : ''
            }`}
          >
            <SquarePen className="mr-3" size={20} />
            <span className="font-medium">Generate</span>
          </button>
          
          <button
            ref={historyButtonRef}
            onClick={() => setView('history')}
            className={`tour-step-2 w-full text-left px-4 py-3 flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              view === 'history' ? 'bg-purple-100 dark:bg-purple-900 border-r-4 border-purple-600' : ''
            }`}
          >
            <History className="mr-3" size={20} />
            <span className="font-medium">History</span>
          </button>
          
          <button
            ref={gettingStartedButtonRef}
            onClick={() => setView('getting-started')}
            className={`tour-step-4 w-full text-left px-4 py-3 flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              view === 'getting-started' ? 'bg-purple-100 dark:bg-purple-900 border-r-4 border-purple-600' : ''
            }`}
          >
            <HelpCircle className="mr-3" size={20} />
            <span className="font-medium">Getting Started</span>
          </button>
          
          <button
            onClick={handleStartTour}
            className="w-full text-left px-4 py-3 flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <PlayCircle className="mr-3" size={20} />
            <span className="font-medium">Take Tour</span>
          </button>
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={logout}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            <LogOut className="mr-2" size={20} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'generate' && (
          <div className="flex h-full">
            {/* Left Panel - Generation Form */}
            <div className="w-1/2 p-6 overflow-y-auto border-r dark:border-gray-700">
              <GenerationForm
                onGenerateSuccess={handleGenerateSuccess}
                onRelationalGenerateSuccess={handleRelationalGenerateSuccess}
              />
            </div>
            
            {/* Right Panel - Generated Data Display */}
            <div className="w-1/2 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-800">
              {(generatedData || generatedRelationalData) ? (
                <>
                  <div ref={exportsButtonRef} className="tour-step-exports mb-4 flex space-x-2">
                    <button onClick={() => handleExport('json')} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md flex items-center text-sm">
                      <FileJson size={16} className="mr-1" /> JSON
                    </button>
                    <button onClick={() => handleExport('csv')} className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md flex items-center text-sm">
                      <FileText size={16} className="mr-1" /> CSV
                    </button>
                    <button onClick={() => handleExport('excel')} className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-md flex items-center text-sm">
                      <FileSpreadsheet size={16} className="mr-1" /> Excel
                    </button>
                  </div>
                  <DataTable 
                    data={isRelationalOutput ? generatedRelationalData : generatedData}
                    isRelational={isRelationalOutput}
                  />
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                  <div>
                    <Table size={48} className="mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Your generated data will appear here.</h3>
                    <p>Use the form on the left to get started!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="h-full overflow-y-auto">
            <HistoryView 
              onSelectHistoryEntry={handleSelectHistoryEntry}
              onStartAugmentation={handleStartAugmentation}
            />
          </div>
        )}

        {view === 'getting-started' && (
          <div className="h-full overflow-y-auto p-6">
            <GettingStarted />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

