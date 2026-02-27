require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/services/socketService');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

// Connect to MongoDB then start listening
app.start().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`CityFix API running on port ${PORT}`);
    });
});
