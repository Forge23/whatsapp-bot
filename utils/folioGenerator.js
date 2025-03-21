function generateFolio() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${timestamp.slice(-6)}${random}`;
}

module.exports = {
    generateFolio
};
