const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const querystring = require('querystring');

const boot_vmware = require('./ipxeTemplates/vmware');
const boot_rhel = require('./ipxeTemplates/rhel');
const boot_sles = require('./ipxeTemplates/sles');
const boot_ubuntu = require('./ipxeTemplates/ubuntu');
const boot_archlinux = require('./ipxeTemplates/archlinux');

const router = express.Router();


// VMware iPXE boot
router.get('/vmware*', async (req, res, next) => {
    const serverInfo = req.query;
    const rootURL = `http://${path.join(req.headers.host, 'iso', req.info.route)}`

    // Generate iPXE boot script only if it's a file
    if ((await fs.stat(path.join(ISO_DIR, req.info.route))).isFile()) {
        res.setHeader('content-type', 'text/plain');
        res.send(boot_vmware(serverInfo, req.headers.host, req.info.route));
    } else {
        next();
    }
});

// Linux iPXE boot
router.get('/linux*', async (req, res, next) => {
    const serverInfo = req.query;
    const dirPath = (req.info.route.endsWith('.iso')) ? path.dirname(req.info.route) : req.info.route;

    let isoFiles = [];
    if (req.info.route.endsWith('.iso')) {
        // Specific ISO specified
        isoFiles = [path.basename(req.info.route)];
    } else {
        const isoDir = path.join(ISO_DIR, dirPath);
        // No specific ISO specified
        // Simply return if target path is not a directory
        if (!(await fs.stat(isoDir)).isDirectory()) return next();
        isoFiles = (await fs.readdir(isoDir)).filter(file => file.search(/.*\.iso/g) >= 0).sort();
    }

    // If there is no any iso file,
    // it is not a final directory to be responded.
    // Simply skip for the next handler to handle this request.
    if (isoFiles.length == 0) return next();

    let boot_target = undefined;
    switch (req.info.distribution) {
        case 'sles':
        case 'sled':
        case 'suse':
        case 'opensuse':
            boot_target = boot_sles;
            break;

        case 'redhat':
        case 'rhel':
        case 'centos':
        case 'fedora':
            boot_target = boot_rhel;
            break;

        case 'ubuntu':
            boot_target = boot_ubuntu;
            break;

        case 'archlinux':
            boot_target = boot_archlinux;
            break;

        default:
            return next();
    }
    res.setHeader('content-type', 'text/plain');
    res.send(boot_target(serverInfo, req.headers.host, dirPath, isoFiles));
});

// SPP iPXE boot
router.get('/spp*', async (req, res, next) => {
    const serverInfo = req.query;
    const host = req.headers.host;

    // Generate iPXE boot script only if it's a file
    if ((await fs.stat(path.join(ISO_DIR, req.info.route))).isFile()) {
        res.setHeader('content-type', 'text/plain');
        res.send(`echo SPP iPXE boot is not implemented yet.
echo Press any key to return to the menu
prompt
exit`);
    } else {
        next();
    }
});

// Return messages when it's not matching any os
// Take effect when URL is ended with .iso
router.get('/*', (req, res, next) => {
    res.setHeader('content-type', 'text/plain');
    res.send(`echo iPXE boot to ISO files placed outside of vmware, spp, linux/{DISTRIBUTION} is not implemented.
echo Press any key to return to the menu
prompt
exit`);
});

module.exports = router;
