const http = require('http');
const replaceStream = require('replacestream');
const express = require('express');
const router = express.Router();
const uniqid = require('uniqid');
const axios = require('axios');

let serialID = 0;

router.get('/parse/boot.cfg', async (req, res) => {
    const query = {
        'root': req.query.root ? encodeURI(req.query.root) : '',
        'ks': req.query.ks ? encodeURI(req.query.ks) : '',
        'args': req.query.args ? req.query.args : '',
    };

    if (query.root === undefined || !query.root.startsWith('http://')) {
        res.send('Missing GET parameter "root" or "root" does not start with "http://"');
    } else {
        console.log(`Generating config with root=${query.root}, ks=${query.ks} and args=${query.args}`);
        const kernelopt = (query.ks) ? `ks=${query.ks} ${query.args}` : query.args;
        // Alter the host name to self
        const alt_url = new URL(query.root);
        alt_url.hostname = '127.0.0.1';
        alt_url.port = (process.env.PORT || '3000');

        // File HTTP get requests
        const [r1, r2] = await Promise.allSettled([
            axios.get(query.root + '/boot.cfg', {timeout: 3000}),
            axios.get(alt_url.href + '/boot.cfg', {timeout: 3000})
        ]);
        const response = (r1.status == 'fulfilled') ? r1.value : r2.value;
        // Note that we assume timeout means under port forwarding from unknown gateway
        if (r1.status == 'rejected') {
            console.log(`Accessing '${query.root}' rejected: ${r1.reason}`);
            if (r1.reason.response && r1.reason.response.status == 404) {
                res.type('text/plain; charset=utf-8')
                    .status(404)
                    .send(`Error when querying ${query.root}/boot.cfg\n` +
                          `Error message:\n${r1.reason.response.statusText}`);
                return;
            }
            if (r2.status == 'rejected') {
                res.type('text/plain; charset=utf-8')
                    .status(404)
                    .send(`Error when querying ${query.root}/boot.cfg\n` +
                          `Error message:\n${r2.reason.response.statusText}`);
                return;
            }
        }
        // Patch strings
        const text = response.data
            .replace(/\//g, '')                                // Remove all slashes
            .replace('prefix=', `prefix=${query.root}`)        // Append prefix
            .replace('cdromBoot', '')                          // Remove unused kernelopt
            .replace('kernelopt=', `kernelopt=${kernelopt} `); // Append kernelopt

        // Reply
        if (response.status == 200 || response.status == 302 || response.status == 304) {
            res.type('text/plain; charset=utf-8').send(text);
        } else {
            res.type('text/plain; charset=utf-8')
                .status(404)
                .send(`Error when querying ${query.root}/boot.cfg\n` +
                      `Error message:\n${response.statusText}`);
        }
    }
});

router.get('/getID', (req, res) => {
    serialID += 1;
    res.setHeader('content-type', 'text/plain');
    res.send(serialID.toString());
});

router.get('/getUniqueID', (req, res) => {
    const query = req.query;

    res.setHeader('content-type', 'text/plain');
    if (query.short !== undefined) {
        res.send(uniqid.time());
    } else {
        res.send(uniqid());
    }
});

module.exports = router;
