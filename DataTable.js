import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useState } from 'react';

export const DataTable = ({ data, title = "Generated Data", isRelational = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  if (!data || (isRelational && Object.keys(data).length === 0) || (!isRelational && data.length === 0)) {
    return <p className="text-gray-600 dark:text-gray-400 text-center py-8">No data to display.</p>;
  }

  const renderTable = (tableData, tableName = null) => {
    if (!tableData || tableData.length === 0) {
      return <p className="text-gray-600 dark:text-gray-400">No records for {tableName || 'this table'}.</p>;
    }

    const allKeys = Array.from(new Set(tableData.flatMap(Object.keys)));

    const filteredData = tableData.filter(row =>
      allKeys.some(key =>
        String(row[key]).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    const sortedData = [...filteredData].sort((a, b) => {
      if (!sortColumn) return 0;

      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === null || aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === null || bValue === undefined) return sortDirection === 'asc' ? -1 : 1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      // Fallback for other types or mixed types
      return 0;
    });

    const handleSort = (column) => {
      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto mb-6">
        {tableName && <h3 className="text-xl font-semibold p-4 border-b dark:border-gray-700 text-gray-800 dark:text-white">{tableName}</h3>}
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {allKeys.map(key => (
                <th
                  key={key}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => handleSort(key)}
                >
                  {key}
                  {sortColumn === key && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? <ChevronUp size={14} className="inline" /> : <ChevronDown size={14} className="inline" />}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {allKeys.map((key, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {String(row[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-inner">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">{title}</h2>
      <div className="mb-4 flex items-center">
        <Search size={20} className="text-gray-500 dark:text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search data..."
          className="flex-grow p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isRelational ? (
        Object.entries(data).map(([tableName, tableData]) => (
          <div key={tableName}>
            {renderTable(tableData, tableName)}
          </div>
        ))
      ) : (
        renderTable(data)
      )}
    </div>
  );
};