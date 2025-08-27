import { app } from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 3000;

// Only connect to DB and start server when this file is run directly
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Database connection error:', error);
        process.exit(1);
    });