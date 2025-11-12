const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Simple health endpoint
app.get('/health', (req, res) => {
	res.status(200).send('OK');
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});
