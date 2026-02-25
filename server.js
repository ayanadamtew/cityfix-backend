require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start listening
app.start().then(() => {
    app.listen(PORT, () => {
        console.log(`CityFix API running on port ${PORT}`);
    });
});
