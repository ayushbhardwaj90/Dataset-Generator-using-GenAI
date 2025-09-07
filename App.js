import { Copy, FileJson, FileSpreadsheet, FileText, HelpCircle, History, LogOut, SquarePen, Table } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from './context/AuthContext';

// Import Components and Views
import { Notification } from './components/Notification';
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ResetPasswordForm } from './components/auth/ResetPasswordForm';
import { DataTable } from './components/data/DataTable';
import { GenerationForm } from './components/data/GenerationForm';
import { GettingStarted } from './components/views/GettingStarted';
import { HistoryView } from './components/views/HistoryView';
import { api } from './services/api'; // Import api to use getExportUrl

const App = () => {
  const { user, loading, logout, token, API_BASE_URL } = useAuth();
  const [view, setView] = useState('generate'); // 'generate', 'history', 'getting-started', 'login', 'register', 'forgot-password', 'reset-password'
  const [generatedData, setGeneratedData] = useState(null);
  const [generatedRelationalData, setGeneratedRelationalData] = useState(null);
  const [isRelationalOutput, setIsRelationalOutput] = useState(false);
  const [notification, setNotification] = useState(null); // { message: '', type: 'success' | 'error' }

  const handleGenerateSuccess = (data) => {
    setGeneratedData(data.data);
    setGeneratedRelationalData(null); // Clear relational data if single table generated
    setIsRelationalOutput(false);
    setView('generate'); // Stay on generate view to see results
    setNotification({ message: 'Data generated successfully!', type: 'success' });
  };

  const handleRelationalGenerateSuccess = (data) => {
    setGeneratedRelationalData(data.data);
    setGeneratedData(null); // Clear single table data if relational generated
    setIsRelationalOutput(true);
    setView('generate'); // Stay on generate view to see results
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
      setView('generate'); // Show results on generate view
    } catch (e) {
      console.error("Error parsing history data:", e);
      setNotification({ message: 'Failed to load history data.', type: 'error' });
    }
  };

  // NEW: Handle exports with an authenticated request
  const handleExport = async (format) => {
    if (!generatedData && !generatedRelationalData) {
      setNotification({ message: 'No data to export!', type: 'error' });
      return;
    }

    try {
      // Get the correct data to send to the export function
      const dataToExport = isRelationalOutput ? generatedRelationalData : generatedData;
      const domain = isRelationalOutput ? 'Relational' : 'Generated';
      
      const response = await api.exportData(format, domain, dataToExport.length, null, token, API_BASE_URL);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dataset.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setNotification({ message: `Exported to ${format.toUpperCase()} successfully!`, type: 'success' });
    } catch (err) {
      setNotification({ message: `Export failed: ${err.message}`, type: 'error' });
    }
  };

  // Check URL for reset token on load
  useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setView('reset-password');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
        <svg className="animate-spin h-8 w-8 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading user session...
      </div>
    );
  }
  
  // Handle unauthenticated views
  if (!user) {
    return (
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="w-1/2 flex items-center justify-center">
          {view === 'register' ? (
            <RegisterForm onRegisterSuccess={() => { setView('login'); setNotification({ message: 'Registration successful! Please log in.', type: 'success' }); }} />
          ) : view === 'forgot-password' ? (
            <ForgotPasswordForm onPasswordResetRequest={() => setView('login')} />
          ) : view === 'reset-password' ? (
              <ResetPasswordForm onPasswordResetSuccess={() => { setView('login'); setNotification({ message: 'Password reset successful! Please log in with your new password.', type: 'success' }); }} />
          ) : (
            <LoginForm onLoginSuccess={() => setView('generate')} onForgotPassword={() => setView('forgot-password')} />
          )}
        </div>
        <div className="w-1/2 flex items-center justify-center p-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-4">Synthetic Dataset Generator</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Leverage Generative AI to create realistic datasets for your projects.
            </p>
            {view === 'register' ? (
              <button
                onClick={() => setView('login')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
              >
                Already have an account? Login
              </button>
            ) : (
              <button
                onClick={() => setView('register')}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
              >
                Don't have an account? Register
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <header className="bg-white dark:bg-gray-800 shadow-sm py-4 px-6 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mr-6">GenAI Data</h1>
          <nav className="hidden md:flex space-x-4">
            <button
              onClick={() => { setView('generate'); setGeneratedData(null); setGeneratedRelationalData(null); setIsRelationalOutput(false); }}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition duration-150 ${
                view === 'generate' ? 'bg-purple-100 dark:bg-gray-700 text-purple-700 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <SquarePen size={18} className="mr-2" /> Generate
            </button>
            <button
              onClick={() => setView('history')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition duration-150 ${
                view === 'history' ? 'bg-purple-100 dark:bg-gray-700 text-purple-700 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <History size={18} className="mr-2" /> History
            </button>
            <button
              onClick={() => setView('getting-started')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition duration-150 ${
                view === 'getting-started' ? 'bg-purple-100 dark:bg-gray-700 text-purple-700 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <HelpCircle size={18} className="mr-2" /> Getting Started
            </button>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-700 dark:text-gray-300 text-sm">Welcome, {user.username}!</span>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md flex items-center transition duration-150"
          >
            <LogOut size={18} className="mr-2" /> Logout
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {view === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <GenerationForm onGenerateSuccess={handleGenerateSuccess} onRelationalGenerateSuccess={handleRelationalGenerateSuccess} />
            </div>
            <div>
              {(generatedData || generatedRelationalData) ? (
                <>
                  <div className="flex justify-end space-x-2 mb-4">
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
                    {/* Export buttons - simplified for GET requests */}
                    {/* Note: For complex data/constraints, POST export endpoints would be better */}
                    <a
                      href={api.getExportUrl('json', 'Generated', generatedData?.length || 0, null, token, API_BASE_URL)}
                      target="_blank" rel="noopener noreferrer"
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-md flex items-center"
                    >
                      <FileJson size={16} className="mr-2" /> Export JSON
                    </a>
                    <a
                      href={api.getExportUrl('csv', 'Generated', generatedData?.length || 0, null, token, API_BASE_URL)}
                      target="_blank" rel="noopener noreferrer"
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-md flex items-center"
                    >
                      <FileText size={16} className="mr-2" /> Export CSV
                    </a>
                    <a
                      href={api.getExportUrl('excel', 'Generated', generatedData?.length || 0, null, token, API_BASE_URL)}
                      target="_blank" rel="noopener noreferrer"
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-md flex items-center"
                    >
                      <FileSpreadsheet size={16} className="mr-2" /> Export Excel
                    </a>
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
          <HistoryView onSelectHistoryEntry={handleSelectHistoryEntry} />
        )}

        {view === 'getting-started' && (
          <GettingStarted />
        )}
      </main>
    </div>
  );
};

export default App;