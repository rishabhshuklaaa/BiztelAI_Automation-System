import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, FileText, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight,
  Layers, Search, RefreshCw, BarChart2, User, Cpu, Trash2, Edit3, Eye, PieChart as PieIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const IS_LOCAL_RUNTIME = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BACKEND_BASE_URL = IS_LOCAL_RUNTIME ? 'http://localhost:5000' : 'https://biztelai-backend.onrender.com';
const API_URL = `${BACKEND_BASE_URL}/api/documents`;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function App() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Staged pagination elements for dynamic record rows
  const [extractedRowsBatch, setExtractedRowsBatch] = useState([]); 
  const [activePageIndex, setActivePageIndex] = useState(0); 
  const [isEditingRowId, setIsEditingRowId] = useState(null); 

  // Fetch complete transactional sequence data from database
  const fetchRecordsHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}?_t=${new Date().getTime()}`);
      if (response.data && response.data.success) {
        setRecords(response.data.data || []);
      }
    } catch (error) {
      console.error("Ledger fetch metrics runtime exception:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecordsHistory(); }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  // Upload structural asset binaries into ingestion tracks
  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('document', selectedFile);

      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data && response.data.success) {
        const payloadData = response.data.data;
        
        let parsedRows = [];
        if (Array.isArray(payloadData)) {
          parsedRows = payloadData;
        } else if (payloadData?.extractedRows) {
          parsedRows = payloadData.extractedRows;
        } else {
          parsedRows = [payloadData]; 
        }

        setExtractedRowsBatch(parsedRows);
        setActivePageIndex(0);
        fetchRecordsHistory();
        setSelectedFile(null);
      }
    } catch (error) {
      console.error("Ingestion loop system fault:", error);
      alert("AI Processing Failure: " + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  // Handle value overrides inside control text areas
  const handleFieldChange = (field, val) => {
    setExtractedRowsBatch(prev => {
      const copy = [...prev];
      if (!copy[activePageIndex].extractedData) copy[activePageIndex].extractedData = {};
      copy[activePageIndex].extractedData[field] = { value: val, confidence: 100 }; 
      return copy;
    });
  };

  // Client-side rule evaluation loop
  const runLocalValidation = (data) => {
    const errors = [];
    const fields = ['date', 'shift', 'employeeNumber', 'opnCode', 'machineNumber', 'workOrderNumber', 'quantityProduced'];
    
    fields.forEach(f => {
      const val = String(data?.[f]?.value || '').trim();
      if (!val || val === "" || val === "—") {
        errors.push(`Field '${f}' is blank or contains anomaly characters.`);
      }
    });

    const shiftVal = String(data?.shift?.value || '').toUpperCase();
    if (shiftVal && !['1','2','3','I','II','III','A','B','C'].includes(shiftVal)) {
      errors.push(`Invalid Shift value context '${shiftVal}'.`);
    }

    return { isValid: errors.length === 0, errors };
  };

  // Synchronize staging arrays with remote schema state engines
  const handleSaveActivePageRow = async () => {
    if (extractedRowsBatch.length === 0) return;
    const currentTargetRow = extractedRowsBatch[activePageIndex];

    const { isValid, errors } = runLocalValidation(currentTargetRow.extractedData);

    try {
      if (currentTargetRow._id || isEditingRowId) {
        const targetId = currentTargetRow._id || isEditingRowId;
        await axios.put(`${BACKEND_BASE_URL}/api/system/records/${targetId}`, {
          updatedData: currentTargetRow.extractedData,
          validationRules: { isValid, errors }
        });
      } else {
        await axios.post(`${API_URL}/save-single`, {
          fileName: currentTargetRow.fileName || "Extracted_Asset.png",
          filePath: currentTargetRow.filePath || "uploads/default.png",
          extractedData: currentTargetRow.extractedData,
          validationRules: { isValid, errors }
        });
      }

      alert(isValid ? "Record locked successfully into ledger!" : "Saved with Warning Checkpoints. Checked row marked Red!");
      
      if (activePageIndex < extractedRowsBatch.length - 1) {
        setActivePageIndex(prev => prev + 1);
      } else {
        setExtractedRowsBatch([]);
        setIsEditingRowId(null);
        setFilePreview(null);
      }
      fetchRecordsHistory();
    } catch (err) {
      console.error("Database persistence network breakdown:", err);
      alert("Failed to commit active transaction page matrix.");
    }
  };

  // Wipe individual entry context permanently from cluster collections
  const handleDeleteRow = async (id) => {
    if (!window.confirm("Delete this log permanently from ledger?")) return;
    try {
      await axios.delete(`${BACKEND_BASE_URL}/api/system/records/${id}`);
      fetchRecordsHistory();
    } catch (error) {
      alert("Failed to remove operational entry.");
    }
  };

  // Hydrate visual tracking fields with chosen transaction attributes
  const loadDocumentIntoDeck = (rec, editMode = false) => {
    setExtractedRowsBatch([rec]);
    setActivePageIndex(0);
    if (editMode) {
      setIsEditingRowId(rec._id);
    }
    if (rec.filePath) {
      setFilePreview(`${BACKEND_BASE_URL}/${rec.filePath}`);
    }
  };

  // Execute comprehensive purge loop across data nodes and local volumes
  const handleSystemReset = async () => {
    if (!window.confirm("Purge entire database log ecosystem?")) return;
    await axios.delete(`${BACKEND_BASE_URL}/api/system/reset`);
    setRecords([]);
    setExtractedRowsBatch([]);
    setFilePreview(null);
    alert("System database completely reset.");
  };

  // =======================================================
  // 📊 DATA RECALCULATION & COMPREHENSIVE GRAPH LABS
  // =======================================================
  const safeRecords = Array.isArray(records) ? records : [];
  const totalUploads = safeRecords.length;
  const validationFailures = safeRecords.filter(r => r.validationRules && !r.validationRules.isValid).length;
  
  const totalQtyProduced = safeRecords.reduce((acc, r) => {
    const rawVal = r.extractedData?.quantityProduced?.value;
    const cleanQty = rawVal ? Number(String(rawVal).replace('*', '')) : 0;
    return acc + (isNaN(cleanQty) ? 0 : cleanQty);
  }, 0);

  const machineDataMap = safeRecords.reduce((acc, curr) => {
    const mac = curr.extractedData?.machineNumber?.value || 'Unknown';
    const qty = Number(curr.extractedData?.quantityProduced?.value || 0);
    acc[mac] = (acc[mac] || 0) + (isNaN(qty) ? 0 : qty);
    return acc;
  }, {});
  const machineChartData = Object.keys(machineDataMap).map(k => ({ name: k, Quantity: machineDataMap[k] }));

  const shiftDataMap = safeRecords.reduce((acc, curr) => {
    const sft = curr.extractedData?.shift?.value || 'Unknown';
    acc[sft] = (acc[sft] || 0) + 1;
    return acc;
  }, {});
  const shiftChartData = Object.keys(shiftDataMap).map(k => ({ name: `Shift ${k}`, value: shiftDataMap[k] }));

  // =======================================================
  // 🔍 DEEP MULTI-FIELD RE-ACTIVE SEARCH RULE CONTROLLER
  // =======================================================
  const filteredRecords = safeRecords.filter(rec => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    const matchFileName = (rec.fileName || '').toLowerCase().includes(term);
    const matchShift = (rec.extractedData?.shift?.value || '').toLowerCase().includes(term);
    const matchEmpNum = (rec.extractedData?.employeeNumber?.value || '').toLowerCase().includes(term);
    const matchOpnCode = (rec.extractedData?.opnCode?.value || '').toLowerCase().includes(term);
    const matchMachNum = (rec.extractedData?.machineNumber?.value || '').toLowerCase().includes(term);
    const matchWorkOrder = (rec.extractedData?.workOrderNumber?.value || '').toLowerCase().includes(term);
    const matchQuantity = (rec.extractedData?.quantityProduced?.value || '').toLowerCase().includes(term);

    return matchFileName || matchShift || matchEmpNum || matchOpnCode || matchMachNum || matchWorkOrder || matchQuantity;
  });

  const activeRowData = extractedRowsBatch[activePageIndex];
  const activeValidationResult = activeRowData ? runLocalValidation(activeRowData.extractedData) : { isValid: true, errors: [] };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans antialiased pb-12">
      <header className="border-b border-gray-800 bg-gray-950 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white"><Cpu className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Biztel OMNI v2</h1>
            <p className="text-xs text-gray-400">Paginated Process Control Ledger Engine</p>
          </div>
        </div>
        <button onClick={handleSystemReset} className="px-4 py-1.5 bg-red-950/40 hover:bg-red-600 border border-red-900 text-red-400 hover:text-white text-xs font-bold rounded-lg cursor-pointer transition-all">
          Purge Ledger System
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* EXECUTIVE CARD METRICS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-gray-950 p-5 rounded-xl border border-gray-800 flex items-center space-x-4">
            <div className="p-3 bg-blue-900/40 text-blue-400 rounded-lg"><Layers className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium tracking-wider">Total Active Ledger Records</p>
              <p className="text-2xl font-bold text-white mt-0.5">{totalUploads}</p>
            </div>
          </div>
          <div className="bg-gray-950 p-5 rounded-xl border border-gray-800 flex items-center space-x-4">
            <div className="p-3 bg-red-900/40 text-red-400 rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium tracking-wider">Critical Failures / Warnings</p>
              <p className="text-2xl font-bold text-white mt-0.5">{validationFailures}</p>
            </div>
          </div>
          <div className="bg-gray-950 p-5 rounded-xl border border-gray-800 flex items-center space-x-4">
            <div className="p-3 bg-emerald-900/40 text-emerald-400 rounded-lg"><CheckCircle className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium tracking-wider">Aggregated Quantity Factory Production</p>
              <p className="text-2xl font-bold text-white mt-0.5">{totalQtyProduced}</p>
            </div>
          </div>
        </section>

        {/* RECHARTS COMPONENT STREAMS */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-950 p-5 rounded-xl border border-gray-800">
            <h3 className="text-xs font-semibold text-white mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-500" /> Facility Machine Output Aggregations</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={machineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#030712', borderColor: '#374151' }} />
                  <Bar dataKey="Quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-gray-950 p-5 rounded-xl border border-gray-800">
            <h3 className="text-xs font-semibold text-white mb-4 flex items-center gap-2"><PieIcon className="w-4 h-4 text-emerald-500" /> Total Ingestions Distributed via Shifts</h3>
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={shiftChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                    {shiftChartData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#030712', borderColor: '#374151' }} />
                  <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* OPERATIONAL HUB MATRIX */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-950 p-5 rounded-xl border border-gray-800 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Upload className="w-4 h-4 text-blue-500" /> Operational Asset Stream Entry</h3>
              <form onSubmit={handleDocumentSubmit} className="space-y-4">
                <div className="border-2 border-dashed border-gray-800 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-900/40 relative">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <FileText className="w-10 h-10 text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400 text-center">{selectedFile ? selectedFile.name : 'Select or drop production log image asset...'}</p>
                </div>
                {filePreview && (
                  <div className="border border-gray-800 rounded-lg p-2 bg-gray-900 flex justify-center">
                    <img src={filePreview} alt="Preview" className="max-h-48 rounded object-contain" />
                  </div>
                )}
                <button type="submit" disabled={!selectedFile || uploading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Execute AI Multi-Row Splitter Extraction'}
                </button>
              </form>
            </div>
          </div>

          {/* DYNAMIC FORM VERIFICATION CARDS */}
          <div className="bg-gray-950 p-5 rounded-xl border border-gray-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3 border-b border-gray-900 pb-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Multi-Stage Validation Deck</h3>
                {extractedRowsBatch.length > 0 && (
                  <div className="flex items-center space-x-2 bg-gray-900 px-2.5 py-1 rounded-md border border-gray-800">
                    <button disabled={activePageIndex === 0} onClick={() => setActivePageIndex(p => p - 1)} className="text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-[10px] font-bold text-gray-300">Row Stack: {activePageIndex + 1} of {extractedRowsBatch.length}</span>
                    <button disabled={activePageIndex === extractedRowsBatch.length - 1} onClick={() => setActivePageIndex(p => p + 1)} className="text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}
              </div>

              {activeRowData ? (
                <div className="space-y-4">
                  {!activeValidationResult.isValid && (
                    <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-[11px] text-red-400 space-y-0.5">
                      <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Core Rule Violations Triggered:</p>
                      <ul className="list-disc pl-4 space-y-0.5 font-medium">
                        {activeValidationResult.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {['date', 'shift', 'employeeNumber', 'opnCode', 'machineNumber', 'workOrderNumber', 'quantityProduced'].map((f) => {
                      const fieldRef = activeRowData.extractedData?.[f] || { value: '', confidence: 100 };
                      const val = fieldRef.value || '';
                      const conf = fieldRef.confidence !== undefined ? fieldRef.confidence : 100;
                      
                      const isBlank = !val || String(val).trim() === '' || String(val) === '—';
                      const isLowConf = conf < 70;

                      return (
                        <div key={f} className={f === 'quantityProduced' ? 'col-span-2' : ''}>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] text-gray-400 font-semibold capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded tracking-wide ${
                              isBlank || isLowConf ? 'bg-red-950/80 text-red-400 border border-red-900' : 'bg-gray-900 text-emerald-400'
                            }`}>{isBlank ? 'BLANK ROW' : `${conf}% CONF.`}</span>
                          </div>
                          <input 
                            type="text" 
                            value={val} 
                            onChange={(e) => handleFieldChange(f, e.target.value)}
                            className={`w-full bg-gray-900 text-white rounded p-2 outline-none text-xs border transition-all ${
                              isBlank ? 'border-red-600 bg-red-950/5 focus:border-red-400' : 
                              isLowConf ? 'border-amber-500 bg-amber-950/5 focus:border-amber-400' : 'border-gray-800 focus:border-blue-500'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <button onClick={handleSaveActivePageRow} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                    <CheckCircle className="w-4 h-4" /> Save & Commit This Transaction Page
                  </button>
                </div>
              ) : (
                <div className="h-56 border border-dashed border-gray-800 bg-gray-900/10 rounded-xl flex flex-col items-center justify-center text-gray-500 text-xs">
                  <User className="w-6 h-6 mb-1 text-gray-700" /> Queue empty. Upload log image or click ledger entries to initiate stage loops.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* MAIN HISTORICAL AUDIT LOG TABLE */}
        <section className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Immutable Operational History Audit Ledger</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Real-time reactive searching grid layer with direct hardware state overrides.</p>
            </div>
            
            {/* Integrated predictive search matching all critical matrix strings */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search by Machine ID, Emp No, Shift, Work Order, Qty..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full bg-gray-900 text-xs text-white pl-9 pr-4 py-2 rounded-lg border border-gray-800 outline-none focus:border-blue-500 transition-all placeholder-gray-500" 
              />
            </div>
          </div>
          
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-900/50 text-gray-400 font-medium border-b border-gray-800 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Asset Target Name</th>
                  <th className="p-3">Shift</th>
                  <th className="p-3">Emp ID</th>
                  <th className="p-3">Machine ID</th>
                  <th className="p-3">Work Order</th>
                  <th className="p-3">Qty Output</th>
                  <th className="p-3">Pipeline Audit Status</th>
                  <th className="p-3 text-right">Ledger Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40 text-gray-300 font-medium">
                {loading ? (
                  <tr><td colSpan="9" className="p-6 text-center text-gray-500"><RefreshCw className="w-4 h-4 animate-spin mx-auto" /></td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan="9" className="p-6 text-center text-gray-500">Zero matching operational transaction blocks recorded.</td></tr>
                ) : filteredRecords.map((rec) => {
                  const checkValid = rec.validationRules?.isValid !== false;
                  return (
                    <tr key={rec._id} className="hover:bg-gray-900/20 transition-all">
                      <td className="p-3 text-gray-500 text-[11px]">{new Date(rec.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 font-semibold text-white">{rec.fileName}</td>
                      <td className="p-3">{rec.extractedData?.shift?.value || '—'}</td>
                      <td className="p-3">{rec.extractedData?.employeeNumber?.value || '—'}</td>
                      <td className="p-3">{rec.extractedData?.machineNumber?.value || '—'}</td>
                      <td className="p-3">{rec.extractedData?.workOrderNumber?.value || '—'}</td>
                      <td className="p-3 font-bold text-blue-400">{rec.extractedData?.quantityProduced?.value || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[10px] rounded-full border font-bold ${
                          checkValid 
                            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' 
                            : 'bg-red-950/60 border-red-900 text-red-400'
                        }`}>{checkValid ? 'Pipeline Secure' : 'Validation Error Alert'}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end items-center space-x-1.5">
                          
                          <button onClick={() => loadDocumentIntoDeck(rec, true)} className="p-1 bg-gray-900 border border-gray-800 hover:border-amber-500 hover:text-amber-400 rounded cursor-pointer transition-all" title="Edit Entry"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteRow(rec._id)} className="p-1 bg-gray-900 border border-gray-800 hover:border-red-500 hover:text-red-400 rounded cursor-pointer transition-all" title="Delete Entry"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}