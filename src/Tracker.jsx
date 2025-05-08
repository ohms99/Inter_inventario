import { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, PercentCircle, Trash2, PlayCircle, StopCircle, Download, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const bottleData = {
  tequila: {
    patron: { label: 'Patrón', volume: 750, emptyWeight: 480, fullWeight: 1072 },
  },
  whiskey: {
  },
  vodka: {
    oso_negro: { label: 'Oso Negro', volume: 1000, emptyWeight: 665, fullWeight: 1620 },
  },
  ginebra: {
    oso_negro: { label: 'Oso Negro', volume: 1000, emptyWeight: 665, fullWeight: 1620 },
  },
  brandy: {
  },
  mezcal: {
    Apaluz: { label: 'Apaluz', volume: 750, emptyWeight: 485, fullWeight: 1190 },
  },
  ron: {
    antillano: { label: 'Antillano', volume: 1000, emptyWeight: 625, fullWeight: 1580 },
  },
  licor: {
    flamingo_blue: { label: 'Flamingo Blue Curacao', volume: 1000, emptyWeight: 635, fullWeight: 1700 },
    sangrita_viuda_sanchez: { label: 'Sangrita Viuda Sanchez', volume: 1000, emptyWeight: 640, fullWeight: 1695 },
  },
}

export default function LiquorInventoryCalculator() {
  const navigate = useNavigate();
  const [allBottleData, setAllBottleData] = useState(bottleData);
  const [liquorType, setLiquorType] = useState('');
  const [bottleKey, setBottleKey] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [inventoryList, setInventoryList] = useState([]);
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [preview, setPreview] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);

  // State for new bottle form
  const [showNewBottleForm, setShowNewBottleForm] = useState(false);
  const [newBottleType, setNewBottleType] = useState('');
  const [newBottleName, setNewBottleName] = useState('');
  const [newBottleVolume, setNewBottleVolume] = useState('');
  const [newBottleEmptyWeight, setNewBottleEmptyWeight] = useState('');
  const [newBottleFullWeight, setNewBottleFullWeight] = useState('');
  const [customNewBottleType, setCustomNewBottleType] = useState('');

  const [lastInventorySummaryStats, setLastInventorySummaryStats] = useState({});

  const handleAddNewBottle = () => {
    const finalNewBottleType = newBottleType === '__NEW_TYPE__' ? customNewBottleType.trim() : newBottleType;

    if (!finalNewBottleType || !newBottleName || !newBottleVolume || !newBottleEmptyWeight || !newBottleFullWeight) {
      setError('Por favor, complete todos los campos para la nueva botella, incluyendo el peso llena.');
      return;
    }
    if (newBottleType === '__NEW_TYPE__' && !customNewBottleType.trim()) {
        setError('Por favor, especifique el nuevo tipo de licor.');
        return;
    }

    const newBottleData = {
      label: newBottleName,
      volume: parseInt(newBottleVolume, 10),
      emptyWeight: parseInt(newBottleEmptyWeight, 10),
      fullWeight: parseInt(newBottleFullWeight, 10),
    };

    setAllBottleData(prevData => {
      const updatedType = {
        ...(prevData[finalNewBottleType] || {}),
        [finalNewBottleType]: newBottleData,
      };
      const newData = {
        ...prevData,
        [finalNewBottleType]: updatedType,
      };
      localStorage.setItem('allBottleData', JSON.stringify(newData));
      return newData;
    });

    // Reset form fields and hide form
    setNewBottleType('');
    setCustomNewBottleType('');
    setNewBottleName('');
    setNewBottleVolume('');
    setNewBottleEmptyWeight('');
    setNewBottleFullWeight('');
    setShowNewBottleForm(false);
    setError('');
  };

  const bottle = allBottleData[liquorType]?.[bottleKey] || {};

  useEffect(() => {
    const savedHistory = localStorage.getItem('inventoryHistory');
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);
      setInventoryHistory(parsedHistory);

      // Calculate stats for the last inventory session for the summary display
      if (parsedHistory.length > 0) {
        const lastSession = parsedHistory[parsedHistory.length - 1];
        const stats = {};
        if (lastSession && lastSession.items) {
          Object.values(lastSession.items).forEach(item => {
            const type = item.type;
            if (!stats[type]) {
              stats[type] = {
                totalServings: 0,
                totalPercentage: 0,
                bottleCount: 0,
              };
            }
            stats[type].totalServings += item.servings;
            // Ensure item.percentage is a number; it might be a string from storage/calculation
            stats[type].totalPercentage += parseFloat(item.percentage) || 0;
            stats[type].bottleCount += 1;
          });

          Object.keys(stats).forEach(type => {
            if (stats[type].bottleCount > 0) {
              stats[type].avgPercent = (stats[type].totalPercentage / stats[type].bottleCount).toFixed(1);
            } else {
              stats[type].avgPercent = '0';
            }
          });
        }
        setLastInventorySummaryStats(stats);
      } else {
        setLastInventorySummaryStats({}); // Clear stats if no history
      }
    }

    const savedBottleDataString = localStorage.getItem('allBottleData');
    if (savedBottleDataString) {
      try {
        const loadedData = JSON.parse(savedBottleDataString);
        // Create a mutable copy for processing to avoid issues with frozen objects or direct state mutation
        const processedData = JSON.parse(JSON.stringify(loadedData)); 

        for (const type in processedData) {
          // Check if the type exists in the initial bottleData for reference
          if (bottleData[type]) { 
            for (const bottleKey in processedData[type]) {
              const currentBottle = processedData[type][bottleKey];
              const initialBottleMatch = bottleData[type][bottleKey];

              if (initialBottleMatch) { // If this specific bottle is a default/initial bottle
                // If critical data like fullWeight, emptyWeight, volume, or label is missing or not a number from the stored version,
                // restore it from the up-to-date initialBottleMatch.
                let restoreNeeded = false;
                if (typeof currentBottle.fullWeight !== 'number' && typeof initialBottleMatch.fullWeight === 'number') restoreNeeded = true;
                if (typeof currentBottle.emptyWeight !== 'number' && typeof initialBottleMatch.emptyWeight === 'number') restoreNeeded = true;
                if (typeof currentBottle.volume !== 'number' && typeof initialBottleMatch.volume === 'number') restoreNeeded = true;
                if (typeof currentBottle.label !== 'string' && typeof initialBottleMatch.label === 'string') restoreNeeded = true;
                
                if (restoreNeeded) {
                  console.warn(`Bottle ${type} - ${bottleKey} from localStorage is missing or has invalid critical fields. Restoring from defaults.`);
                  processedData[type][bottleKey] = { ...initialBottleMatch }; // Overwrite with the complete default
                }
              }
              // For custom bottles (not in initialBottleMatch) that might be missing fullWeight,
              // calculateRemaining will correctly show an error if they are selected, as their data is incomplete.
            }
          }
        }
        setAllBottleData(processedData);
      } catch (e) {
        console.error("Failed to parse or process allBottleData from localStorage:", e);
        // Fallback to initial bottleData if localStorage is corrupted
        setAllBottleData(bottleData);
      }
    } else {
      // If no data in localStorage, initialize with default bottleData
      setAllBottleData(bottleData); 
    }
  }, []); // This effect now also validates and patches last summary stats on initial load

  // Effect to update summary stats when a new inventory is saved (inventoryHistory changes)
  useEffect(() => {
    if (inventoryHistory.length > 0) {
      const lastSession = inventoryHistory[inventoryHistory.length - 1];
      const stats = {};
      if (lastSession && lastSession.items) {
        Object.values(lastSession.items).forEach(item => {
          const type = item.type;
          if (!stats[type]) {
            stats[type] = {
              totalServings: 0,
              totalPercentage: 0,
              bottleCount: 0,
            };
          }
          stats[type].totalServings += item.servings;
          stats[type].totalPercentage += parseFloat(item.percentage) || 0;
          stats[type].bottleCount += 1;
        });

        Object.keys(stats).forEach(type => {
          if (stats[type].bottleCount > 0) {
            stats[type].avgPercent = (stats[type].totalPercentage / stats[type].bottleCount).toFixed(1);
          } else {
            stats[type].avgPercent = '0';
          }
        });
      }
      setLastInventorySummaryStats(stats);
    } else {
      setLastInventorySummaryStats({}); // Clear if history becomes empty
    }
  }, [inventoryHistory]);

  const startInventory = () => {
    setInventoryList([]);
    setStartDate(new Date().toISOString());
    setTracking(true);
  };

  const endInventory = () => {
    const endDate = new Date().toISOString();
    const newSession = {
      startDate,
      endDate,
      items: inventoryList.reduce((acc, item) => {
        const key = `${item.type}_${item.name}`;
        if (!acc[key]) acc[key] = { ...item };
        else {
          acc[key].remainingFlOz = (parseFloat(acc[key].remainingFlOz) + parseFloat(item.remainingFlOz)).toFixed(2);
          acc[key].servings += item.servings;
        }
        return acc;
      }, {}),
    };
    const updatedHistory = [...inventoryHistory, newSession];
    setInventoryHistory(updatedHistory);
    localStorage.setItem('inventoryHistory', JSON.stringify(updatedHistory));
    setTracking(false);
    setInventoryList([]);
    setPreview(null);
  };

  const calculateRemaining = (weight = currentWeight) => {
    setError('');
    const current = parseFloat(weight);
    const empty = parseFloat(bottle.emptyWeight);
    const full = parseFloat(bottle.fullWeight);
    const volumeMl = parseFloat(bottle.volume);

    if (isNaN(current) || isNaN(empty) || isNaN(full) || isNaN(volumeMl) || !bottle.label) {
      setError('Datos de botella incompletos o peso actual no válido. Seleccione una botella y asegúrese de que tenga peso tara y peso llena definidos.');
      setPreview(null);
      return;
    }

    const totalLiquidInBottleWeight = full - empty;
    
    if (totalLiquidInBottleWeight <= 0) {
        setError('El peso llena debe ser mayor que el peso tara de la botella.');
        setPreview(null);
        return;
    }

    let currentLiquidNetWeight = current - empty;

    // Clamp currentLiquidNetWeight to be between 0 and totalLiquidInBottleWeight
    currentLiquidNetWeight = Math.max(0, currentLiquidNetWeight);
    currentLiquidNetWeight = Math.min(currentLiquidNetWeight, totalLiquidInBottleWeight);

    const percentage = (currentLiquidNetWeight / totalLiquidInBottleWeight) * 100;
    
    const ML_PER_FL_OZ = 29.5735;
    const remainingVolumeMl = volumeMl * (percentage / 100);
    const remainingFlOz = remainingVolumeMl / ML_PER_FL_OZ;
    const servings = Math.floor(remainingFlOz / 1.5);

    const previewData = {
      type: liquorType,
      name: bottle.label,
      volume: volumeMl,
      percentage: percentage.toFixed(1),
      remainingFlOz: remainingFlOz.toFixed(2),
      servings,
    };

    setPreview(previewData);
  };

  const addToInventory = () => {
    if (preview) {
      setInventoryList([...inventoryList, preview]);
      setPreview(null);
      setCurrentWeight('');
    }
  };

  const removeFromInventory = (indexToRemove) => {
    setInventoryList(inventoryList.filter((_, index) => index !== indexToRemove));
  };

  const exportToCSV = () => {
    const rows = [['Fecha Inicio', 'Fecha Fin', 'Tipo', 'Nombre', 'Volumen', '% Restante', 'Oz Restante', 'Bebidas']];
    inventoryHistory.forEach((session) => {
      Object.values(session.items).forEach((item) => {
        rows.push([
          session.startDate,
          session.endDate,
          item.type,
          item.name,
          item.volume,
          item.percentage,
          item.remainingFlOz,
          item.servings,
        ]);
      });
    });
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'inventario_licores.csv');
    link.click();
  };

  const simulateScaleReading = () => {
    const fakeWeight = 1480;
    setCurrentWeight(fakeWeight);
    calculateRemaining(fakeWeight);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 bg-white rounded-2xl shadow-md mt-10">
          <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Inventory Tracker</h1>

      {/* Navigation Button */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
        >
          Ver Dashboard 📊
        </button>
        <button
          onClick={() => navigate('/beer-tracker')}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded"
        >
          Inventario Cervezas 🍺
        </button>
      </div>

      {/* ... rest of your Tracker component UI */}
    </div>
      <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center flex items-center justify-center gap-2 text-gray-800">
        <Calculator className="text-blue-600" /> Inventario de Licores
      </h2>

      <div className="flex gap-2 justify-center mb-6 flex-wrap">
        {!tracking ? (
          <button onClick={startInventory} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2">
            <PlayCircle className="w-5 h-5" /> Iniciar Inventario
          </button>
        ) : (
          <button onClick={endInventory} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2">
            <StopCircle className="w-5 h-5" /> Terminar y Guardar
          </button>
        )}
        <button onClick={exportToCSV} className="bg-gray-700 hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded flex items-center gap-2">
          <Download className="w-5 h-5" /> Exportar CSV
        </button>
        {/* <button onClick={simulateScaleReading} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded flex items-center gap-2">
          <PlusCircle className="w-5 h-5" /> Desde Báscula
        </button> */}
        {/* Button to toggle new bottle form visibility */}
        <button onClick={() => setShowNewBottleForm(!showNewBottleForm)} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2">
          {showNewBottleForm ? 'Cancelar' : 'Agregar Nueva Botella'}
        </button>
      </div>

      {/* New Bottle Form */}
      {showNewBottleForm && (
        <div className="bg-gray-100 p-4 rounded-md shadow-sm mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Agregar Nueva Botella al Catálogo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <select
              value={newBottleType}
              onChange={(e) => {
                setNewBottleType(e.target.value);
                if (e.target.value !== '__NEW_TYPE__') {
                  setCustomNewBottleType('');
                }
              }}
              className="border rounded px-3 py-2"
            >
              <option value="">Selecciona Tipo Existente o Nuevo</option>
              {Object.keys(allBottleData).map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
              <option value="__NEW_TYPE__">Otro (Especificar)...</option>
            </select>

            {newBottleType === '__NEW_TYPE__' && (
              <input
                type="text"
                placeholder="Especifique Nuevo Tipo"
                value={customNewBottleType}
                onChange={(e) => setCustomNewBottleType(e.target.value)}
                className="border rounded px-3 py-2"
              />
            )}

            <input
              type="text"
              placeholder="Nombre Botella (e.g., Don Julio 70)"
              value={newBottleName}
              onChange={(e) => setNewBottleName(e.target.value)}
              className="border rounded px-3 py-2"
            />
            <input
              type="number"
              placeholder="Volumen (ml)"
              value={newBottleVolume}
              onChange={(e) => setNewBottleVolume(e.target.value)}
              className="border rounded px-3 py-2"
            />
            <input
              type="number"
              placeholder="Peso Vacía (g)"
              value={newBottleEmptyWeight}
              onChange={(e) => setNewBottleEmptyWeight(e.target.value)}
              className="border rounded px-3 py-2"
            />
            <input
              type="number"
              placeholder="Peso Llena (g)"
              value={newBottleFullWeight}
              onChange={(e) => setNewBottleFullWeight(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <button onClick={handleAddNewBottle} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2">
            Guardar Nueva Botella
          </button>
          {error && <p className="text-red-500 mt-2 text-sm font-medium">{error}</p>}
        </div>
      )}

      {tracking && (
        <>
          <div className="bg-gray-50 p-4 rounded-md shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select value={liquorType} onChange={(e) => { setLiquorType(e.target.value); setBottleKey(''); }} className="border rounded px-3 py-2">
                <option value="">Selecciona Tipo</option>
                {Object.keys(allBottleData).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select value={bottleKey} onChange={(e) => setBottleKey(e.target.value)} className="border rounded px-3 py-2">
                <option value="">Selecciona Botella</option>
                {liquorType && allBottleData[liquorType] && Object.keys(allBottleData[liquorType]).map(key => (
                  <option key={key} value={key}>{allBottleData[liquorType][key].label}</option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Peso Actual (g)"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
            {/* Display Empty and Full Weight if bottle is selected */}
            {bottleKey && bottle && typeof bottle.emptyWeight === 'number' && typeof bottle.fullWeight === 'number' && (
              <div className="mt-2 text-xs text-center text-gray-600 bg-gray-100 p-2 rounded-md">
                <p>Peso Botella Vacía: <strong>{bottle.emptyWeight}g</strong> | Peso Botella Llena: <strong>{bottle.fullWeight}g</strong></p>
              </div>
            )}
            {error && <p className="text-red-500 mt-2 text-sm font-medium">{error}</p>}

            {preview && (
              <div className="mt-4 bg-white border p-4 rounded text-center text-sm text-gray-700">
                <p><strong>Tipo:</strong> {preview.type}</p>
                <p><strong>Nombre:</strong> {preview.name}</p>
                <p><strong>Volumen:</strong> {preview.volume} ml</p>
                <p><strong>% Restante:</strong> {preview.percentage}%</p>
                <p><strong>Oz Restante:</strong> {preview.remainingFlOz} oz</p>
                <p><strong>Bebidas:</strong> {preview.servings}</p>
                <button onClick={addToInventory} className="mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded flex items-center gap-2 mx-auto">
                  <CheckCircle2 className="w-5 h-5" /> Confirmar y Agregar
                </button>
              </div>
            )}

            <div className="mt-4 text-center">
              <button onClick={() => calculateRemaining()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded flex items-center gap-2 mx-auto">
                <PercentCircle className="w-5 h-5" /> Calcular
              </button>
            </div>
          </div>

          {/* Real-Time Inventory Breakdown */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2 text-gray-700">Botellas Añadidas</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1">Tipo</th>
                    <th className="border px-2 py-1">Nombre</th>
                    <th className="border px-2 py-1">Volumen</th>
                    <th className="border px-2 py-1">% Restante</th>
                    <th className="border px-2 py-1">Oz Restante</th>
                    <th className="border px-2 py-1">Bebidas</th>
                    <th className="border px-2 py-1">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryList.map((item, index) => (
                    <tr key={index}>
                      <td className="border px-2 py-1">{item.type}</td>
                      <td className="border px-2 py-1">{item.name}</td>
                      <td className="border px-2 py-1">{item.volume} ml</td>
                      <td className="border px-2 py-1">{item.percentage}%</td>
                      <td className="border px-2 py-1">{item.remainingFlOz} oz</td>
                      <td className="border px-2 py-1">{item.servings}</td>
                      <td className="border px-2 py-1 text-center">
                        <button
                          onClick={() => removeFromInventory(index)}
                          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-2 py-1 rounded text-xs flex items-center justify-center mx-auto"
                          title="Eliminar Botella"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="mb-10">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Historial de Inventarios</h3>
        {inventoryHistory.length === 0 ? (
          <p className="text-gray-500">No hay inventarios guardados todavía.</p>
        ) : (
          <div className="space-y-4">
            {inventoryHistory.map((session, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <div key={index} className="border rounded shadow-sm">
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold">Inventario del {new Date(session.startDate).toLocaleString()}</p>
                      <p className="text-sm text-gray-600">
                        {Object.keys(session.items).length} botellas
                      </p>
                    </div>
                    <span className="text-blue-600 text-sm font-medium">
                      {isExpanded ? 'Cerrar' : 'Ver Detalles'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-white overflow-x-auto">
                      <table className="min-w-full border text-sm mb-2">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border px-2 py-1">Tipo</th>
                            <th className="border px-2 py-1">Nombre</th>
                            <th className="border px-2 py-1">Volumen</th>
                            <th className="border px-2 py-1">% Restante</th>
                            <th className="border px-2 py-1">Oz Restante</th>
                            <th className="border px-2 py-1">Bebidas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.values(session.items).map((item, i) => (
                            <tr key={i}>
                              <td className="border px-2 py-1">{item.type}</td>
                              <td className="border px-2 py-1">{item.name}</td>
                              <td className="border px-2 py-1">{item.volume} ml</td>
                              <td className="border px-2 py-1">{item.percentage}%</td>
                              <td className="border px-2 py-1">{item.remainingFlOz} oz</td>
                              <td className="border px-2 py-1">{item.servings}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="text-sm text-gray-600">
                        <p><strong>Inicio:</strong> {new Date(session.startDate).toLocaleString()}</p>
                        <p><strong>Fin:</strong> {new Date(session.endDate).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>


      <div className="sticky top-0 z-10 bg-white shadow-sm rounded mb-4 p-3 border">
        <h4 className="text-md font-semibold mb-2 text-gray-700 text-center">Resumen del Último Inventario Guardado</h4>
        {Object.keys(lastInventorySummaryStats).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(lastInventorySummaryStats).map(([type, stats]) => (
              <div key={type} className="p-2 bg-gray-50 rounded-md shadow-xs">
                <p className="font-semibold text-blue-600 capitalize">{type}</p>
                <div className="grid grid-cols-3 gap-1 text-xs text-gray-600 mt-1">
                  <span>Bebidas: <strong>{stats.totalServings}</strong></span>
                  <span>Prom. %: <strong>{stats.avgPercent}%</strong></span>
                  <span>Botellas: <strong>{stats.bottleCount}</strong></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center">No hay historial de inventarios para mostrar resumen.</p>
        )}
      </div>
    </div>
  );
}
