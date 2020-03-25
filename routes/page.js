const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const router = express.Router();
const querystring = require('querystring');

const serveIndex = require('./serve-dir');

// Return ISO file lists or mounted directory file list
async function isDirectory(path) {
    try {
        const stat = await fs.stat(path);
        return stat.isDirectory();
    } catch (err) {}
    return false;
}

router.post('/iso/*', (req, res, next) => {
    if (path.dirname(req.url).search(/\/.*\.iso/g) >= 0) {
        res.writeHead(405);
        return res.end('HTTP Error 405 Method Not Allowed under mounted ISO file');
    } else {
        req.url = req.url.replace(/^\/mount/g, '/iso');
    }
    return next();
});

router.use('/iso', async (req, res, next) => {
    // Unscape is required for special characters and "spaces".
    const url = path.normalize(querystring.unescape(req.url)).replace(/\/$/g, '');
    const mnt_path = path.join(MNT_DIR, url);

    // Serve file list or static file if the URL route contains .iso file
    if (url.search(/\/.*\.iso$/g) >= 0 || url.search(/\/.*\.iso\//g) >= 0) {
        if (await isDirectory(mnt_path)) {
            return serveIndex(MNT_DIR, {
                view: 'details',
                icons: true,
                keepPrevDir: true,
            })(req, res, next);
        } else {
            return express.static(MNT_DIR, {
                dotfiles: 'allow'
            })(req, res, next);
        }
    }
    return next();
});


// Lastly, if nothing matches, serve as normal HTTP file server
router.use('/', express.static(PUBLIC_DIR)); // Serve static files
router.use('/', serveIndex(PUBLIC_DIR, {
    view: 'details',
    icons: true
})); // Serve as file browser


module.exports = router;
