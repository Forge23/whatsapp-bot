const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const { formState, handleFormResponse } = require('./components/formHandler');
const { 
    schedulingState, 
    handleSchedulingResponse, 
    handleNextSlot, 
    confirmAppointment 
} = require('./components/schedulingHandler');

const client = new Client({
    authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("Client is ready!");
});

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

        if (text === "s") {
            await confirmAppointment(msg);
            return;
        }

        if (text === "n") {
            await handleNextSlot(msg);
            return;
        }

        if (text === "1") {
            formState[chatId] = { step: 1, data: {} };
            msg.sendMessage("Por favor, proporciona tu nombre completo:");
        } 
        else if (text === "3") {
            schedulingState[chatId] = { step: 1 };
            msg.sendMessage("Por favor, proporciona tu folio:");
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
                msg.sendMessage(response);
            }, 3000);

        }
        else if (text === "2") {
            msg.sendMessage("🔗 [Conoce bloque](https://bloqueqro.mx)");
        }
        else if (text === "4") {
            msg.sendMessage("🔗 [Conoce el reglamento de eventos](https://drive.google.com/file/d/1UIsCc4zyDtkBia7Fun1IbdVRNcRDEa0u/view?usp=sharing)");
        }
        else if (text === "5") {
            msg.sendMessage("🔗 [Conocer los espacios que tenemos para ti](https://bloqueqro.mx/espacios/)");
        }
        else if (text === "6") {
            msg.sendMessage("🔗 [Ver todos los cursos disponibles](https://bloqueqro.mx/cursos)");
        }
        else if (text === "7") {
            msg.sendMessage("🔗 [si requieres ayuda marca al:](442 238 7700 ext: 1012)");
        }
        else {
            const defaultResponse = `🤖 No entiendo ese mensaje. Escribe *HOLA* para empezar o selecciona una opción válida.`;
            setTimeout(() => {
                msg.sendMessage(defaultResponse);
            }, 3000);
        }
    }
});

client.initialize();
