import { useState, useEffect } from 'react';
import { Beer, CheckCircle2, Trash2, PlayCircle, StopCircle, Download, PlusCircle, PackagePlus, PackageMinus, PackageSearch, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const INITIAL_BEER_CATALOG = {
  'miller_high_life_media': { label: 'Miller High Life', category: 'Media' },
  'XX_Lager_media': { label: 'XX Lager', category: 'Media' },
  'indio_media': { label: 'Indio', category: 'Media' },
  'carta_blanca_caguamita': { label: 'Carta Blanca', category: 'Caguamita' },
  'miller_high_life_caguama': { label: 'Miller High Life', category: 'Caguama' },
  'amstel_ultra_media': { label: 'Amstel Ultra', category: 'Media' },
  'XX_ultra_media': { label: 'XX Ultra', category: 'Media' },
};

export default function BeerTracker() {
  const navigate = useNavigate();

  // Core Data State
  const [beerCatalog, setBeerCatalog] = useState(INITIAL_BEER_CATALOG);
  const [beerInventoryHistory, setBeerInventoryHistory] = useState([]);
  
  // Current Inventory State
  const [currentBeerInventory, setCurrentBeerInventory] = useState([]);
  const [isTrackingBeer, setIsTrackingBeer] = useState(false);
  const [beerInventoryStartDate, setBeerInventoryStartDate] = useState(null);

  // Form State for Adding to Current Inventory
  const [selectedBeerKey, setSelectedBeerKey] = useState('');
  const [currentBeerCount, setCurrentBeerCount] = useState('');

  // Form State for Adding New Beer to Catalog
  const [showNewBeerForm, setShowNewBeerForm] = useState(false);
  const [newBeerLabel, setNewBeerLabel] = useState('');
  const [newBeerCategory, setNewBeerCategory] = useState('');
  
  const [error, setError] = useState('');
  const [expandedHistoryIndex, setExpandedHistoryIndex] = useState(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedCatalog = localStorage.getItem('beerCatalog');
    if (savedCatalog) {
      try {
        const parsedCatalog = JSON.parse(savedCatalog);
        // Basic validation: ensure it's an object
        if (typeof parsedCatalog === 'object' && parsedCatalog !== null && !Array.isArray(parsedCatalog)) {
          setBeerCatalog(parsedCatalog);
        } else {
          console.warn("Beer catalog from localStorage was not a valid object, using initial.");
          setBeerCatalog(INITIAL_BEER_CATALOG);
          localStorage.setItem('beerCatalog', JSON.stringify(INITIAL_BEER_CATALOG));
        }
      } catch (e) {
        console.error("Failed to parse beer catalog from localStorage:", e);
        setBeerCatalog(INITIAL_BEER_CATALOG); // Fallback to initial
      }
    } else {
        // If nothing in localStorage, initialize with default and save it.
        localStorage.setItem('beerCatalog', JSON.stringify(INITIAL_BEER_CATALOG));
    }

    const savedHistory = localStorage.getItem('beerInventoryHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
         // Basic validation: ensure it's an array
        if (Array.isArray(parsedHistory)) {
            setBeerInventoryHistory(parsedHistory);
        } else {
            console.warn("Beer inventory history from localStorage was not an array, initializing empty.");
            setBeerInventoryHistory([]);
            localStorage.setItem('beerInventoryHistory', JSON.stringify([]));
        }
      } catch (e) {
        console.error("Failed to parse beer inventory history from localStorage:", e);
        setBeerInventoryHistory([]); // Fallback
      }
    }
  }, []);

  // --- Core Functions (to be implemented next) ---
  const handleStartBeerInventory = () => {
    setCurrentBeerInventory([]);
    setBeerInventoryStartDate(new Date().toISOString());
    setIsTrackingBeer(true);
    setError('');
  };

  const handleEndBeerInventory = () => {
    if (!beerInventoryStartDate || currentBeerInventory.length === 0) {
      setError("No items in current inventory or start date missing.");
      return;
    }
    const endDate = new Date().toISOString();
    const aggregatedItems = currentBeerInventory.reduce((acc, item) => {
      if (acc[item.key]) {
        acc[item.key].count += item.count;
      } else {
        acc[item.key] = { ...item };
      }
      return acc;
    }, {});

    const newSession = {
      startDate: beerInventoryStartDate,
      endDate,
      items: aggregatedItems,
    };
    const updatedHistory = [...beerInventoryHistory, newSession];
    setBeerInventoryHistory(updatedHistory);
    localStorage.setItem('beerInventoryHistory', JSON.stringify(updatedHistory));
    
    setIsTrackingBeer(false);
    setCurrentBeerInventory([]);
    setBeerInventoryStartDate(null);
    setError('');
  };

  const handleAddBeerToCatalog = () => {
    if (!newBeerLabel.trim() || !newBeerCategory.trim()) {
      setError("Beer name and category are required.");
      return;
    }
    const labelSlug = newBeerLabel.trim().toLowerCase().replace(/\s+/g, '-');
    const categorySlug = newBeerCategory.trim().toLowerCase().replace(/\s+/g, '-');
    const beerKey = `${labelSlug}_${categorySlug}`;

    if (beerCatalog[beerKey]) {
      setError("This beer with this size/category already exists in the catalog.");
      return;
    }
    const newCatalogEntry = { label: newBeerLabel.trim(), category: newBeerCategory.trim() };
    const updatedCatalog = { ...beerCatalog, [beerKey]: newCatalogEntry };
    setBeerCatalog(updatedCatalog);
    localStorage.setItem('beerCatalog', JSON.stringify(updatedCatalog));
    
    setNewBeerLabel('');
    setNewBeerCategory('');
    setShowNewBeerForm(false);
    setError('');
  };

  const handleAddBeerToCurrentInventory = () => {
    if (!selectedBeerKey) {
      setError("Please select a beer.");
      return;
    }
    const count = parseInt(currentBeerCount, 10);
    if (isNaN(count) || count <= 0) {
      setError("Please enter a valid count (greater than 0).");
      return;
    }
    const beerDetails = beerCatalog[selectedBeerKey];
    if (!beerDetails) {
        setError("Selected beer not found in catalog.");
        return;
    }

    setCurrentBeerInventory([...currentBeerInventory, { key: selectedBeerKey, label: beerDetails.label, category: beerDetails.category, count }]);
    setSelectedBeerKey('');
    setCurrentBeerCount('');
    setError('');
  };
  
  const handleRemoveFromCurrentInventory = (indexToRemove) => {
    setCurrentBeerInventory(currentBeerInventory.filter((_, index) => index !== indexToRemove));
  };

  const exportBeerToCSV = () => {
    if (beerInventoryHistory.length === 0) {
      alert("No inventory history to export.");
      return;
    }
    const rows = [['Inventory Start', 'Inventory End', 'Beer Name', 'Category', 'Count']];
    beerInventoryHistory.forEach(session => {
      Object.values(session.items).forEach(item => {
        rows.push([
          new Date(session.startDate).toLocaleString(),
          new Date(session.endDate).toLocaleString(),
          item.label,
          item.category,
          item.count,
        ]);
      });
    });
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "beer_inventory_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // --- UI Rendering ---
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 bg-white rounded-2xl shadow-md mt-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-center flex items-center justify-center gap-2 text-gray-800">
          <Beer className="text-yellow-500" /> Inventario de Cervezas
        </h2>
        <button
            onClick={() => navigate('/')} // Navigate back to liquor tracker or a main dashboard
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded shadow"
        >
            Ir a Licores
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-center mb-6 flex-wrap">
        {!isTrackingBeer ? (
          <button onClick={handleStartBeerInventory} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2">
            <PlayCircle /> Iniciar Inventario Cervezas
          </button>
        ) : (
          <button onClick={handleEndBeerInventory} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2">
            <StopCircle /> Terminar y Guardar
          </button>
        )}
        <button onClick={exportBeerToCSV} className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded flex items-center gap-2">
          <Download /> Exportar CSV Cervezas
        </button>
        <button onClick={() => setShowNewBeerForm(!showNewBeerForm)} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2">
          <PackagePlus /> {showNewBeerForm ? 'Cancelar' : 'Agregar Nueva Cerveza al Catálogo'}
        </button>
      </div>
      
      {error && <p className="text-red-500 bg-red-100 border border-red-400 p-3 rounded-md mb-4 text-sm text-center">{error}</p>}

      {/* Form to Add New Beer to Catalog */}
      {showNewBeerForm && (
        <div className="bg-gray-100 p-4 rounded-md shadow-sm mb-6 border">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center"><Edit3 className="mr-2"/>Añadir Nueva Cerveza al Catálogo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <input
              type="text"
              placeholder="Nombre de la Cerveza (e.g., Corona Extra)"
              value={newBeerLabel}
              onChange={(e) => setNewBeerLabel(e.target.value)}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Categoría (e.g., Media, Caguama, Lata)"
              value={newBeerCategory}
              onChange={(e) => setNewBeerCategory(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <button onClick={handleAddBeerToCatalog} className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded flex items-center gap-2">
            <PackagePlus /> Guardar Cerveza
          </button>
        </div>
      )}

      {/* Current Inventory Tracking UI */}
      {isTrackingBeer && (
        <div className="bg-gray-50 p-4 rounded-md shadow-sm mb-6 border">
          <h3 className="text-lg font-bold mb-3 text-gray-700 flex items-center"><PackageSearch className="mr-2"/>Registrar Cervezas en Inventario Actual</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <select 
              value={selectedBeerKey}
              onChange={(e) => setSelectedBeerKey(e.target.value)}
              className="border rounded px-3 py-2 h-10"
            >
              <option value="">-- Selecciona Cerveza --</option>
              {Object.entries(beerCatalog).map(([key, beer]) => (
                <option key={key} value={key}>{beer.label} ({beer.category})</option>
              ))}
            </select>
            <input 
              type="number"
              placeholder="Cantidad (unidades)"
              value={currentBeerCount}
              onChange={(e) => setCurrentBeerCount(e.target.value)}
              className="border rounded px-3 py-2 h-10"
              min="1"
            />
            <button onClick={handleAddBeerToCurrentInventory} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded flex items-center justify-center gap-2 h-10">
              <PlusCircle /> Agregar al Inventario
            </button>
          </div>

          {/* Display Current Beer Inventory */}
          {currentBeerInventory.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-2 text-gray-600">Cervezas Añadidas:</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border px-2 py-1">Nombre</th>
                      <th className="border px-2 py-1">Categoría</th>
                      <th className="border px-2 py-1">Cantidad</th>
                      <th className="border px-2 py-1">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBeerInventory.map((item, index) => (
                      <tr key={index}>
                        <td className="border px-2 py-1">{item.label}</td>
                        <td className="border px-2 py-1">{item.category}</td>
                        <td className="border px-2 py-1">{item.count}</td>
                        <td className="border px-2 py-1 text-center">
                          <button onClick={() => handleRemoveFromCurrentInventory(index)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={18}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                <p className="text-right font-semibold mt-2 text-gray-700">
                    Total Unidades: {currentBeerInventory.reduce((sum, item) => sum + item.count, 0)}
                </p>
            </div>
          )}
        </div>
      )}

      {/* Beer Inventory History */}
      <div className="mb-10">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Historial de Inventarios de Cervezas</h3>
        {beerInventoryHistory.length === 0 ? (
          <p className="text-gray-500">No hay inventarios de cerveza guardados todavía.</p>
        ) : (
          <div className="space-y-4">
            {beerInventoryHistory.map((session, index) => (
              <div key={index} className="border rounded shadow-sm">
                <button
                  onClick={() => setExpandedHistoryIndex(expandedHistoryIndex === index ? null : index)}
                  className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">Inventario de Cervezas del {new Date(session.startDate).toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{Object.keys(session.items).length} tipos de cerveza, {Object.values(session.items).reduce((sum, item) => sum + item.count, 0)} unidades totales</p>
                  </div>
                  <span className="text-blue-600 text-sm font-medium">{expandedHistoryIndex === index ? 'Cerrar' : 'Ver Detalles'}</span>
                </button>
                {expandedHistoryIndex === index && (
                  <div className="p-4 bg-white overflow-x-auto">
                    <table className="min-w-full border text-sm mb-2">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border px-2 py-1">Nombre Cerveza</th>
                          <th className="border px-2 py-1">Categoría</th>
                          <th className="border px-2 py-1">Cantidad Contada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(session.items).map((item, i) => (
                          <tr key={i}>
                            <td className="border px-2 py-1">{item.label}</td>
                            <td className="border px-2 py-1">{item.category}</td>
                            <td className="border px-2 py-1">{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="text-xs text-gray-500">
                        <p><strong>Inicio:</strong> {new Date(session.startDate).toLocaleString()}</p>
                        <p><strong>Fin:</strong> {new Date(session.endDate).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 