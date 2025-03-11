const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { google } = require("googleapis");
const fs = require("fs");
const axios = require('axios'); // Add axios for API calls
const { normalize } = require("path");

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
const formState = {}; // Object to store form states
const schedulingState = {}; // Object to store scheduling states
const globalFolio = {}; // Variable global para almacenar el folio


// Buscar el siguiente horario disponible
async function getNextAvailableSlot() {
    const now = new Date();
    now.setDate(now.getDate() + 1); // Buscar desde mañana
    now.setHours(9, 0, 0, 0); // Inicio de jornada

    let availableSlot = null;

    while (!availableSlot) {
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + 6); // Buscar en la próxima semana

        const response = await calendar.events.list({
            calendarId,
            timeMin: now.toISOString(),
            timeMax: endOfWeek.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
        });

        const events = response.data.items;

        for (let day = 0; day < 7; day++) {
            let checkDate = new Date(now);
            checkDate.setDate(now.getDate() + day);

            // Saltar jueves a domingo
            if (checkDate.getDay() < 1 || checkDate.getDay() > 3) continue;

            checkDate.setHours(9, 0, 0, 0);
            while (checkDate.getHours() < 12) { // Hasta las 12 PM
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

        // Si no se encontró disponibilidad, avanzar una semana
        now.setDate(now.getDate() + 7);
    }

    return null;
}

// Crear evento en el calendario
async function createCalendarEvent(msg, folio, date) {
    try {
        const response = await axios.get(`http://localhost:8089/ficha/buscar/${folio}`);
        const data = response.data;

        if (!data || !data.mail || !data.empresa) {
            throw new Error("Datos incompletos en la respuesta de la API");
        }

        const { mail: email, empresa: companyName } = data;

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

        await calendar.events.insert({
            calendarId,
            resource: event,
        });

        msg.reply(`✅ Tu pregira ha sido agendada el ${date.toLocaleString()}`);
        delete pendingAppointments[msg.from]; // Eliminar la reserva temporal
    } catch (error) {
        console.error("Error creando evento:", error);
        msg.reply("❌ Ocurrió un error al agendar tu recorrido. Intenta de nuevo.");
    }
}

client.on("message", async (msg) => {
    if (!msg.isGroup) {
        const text = msg.body.toLowerCase().trim();
        const chatId = msg.from;

        if (formState[chatId]) {
            handleFormResponse(msg, text);
            return;
        }

        if (schedulingState[chatId]) {
            handleSchedulingResponse(msg, text);
            return;
        }

        const confirmMatch = text.match(/^s$/i);
        if (confirmMatch) {
            const folio = globalFolio[chatId];

            if (!pendingAppointments[msg.from]) {
                msg.reply("⚠️ No tienes una cita pendiente. Escribe *3* para iniciar.");
                return;
            }

            const confirmedSlot = pendingAppointments[msg.from];
            createCalendarEvent(msg, folio, confirmedSlot);
            return; // Ensure no further processing
        }

        if (text === "1") {
            formState[chatId] = { step: 1, data: {} };
            msg.reply("Por favor, proporciona tu nombre completo:");
        } 
        else if (text === "3") {
            schedulingState[chatId] = { step: 1 };
            msg.reply("Por favor, proporciona tu folio para verificar el estado de tu solicitud:");
        } 
        
        else if (text === "n") {
            if (!pendingAppointments[msg.from]) {
                msg.reply("⚠️ No tienes una cita pendiente. Escribe *agendar pregira* para iniciar.");
                return;
            }

            let nextSlot = new Date(pendingAppointments[msg.from]);
            nextSlot.setHours(nextSlot.getHours() + 1);

            if (nextSlot.getHours() >= 12) {
                nextSlot.setDate(nextSlot.getDate() + 1);
                nextSlot.setHours(9, 0, 0, 0);
            }

            // Saltar jueves a domingo
            while (nextSlot.getDay() < 1 || nextSlot.getDay() > 3) {
                nextSlot.setDate(nextSlot.getDate() + 1);
                nextSlot.setHours(9, 0, 0, 0);
            }

            const response = await calendar.events.list({
                calendarId,
                timeMin: nextSlot.toISOString(),
                timeMax: new Date(nextSlot.getTime() + 10800000).toISOString(), // Buscar en 3 horas
                singleEvents: true,
                orderBy: "startTime",
            });

            const events = response.data.items;
            let foundSlot = null;

            while (nextSlot.getHours() < 12) {
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
                msg.reply(`📆 La siguiente disponibilidad es el ${foundSlot.toLocaleString()}.\nResponde con:\n\n✅ *S*\n❌ *n* para probar otra opción`);
            } else {
                // Si no hay más horarios disponibles en el día, buscar en el siguiente día hábil
                nextSlot.setDate(nextSlot.getDate() + 1);
                nextSlot.setHours(9, 0, 0, 0);

                // Saltar jueves a domingo
                while (nextSlot.getDay() < 1 || nextSlot.getDay() > 3) {
                    nextSlot.setDate(nextSlot.getDate() + 1);
                    nextSlot.setHours(9, 0, 0, 0);
                }

                const nextDayResponse = await calendar.events.list({
                    calendarId,
                    timeMin: nextSlot.toISOString(),
                    timeMax: new Date(nextSlot.getTime() + 10800000).toISOString(), // Buscar en 3 horas
                    singleEvents: true,
                    orderBy: "startTime",
                });

                const nextDayEvents = nextDayResponse.data.items;
                let nextDayFoundSlot = null;

                while (nextSlot.getHours() < 12) {
                    const nextDayConflict = nextDayEvents.some(event => {
                        const eventStart = new Date(event.start.dateTime);
                        const eventEnd = new Date(event.end.dateTime);
                        return nextSlot >= eventStart && nextSlot < eventEnd;
                    });

                    if (!nextDayConflict) {
                        nextDayFoundSlot = new Date(nextSlot);
                        break;
                    }
                    nextSlot.setHours(nextSlot.getHours() + 1);
                }

                if (nextDayFoundSlot) {
                    pendingAppointments[msg.from] = nextDayFoundSlot;
                    msg.reply(`📆 La siguiente disponibilidad es el ${nextDayFoundSlot.toLocaleString()}.\nResponde con:\n\n✅ *S*\n❌ *n* para probar otra opción`);
                } else {
                    msg.reply("❌ No hay más horarios disponibles en los próximos días. Intenta de nuevo mañana.");
                }
            }
        }
        else if(text === "hola"){
            console.log(text);
            const response = `Hola, bienvenido al chat de información de bloque, se parte de nuestra comunidad al registrarte en (https://bloqueqro.mx/crear-cuenta/) .\n\n
            1️⃣ *[Quiero hacer un evento en BLOQUE]*\n
            2️⃣ *[Conoce bloque](https://bloqueqro.mx)*\n
            3️⃣ *[Agenda una pregira por BLOQUE]*\n
            4️⃣ *[Conoce el reglamento de eventos](https://drive.google.com/file/d/1UIsCc4zyDtkBia7Fun1IbdVRNcRDEa0u/view?usp=sharing)*\n
            5️⃣ *[Conocer los espacios que tenemos para ti](https://bloqueqro.mx/espacios/)*\n
            6️⃣ *[Ver todos los cursos disponibles](https://bloqueqro.mx/cursos)* \n
            7️⃣ *[ayuda perosonalizada]*`;

            setTimeout(() => {
                msg.reply(response);
            }, 3000);

        }
        else if (text === "2") {
            msg.reply("🔗 [Conoce bloque](https://bloqueqro.mx)");
        }
        else if (text === "4") {
            msg.reply("🔗 [Conoce el reglamento de eventos](https://drive.google.com/file/d/1UIsCc4zyDtkBia7Fun1IbdVRNcRDEa0u/view?usp=sharing)");
        }
        else if (text === "5") {
            msg.reply("🔗 [Conocer los espacios que tenemos para ti](https://bloqueqro.mx/espacios/)");
        }
        else if (text === "6") {
            msg.reply("🔗 [Ver todos los cursos disponibles](https://bloqueqro.mx/cursos)");
        }
        else if (text === "7") {
            msg.reply("🔗 [si requieres ayuda marca al:](442 238 7700 ext: 1012)");
        }
        else {
            const defaultResponse = `🤖 No entiendo ese mensaje. Escribe *HOLA* para empezar o selecciona una opción válida.`;
            setTimeout(() => {
                msg.reply(defaultResponse);
            }, 3000);
        }
    }
});

async function handleSchedulingResponse(msg, text) {
    const chatId = msg.from;
    const state = schedulingState[chatId];

    if (state.step === 1) {
        const folio = text;
        const status = await checkStatus(folio);        
        if (status === null) {
            msg.reply("❌ No se encontró la solicitud con ese folio.");
            delete schedulingState[chatId];
        } else if (status.estatus === 1 && status.token === 0) {
            updateToken(folio);
            globalFolio[chatId] = folio; // Guardar el folio en la variable global
            msg.reply("🔍 Buscando disponibilidad...");
            const availableSlot = await getNextAvailableSlot();
            if (availableSlot) {
                pendingAppointments[chatId] = availableSlot;
                schedulingState[chatId].folio = folio;
                msg.reply(`📆 La próxima disponibilidad es el ${availableSlot.toLocaleString()}.\nResponde con:\n\n✅ *S*\n❌ *n* para intentar con otro horario`);
            } else {
                msg.reply("❌ No hay disponibilidad en la próxima semana.");
            }
            delete schedulingState[chatId];
        } else if (status.estatus === 0) {
            msg.reply("❌ Su solicitud no ha sido aceptada.");
            delete schedulingState[chatId];
        } else if (status.token === 1) {
            msg.reply("❌ Ya ha agendado una pregira con este folio.");
            delete schedulingState[chatId];
        }
    }
}

async function handleFormResponse(msg, text) {
    const chatId = msg.from;
    const state = formState[chatId];

    switch (state.step) {
        case 1:
            state.data.fullName = text;
            state.step++;
            msg.reply("Por favor, proporciona tu correo electrónico:");
            break;
        case 2:
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(text)) {
                msg.reply("❌ Correo electrónico no válido. Por favor, proporciona un correo electrónico válido:");
                return;
            }
            state.data.email = text;
            state.step++;
            msg.reply("Por favor, proporciona el nombre de tu empresa:");
            break;
        case 3:
            state.data.company = text;
            state.step++;
            msg.reply("Por favor, proporciona tu número de teléfono:");
            break;
        case 4:
            state.data.phone = text;
            state.step++;
            msg.reply("Por favor, proporciona el aforo del evento solo el número:");
            break;
        case 5:
            state.data.aforo = text;
            state.step++;
            msg.reply("Por favor, proporciona la fecha deseada para el evento (YYYY-MM-DD):");
            break;
        case 6:
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(text)) {
                msg.reply("❌ Formato de fecha no válido. Por favor, proporciona una fecha válida (YYYY-MM-DD):");
                return;
            }
            state.data.eventDate = text;
            state.data.folio = generateFolio(); // Generate folio
            await submitForm(state.data);
            msg.reply(`✅ Tu información ha sido registrada correctamente. Tu folio es: ${state.data.folio} para iniciar el proceso de agendamiento presione *3*, recuerde que solo puede agendar una vez con su folio.`);
            delete formState[chatId];
            break;
    }
}

function generateFolio() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let folio = '';
    for (let i = 0; i < 10; i++) {
        folio += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return folio;
}

async function submitForm(data) {
    const payload = {
        nombre: data.fullName,
        telefono: data.phone,
        mail: data.email,
        empresa: data.company,
        aforo: data.aforo,
        fecha: data.eventDate,
        folio: data.folio,
        estatus: 1
    };

    try {
        const response = await axios.post('http://localhost:8089/ficha', payload);
        console.log('Form submitted successfully:', response.data);
    } catch (error) {
        console.error('Error submitting form:', error);
    }
}

async function checkStatus(folio) {
    try {
        const response = await axios.get(`http://localhost:8089/ficha/buscar/${folio}`);
        if (response.data) {
            return { estatus: response.data.estatus, token: response.data.token, nombre: response.data.nombre, empresa: response.data.empresa, mail: response.data.mail };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error checking status:', error);
        return null;
    }
}

async function updateToken(folio) {
    try {
        await axios.put(`http://localhost:8089/ficha/token/${folio}`, {nuevoToken: 1});
    } catch (error) {
        console.error('Error updating token:', error);
    }
}

client.initialize();
