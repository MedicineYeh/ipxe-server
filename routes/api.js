const http = require('http');
const replaceStream = require('replacestream');
const express = require('express');
const router = express.Router();
const uniqid = require('uniqid');

let serialID = 0;

// Download file to stream
function download(url, stream_cb, cb) {
    const request = http.get(url, (response) => {
        // check if response is success
        if (response.statusCode !== 200) {
            return cb('Response status was ' + response.statusCode);
        }
        stream_cb(response);
    });

    // check for request error too
    request.on('error', (err) => {
        return cb(err.message);
    });
}

router.get('/parse/boot.cfg', (req, res) => {
    const query = {
        'root': req.query.root ? req.query.root : '',
        'ks': req.query.ks ? req.query.ks : '',
        'args': req.query.args ? req.query.args : '',
    };

    if (query.root === undefined || !query.root.startsWith('http://')) {
        res.send('Missing GET parameter "root" or "root" does not start with "http://"');
    } else {
        console.log(`Generating config with root=${query.root}, ks=${query.ks} and args=${query.args}`);
        const kernelopt = (query.ks) ? `ks=${query.ks} ${query.args}` : query.args;
        download(query.root + '/boot.cfg',
            (res_stream) => {
                res_stream
                    .pipe(replaceStream('=/', '='))
                    .pipe(replaceStream(' /', ' '))
                    .pipe(replaceStream('prefix=', `prefix=${query.root}`))
                    .pipe(replaceStream('cdromBoot', ''))                         // Remove unused kernelopt
                    .pipe(replaceStream('kernelopt=', `kernelopt=${kernelopt} `)) // Append kernelopt
                    .pipe(res);
            }, (msg) => {
                console.log(msg);
                res.send(`Error when querying ${query.root}/boot.cfg\n${msg}`);
            });
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
