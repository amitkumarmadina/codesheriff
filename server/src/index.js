require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const webhookRoutes = require('./routes/webhook');
const reviewRoutes = require('./routes/Review');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use('/webhook', express.raw({ type: '*/*' }));
app.use(express.json());

app.use('/', webhookRoutes);
app.use('/api', reviewRoutes);

connectDB()
    .then(() => {
        app.listen(port, () =>
            console.log(`Server running on port ${port}`)
        );
    })
    .catch((err) => {
        console.error('MongoDB connection failed:', err.message);
        process.exit(1);
    });
