const axios = require('axios');

async function checkStatus(folio) {
    try {
        const response = await axios.get(`http://localhost:8089/ficha/buscar/${folio}`);
        return response.data;
    } catch (error) {
        console.error("Error checking status:", error);
        return null;
    }
}

async function submitForm(data) {
    try {
        const response = await axios.post('http://localhost:8089/ficha/crear', data);
        return response.data;
    } catch (error) {
        console.error("Error submitting form:", error);
        return null;
    }
}

async function updateToken(folio) {
    try {
        await axios.put(`http://localhost:8089/ficha/token/${folio}`);
        return true;
    } catch (error) {
        console.error("Error updating token:", error);
        return false;
    }
}

module.exports = {
    checkStatus,
    submitForm,
    updateToken
};
