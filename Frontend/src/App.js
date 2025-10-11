import Lenis from '@studio-freight/lenis';
import { FileJson, FileSpreadsheet, FileText, HelpCircle, History, LogOut, PlayCircle, SquarePen, Table } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Joyride from 'react-joyride';
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ResetPasswordForm } from './components/auth/ResetPasswordForm';
import LiquidEther from './components/backgrounds/LiquidEther';
import { DataTable } from './components/data/DataTable';
import { GenerationForm } from './components/data/GenerationForm';
import { GettingStarted } from './components/views/GettingStarted';
import { HistoryView } from './components/views/HistoryView';
import { LandingPage } from './components/views/LandingPage';
import { useAuth } from './context/AuthContext';


const App = () => {
  const { user, loading, logout, token, API_BASE_URL } = useAuth();
  const [view, setView] = useState('generate');
  const [generatedData, setGeneratedData] = useState(null);
  const [generatedRelationalData, setGeneratedRelationalData] = useState(null);
  const [isRelationalOutput, setIsRelationalOutput] = useState(false);


  const [runTour, setRunTour] = useState(false);
  const [tourSteps, setTourSteps] = useState([]);


  const generateButtonRef = useRef(null);
  const historyButtonRef = useRef(null);
  const gettingStartedButtonRef = useRef(null);
  const exportsButtonRef = useRef(null);


  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });


    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }


    requestAnimationFrame(raf);


    return () => lenis.destroy();
  }, []);


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
    toast.success('Data generated successfully!');
  };


  const handleRelationalGenerateSuccess = (data) => {
    setGeneratedRelationalData(data.data);
    setGeneratedData(null);
    setIsRelationalOutput(true);
    setView('generate');
    toast.success('Relational data generated successfully!');
  };


  const handleSelectHistoryEntry = (entry) => {
   try {
    let parsedData;
    
    if (entry.data_json && entry.data_json !== 'null' && entry.data_json !== 'undefined') {
      if (typeof entry.data_json === 'string') {
        parsedData = JSON.parse(entry.data_json);
      } else {
        parsedData = entry.data_json;
      }
    } else {
      parsedData = entry.preview;
      toast('Only preview available - showing first record only', { icon: '⚠️' });
    }
    
    if (!parsedData || (Array.isArray(parsedData) && parsedData.length === 0)) {
      toast.error('No data found for this history entry.');
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
    toast.success('History data loaded successfully!');
  } catch (e) {
    toast.error(`Failed to load history data: ${e.message}`);
  }
};


  const handleStartAugmentation = (historyId, data) => {
    console.log('Starting augmentation for history ID:', historyId, 'with data:', data);
    toast.info('Augmentation feature coming soon!');
  };


  const handleExport = async (format) => {
    if (!generatedData && !generatedRelationalData) {
      toast.error('No data to export!');
      return;
    }


    const toastId = toast.loading(`Exporting to ${format.toUpperCase()}...`);


    try {
      const dataToExport = isRelationalOutput ? generatedRelationalData : generatedData;
      const domain = isRelationalOutput ? 'Relational' : 'Generated';


      const response = await fetch(`${API_BASE_URL}/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: dataToExport,
          domain: domain
        })
      });


      if (!response || !response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }


      let mimeType = 'application/octet-stream';
      switch (format) {
        case 'csv':
          mimeType = 'text/csv';
          break;
        case 'json':
          mimeType = 'application/json';
          break;
        case 'excel':
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        default:
          break;
      }


      const blob = await response.blob();
      const correctedBlob = new Blob([blob], { type: mimeType });
      
      const url = window.URL.createObjectURL(correctedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.style.display = 'none';
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const extension = format === 'excel' ? 'xlsx' : format;
      const filename = `dataset_${domain}_${timestamp}.${extension}`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Successfully exported to ${format.toUpperCase()}!`, { id: toastId });
    } catch (err) {
      toast.error(`Export failed: ${err.message || 'Unknown error'}`, { id: toastId });
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
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <Toaster position="top-right" />
        
        {/* LiquidEther Background - Only for auth pages */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0
        }}>
          <LiquidEther
            colors={['#4285F4', '#EA4335', '#34A853']}
            mouseForce={20}
            cursorSize={100}
            isViscous={false}
            viscous={30}
            iterationsViscous={32}
            iterationsPoisson={32}
            resolution={0.5}
            isBounce={false}
            autoDemo={true}
            autoSpeed={0.5}
            autoIntensity={2.2}
            takeoverDuration={0.25}
            autoResumeDelay={3000}
            autoRampDuration={0.6}
          />
        </div>

        {/* Auth Content Layer */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {view === 'register' && <RegisterForm onRegisterSuccess={() => { setView('login'); toast.success('Registration successful! Please log in.'); }} onViewChange={setView} />}
          {view === 'forgot-password' && <ForgotPasswordForm onPasswordResetRequest={() => setView('login')} onViewChange={setView} />}
          {view === 'reset-password' && <ResetPasswordForm onPasswordResetSuccess={() => { setView('login'); toast.success('Password reset successful! Please log in.'); }} />}
          {view === 'login' && <LoginForm onLoginSuccess={() => setView('generate')} onForgotPassword={() => setView('forgot-password')} />}
          {view !== 'register' && view !== 'forgot-password' && view !== 'reset-password' && view !== 'login' && <LandingPage onViewChange={setView} />}
        </div>
      </div>
    );
  }


  return (
    <div className="flex h-screen bg-gray-100 dark:main-content-gradient">
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#333',
          color: '#fff',
        },
      }}/>
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


      <div className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col">
        <div className="p-4 border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Dataset Generator</h1>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Welcome, {user?.username}!</p>
            <button
              onClick={logout}
              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500 p-1 rounded-md transition-colors flex items-center gap-1 text-sm"
              title="Logout"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
        
        <nav className="mt-4 flex-1">
          <button
            ref={generateButtonRef}
            onClick={() => setView('generate')}
            className={`tour-step-1 w-full text-left px-4 py-3 flex items-center dark:hover:bg-purple-800/20 transition-colors duration-300 ${
              view === 'generate' ? 'bg-purple-100 dark:bg-purple-900 border-r-4 border-purple-600' : 'hover:bg-gray-100'
            }`}
          >
            <SquarePen className="mr-3" size={20} />
            <span className="font-medium">Generate</span>
          </button>
          
          <button
            ref={historyButtonRef}
            onClick={() => setView('history')}
            className={`tour-step-2 w-full text-left px-4 py-3 flex items-center dark:hover:bg-purple-800/20 transition-colors duration-300 ${
              view === 'history' ? 'bg-purple-100 dark:bg-purple-900 border-r-4 border-purple-600' : 'hover:bg-gray-100'
            }`}
          >
            <History className="mr-3" size={20} />
            <span className="font-medium">History</span>
          </button>
          
          <button
            ref={gettingStartedButtonRef}
            onClick={() => setView('getting-started')}
            className={`tour-step-4 w-full text-left px-4 py-3 flex items-center dark:hover:bg-purple-800/20 transition-colors duration-300 ${
              view === 'getting-started' ? 'bg-purple-100 dark:bg-purple-900 border-r-4 border-purple-600' : 'hover:bg-gray-100'
            }`}
          >
            <HelpCircle className="mr-3" size={20} />
            <span className="font-medium">Getting Started</span>
          </button>
          
          <button
            onClick={handleStartTour}
            className="w-full text-left px-4 py-3 flex items-center hover:bg-gray-100 dark:hover:bg-purple-800/20 transition-colors duration-300"
          >
            <PlayCircle className="mr-3" size={20} />
            <span className="font-medium">Take Tour</span>
          </button>
        </nav>
      </div>


      <div className="flex-1 overflow-hidden">
        {view === 'generate' && (
          <div className="flex h-full">
            <div className="w-1/2 p-6 overflow-y-auto border-r dark:border-gray-700">
              <GenerationForm
                onGenerateSuccess={handleGenerateSuccess}
                onRelationalGenerateSuccess={handleRelationalGenerateSuccess}
              />
            </div>
            
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


