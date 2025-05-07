import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShoppingCart, TrendingDown, HelpCircle, Beer } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

// Initial bottle data - needed if allBottleData isn't in localStorage or for reference
const initialBottleDataReference = {
  tequila: {
    herradura: { label: 'Herradura', volume: 750, emptyWeight: 500, fullWeight: 1092 },
    patron: { label: 'Patrón', volume: 750, emptyWeight: 480, fullWeight: 1072 },
  },
  whiskey: {
    // Ensure this matches the main app's data, especially escaped characters
    jackdaniels: { label: 'Jack Daniel\'s', volume: 1000, emptyWeight: 700, fullWeight: 1489 },
    jameson: { label: 'Jameson', volume: 750, emptyWeight: 510, fullWeight: 1102 },
  },
};

// Initial Beer Catalog - for reference and fallback
const initialBeerCatalogReference = {
  'corona-extra_media': { label: 'Corona Extra', category: 'Media' },
  'modelo-especial_media': { label: 'Modelo Especial', category: 'Media' },
  'heineken_media': { label: 'Heineken', category: 'Media' },
  'stella-artois_botella': { label: 'Stella Artois', category: 'Botella' },
  'guinness-draught_lata': { label: 'Guinness Draught', category: 'Lata' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [allBottleData, setAllBottleData] = useState(initialBottleDataReference);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [purchasePredictions, setPurchasePredictions] = useState([]);

  // State for Beer data
  const [beerInventoryHistory, setBeerInventoryHistory] = useState([]);
  const [beerCatalog, setBeerCatalog] = useState(initialBeerCatalogReference);
  const [beerPurchasePredictions, setBeerPurchasePredictions] = useState([]);

  // State for item-specific graph
  const [selectedLiquorTypeForGraph, setSelectedLiquorTypeForGraph] = useState('');
  const [selectedBottleKeyForGraph, setSelectedBottleKeyForGraph] = useState('');
  const [selectedBottleGraphData, setSelectedBottleGraphData] = useState([]);

  // Define low stock thresholds (can be made configurable later)
  const LOW_SERVINGS_THRESHOLD = 5;
  const LOW_PERCENTAGE_THRESHOLD = 15;

  useEffect(() => {
    const savedHistory = localStorage.getItem('inventoryHistory');
    if (savedHistory) {
      setInventoryHistory(JSON.parse(savedHistory));
    }

    const savedBottleData = localStorage.getItem('allBottleData');
    if (savedBottleData) {
      try {
        setAllBottleData(JSON.parse(savedBottleData));
      } catch (e) {
        console.error("Error parsing allBottleData from localStorage on Dashboard:", e);
        setAllBottleData(initialBottleDataReference); 
      }
    }

    // Load Beer Inventory History
    const savedBeerHistory = localStorage.getItem('beerInventoryHistory');
    if (savedBeerHistory) {
      try {
        const parsedBeerHistory = JSON.parse(savedBeerHistory);
        if (Array.isArray(parsedBeerHistory)) {
          setBeerInventoryHistory(parsedBeerHistory);
        } else {
          setBeerInventoryHistory([]);
        }
      } catch (e) {
        console.error("Error parsing beerInventoryHistory:", e);
        setBeerInventoryHistory([]);
      }
    }

    // Load Beer Catalog
    const savedBeerCatalog = localStorage.getItem('beerCatalog');
    if (savedBeerCatalog) {
      try {
        const parsedBeerCatalog = JSON.parse(savedBeerCatalog);
        if (typeof parsedBeerCatalog === 'object' && parsedBeerCatalog !== null && !Array.isArray(parsedBeerCatalog)) {
          setBeerCatalog(parsedBeerCatalog);
        } else {
          setBeerCatalog(initialBeerCatalogReference);
        }
      } catch (e) {
        console.error("Error parsing beerCatalog:", e);
        setBeerCatalog(initialBeerCatalogReference);
      }
    }
  }, []);

  useEffect(() => {
    if (inventoryHistory.length > 0) {
      const latestSession = inventoryHistory[inventoryHistory.length - 1];
      const currentLowStock = [];

      if (latestSession && latestSession.items) {
        Object.values(latestSession.items).forEach(item => {
          // The item key in session.items is type_name. We might need allBottleData for more details if not all are in item.
          // For now, assuming item has 'servings' and 'percentage'.
          const isLowOnServings = item.servings < LOW_SERVINGS_THRESHOLD;
          const isLowOnPercentage = parseFloat(item.percentage) < LOW_PERCENTAGE_THRESHOLD;

          if (isLowOnServings || isLowOnPercentage) {
            currentLowStock.push({
              name: item.name, // Name from the inventory item
              type: item.type, // Type from the inventory item
              servings: item.servings,
              percentage: parseFloat(item.percentage).toFixed(1),
              reason: isLowOnServings && isLowOnPercentage ? 'Servings & Percentage' : isLowOnServings ? 'Servings' : 'Percentage',
            });
          }
        });
      }
      setLowStockItems(currentLowStock);
    } else {
      setLowStockItems([]);
    }
  }, [inventoryHistory, allBottleData]); // allBottleData might be needed if we cross-reference for more details later

  // useEffect for Purchase Predictions
  useEffect(() => {
    if (inventoryHistory.length < 2) {
      setPurchasePredictions([]); // Not enough data for predictions
      return;
    }

    const itemHistories = {}; // Key: type_name, Value: array of {date, oz, servings}

    inventoryHistory.forEach(session => {
      const sessionDate = parseISO(session.endDate);
      Object.values(session.items).forEach(item => {
        const itemKey = `${item.type}__${item.name}`; // Consistent key
        if (!itemHistories[itemKey]) {
          itemHistories[itemKey] = [];
        }
        itemHistories[itemKey].push({
          date: sessionDate,
          oz: parseFloat(item.remainingFlOz),
          servings: item.servings,
          percentage: parseFloat(item.percentage),
          name: item.name, // Store for easy access later
          type: item.type   // Store for easy access later
        });
      });
    });

    const predictions = [];
    for (const itemKey in itemHistories) {
      const history = itemHistories[itemKey].sort((a, b) => a.date - b.date);
      if (history.length < 2) continue; // Need at least two points for a rate

      let totalOzConsumed = 0;
      let totalDays = 0;
      let periodsCount = 0;

      for (let i = 1; i < history.length; i++) {
        const prevEntry = history[i-1];
        const currentEntry = history[i];
        
        const ozChange = prevEntry.oz - currentEntry.oz;
        const daysChange = differenceInDays(currentEntry.date, prevEntry.date);

        if (daysChange > 0 && ozChange > 0) { // Consumed and time passed
          totalOzConsumed += ozChange;
          totalDays += daysChange;
          periodsCount++;
        }
      }

      const latestEntry = history[history.length - 1];
      if (periodsCount > 0) {
        const avgDailyOzConsumption = totalOzConsumed / totalDays;
        const daysLeft = latestEntry.oz / avgDailyOzConsumption;
        predictions.push({
          name: latestEntry.name,
          type: latestEntry.type,
          latestServings: latestEntry.servings,
          latestPercentage: latestEntry.percentage.toFixed(1),
          avgDailyOzConsumption: parseFloat(avgDailyOzConsumption.toFixed(2)),
          daysLeft: parseFloat(daysLeft.toFixed(1)),
        });
      } else {
        // No consumption period found, or stock increased/stayed same
        predictions.push({
          name: latestEntry.name,
          type: latestEntry.type,
          latestServings: latestEntry.servings,
          latestPercentage: latestEntry.percentage.toFixed(1),
          avgDailyOzConsumption: 0, // Or null, or specific note
          daysLeft: Infinity, // Or null
          note: "No consumption data or stock stable/increased."
        });
      }
    }
    
    // Sort predictions: items with fewer days left first, then by name
    predictions.sort((a,b) => {
        if (a.daysLeft === Infinity && b.daysLeft !== Infinity) return 1;
        if (a.daysLeft !== Infinity && b.daysLeft === Infinity) return -1;
        if (a.daysLeft === Infinity && b.daysLeft === Infinity) return a.name.localeCompare(b.name);
        if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
        return a.name.localeCompare(b.name);
    });


    setPurchasePredictions(predictions);

  }, [inventoryHistory]);

  // useEffect for Beer Purchase Predictions
  useEffect(() => {
    if (beerInventoryHistory.length < 2) {
      setBeerPurchasePredictions([]);
      return;
    }

    const beerItemHistories = {}; // Key: beer.label, Value: array of {date, count, name, category}

    beerInventoryHistory.forEach(session => {
      const sessionDate = parseISO(session.endDate);
      Object.values(session.items).forEach(item => {
        const itemKey = item.label; // Use label as the key for beer aggregation
        if (!beerItemHistories[itemKey]) {
          beerItemHistories[itemKey] = [];
        }
        beerItemHistories[itemKey].push({
          date: sessionDate,
          count: parseInt(item.count, 10),
          name: item.label,
          category: item.category,
        });
      });
    });

    const beerPredictions = [];
    for (const itemKey in beerItemHistories) {
      const history = beerItemHistories[itemKey].sort((a, b) => a.date - b.date);
      if (history.length < 2) continue;

      let totalUnitsConsumed = 0;
      let totalDays = 0;
      let periodsCount = 0;

      for (let i = 1; i < history.length; i++) {
        const prevEntry = history[i - 1];
        const currentEntry = history[i];

        const unitsChange = prevEntry.count - currentEntry.count;
        const daysChange = differenceInDays(currentEntry.date, prevEntry.date);

        if (daysChange > 0 && unitsChange > 0) { // Consumed and time passed
          totalUnitsConsumed += unitsChange;
          totalDays += daysChange;
          periodsCount++;
        }
      }

      const latestEntry = history[history.length - 1];
      if (periodsCount > 0) {
        const avgDailyUnitConsumption = totalUnitsConsumed / totalDays;
        const daysLeft = latestEntry.count / avgDailyUnitConsumption;
        beerPredictions.push({
          name: latestEntry.name,
          category: latestEntry.category,
          latestCount: latestEntry.count,
          avgDailyUnitConsumption: parseFloat(avgDailyUnitConsumption.toFixed(2)),
          daysLeft: parseFloat(daysLeft.toFixed(1)),
        });
      } else {
        beerPredictions.push({
          name: latestEntry.name,
          category: latestEntry.category,
          latestCount: latestEntry.count,
          avgDailyUnitConsumption: 0,
          daysLeft: Infinity,
          note: "No consumption data or stock stable/increased.",
        });
      }
    }

    beerPredictions.sort((a, b) => {
      if (a.daysLeft === Infinity && b.daysLeft !== Infinity) return 1;
      if (a.daysLeft !== Infinity && b.daysLeft === Infinity) return -1;
      if (a.daysLeft === Infinity && b.daysLeft === Infinity) return a.name.localeCompare(b.name);
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      return a.name.localeCompare(b.name);
    });

    setBeerPurchasePredictions(beerPredictions);
  }, [beerInventoryHistory]);

  // useEffect for Item-Specific Graph Data
  useEffect(() => {
    if (selectedLiquorTypeForGraph && selectedBottleKeyForGraph && allBottleData[selectedLiquorTypeForGraph] && allBottleData[selectedLiquorTypeForGraph][selectedBottleKeyForGraph]) {
      const bottleLabel = allBottleData[selectedLiquorTypeForGraph][selectedBottleKeyForGraph].label;
      // The key in session.items is constructed as `${item.type}_${item.name}`.
      // However, the `endInventory` function in Tracker.jsx uses `item.name` directly as part of the key: `const key = `${item.type}_${item.name}`;`
      // Let's assume item.name is the label for consistency.
      const itemKeyToFind = `${selectedLiquorTypeForGraph}_${bottleLabel}`;

      const graphData = [];
      inventoryHistory.forEach(session => {
        if (session.items && session.items[itemKeyToFind]) {
          const itemData = session.items[itemKeyToFind];
          graphData.push({
            date: new Date(session.endDate).toLocaleDateString(), // Format date for X-axis
            oz: parseFloat(itemData.remainingFlOz), // Ensure it's a number
            // percentage: parseFloat(itemData.percentage) // Could also graph percentage
          });
        }
      });

      // Sort by date to ensure the line chart connects points chronologically
      // The dates are already strings like "MM/DD/YYYY", direct string sort might not be robust.
      // Better to sort by original ISO date if possible before converting to toLocaleDateString.
      // For now, we sort after formatting, which might be okay for MM/DD/YYYY format if year changes correctly.
      // A more robust sort would be on the original ISO date string or Date object.
      // Let's assume toLocaleDateString() gives a sortable format or history is mostly chronological.
      // To make it robust, we should sort based on the actual date objects:
      const sortedGraphData = inventoryHistory
        .filter(session => session.items && session.items[itemKeyToFind])
        .map(session => ({
            originalDate: parseISO(session.endDate),
            oz: parseFloat(session.items[itemKeyToFind].remainingFlOz),
        }))
        .sort((a, b) => a.originalDate - b.originalDate) // Sort by actual Date objects
        .map(data => ({
            date: data.originalDate.toLocaleDateString(), // Then format for display
            oz: data.oz,
        }));
      
      setSelectedBottleGraphData(sortedGraphData);
    } else {
      setSelectedBottleGraphData([]); // Clear data if selection is incomplete
    }
  }, [selectedLiquorTypeForGraph, selectedBottleKeyForGraph, inventoryHistory, allBottleData]);

  // Prepare data for charts
  const sessionTrends = inventoryHistory.map(session => {
    const totalServings = Object.values(session.items).reduce((acc, item) => acc + item.servings, 0);
    const avgPercent = (
      Object.values(session.items).reduce((acc, item) => acc + parseFloat(item.percentage), 0) /
      Object.values(session.items).length
    ).toFixed(1);
    return {
      date: new Date(session.endDate).toLocaleDateString(),
      servings: totalServings,
      avgPercentage: parseFloat(avgPercent),
    };
  });

  // Type-level breakdown
  const typeTrends = {};
  inventoryHistory.forEach(session => {
    Object.values(session.items).forEach(item => {
      if (!typeTrends[item.type]) typeTrends[item.type] = 0;
      typeTrends[item.type] += parseFloat(item.remainingFlOz);
    });
  });

  const typeData = Object.entries(typeTrends).map(([type, oz]) => ({
    type,
    ounces: parseFloat(oz.toFixed(2)),
  }));

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">📊 Bar Dashboard</h2>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded shadow hover:shadow-lg transition-all"
        >
          Ir al Tracker
        </button>
      </div>

      {/* Low Stock Alerts Section */}
      <div className="mb-10 bg-white shadow-xl p-6 rounded-lg border border-gray-200">
        <h3 className="text-xl font-semibold mb-4 text-red-600 flex items-center">
          <AlertTriangle className="mr-2 h-6 w-6" /> Alertas de Stock Bajo
        </h3>
        {lowStockItems.length > 0 ? (
          <ul className="space-y-3">
            {lowStockItems.map((item, index) => (
              <li key={index} className="p-3 bg-red-50 border border-red-200 rounded-md shadow-sm">
                <p className="font-semibold text-red-700">{item.name} <span className="text-sm text-gray-600">({item.type})</span></p>
                <p className="text-sm text-red-600">
                  Nivel: {item.servings} bebidas / {item.percentage}% restante
                </p>
                <p className="text-xs text-gray-500 mt-1">Motivo: Bajo en {item.reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No hay alertas de stock bajo por el momento. ¡Todo en orden!</p>
        )}
      </div>
      
      {/* Placeholder for Purchase Predictions */}
      <div className="mb-10 bg-white shadow-xl p-6 rounded-lg border border-gray-200">
        <h3 className="text-xl font-semibold mb-4 text-orange-600 flex items-center">
          <ShoppingCart className="mr-2 h-6 w-6" /> Predicciones de Compra
        </h3>
        {purchasePredictions.length > 0 ? (
          <ul className="space-y-4">
            {purchasePredictions.map((item, index) => (
              <li key={index} className={`p-4 rounded-md shadow-sm border ${item.daysLeft < 7 ? 'border-red-400 bg-red-50' : item.daysLeft < 30 ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'}`}>
                <div className="flex justify-between items-center">
                    <p className="font-semibold text-gray-800">{item.name} <span className="text-sm text-gray-600">({item.type})</span></p>
                    {item.daysLeft !== Infinity && item.daysLeft < 7 && (
                        <span className="px-2 py-1 text-xs font-bold text-red-700 bg-red-200 rounded-full">¡CRÍTICO!</span>
                    )}
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  Nivel Actual: {item.latestServings} bebidas / {item.latestPercentage}%
                </p>
                {item.avgDailyOzConsumption > 0 && item.daysLeft !== Infinity ? (
                  <>
                    <p className="text-sm text-gray-600">Consumo Promedio: {item.avgDailyOzConsumption} oz/día</p>
                    <p className="text-sm font-medium text-orange-700 mt-1">
                      Tiempo Estimado Restante: ~{item.daysLeft} días
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic mt-1">
                    {item.note || "No hay suficientes datos para estimar consumo."} 
                    <Tooltip title={item.note || "No hay suficientes datos para estimar consumo."}>
                        <HelpCircle className="inline ml-1 h-4 w-4 text-gray-400 cursor-help" />
                    </Tooltip>
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : inventoryHistory.length < 2 ? (
          <p className="text-gray-500">Se necesitan al menos dos sesiones de inventario para generar predicciones.</p>
        ) : (
          <p className="text-gray-500">No se generaron predicciones. Verifique los datos de inventario.</p>
        )}
      </div>

      {/* Beer Purchase Predictions Section */}
      <div className="mb-10 bg-white shadow-xl p-6 rounded-lg border border-gray-200">
        <h3 className="text-xl font-semibold mb-4 text-teal-600 flex items-center">
          <Beer className="mr-2 h-6 w-6" /> Predicciones de Compra de Cervezas
        </h3>
        {beerPurchasePredictions.length > 0 ? (
          <ul className="space-y-4">
            {beerPurchasePredictions.map((item, index) => (
              <li key={index} className={`p-4 rounded-md shadow-sm border ${item.daysLeft < 7 ? 'border-red-400 bg-red-50' : item.daysLeft < 30 ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'}`}>
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-gray-800">{item.name} <span className="text-sm text-gray-500">({item.category})</span></p>
                  {item.daysLeft !== Infinity && item.daysLeft < 7 && (
                    <span className="px-2 py-1 text-xs font-bold text-red-700 bg-red-200 rounded-full">¡CRÍTICO!</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  Nivel Actual: {item.latestCount} unidades
                </p>
                {item.avgDailyUnitConsumption > 0 && item.daysLeft !== Infinity ? (
                  <>
                    <p className="text-sm text-gray-600">Consumo Promedio: {item.avgDailyUnitConsumption} unidades/día</p>
                    <p className="text-sm font-medium text-teal-700 mt-1">
                      Tiempo Estimado Restante: ~{item.daysLeft} días
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic mt-1">
                    {item.note || "No hay suficientes datos para estimar consumo."}
                     {/* Simple title tooltip for now */}
                    <HelpCircle title={item.note || "No hay suficientes datos para estimar consumo."} className="inline ml-1 h-4 w-4 text-gray-400 cursor-help" />
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : beerInventoryHistory.length < 2 ? (
          <p className="text-gray-500">Se necesitan al menos dos sesiones de inventario de cervezas para generar predicciones.</p>
        ) : (
          <p className="text-gray-500">No se generaron predicciones para cervezas. Verifique los datos de inventario.</p>
        )}
      </div>

      {/* Item-Specific Graphs Section */}
      <div className="mb-10 bg-white shadow-xl p-6 rounded-lg border border-gray-200">
        <h3 className="text-xl font-semibold mb-4 text-indigo-600 flex items-center">
          <TrendingDown className="mr-2 h-6 w-6" /> Gráficos de Inventario por Artículo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <select 
            value={selectedLiquorTypeForGraph}
            onChange={(e) => {
              setSelectedLiquorTypeForGraph(e.target.value);
              setSelectedBottleKeyForGraph(''); // Reset bottle selection
              setSelectedBottleGraphData([]); // Clear graph data
            }}
            className="border rounded px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Selecciona Tipo de Licor</option>
            {Object.keys(allBottleData).map(type => (
              <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
            ))}
          </select>

          <select
            value={selectedBottleKeyForGraph}
            onChange={(e) => setSelectedBottleKeyForGraph(e.target.value)}
            disabled={!selectedLiquorTypeForGraph}
            className="border rounded px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          >
            <option value="">Selecciona Botella</option>
            {selectedLiquorTypeForGraph && allBottleData[selectedLiquorTypeForGraph] &&
              Object.keys(allBottleData[selectedLiquorTypeForGraph]).map(bottleKey => (
                <option key={bottleKey} value={bottleKey}>
                  {allBottleData[selectedLiquorTypeForGraph][bottleKey].label}
                </option>
              ))}
          </select>
        </div>

        {/* Graph will go here */}
        {selectedBottleKeyForGraph && selectedBottleGraphData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={selectedBottleGraphData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: 'Oz Restantes', angle: -90, position: 'insideLeft' }}/>
              <Tooltip formatter={(value) => [`${value.toFixed(2)} oz`, 'Restante']}/>
              <Legend verticalAlign="top" />
              <Line type="monotone" dataKey="oz" stroke="#818cf8" name={allBottleData[selectedLiquorTypeForGraph]?.[selectedBottleKeyForGraph]?.label || 'Botella'} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
            </LineChart>
          </ResponsiveContainer>
        ) : selectedBottleKeyForGraph ? (
          <p className="text-gray-500 text-center py-10">No hay datos históricos para la botella seleccionada.</p>
        ) : (
          <p className="text-gray-500 text-center py-10">Por favor, selecciona un tipo de licor y una botella para ver su historial.</p>
        )}
      </div>

      {/* Existing Charts - Can be refactored or kept as is */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white shadow-xl p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 text-center">Servings & % Restante por Sesión</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sessionTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="servings" stroke="#4ade80" name="Servings" />
              <Line yAxisId="right" type="monotone" dataKey="avgPercentage" stroke="#60a5fa" name="% Restante" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white shadow-xl p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 text-center">Total Oz Acumulado por Tipo (Histórico)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ounces" fill="#facc15" name="Oz Restante" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
