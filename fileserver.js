const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 8083;

// Serve files from the "public" directory
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/public', (req, res) => {
    const publicFolderPath = path.join(__dirname, 'public');

    fs.readdir(publicFolderPath, (err, files) => {
        if (err) {
            console.error(`Error reading public folder: ${err}`);
            res.status(500).send('Error reading public folder');
            return;
        }

        const fileLinks = files
            .map((file) => `<a href="/public/${file}">${file}</a>`)
            .join('<br>');

        const html = `
            <html>
                <body>
                    <h1>Files in /public</h1>
                    ${fileLinks}
                </body>
            </html>
        `;

        res.send(html);
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
