const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
    authStrategy: new LocalAuth(), // Guarda sesión para no escanear QR siempre
});

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

        // Si el usuario escribe "hola"
        if (text === "hola") {
            const response = `¿En qué podemos ayudarte? Solo necesitas seleccionar una de las opciones que aparecen a continuación.\n\n
            1️⃣ *Eventos*\n
            2️⃣ *Cursos*\n
            3️⃣ *Recorridos*\n`;

            setTimeout(() => {
                msg.reply(response);
            }, 3000);
        }

        // Si el usuario elige "Eventos"
        else if (text === "eventos") {
            const eventResponse = `📅 *EVENTOS*\n\n
            a) *[Quiero hacer un evento en BLOQUE](https://link-a-solicitud-evento.com)*\n
               - *[Conocer los espacios que tenemos para ti](https://bloqueqro.mx/espacios/)*\n
               - *[Conoce el reglamento de eventos](https://drive.google.com/file/d/1UIsCc4zyDtkBia7Fun1IbdVRNcRDEa0u/view?usp=sharing)*\n`;

            setTimeout(() => {
                msg.reply(eventResponse);
            }, 3000);
        }

        // Si el usuario elige "Cursos"
        else if (text === "cursos") {
            const courseResponse = `📚 *CURSOS*\n\n
            🔹 *[Ver todos los cursos disponibles](https://bloqueqro.mx)*\n
            🔹 *[Inscribirme en un curso](https://bloqueqro.mx/cursos/)*\n `;

            setTimeout(() => {
                msg.reply(courseResponse);
            }, 3000);
        }

        // Si el usuario elige "Recorridos"
        else if (text === "recorridos") {
            const tourResponse = `🚶‍♂️ *RECORRIDOS*\n\n
            📍 *[Agenda un recorrido por BLOQUE](https://link-a-agendar-recorrido.com)*\n
            🏛 *[Ver el recorrido virtual](https://link-a-recorrido-virtual.com)*\n
            ❓ *[Más información sobre los recorridos](https://link-a-info-recorridos.com)*\n`;

            setTimeout(() => {
                msg.reply(tourResponse);
            }, 3000);
        }

        // Si el usuario quiere hablar con un asesor
        else if (text === "hablar con un asesor") {
            const advisorResponse = `👨‍💻 *Hablar con un asesor:*\n\n
            En este momento nos encontramos fuera del horario de atención.\n
            Los horarios de servicio en BLOQUE Centro de Innovación y Tecnología Creativa son los siguientes:\n
            🕒 *Horario de oficina:* 9:00 Hrs - 15:00 Hrs.\n\n
            Recuerda que puedes visitar nuestra página donde encontrarás todos los cursos, eventos y actividades que BLOQUE ofrece para ti.\n
            🌐 [Visitar plataforma](https://bloqueqro.mx)`;

            setTimeout(() => {
                msg.reply(advisorResponse);
            }, 3000);
        }

        // Respuesta por defecto si el mensaje no coincide
        else {
            const defaultResponse = `🤖 No entiendo ese mensaje. Escribe *HOLA* para empezar o selecciona una opción válida.`;
            setTimeout(() => {
                msg.reply(defaultResponse);
            }, 3000);
        }
    }
});

client.initialize();
