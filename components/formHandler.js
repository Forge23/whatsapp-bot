const { submitForm } = require('../services/apiService');
const { generateFolio } = require('../utils/folioGenerator');

const formState = {};

async function handleFormResponse(msg, text) {
    const chatId = msg.from;
    const currentState = formState[chatId];

    if (!currentState) return false;

    switch (currentState.step) {
        case 1:
            currentState.data.nombre = text;
            currentState.step = 2;
            msg.reply("Por favor, proporciona tu correo electrónico:");
            break;

        case 2:
            if (!text.includes('@')) {
                msg.reply("❌ Por favor, proporciona un correo electrónico válido:");
                return true;
            }
            currentState.data.mail = text;
            currentState.step = 3;
            msg.reply("Por favor, proporciona el nombre de tu empresa:");
            break;

        case 3:
            currentState.data.empresa = text;
            currentState.step = 4;
            msg.reply("Por favor, proporciona tu número de teléfono:");
            break;

        case 4:
            currentState.data.telefono = text;
            const folio = generateFolio();
            currentState.data.folio = folio;
            
            try {
                await submitForm(currentState.data);
                msg.reply(`✅ Formulario enviado correctamente.\nTu folio es: *${folio}*\nGuárdalo para agendar tu pregira más tarde.`);
            } catch (error) {
                msg.reply("❌ Hubo un error al enviar el formulario. Por favor, intenta de nuevo.");
            }
            
            delete formState[chatId];
            break;
    }
    return true;
}

module.exports = {
    formState,
    handleFormResponse
};
