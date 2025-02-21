const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { google } = require("googleapis");
const fs = require("fs");

const client = new Client({
    authStrategy: new LocalAuth(),
});

const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/calendar"],
});

const calendar = google.calendar({ version: "v3", auth });
const calendarId = "TU_CALENDAR_ID";

async function getNextAvailableSlot() {
    const now = new Date();
    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + 7);

    const response = await calendar.events.list({
        calendarId,
        timeMin: now.toISOString(),
        timeMax: endOfWeek.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
    });

    const events = response.data.items;
    let availableSlot = null;
    let startHour = 9;
    let endHour = 18;

    for (let day = 0; day < 7; day++) {
        let checkDate = new Date();
        checkDate.setDate(now.getDate() + day);
        checkDate.setHours(startHour, 0, 0, 0);

        while (checkDate.getHours() < endHour) {
            const conflict = events.some(event => {
                const eventStart = new Date(event.start.dateTime);
                const eventEnd = new Date(event.end.dateTime);
                return checkDate >= eventStart && checkDate < eventEnd;
            });

            if (!conflict) {
                availableSlot = new Date(checkDate);
                break;
            }
            checkDate.setHours(checkDate.getHours() + 1);
        }
        if (availableSlot) break;
    }

    return availableSlot;
}

async function createCalendarEvent(msg, email, companyName, date) {
    try {
        const event = {
            summary: `Recorrido - ${companyName}`,
            location: "BLOQUE Centro de Innovación",
            description: "Recorrido guiado por las instalaciones de BLOQUE.",
            start: {
                dateTime: date.toISOString(),
                timeZone: "America/Mexico_City",
            },
            end: {
                dateTime: new Date(date.getTime() + 3600000).toISOString(),
                timeZone: "America/Mexico_City",
            },
            attendees: [{ email }],
        };

        const response = await calendar.events.insert({
            calendarId,
            resource: event,
        });

        msg.reply(`✅ Tu recorrido ha sido agendado el ${date.toLocaleString()} \n📅 Link del evento: ${response.data.htmlLink}`);
    } catch (error) {
        console.error("Error creando evento:", error);
        msg.reply("❌ Ocurrió un error al agendar tu recorrido. Intenta de nuevo.");
    }
}

client.on("message", async (msg) => {
    if (!msg.isGroup) {
        const text = msg.body.toLowerCase().trim();
        
        if (text === "agendar recorrido") {
            msg.reply("🔍 Buscando disponibilidad...");
            const availableSlot = await getNextAvailableSlot();
            if (availableSlot) {
                msg.reply(`📆 La próxima disponibilidad es el ${availableSlot.toLocaleString()}. Responde con: \n\n*Confirmar [correo] [nombre de empresa]*`);
            } else {
                msg.reply("❌ No hay disponibilidad en la próxima semana.");
            }
        }

        const confirmMatch = text.match(/^confirmar (\S+) (.+)$/);
        if (confirmMatch) {
            const email = confirmMatch[1];
            const companyName = confirmMatch[2];
            const availableSlot = await getNextAvailableSlot();
            if (availableSlot) {
                createCalendarEvent(msg, email, companyName, availableSlot);
            } else {
                msg.reply("❌ Lo siento, el horario ya no está disponible.");
            }
        }
    }
});

client.initialize();
