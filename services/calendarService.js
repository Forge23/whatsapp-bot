const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/calendar"],
});

const calendar = google.calendar({ version: "v3", auth });
const calendarId = "0db2b3851de0802b3c7d7fe3a970808e67ddf6ad013d0fd6dc3924353fc726cd@group.calendar.google.com";

async function getNextAvailableSlot() {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    now.setHours(9, 0, 0, 0);

    let availableSlot = null;

    while (!availableSlot) {
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + 6);

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

            if (checkDate.getDay() < 1 || checkDate.getDay() > 3) continue;

            checkDate.setHours(9, 0, 0, 0);
            while (checkDate.getHours() < 12) {
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
        now.setDate(now.getDate() + 7);
    }
    return null;
}

async function createCalendarEvent(msg, folio, date, data) {
    const event = {
        summary: `Pregira - ${data.empresa} - ${data.mail}`,
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

    return calendar.events.insert({
        calendarId,
        resource: event,
    });
}

module.exports = {
    getNextAvailableSlot,
    createCalendarEvent
};
