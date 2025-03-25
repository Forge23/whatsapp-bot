const { checkStatus } = require('../services/apiService');
const { getNextAvailableSlot, createCalendarEvent } = require('../services/calendarService');

const schedulingState = {};
const pendingAppointments = {};
const globalFolio = {};

async function handleSchedulingResponse(msg, text) {
    const chatId = msg.from;
    const currentState = schedulingState[chatId];

    if (!currentState) return false;

    switch (currentState.step) {
        case 1:
            try {
                const data = await checkStatus(text);
                if (!data) {
                    msg.reply("❌ Folio no encontrado. Por favor, verifica e intenta de nuevo:");
                    return true;
                }

                globalFolio[chatId] = text;
                const nextSlot = await getNextAvailableSlot();
                
                if (nextSlot) {
                    pendingAppointments[chatId] = nextSlot;
                    msg.reply(
                        `Horario disponible: ${nextSlot.toLocaleString()}\n` +
                        "¿Te gustaría agendar este horario?\n" +
                        "Responde *s* para confirmar o *n* para ver el siguiente horario disponible."
                    );
                } else {
                    msg.reply("❌ No hay horarios disponibles en este momento.");
                }
                
                delete schedulingState[chatId];
            } catch (error) {
                msg.reply("❌ Error al verificar el folio. Por favor, intenta de nuevo.");
            }
            break;
    }
    return true;
}

async function handleNextSlot(msg) {
    const chatId = msg.from;
    if (!pendingAppointments[chatId]) {
        msg.reply("⚠️ No tienes una cita pendiente. Escribe *3* para iniciar.");
        return;
    }

    let nextSlot = new Date(pendingAppointments[chatId]);
    nextSlot.setHours(nextSlot.getHours() + 1);

    if (nextSlot.getHours() >= 12) {
        nextSlot.setDate(nextSlot.getDate() + 1);
        nextSlot.setHours(9, 0, 0, 0);
    }

    while (nextSlot.getDay() < 1 || nextSlot.getDay() > 3) {
        nextSlot.setDate(nextSlot.getDate() + 1);
        nextSlot.setHours(9, 0, 0, 0);
    }

    const availableSlot = await getNextAvailableSlot();
    
    if (availableSlot) {
        pendingAppointments[chatId] = availableSlot;
        msg.reply(
            `Siguiente horario disponible: ${availableSlot.toLocaleString()}\n` +
            "¿Te gustaría agendar este horario?\n" +
            "Responde *s* para confirmar o *n* para ver el siguiente horario disponible."
        );
    } else {
        msg.reply("❌ No hay más horarios disponibles.");
    }
}

async function confirmAppointment(msg) {
    const chatId = msg.from;
    const folio = globalFolio[chatId];

    if (!pendingAppointments[chatId]) {
        msg.reply("⚠️ No tienes una cita pendiente. Escribe *3* para iniciar.");
        return;
    }

    try {
        const data = await checkStatus(folio);
        const confirmedSlot = pendingAppointments[chatId];
        await createCalendarEvent(msg, folio, confirmedSlot, data);
        msg.reply(`✅ Tu pregira ha sido agendada el ${confirmedSlot.toLocaleString()} \n dirección: https://maps.app.goo.gl/EJsdeEDLNEpw2jfx9`);
        delete pendingAppointments[chatId];
    } catch (error) {
        console.error("Error al confirmar la cita:", error);
        msg.reply("❌ Ocurrió un error al agendar tu recorrido. Intenta de nuevo.");
    }
}

module.exports = {
    schedulingState,
    pendingAppointments,
    globalFolio,
    handleSchedulingResponse,
    handleNextSlot,
    confirmAppointment
};
