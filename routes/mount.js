const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const querystring = require('querystring');

const serveIndex = require('./serve-dir');
const mountutil = require('./mountutils');

const router = express.Router();

router.get('*/*.iso*', async (req, res, next) => {
    const urlPath = req.params[0];
    const fileName = req.params[1] + '.iso';
    const iso = path.join(ISO_DIR, urlPath, fileName);
    const dir = path.join(MNT_DIR, urlPath, fileName);

    // (Try) mount first (The error is ignored if it's already mounted.)
    const options = {
        'createDir': true,
        'fstype': 'iso9660',
        'fsopts': 'loop',
    };
    if (req.query.remount == 'true') {
        await mountutil.umount(dir, false, options);
    }
    if (await mountutil.mount(iso, dir, options)) {
        next();
    } else {
        res.status(500).send(`Failed to mount target iso file: ${path.join('/iso', urlPath, fileName)} Please review server log.`);
    }
});

async function reclaim_loop() {
    await mountutil.reclaim();
    // Period of 60s
    setTimeout(reclaim_loop, 60 * 1000);
}
setTimeout(reclaim_loop, 1000);

module.exports = router;
