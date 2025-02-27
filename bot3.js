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
const pendingAppointments = {}; // Objeto para almacenar citas en espera


// Buscar el siguiente horario disponible
async function getNextAvailableSlot() {
    const now = new Date();
    now.setDate(now.getDate() + 1); // Buscar desde mañana
    now.setHours(9, 0, 0, 0); // Inicio de jornada

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

    for (let day = 0; day < 7; day++) {
        let checkDate = new Date(now);
        checkDate.setDate(now.getDate() + day);

        // Saltar sábados y domingos
        if (checkDate.getDay() === 6 || checkDate.getDay() === 0) continue;

        checkDate.setHours(9, 0, 0, 0);
        while (checkDate.getHours() < 16) { // Hasta las 4 PM
            const conflict = events.some(event => {
                const eventStart = new Date(event.start.dateTime);
                const eventEnd = new Date(event.end.dateTime);
                return checkDate >= eventStart && checkDate < eventEnd;
            });

            if (!conflict) {
                availableSlot = new Date(checkDate);
                return availableSlot;
            }
            checkDate.setHours(checkDate.getHours() + 1);
        }
    }

    return null;
}

// Crear evento en el calendario
async function createCalendarEvent(msg, email, companyName, date) {
    try {
        const event = {
            summary: `Pregira - ${companyName} - ${email}`,
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
        };

        const response = await calendar.events.insert({
            calendarId,
            resource: event,
        });

        msg.reply(`✅ Tu pregira ha sido agendada el ${date.toLocaleString()} \n📅 Link del evento: ${response.data.htmlLink}`);
        delete pendingAppointments[msg.from]; // Eliminar la reserva temporal
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
                pendingAppointments[msg.from] = availableSlot;
                msg.reply(`📆 La próxima disponibilidad es el ${availableSlot.toLocaleString()}.\nResponde con:\n\n✅ *Confirmar [correo] [nombre de empresa]*\n❌ *Siguiente* para intentar con otro horario`);
            } else {
                msg.reply("❌ No hay disponibilidad en la próxima semana.");
            }
        } 
        
        else if (text === "siguiente") {
            if (!pendingAppointments[msg.from]) {
                msg.reply("⚠️ No tienes una cita pendiente. Escribe *agendar pregira* para iniciar.");
                return;
            }

            let nextSlot = new Date(pendingAppointments[msg.from]);
            nextSlot.setHours(nextSlot.getHours() + 1);

            if (nextSlot.getHours() >= 16) {
                nextSlot.setDate(nextSlot.getDate() + 1);
                nextSlot.setHours(9, 0, 0, 0);
            }

            const response = await calendar.events.list({
                calendarId,
                timeMin: nextSlot.toISOString(),
                timeMax: new Date(nextSlot.getTime() + 25200000).toISOString(), // Buscar en 7 horas
                singleEvents: true,
                orderBy: "startTime",
            });

            const events = response.data.items;
            let foundSlot = null;

            while (nextSlot.getHours() < 16) {
                const conflict = events.some(event => {
                    const eventStart = new Date(event.start.dateTime);
                    const eventEnd = new Date(event.end.dateTime);
                    return nextSlot >= eventStart && nextSlot < eventEnd;
                });

                if (!conflict) {
                    foundSlot = new Date(nextSlot);
                    break;
                }
                nextSlot.setHours(nextSlot.getHours() + 1);
            }

            if (foundSlot) {
                pendingAppointments[msg.from] = foundSlot;
                msg.reply(`📆 La siguiente disponibilidad es el ${foundSlot.toLocaleString()}.\nResponde con:\n\n✅ *Confirmar [correo] [nombre de empresa]*\n❌ *Siguiente* para probar otra opción`);
            } else {
                msg.reply("❌ No hay más horarios disponibles en este día.");
            }
        }
        else if(text === "hola"){
            const response = `Hola, bienvenido al chat de información de bloque, se parte de nuestra comunidad al registrarte en (https://bloqueqro.mx/crear-cuenta/) .\n\n
            1️⃣ *[Quiero hacer un evento en BLOQUE](https://bloqueqro.mx/cotizacion/)*\n
            2️⃣ *[Conoce bloque](https://bloqueqro.mx)*\n
            3️⃣ *[Agenda una pregira por BLOQUE]\n
            4️⃣ *[Conoce el reglamento de eventos](https://drive.google.com/file/d/1UIsCc4zyDtkBia7Fun1IbdVRNcRDEa0u/view?usp=sharing)*\n
            5️⃣ *[Conocer los espacios que tenemos para ti](https://bloqueqro.mx/espacios/)*\n
            6️⃣ *[Ver todos los cursos disponibles](https://bloqueqro.mx/cursos)*`;

            setTimeout(() => {
                msg.reply(response);
            }, 3000);

        }

        else if (text === "eventos") {
            const eventResponse = `📅 *EVENTOS*\n\n
            a) *[Quiero hacer un evento en BLOQUE](https://bloqueqro.mx/cotizacion/)*\n
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
    
                if (!pendingAppointments[msg.from]) {
                    msg.reply("⚠️ No tienes una cita pendiente. Escribe *agendar pregira* para iniciar.");
                    return;
                }
    
                const confirmedSlot = pendingAppointments[msg.from];
                createCalendarEvent(msg, email, companyName, confirmedSlot);
            }
        }
});

client.initialize();
