const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'CityFix Backend API',
    description: 'API Documentation for CityFix Backend',
  },
  host: 'localhost:5000',
  schemes: ['http'],
  securityDefinitions: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
};

const outputFile = './swagger.json';
const endpointsFiles = ['./src/app.js'];

// Generate swagger.json
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    console.log('✅ Swagger documentation generated correctly at swagger.json!');
});
