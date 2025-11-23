import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api',
    // Content-Type is set automatically for FormData
});

export const submitReport = (formData) => {
    return api.post('/report', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export const performOcr = (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post('/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export default api;
