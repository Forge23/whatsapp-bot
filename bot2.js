const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { google } = require("googleapis");
const fs = require("fs");

const client = new Client({
    authStrategy: new LocalAuth(), // Guarda sesión para no escanear QR siempre
});

// Configurar autenticación con Google Calendar
const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json", // Asegúrate de tener este archivo en la raíz del proyecto
    scopes: ["https://www.googleapis.com/auth/calendar"],
});

const calendar = google.calendar({ version: "v3", auth });

async function createCalendarEvent(msg) {
    try {
        const authClient = await auth.getClient();
        const calendarId = "0db2b3851de0802b3c7d7fe3a970808e67ddf6ad013d0fd6dc3924353fc726cd@group.calendar.google.com"; // Reemplaza con tu ID de calendario

        // Generar evento sin "attendees" para evitar errores
        const event = {
            summary: "Recorrido por BLOQUE",
            location: "BLOQUE Centro de Innovación",
            description: "Recorrido guiado por las instalaciones de BLOQUE.",
            start: {
                dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hora después del mensaje
                timeZone: "America/Mexico_City",
            },
            end: {
                dateTime: new Date(Date.now() + 7200000).toISOString(), // 2 horas después del mensaje
                timeZone: "America/Mexico_City",
            }
        };        

        // Intentar agregar attendee si es un email válido
        /*
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const userEmail = msg.from.includes("@") ? msg.from : null;

        if (userEmail && emailRegex.test(userEmail)) {
            event.attendees = [{ email: userEmail }];
        }*/

        const response = await calendar.events.insert({
            auth: authClient,
            calendarId,
            resource: event,
        });

        msg.reply(`✅ Tu recorrido ha sido agendado. Aquí está el enlace a tu evento en Google Calendar: ${response.data.htmlLink}`);
    } catch (error) {
        console.error("Error creando evento:", error);
        msg.reply("❌ Ocurrió un error al agendar tu recorrido. Intenta de nuevo.");
    }
}


client.on("qr", (qr) => {
    console.log("Escanea este código QR para conectar tu bot:");
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("✅ Bot de WhatsApp conectado y listo!");
});

client.on("message", async (msg) => {
    if (!msg.isGroup) {
        const text = msg.body.toLowerCase().trim();

        if (text === "hola") {
            const response = `¿En qué podemos ayudarte? Solo necesitas seleccionar una de las opciones que aparecen a continuación.\n\n
            1️⃣ *Eventos*\n
            2️⃣ *Cursos*\n
            3️⃣ *Recorridos*\n`;

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

        else if (text === "recorridos") {
            const tourResponse = `🚶‍♂️ *RECORRIDOS*\n\n
            📍 *[Agenda un recorrido por BLOQUE](https://link-a-agendar-recorrido.com)* o escribe "agendar recorrido"\n
            🏛 *[Ver el recorrido virtual](https://link-a-recorrido-virtual.com)*\n
            ❓ *[Más información sobre los recorridos](https://link-a-info-recorridos.com)*\n`;

            setTimeout(() => {
                msg.reply(tourResponse);
            }, 3000);
        }

        else if (text === "agendar recorrido") {
            msg.reply("📆 Agendando tu recorrido, un momento...");
            createCalendarEvent(msg);
        }

        else if (text === "hablar con un asesor") {
            const advisorResponse = `👨‍💻 *Hablar con un asesor:*\n\n
            En este momento nos encontramos fuera del horario de atención.\n
            Los horarios de servicio en BLOQUE Centro de Innovación y Tecnología Creativa son los siguientes:\n
            🕒 *Horario de oficina:* 9:00 Hrs - 15:00 Hrs.\n\n
            Recuerda que puedes visitar nuestra página donde encontrarás todos los cursos, eventos y actividades que BLOQUE ofrece para ti.\n
            🌐 [Visitar plataforma](https://link-a-la-plataforma.com)`;

            setTimeout(() => {
                msg.reply(advisorResponse);
            }, 3000);
        }

        else {
            const defaultResponse = `🤖 No entiendo ese mensaje. Escribe *HOLA* para empezar o selecciona una opción válida.`;
            setTimeout(() => {
                msg.reply(defaultResponse);
            }, 3000);
        }
    }
});

client.initialize();
