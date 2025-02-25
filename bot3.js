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
const calendarId = "0db2b3851de0802b3c7d7fe3a970808e67ddf6ad013d0fd6dc3924353fc726cd@group.calendar.google.com";

async function getNextAvailableSlot() {
    const now = new Date();
    now.setDate(now.getDate() + 1); // Comenzar desde mañana
    now.setHours(9, 0, 0, 0); // Hora de inicio de jornada
    
    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + 6); // Buscar en la próxima semana
    
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
        let checkDate = new Date(now);
        checkDate.setDate(now.getDate() + day);
        
        // Verificar si el día es sábado (6) o domingo (0)
        if (checkDate.getDay() === 6 || checkDate.getDay() === 0) {
            continue; // Saltar sábados y domingos
        }
        
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
            summary: `Pregira - ${companyName}`,
            location: "BLOQUE Centro de Innovación",
            description: "Pregira guiada por las instalaciones de BLOQUE.",
            start: {
                dateTime: date.toISOString(),
                timeZone: "America/Mexico_City",
            },
            end: {
                dateTime: new Date(date.getTime() + 3600000).toISOString(),
                timeZone: "America/Mexico_City",
            },
            //attendees: [{ email }],
        };

        const response = await calendar.events.insert({
            calendarId,
            resource: event,
        });

        msg.reply(`✅ Tu pregira ha sido agendado el ${date.toLocaleString()} \n📅 Link del evento: ${response.data.htmlLink}`);
    } catch (error) {
        console.error("Error creando evento:", error);
        msg.reply("❌ Ocurrió un error al agendar tu recorrido. Intenta de nuevo.");
    }
}

client.on("message", async (msg) => {
    if (!msg.isGroup) {
        const text = msg.body.toLowerCase().trim();
        
        if (text === "agendar pregira") {
            msg.reply("🔍 Buscando disponibilidad...");
            const availableSlot = await getNextAvailableSlot();
            if (availableSlot) {
                msg.reply(`📆 La próxima disponibilidad es el ${availableSlot.toLocaleString()}. Responde con: \n\n*Confirmar [correo] [nombre de empresa]*`);
            } else {
                msg.reply("❌ No hay disponibilidad en la próxima semana.");
            }
        }

        else if(text === "hola"){
            const response = `¿En qué podemos ayudarte? Solo necesitas seleccionar una de las opciones que aparecen a continuación.\n\n
            1️⃣ *Eventos*\n
            2️⃣ *Cursos*\n
            3️⃣ *Pregiras*\n`;

            setTimeout(() => {
                msg.reply(response);
            }, 3000);

        }

        else if (text === "eventos") {
            const eventResponse = `📅 *EVENTOS*\n\n
            a) *[Quiero hacer un evento en BLOQUE](https://link-a-solicitud-evento.com)*\n
               - *[Conocer los espacios que tenemos para ti](https://bloqueqro.mx/espacios/)*\n
               - *[Conoce el reglamento de eventos](https://drive.google.com/file/d/1UIsCc4zyDtkBia7Fun1IbdVRNcRDEa0u/view?usp=sharing)*\n`;

            setTimeout(() => {
                msg.reply(eventResponse);
            }, 3000);
        }

        else if (text === "cursos") {
            const courseResponse = `📚 *CURSOS*\n\n
            🔹 *[Ver todos los cursos disponibles](https://bloqueqro.mx)*\n
            🔹 *[Inscribirme en un curso](https://bloqueqro.mx/cursos/)*\n `;

            setTimeout(() => {
                msg.reply(courseResponse);
            }, 3000);
        }

        else if (text === "pregiras") {
            const tourResponse = `🚶‍♂️ *PREGIRAS*\n\n
            📍 *[Agenda una pregira por BLOQUE] escribe "agendar pregira"\n`;

            setTimeout(() => {
                msg.reply(tourResponse);
            }, 3000);
        }
        /*else if (text === "hablar con un asesor") {
            const advisorResponse = `👨‍💻 *Hablar con un asesor:*\n\n
            En este momento nos encontramos fuera del horario de atención.\n
            Los horarios de servicio en BLOQUE Centro de Innovación y Tecnología Creativa son los siguientes:\n
            🕒 *Horario de oficina:* 9:00 Hrs - 15:00 Hrs.\n\n
            Recuerda que puedes visitar nuestra página donde encontrarás todos los cursos, eventos y actividades que BLOQUE ofrece para ti.\n
            🌐 [Visitar plataforma](https://link-a-la-plataforma.com)`;

            setTimeout(() => {
                msg.reply(advisorResponse);
            }, 3000);
        }*/

        else if(text === "transporte"){
            const response = `¿En qué podemos ayudarte? Solo necesitas seleccionar una de las opciones que aparecen a continuación.\n\n
            1️⃣ *Eventos*\n
            2️⃣ *Cursos*\n
            3️⃣ *Recorridos*\n`;

            setTimeout(() => {
                msg.reply(response);
            }, 3000);

        }

        /*else {
            const defaultResponse = `🤖 No entiendo ese mensaje. Escribe *HOLA* para empezar o selecciona una opción válida.`;
            setTimeout(() => {
                msg.reply(defaultResponse);
            }, 3000);
        }*/



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
