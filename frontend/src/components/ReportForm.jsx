import React, { useState } from 'react';
import { submitReport, performOcr } from '../api/api';
import imageCompression from 'browser-image-compression';
import { Upload, Send, CheckCircle, AlertCircle, Loader2, X, ScanLine } from 'lucide-react';

const ReportForm = () => {
    const [formData, setFormData] = useState({
        employeeId: '',
        name: '',
        promReceiptNo: '',
        onuIp: '',
        installLocation: '',
        breakerLocation: '',
        accessProcedure: '',
        opticalDb: '',
        opticalDb: '',
        // chassisNumber and moduleNumber removed from state as they are derived from ocrResults
    });
    const [images, setImages] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [ocrResults, setOcrResults] = useState([]); // Array of { number, type } or null
    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        if (images.length + files.length > 8) {
            setStatus({ type: 'error', message: '사진은 최대 8장까지만 업로드 가능합니다.' });
            return;
        }

        setOcrLoading(true);
        setStatus({ type: '', message: '' });

        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        };

        const newImages = [];
        const newPreviews = [];
        const newOcrResults = [];

        try {
            for (const file of files) {
                const compressedFile = await imageCompression(file, options);
                newImages.push(compressedFile);
                newPreviews.push(URL.createObjectURL(compressedFile));

                // Perform Real-time OCR
                try {
                    const response = await performOcr(compressedFile);
                    if (response.data) {
                        newOcrResults.push(response.data); // { number, type }

                        // Auto-fill logic removed as inputs are hidden
                    } else {
                        newOcrResults.push(null);
                    }
                } catch (err) {
                    console.error("OCR Failed for image", err);
                    newOcrResults.push(null);
                }
            }

            setImages(prev => [...prev, ...newImages]);
            setPreviewUrls(prev => [...prev, ...newPreviews]);
            setOcrResults(prev => [...prev, ...newOcrResults]);
        } catch (error) {
            console.error('Error processing images:', error);
            setStatus({ type: 'error', message: '이미지 처리 중 오류가 발생했습니다.' });
        } finally {
            setOcrLoading(false);
        }
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
        setOcrResults(prev => prev.filter((_, i) => i !== index));
    };

    const hasChassis = ocrResults.some(res => res && res.type === '샤시');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        if (!hasChassis) {
            setStatus({ type: 'error', message: "'샤시' 바코드 번호가 포함된 사진이 반드시 필요합니다." });
            setLoading(false);
            return;
        }

        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));

        // Collect all detected numbers
        const chassisNumbers = ocrResults.filter(res => res && res.type === '샤시').map(res => res.number);
        const moduleNumbers = ocrResults.filter(res => res && res.type === '모듈').map(res => res.number);

        chassisNumbers.forEach(num => data.append('chassisNumbers', num));
        moduleNumbers.forEach(num => data.append('moduleNumbers', num));

        images.forEach((image) => {
            data.append('images', image, image.name);
        });

        try {
            await submitReport(data);
            setStatus({ type: 'success', message: '성적서가 성공적으로 전송되었습니다! (이메일 발송됨)' });
            // Reset form
            setFormData({
                employeeId: '',
                name: '',
                promReceiptNo: '',
                onuIp: '',
                installLocation: '',
                breakerLocation: '',
                accessProcedure: '',
                opticalDb: '',
            });
            setImages([]);
            setPreviewUrls([]);
            setOcrResults([]);
        } catch (error) {
            console.error('Submission error:', error);
            setStatus({ type: 'error', message: error.response?.data || '전송 실패. 다시 시도해주세요.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* 전송중 모달 */}
            {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 transform transition-all animate-in fade-in zoom-in-95">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                            <h3 className="text-xl font-bold text-gray-800">전송중</h3>
                            <p className="text-sm text-gray-500 text-center">메일을 전송하고 있습니다. 잠시만 기다려주세요...</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl my-10 border border-white/20">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Prom 인수시험성적서 간편등록
                    </h2>
                    <p className="text-sm text-gray-500">필수 정보를 입력하고 바코드 사진을 업로드해주세요</p>
                </div>

            {status.message && (
                <div className={`mb-6 p-4 rounded-xl flex items-center shadow-md animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    {status.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />}
                    <span className="text-sm font-medium">{status.message}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            사번 <span className="text-gray-400 font-normal">(숫자 7자리)</span>
                        </label>
                        <input
                            type="text"
                            name="employeeId"
                            value={formData.employeeId}
                            onChange={handleChange}
                            pattern="\d{7}"
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white placeholder:text-gray-400 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)]"
                            placeholder="110xxxx"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">이름</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white placeholder:text-gray-400 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)]"
                            placeholder="홍길동"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Prom 접수번호 <span className="text-gray-400 font-normal">(숫자 6자리 이상)</span>
                    </label>
                    <input
                        type="text"
                        name="promReceiptNo"
                        value={formData.promReceiptNo}
                        onChange={handleChange}
                        pattern="\d{6,}"
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white placeholder:text-gray-400 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)]"
                        placeholder="123456"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">ONU IP</label>
                        <input
                            type="text"
                            name="onuIp"
                            value={formData.onuIp}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white placeholder:text-gray-400 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)]"
                            placeholder="192.168.1.1"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">광 DB</label>
                        <input
                            type="text"
                            name="opticalDb"
                            value={formData.opticalDb}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white placeholder:text-gray-400 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)]"
                            placeholder="-20.5"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">설치 위치</label>
                    <input
                        type="text"
                        name="installLocation"
                        value={formData.installLocation}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white placeholder:text-gray-400 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)]"
                        placeholder="1층 통신실"
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">차단기 위치</label>
                    <input
                        type="text"
                        name="breakerLocation"
                        value={formData.breakerLocation}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white placeholder:text-gray-400 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)]"
                        placeholder="2층 전기실"
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">출입 절차</label>
                    <input
                        type="text"
                        name="accessProcedure"
                        value={formData.accessProcedure}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white placeholder:text-gray-400 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)]"
                        placeholder="비밀번호 / 호출"
                    />
                </div>

                {/* Detected Barcodes Section */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 p-5 rounded-xl border-2 border-blue-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                        <ScanLine className="w-5 h-5 mr-2 text-blue-600" />
                        인식된 바코드
                    </h3>
                    {ocrResults.length === 0 && !ocrLoading && (
                        <p className="text-sm text-gray-500 italic">사진을 업로드하면 여기에 바코드 정보가 표시됩니다.</p>
                    )}
                    {ocrLoading && (
                        <div className="flex items-center gap-2 text-blue-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <p className="text-sm font-medium animate-pulse">바코드 분석 중...</p>
                        </div>
                    )}

                    <ul className="space-y-2 mt-3">
                        {ocrResults.map((res, idx) => (
                            res && (
                                <li key={idx} className={`text-sm px-3 py-2 rounded-lg flex justify-between items-center shadow-sm transition-all duration-200 ${res.type === '샤시' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold shadow-blue-200' : 'bg-white text-gray-700 border border-gray-200'}`}>
                                    <span className="font-medium">{res.type}</span>
                                    <span className="font-mono text-xs">{res.number}</span>
                                </li>
                            )
                        ))}
                    </ul>

                    {!hasChassis && images.length > 0 && !ocrLoading && (
                        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                            <p className="text-xs text-rose-700 font-semibold flex items-center">
                                <AlertCircle className="w-4 h-4 mr-1.5" />
                                * 샤시 바코드가 포함된 사진이 필요합니다.
                            </p>
                        </div>
                    )}
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 cursor-pointer relative group">
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        disabled={images.length >= 8}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    <div className="flex flex-col items-center text-gray-500 group-hover:text-blue-600 transition-colors">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                            <Upload className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="font-semibold text-base mb-1">
                            {images.length >= 8 ? "최대 8장까지 업로드 가능" : "사진 업로드 (클릭)"}
                        </p>
                        <p className="text-sm text-gray-400">
                            ({images.length}/8 장)
                        </p>
                    </div>
                </div>

                {previewUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {previewUrls.map((url, index) => (
                            <div key={index} className="relative group">
                                <div className="relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                                    <img src={url} alt={`Preview ${index}`} className="w-full h-32 object-cover" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-xs p-2">
                                        <div className="font-medium truncate">
                                            {ocrResults[index] ? `${ocrResults[index].type}: ${ocrResults[index].number.slice(-6)}` : '인식 실패'}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !hasChassis}
                    className={`w-full py-4 px-6 rounded-xl text-white font-bold text-base flex items-center justify-center gap-3 transition-all duration-300 transform ${
                        (loading || !hasChassis) 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>전송 중...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            <span>성적서 등록</span>
                        </>
                    )}
                </button>
            </form>
        </div>
        </>
    );
};

export default ReportForm;
