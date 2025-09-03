import { LayoutGrid, Plus, Table, Trash2 } from 'lucide-react'; // Added LayoutGrid for relational tab
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ConstraintForm } from './ConstraintForm'; // Import ConstraintForm

export const GenerationForm = ({ onGenerateSuccess, onRelationalGenerateSuccess }) => {
  const { token, API_BASE_URL } = useAuth();
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('E-commerce');
  const [rows, setRows] = useState(5);
  const [customPrompt, setCustomPrompt] = useState('');
  const [constraints, setConstraints] = useState([]); // For granular control
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generationMode, setGenerationMode] = useState('single'); // 'single' or 'relational'

  // State for relational generation
  const [tables, setTables] = useState([]);
  const [newTableName, setNewTableName] = useState('');
  const [newTableRows, setNewTableRows] = useState(5);
  const [newTableColumns, setNewTableColumns] = useState([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('string');
  const [newColumnDescription, setNewColumnDescription] = useState('');
  const [newColumnIsPK, setNewColumnIsPK] = useState(false);
  const [newColumnIsFK, setNewColumnIsFK] = useState(false);
  const [newColumnReferencesTable, setNewColumnReferencesTable] = useState('');
  const [newColumnReferencesColumn, setNewColumnReferencesColumn] = useState('');
  const [newColumnUnique, setNewColumnUnique] = useState(false);
  const [relationalError, setRelationalError] = useState('');

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const data = await api.getDomains(token, API_BASE_URL);
        setDomains(data.domains);
      } catch (err) {
        setError(err.message || 'Failed to fetch domains');
      }
    };
    fetchDomains();
  }, [token, API_BASE_URL]);

  const handleSubmitSingle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.generateData(selectedDomain, rows, selectedDomain === 'Custom' ? customPrompt : null, constraints, token, API_BASE_URL);
      onGenerateSuccess(data);
    } catch (err) {
      setError(err.message || 'Data generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = () => {
    if (!newColumnName || !newColumnType) {
      alert("Column name and type are required.");
      return;
    }
    const newColumn = {
      name: newColumnName,
      data_type: newColumnType,
      description: newColumnDescription,
      is_primary_key: newColumnIsPK,
      is_foreign_key: newColumnIsFK,
      references_table: newColumnIsFK ? newColumnReferencesTable : null,
      references_column: newColumnIsFK ? newColumnReferencesColumn : null,
      unique: newColumnUnique,
    };
    setNewTableColumns([...newTableColumns, newColumn]);
    setNewColumnName('');
    setNewColumnType('string');
    setNewColumnDescription('');
    setNewColumnIsPK(false);
    setNewColumnIsFK(false);
    setNewColumnReferencesTable('');
    setNewColumnReferencesColumn('');
    setNewColumnUnique(false);
  };

  const handleRemoveColumn = (index) => {
    setNewTableColumns(newTableColumns.filter((_, i) => i !== index));
  };

  const handleAddTable = () => {
    if (!newTableName || newTableColumns.length === 0) {
      alert("Table name and at least one column are required.");
      return;
    }
    const newTable = {
      name: newTableName,
      rows: newTableRows,
      columns: newTableColumns,
    };
    setTables([...tables, newTable]);
    setNewTableName('');
    setNewTableRows(5);
    setNewTableColumns([]);
    setRelationalError('');
  };

  const handleRemoveTable = (index) => {
    setTables(tables.filter((_, i) => i !== index));
  };

  const handleSubmitRelational = async (e) => {
    e.preventDefault();
    setRelationalError('');
    setLoading(true);
    try {
      if (tables.length === 0) {
        throw new Error("Please define at least one table for relational generation.");
      }
      const data = await api.generateRelationalData(tables, constraints, token, API_BASE_URL);
      onRelationalGenerateSuccess(data);
    } catch (err) {
      setRelationalError(err.message || 'Relational data generation failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex border-b dark:border-gray-700 mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none ${
            generationMode === 'single'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => setGenerationMode('single')}
        >
          <Table size={18} className="inline mr-2" /> Single Table
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none ${
            generationMode === 'relational'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => setGenerationMode('relational')}
        >
          <LayoutGrid size={18} className="inline mr-2" /> Relational
        </button>
      </div>

      {generationMode === 'single' ? (
        <>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Generate Single Table Dataset</h2>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleSubmitSingle}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="domain">
                Domain
              </label>
              <select
                id="domain"
                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-white dark:border-gray-600"
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                disabled={loading}
              >
                {domains.map(domain => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
            </div>

            {selectedDomain === 'Custom' && (
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="customPrompt">
                  Custom Prompt
                </label>
                <textarea
                  id="customPrompt"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-white dark:border-gray-600 h-24"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Generate 5 records for a list of magical artifacts with name, rarity, and magical properties."
                  required={selectedDomain === 'Custom'}
                  disabled={loading}
                ></textarea>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="rows">
                Number of Rows
              </label>
              <input
                type="number"
                id="rows"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-white dark:border-gray-600"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value))}
                min="1"
                required
                disabled={loading}
              />
            </div>

            <ConstraintForm constraints={constraints} setConstraints={setConstraints} />

            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50 flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <Table size={18} className="mr-2" /> Generate Data
                </>
              )}
            </button>
          </form>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Generate Relational Dataset</h2>
          {relationalError && <p className="text-red-500 text-sm mb-4">{relationalError}</p>}
          <form onSubmit={handleSubmitRelational}>
            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Define New Table</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Table Name</label>
                  <input
                    type="text"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                    placeholder="e.g., customers"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Number of Rows</label>
                  <input
                    type="number"
                    value={newTableRows}
                    onChange={(e) => setNewTableRows(parseInt(e.target.value))}
                    min="1"
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                  />
                </div>
              </div>

              <h4 className="text-md font-semibold mb-2 text-gray-800 dark:text-white">Columns for "{newTableName || 'New Table'}"</h4>
              {newTableColumns.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {newTableColumns.map((col, index) => (
                    <li key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm text-sm text-gray-800 dark:text-gray-200">
                      <span>
                        <strong>{col.name}</strong> ({col.data_type})
                        {col.is_primary_key && ' (PK)'}
                        {col.is_foreign_key && ` (FK -> ${col.references_table}.${col.references_column})`}
                        {col.unique && ' (Unique)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 border-t dark:border-gray-600 pt-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Column Name</label>
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                    placeholder="e.g., id"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Data Type</label>
                  <select
                    value={newColumnType}
                    onChange={(e) => setNewColumnType(e.target.value)}
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                  >
                    <option value="string">String</option>
                    <option value="integer">Integer</option>
                    <option value="float">Float</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                    <option value="datetime">DateTime</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={newColumnDescription}
                    onChange={(e) => setNewColumnDescription(e.target.value)}
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                    placeholder="e.g., Unique customer identifier"
                  />
                </div>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="isPk"
                    checked={newColumnIsPK}
                    onChange={(e) => setNewColumnIsPK(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="isPk" className="text-gray-700 dark:text-gray-300 text-sm">Primary Key</label>
                </div>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="isUnique"
                    checked={newColumnUnique}
                    onChange={(e) => setNewColumnUnique(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="isUnique" className="text-gray-700 dark:text-gray-300 text-sm">Unique</label>
                </div>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="isFk"
                    checked={newColumnIsFK}
                    onChange={(e) => setNewColumnIsFK(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="isFk" className="text-gray-700 dark:text-gray-300 text-sm">Foreign Key</label>
                </div>
                {newColumnIsFK && (
                  <>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">References Table</label>
                      <input
                        type="text"
                        value={newColumnReferencesTable}
                        onChange={(e) => setNewColumnReferencesTable(e.target.value)}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                        placeholder="e.g., customers"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">References Column</label>
                      <input
                        type="text"
                        value={newColumnReferencesColumn}
                        onChange={(e) => setNewColumnReferencesColumn(e.target.value)}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                        placeholder="e.g., customer_id"
                      />
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddColumn}
                className="mt-3 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
              >
                <Plus size={16} className="mr-2" /> Add Column
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddTable}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center mb-6"
            >
              <Plus size={16} className="mr-2" /> Add Table
            </button>

            {tables.length > 0 && (
              <div className="mt-4 border-t dark:border-gray-600 pt-4">
                <h4 className="text-md font-semibold mb-2 text-gray-800 dark:text-white">Defined Tables:</h4>
                <ul className="space-y-3">
                  {tables.map((table, tableIndex) => (
                    <li key={tableIndex} className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm text-gray-800 dark:text-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{table.name} ({table.rows} rows)</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTable(tableIndex)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <ul className="list-disc list-inside text-sm mt-1 ml-4">
                        {table.columns.map((col, colIndex) => (
                          <li key={colIndex}>
                            {col.name} ({col.data_type})
                            {col.is_primary_key && ' (PK)'}
                            {col.is_foreign_key && ` (FK -> ${col.references_table}.${col.references_column})`}
                            {col.unique && ' (Unique)'}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-6">
              <ConstraintForm constraints={constraints} setConstraints={setConstraints} />
            </div>

            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50 flex items-center justify-center mt-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Relational Data...
                </>
              ) : (
                <>
                  <LayoutGrid size={18} className="mr-2" /> Generate Relational Data
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
};