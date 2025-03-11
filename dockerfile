# Usamos Node.js
FROM node:20.17

# Instala las dependencias necesarias para Puppeteer y Chromium
RUN apt-get update && \
    apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Definimos el directorio de trabajo
WORKDIR /app

# Copiamos archivos y las dependencias
COPY package.json package-lock.json ./
COPY credentials.json /app/credentials.json
RUN npm install puppeteer
RUN npm install

# Copiamos el código del bot
COPY . .

# Exponemos el puerto si el bot lo necesita
EXPOSE 3000

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_DISABLE_SANDBOX=true


# Crear un usuario no root y cambiar permisos
RUN useradd --no-create-home puppeteer \
    && mkdir -p /app/.wwebjs_auth/session \
    && chown -R puppeteer:puppeteer /app

# Cambiar a usuario no root
USER puppeteer

# Comando para ejecutar el bot
CMD ["node", "bot3.js"]