require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const app = express();
const port = process.env.PORT || 4000;
app.use(cors()); app.use(express.json());
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
async function start() { if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error('MONGODB_URI and JWT_SECRET are required'); await mongoose.connect(process.env.MONGODB_URI); app.listen(port, () => console.log(`GeneAir API listening on port ${port}`)); }
if (require.main === module) start().catch((error) => { console.error(error.message); process.exit(1); });
module.exports = app;
