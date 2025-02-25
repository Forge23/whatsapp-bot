const { Client, LocalAuth, Buttons } = require("whatsapp-web.js");
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

client.on("message", async (msg) => {
    if (!msg.isGroup) {
        const text = msg.body.toLowerCase().trim();

        if (text === "hola") {
            const buttonMessage = new Buttons(
                "¿En qué podemos ayudarte? Selecciona una opción:",
                [{ body: "Eventos" }, { body: "Cursos" }, { body: "Recorridos" }],
                "Bienvenido a BLOQUE",
                "Selecciona una opción"
            );
            client.sendMessage(msg.from, buttonMessage);
        }

        if (text === "eventos") {
            const buttonMessage = new Buttons(
                "📅 *EVENTOS*\n\nSelecciona una opción:",
                [
                    { body: "Quiero hacer un evento" },
                    { body: "Espacios disponibles" },
                    { body: "Reglamento de eventos" }
                ],
                "Información de Eventos",
                "Selecciona una opción"
            );
            client.sendMessage(msg.from, buttonMessage);
        }

        if (text === "cursos") {
            const buttonMessage = new Buttons(
                "📚 *CURSOS*\n\nSelecciona una opción:",
                [
                    { body: "Ver cursos disponibles" },
                    { body: "Inscribirme en un curso" }
                ],
                "Información de Cursos",
                "Selecciona una opción"
            );
            client.sendMessage(msg.from, buttonMessage);
        }

        if (text === "recorridos") {
            const buttonMessage = new Buttons(
                "🚶‍♂️ *RECORRIDOS*\n\nSelecciona una opción:",
                [{ body: "Agendar recorrido" }],
                "Información de Recorridos",
                "Selecciona una opción"
            );
            client.sendMessage(msg.from, buttonMessage);
        }
    }
});

client.initialize();
