import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, FileText, CheckCircle, AlertTriangle, 
  Layers, Search, RefreshCw, BarChart2, User, Cpu, PieChart as PieIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const API_URL = 'http://localhost:5000/api/documents';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function App() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [activeReviewRecord, setActiveReviewRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRecordsHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL);
      if (response.data && response.data.success) {
        setRecords(response.data.data || []);
      }
    } catch (error) {
      console.error("API Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordsHistory();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

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
        setActiveReviewRecord(response.data.data);
        if (response.data.data && response.data.data.filePath) {
          setFilePreview(`http://localhost:5000/${response.data.data.filePath}`);
        }
        fetchRecordsHistory();
        setSelectedFile(null);
      }
    } catch (error) {
      console.error("Upload Error:", error);
      alert("AI Ingestion Failed: " + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setActiveReviewRecord(prev => ({
      ...prev,
      extractedData: { ...prev.extractedData, [field]: value }
    }));
  };

  const handleFinalCommit = async () => {
    if (!activeReviewRecord) return;
    try {
      const response = await axios.put(`${API_URL}/${activeReviewRecord._id}/review`, {
        updatedData: activeReviewRecord.extractedData
      });
      if (response.data && response.data.success) {
        alert("Record permanently finalized and tracked!");
        setActiveReviewRecord(null);
        setFilePreview(null);
        fetchRecordsHistory();
      }
    } catch (error) {
      alert("Failed to commit changes.");
    }
  };

  const isUncertain = (val) => val ? String(val).includes('*') : false;

  const loadDocumentIntoDeck = (rec) => {
    setActiveReviewRecord(rec);
    if (rec && rec.filePath) {
      setFilePreview(`http://localhost:5000/${rec.filePath}`);
    }
  };

  // ==========================================
  // 📊 BULLETPROOF CALCULATE OPERATIONS AGGREGATIONS
  // ==========================================
  const safeRecords = Array.isArray(records) ? records : [];
  const totalUploads = safeRecords.length;
  const validationFailures = safeRecords.filter(r => r.validationRules && !r.validationRules.isValid).length;
  
  const totalQtyProduced = safeRecords.reduce((acc, r) => {
    const rawQty = r.extractedData?.quantityProduced;
    const cleanQty = rawQty ? Number(String(rawQty).replace('*', '')) : 0;
    return acc + (isNaN(cleanQty) ? 0 : cleanQty);
  }, 0);

  // Machine Summary Processing
  const machineDataMap = safeRecords.reduce((acc, curr) => {
    const rawMac = curr.extractedData?.machineNumber;
    const mac = rawMac ? String(rawMac).replace('*', '').trim() : 'Unknown';
    const rawQty = curr.extractedData?.quantityProduced;
    const qty = rawQty ? Number(String(rawQty).replace('*', '')) : 0;
    acc[mac] = (acc[mac] || 0) + (isNaN(qty) ? 0 : qty);
    return acc;
  }, {});
  const machineChartData = Object.keys(machineDataMap).map(key => ({ name: key, Quantity: machineDataMap[key] }));

  // Shift Summary Processing
  const shiftDataMap = safeRecords.reduce((acc, curr) => {
    const rawShift = curr.extractedData?.shift;
    const sft = rawShift ? String(rawShift).replace('*', '').trim() : 'Unknown';
    acc[sft] = (acc[sft] || 0) + 1;
    return acc;
  }, {});
  const shiftChartData = Object.keys(shiftDataMap).map(key => ({ name: `Shift ${key}`, value: shiftDataMap[key] }));

  // ==========================================
  // 🔍 CRITICAL FIX: SAFE SEARCH FILTER LOGIC
  // ==========================================
 const filteredRecords = safeRecords.filter(rec => {
    const term = (searchQuery || '').toLowerCase().trim();
    if (!term) return true;

    const fName = (rec.fileName || '').toLowerCase(); // Added filename filter tracking
    const mac = (rec.extractedData?.machineNumber || '').toLowerCase();
    const emp = (rec.extractedData?.employeeNumber || '').toLowerCase();
    const wo = (rec.extractedData?.workOrderNumber || '').toLowerCase();
    const opn = (rec.extractedData?.opnCode || '').toLowerCase();
    const sft = (rec.extractedData?.shift || '').toLowerCase();

    return fName.includes(term) || mac.includes(term) || emp.includes(term) || wo.includes(term) || opn.includes(term) || sft.includes(term);
  });

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans antialiased pb-12">
      <header className="border-b border-gray-800 bg-gray-950 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white"><Cpu className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">BiztelAI</h1>
            <p className="text-xs text-gray-400">Operational Intelligence Workflow</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="text-gray-300 font-medium">Groq Llama-4 Ingestion Engine: Connected</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* EXECUTIVE SUMMARY CARDS */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 flex items-center space-x-4">
            <div className="p-3 bg-blue-900/40 text-blue-400 rounded-lg"><Layers className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-400">Total Operational Logs</p>
              <p className="text-2xl font-bold text-white mt-1">{totalUploads}</p>
            </div>
          </div>
          <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 flex items-center space-x-4">
            <div className="p-3 bg-red-900/40 text-red-400 rounded-lg"><AlertTriangle className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-400">Validation Failures Flagged</p>
              <p className="text-2xl font-bold text-white mt-1">{validationFailures}</p>
            </div>
          </div>
          <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 flex items-center space-x-4">
            <div className="p-3 bg-emerald-900/40 text-emerald-400 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-400">Total Factory Production Qty</p>
              <p className="text-2xl font-bold text-white mt-1">{totalQtyProduced}</p>
            </div>
          </div>
        </section>

        {/* DOUBLE CHARTS SUMMARY VIEW */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {machineChartData.length > 0 ? (
            <div className="bg-gray-950 p-6 rounded-xl border border-gray-800">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-500" /> Machine-Wise Production Summary
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={machineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#030712', borderColor: '#374151' }} />
                    <Bar dataKey="Quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 h-64 flex items-center justify-center text-gray-500 text-xs">
              No machine metrics available.
            </div>
          )}

          {shiftChartData.length > 0 ? (
            <div className="bg-gray-950 p-6 rounded-xl border border-gray-800">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-500" /> Shift-Wise Document Ingestion Distribution
              </h3>
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={shiftChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {shiftChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#030712', borderColor: '#374151' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 h-64 flex items-center justify-center text-gray-500 text-xs">
              No shift metrics available.
            </div>
          )}
        </section>

        {/* WORKSPACE AREA */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 flex flex-col justify-between">
            <div>
              <h3 className="text-md font-semibold text-white mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-500" /> Ingest New Operational Asset
              </h3>
              <form onSubmit={handleDocumentSubmit} className="space-y-4">
                <div className="border-2 border-dashed border-gray-800 hover:border-blue-500 transition-colors rounded-xl p-8 flex flex-col items-center justify-center bg-gray-900/50 cursor-pointer relative">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <FileText className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-300">{selectedFile ? selectedFile.name : 'Drag & drop image log here, or click to browse'}</p>
                </div>
                {filePreview && (
                  <div className="mt-4 border border-gray-800 rounded-lg p-2 bg-gray-900 flex justify-center">
                    <img src={filePreview} alt="Preview" className="max-h-64 rounded object-contain" />
                  </div>
                )}
                <button type="submit" disabled={!selectedFile || uploading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 font-semibold text-sm text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Execute AI Structural Extraction'}
                </button>
              </form>
            </div>
          </div>

          {/* DYNAMIC VERIFICATION DECK */}
          <div className="bg-gray-950 p-6 rounded-xl border border-gray-800">
            <h3 className="text-md font-semibold text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> Real-time Structural Verification Deck
            </h3>
            {activeReviewRecord ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800">
                  <span className="text-xs text-gray-400">AI Confidence Index Score:</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${activeReviewRecord.confidenceScore > 75 ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                    {activeReviewRecord.confidenceScore || 90}% Clarity Match
                  </span>
                </div>

                {activeReviewRecord.validationRules && !activeReviewRecord.validationRules.isValid && (
                  <div className="p-3 bg-red-950/40 border border-red-900 rounded-lg text-xs text-red-400 space-y-1">
                    <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Rule Failures & Exception Signals:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {activeReviewRecord.validationRules.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs">
                  {['date', 'shift', 'employeeNumber', 'opnCode', 'machineNumber', 'workOrderNumber', 'quantityProduced', 'timeTaken'].map((field) => {
                    const rawVal = activeReviewRecord.extractedData?.[field] || '';
                    const uncertain = isUncertain(rawVal);
                    const displayVal = uncertain ? String(rawVal).replace('*', '') : rawVal;

                    return (
                      <div key={field} className={field === 'quantityProduced' ? 'col-span-2' : ''}>
                        <label className="block text-gray-400 font-medium mb-1 capitalize">
                          {field.replace(/([A-Z])/g, ' $1')} {uncertain && <span className="text-amber-500 font-bold">(Low Confidence)</span>}
                        </label>
                        <input 
                          type={field === 'quantityProduced' ? 'text' : 'text'} 
                          value={displayVal} 
                          onChange={(e) => handleFieldChange(field, e.target.value)} 
                          className={`w-full bg-gray-900 text-white rounded p-2 outline-none transition-colors border ${
                            uncertain ? 'border-amber-500 focus:border-amber-400 bg-amber-950/10' : 'border-gray-800 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
                <button onClick={handleFinalCommit} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Save & Finalize Record Ingestion
                </button>
              </div>
            ) : (
              <div className="h-48 border border-dashed border-gray-800 bg-gray-900/20 rounded-xl flex flex-col items-center justify-center text-gray-500 text-xs">
                <User className="w-8 h-8 mb-2 text-gray-600" /> No active document selected for verification layout loops.
              </div>
            )}
          </div>
        </section>

        {/* LOG LEDGER */}
        <section className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-md font-semibold text-white">Historical Data Log Ledger</h3>
              <p className="text-xs text-gray-400 mt-0.5">Comprehensive audit ledger database mapping all processed documents.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search machine, employee, work order..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full bg-gray-900 text-xs text-white pl-9 pr-4 py-2 rounded-lg border border-gray-800 outline-none focus:border-blue-500" 
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-900/60 text-gray-400 uppercase font-medium border-b border-gray-800">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">File Name</th>
                  <th className="p-4">Shift</th>
                  <th className="p-4">Emp. No</th>
                  <th className="p-4">Machine No</th>
                  <th className="p-4">Work Order No</th>
                  <th className="p-4">Qty Produced</th>
                  <th className="p-4">Pipeline Check</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {loading ? (
                  <tr><td colSpan="9" className="p-8 text-center text-gray-500"><RefreshCw className="w-4 h-4 animate-spin mx-auto" /></td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan="9" className="p-8 text-center text-gray-500">No matching operational records found.</td></tr>
                ) : filteredRecords.map((rec) => (
                  <tr key={rec._id} className="hover:bg-gray-900/30">
                    <td className="p-4 text-gray-500">{new Date(rec.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 font-medium text-white">{rec.fileName}</td>
                    <td className="p-4"><span>{rec.extractedData?.shift ? String(rec.extractedData.shift).replace('*','') : 'N/A'}</span></td>
                    <td className="p-4">{rec.extractedData?.employeeNumber ? String(rec.extractedData.employeeNumber).replace('*','') : 'N/A'}</td>
                    <td className="p-4">{rec.extractedData?.machineNumber ? String(rec.extractedData.machineNumber).replace('*','') : 'N/A'}</td>
                    <td className="p-4">{rec.extractedData?.workOrderNumber ? String(rec.extractedData.workOrderNumber).replace('*','') : 'N/A'}</td>
                    <td className="p-4 font-bold">{rec.extractedData?.quantityProduced ? String(rec.extractedData.quantityProduced).replace('*','') : 'N/A'}</td>
                    <td className="p-4">
                      {rec.status === 'Reviewed & Saved' ? (
                        <span className="text-emerald-400 font-medium">Saved</span>
                      ) : rec.validationRules?.isValid ? (
                        <span className="text-blue-400 font-medium">Standard</span>
                      ) : (
                        <span className="text-red-400 font-medium">Flagged</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => loadDocumentIntoDeck(rec)} className="px-2.5 py-1 bg-gray-900 hover:bg-blue-900/50 border border-gray-800 rounded text-xs font-medium">Open Document</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}