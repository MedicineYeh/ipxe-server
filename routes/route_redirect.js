const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const router = express.Router();

async function isDirectory(path) {
    try {
        const stat = await fs.stat(path);
        return stat.isDirectory();
    } catch (err) {}
    return false;
}

// Match all routes containing media.1
router.get('/iso/*/media.1/*', async (req, res, next) => {
    if (req.info === undefined) return next();

    switch (req.info.distribution) {
        case 'sles':
        case 'sled':
        case 'suse':
        case 'opensuse':
            // Note that the req.params are unescapped strings
            const mntDir = path.join(MNT_DIR, req.params[0]);
            const media_dir = (await fs.readdir(mntDir)).filter(file => file.search(/^media\.\d$/g) >= 0)[0];
            // Do nothing if the media folder is media.1
            if (media_dir == 'media.1') {
                return next();
            } else {
                // Redirect to the real folder in other cases
                const media_uri = req.url.replace('/media.1/', `/${media_dir}/`);
                res.redirect(media_uri);
            }
            break;
        default:
            return next();
    }
});

module.exports = router;
