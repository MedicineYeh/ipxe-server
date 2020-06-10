const http = require('http');
const replaceStream = require('replacestream');
const express = require('express');
const router = express.Router();
const uniqid = require('uniqid');
const isReachable = require('is-reachable');

let serialID = 0;

// Download file to stream
function download(url, stream_cb, cb) {
    let finished = false;
    const request = http.get(url, (response) => {
        finished = true;
        // check if response is success
        if (response.statusCode !== 200) {
            return cb('Response status was ' + response.statusCode);
        }
        stream_cb(response);
    });

    // check for request error too
    request.on('error', (err) => {
        finished = true;
        return cb(err.message);
    });

    // Deal with timeout problem
    setTimeout(() => {
        if (!finished) {
            request.destroy();
            console.log("Timeout!!!!");
        }
    }, 5000);
}

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
        let target_url = query.root;
        if (!(await isReachable(query.root))) {
            const new_url = new URL(query.root);
            new_url.hostname = '127.0.0.1';
            new_url.port = (process.env.PORT || '3000');
            target_url = new_url.href;
        }
        download(target_url + '/boot.cfg',
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
                res.status(404).send(`Error when querying ${query.root}/boot.cfg\n${msg}`);
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
