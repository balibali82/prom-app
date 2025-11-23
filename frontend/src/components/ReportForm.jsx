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
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg my-10">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Prom 인수시험성적서 간편등록</h2>

            {status.message && (
                <div className={`mb-4 p-4 rounded-lg flex items-center ${status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {status.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
                    {status.message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">사번 (숫자 7자리)</label>
                        <input
                            type="text"
                            name="employeeId"
                            value={formData.employeeId}
                            onChange={handleChange}
                            pattern="\d{7}"
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="1234567"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="홍길동"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prom 접수번호 (숫자 6자리 이상)</label>
                    <input
                        type="text"
                        name="promReceiptNo"
                        value={formData.promReceiptNo}
                        onChange={handleChange}
                        pattern="\d{6,}"
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="123456"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ONU IP</label>
                        <input
                            type="text"
                            name="onuIp"
                            value={formData.onuIp}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="192.168.1.1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">광 DB</label>
                        <input
                            type="text"
                            name="opticalDb"
                            value={formData.opticalDb}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="-20.5"
                        />
                    </div>
                </div>



                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">설치 위치</label>
                    <input
                        type="text"
                        name="installLocation"
                        value={formData.installLocation}
                        onChange={handleChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="거실"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">차단기 위치</label>
                    <input
                        type="text"
                        name="breakerLocation"
                        value={formData.breakerLocation}
                        onChange={handleChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="현관"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">출입 절차</label>
                    <input
                        type="text"
                        name="accessProcedure"
                        value={formData.accessProcedure}
                        onChange={handleChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="비밀번호 / 호출"
                    />
                </div>

                {/* Detected Barcodes Section */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <ScanLine className="w-4 h-4 mr-2" />
                        인식된 바코드
                    </h3>
                    {ocrResults.length === 0 && !ocrLoading && (
                        <p className="text-xs text-gray-500">사진을 업로드하면 여기에 바코드 정보가 표시됩니다.</p>
                    )}
                    {ocrLoading && <p className="text-xs text-blue-500 animate-pulse">바코드 분석 중...</p>}

                    <ul className="space-y-1 mt-2">
                        {ocrResults.map((res, idx) => (
                            res && (
                                <li key={idx} className={`text-xs px-2 py-1 rounded flex justify-between ${res.type === '샤시' ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-gray-200 text-gray-700'}`}>
                                    <span>{res.type}</span>
                                    <span>{res.number}</span>
                                </li>
                            )
                        ))}
                    </ul>

                    {!hasChassis && images.length > 0 && !ocrLoading && (
                        <p className="text-xs text-red-500 mt-2 font-bold">* 샤시 바코드가 포함된 사진이 필요합니다.</p>
                    )}
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition cursor-pointer relative">
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        disabled={images.length >= 8}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex flex-col items-center text-gray-500">
                        <Upload className="w-12 h-12 mb-2" />
                        <p>{images.length >= 8 ? "최대 8장까지 업로드 가능" : "사진 업로드 (클릭)"}</p>
                        <p className="text-xs text-gray-400">({images.length}/8 장)</p>
                    </div>
                </div>

                {previewUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {previewUrls.map((url, index) => (
                            <div key={index} className="relative group">
                                <img src={url} alt={`Preview ${index}`} className="w-full h-24 object-cover rounded-lg shadow-sm" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-[10px] p-1 truncate text-center">
                                    {ocrResults[index] ? `${ocrResults[index].type}: ${ocrResults[index].number.slice(-6)}` : '인식 실패'}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !hasChassis}
                    className={`w-full py-3 px-4 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition ${(loading || !hasChassis) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                        }`}
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Send />}
                    {loading ? '전송 중...' : '성적서 등록'}
                </button>
            </form>
        </div>
    );
};

export default ReportForm;
