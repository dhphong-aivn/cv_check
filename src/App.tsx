import React, { useState, useRef } from 'react';
import { Upload, FileText, Send, CheckCircle2, XCircle, Loader2, Trash2, Mail, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AnalysisResult {
  candidateName: string;
  score: string | number;
  comment: string;
  status: string;
}

export default function App() {
  const [campaign, setCampaign] = useState('');
  const [jd, setJd] = useState('');
  const [emails, setEmails] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isReporting, setIsReporting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startAnalysis = async () => {
    if (!jd.trim()) {
      alert("Vui lòng nhập Mô tả công việc (JD)!");
      return;
    }
    if (selectedFiles.length === 0) {
      alert("Vui lòng chọn ít nhất 1 file CV!");
      return;
    }

    setIsAnalyzing(true);
    setShowResults(true);
    setResults([]);
    const total = selectedFiles.length;
    setProgress({ current: 0, total });

    const WEBHOOK_1_URL = "/webhook/phan-tich-cv";

    for (let i = 0; i < total; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append('campaign', campaign);
      formData.append('jd', jd);
      formData.append('data', file);

      try {
        const response = await fetch(WEBHOOK_1_URL, {
          method: 'POST',
          body: formData
        });

        let result: any = {};
        try {
          const rawResult = await response.json();
          // Handle case where webhook returns an array
          result = Array.isArray(rawResult) ? rawResult[0] : rawResult;
        } catch (e) {
          result = { error: "Không thể parse JSON từ webhook" };
        }

        const candidateName = result.name || result.candidateName || result.tenUngVien || result.full_name || (result.data && (result.data.name || result.data.candidateName)) || file.name;
        
        // Try to find score in various common field names, including nested in 'data'
        const getScore = (obj: any) => {
          if (!obj) return null;
          return obj.score ?? obj.diem ?? obj.matchPercentage ?? obj.match_percentage ?? obj.percentage ?? obj.percent ?? obj.matching_score ?? obj.point;
        };

        let score = getScore(result);
        if (score === null && result.data) {
          score = getScore(result.data);
        }
        
        if (score === null) score = "N/A";
        
        const comment = result.comment || result.nhanXet || result.summary || result.description || (result.data && (result.data.comment || result.data.nhanXet)) || "Đã phân tích xong";
        const status = result.status || result.ketLuan || result.result || (result.data && (result.data.status || result.data.ketLuan)) || (parseFloat(String(score)) >= 50 ? "Pass" : "Fail");

        const rowData: AnalysisResult = { candidateName, score, comment, status };
        setResults(prev => [...prev, rowData]);
      } catch (error: any) {
        console.error("Error analyzing file:", file.name, error);
        const rowData: AnalysisResult = { candidateName: file.name, score: "Lỗi", comment: error.message, status: "Fail" };
        setResults(prev => [...prev, rowData]);
      }

      setProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setIsAnalyzing(false);
  };

  const sendReport = async () => {
    const recipients = emails.split(',').map(e => e.trim()).filter(e => e);
    if (recipients.length === 0) {
      alert("Vui lòng nhập ít nhất 1 email nhận báo cáo!");
      return;
    }

    setIsReporting(true);
    const WEBHOOK_2_URL = "/webhook/cv-send-mail";

    try {
      const response = await fetch(WEBHOOK_2_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaign,
          recipients,
          results
        })
      });

      if (response.ok) {
        alert("✅ Báo cáo đã được gửi đến trưởng phòng!");
      } else {
        alert("❌ Có lỗi xảy ra khi gửi báo cáo.");
      }
    } catch (error) {
      console.error("Error sending report:", error);
      alert("❌ Lỗi kết nối khi gửi báo cáo.");
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0c29] text-slate-50 font-sans selection:bg-purple-500/30">
      {/* Background Bubbles */}
      <div className="fixed top-[-100px] left-[-100px] w-[400px] h-[400px] bg-purple-600/20 blur-[100px] rounded-full -z-10" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-600/15 blur-[100px] rounded-full -z-10" />

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <header className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <Bot className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-slate-300">AI Powered Recruitment</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
          >
            AI CV Screening System
          </motion.h1>
        </header>

        <div className="grid gap-8">
          {/* Campaign Info */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Thông Tin Đợt Tuyển
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Tên chiến dịch tuyển dụng</label>
                <input
                  type="text"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                  placeholder="VD: Tuyển dụng Frontend Developer Q3"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Mô tả công việc - JD</label>
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-purple-500 transition-colors h-40 resize-none"
                  placeholder="Nhập mô tả công việc vào đây..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Email nhận báo cáo (cách nhau bằng dấu phẩy)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-12 pr-4 py-3 outline-none focus:border-purple-500 transition-colors"
                    placeholder="hr@company.com, manager@company.com"
                  />
                </div>
              </div>
            </div>
          </motion.section>

          {/* File Upload */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-400" />
              Tải Hồ Sơ
            </h2>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-purple-500/10', 'border-purple-500/50'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-purple-500/10', 'border-purple-500/50'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('bg-purple-500/10', 'border-purple-500/50');
                if (e.dataTransfer.files) {
                  setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                }
              }}
              className="border-2 border-dashed border-white/10 rounded-xl p-10 text-center cursor-pointer hover:bg-white/5 hover:border-purple-500/30 transition-all group"
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              <p className="text-slate-300 font-medium">Kéo thả CV vào đây hoặc nhấn để chọn</p>
              <p className="text-slate-500 text-sm mt-2">Hỗ trợ PDF, DOCX, TXT</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.txt,.docx"
                multiple
              />
            </div>

            <AnimatePresence>
              {selectedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 flex flex-wrap gap-2"
                >
                  {selectedFiles.map((file, index) => (
                    <motion.div
                      key={`${file.name}-${index}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm group"
                    >
                      <span className="max-w-[150px] truncate">{file.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {isAnalyzing && (
              <div className="mt-8 space-y-3">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Đang xử lý: {progress.current}/{progress.total}</span>
                  <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </motion.section>
        </div>

        {!isAnalyzing && results.length === 0 && (
          <button
            onClick={startAnalysis}
            disabled={selectedFiles.length === 0 || !jd.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-lg shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-3"
          >
            <Send className="w-5 h-5" />
            Bắt Đầu Phân Tích AI
          </button>
        )}

        {/* Results */}
        <AnimatePresence>
          {showResults && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-bottom border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Kết Quả Phân Tích</h2>
                {isAnalyzing && <Loader2 className="w-5 h-5 animate-spin text-purple-400" />}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/20">
                      <th className="px-6 py-4 text-sm font-semibold text-slate-400">Tên Ứng Viên</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-400">Điểm (%)</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-400">Nhận Xét</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-400">Kết Luận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {results.map((res, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium">{res.candidateName}</td>
                        <td className="px-6 py-4">
                          <span className="text-purple-400 font-bold">{res.score}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400 max-w-xs">{res.comment}</td>
                        <td className="px-6 py-4">
                          {res.status.toLowerCase().includes('pass') || res.status.toLowerCase().includes('đạt') ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              {res.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">
                              <XCircle className="w-3 h-3" />
                              {res.status}
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {!isAnalyzing && results.length > 0 && (
          <button
            onClick={sendReport}
            disabled={isReporting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 font-bold text-lg shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-3"
          >
            {isReporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
            Gửi Báo Cáo Cho Sếp
          </button>
        )}
      </div>
    </div>
  );
}
