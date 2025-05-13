// server.js or app.js
const express = require('express');
// ... other imports (cors, bodyParser, etc.)

const medicineAlternativesRoutes = require('./routes/medicineAlternativesRoutes');
// ... other route imports

const app = express();

// ... middleware (app.use(cors()), app.use(express.json()))

// Mount the routes
app.use('/api/med-alt', medicineAlternativesRoutes); // All routes in medicineAlternativesRoutes will be prefixed with /api/med-alt
// ... mount other routes

const PORT = process.env.PORT || 3000; // Render sets PORT environment variable
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});