const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Redirect ipxe chain boot to our main menu generation function
router.get(['/', '/boot.ipxe', '/menu.ipxe'], (req, res) => {
    res.redirect('/ipxe/_init_.ipxe');
});

function ipxe_menu(host, url, items) {
    const item_list = items.join('\n');
    const os = url.split('/')[0];
    const distribution = (os == 'linux' && url.split('/').length >= 2) ? url.split('/')[1].toLowerCase().match(/\w*/g)[0] : '';

    let env_setup = '';
    if (url === os) {
        env_setup += `
# Figure out if client is 64-bit capable
cpuid --ext 29 && set arch x64 || set arch x86
cpuid --ext 29 && set archl amd64 || set archl i386
`;
    }
    // Set the default ks script when entering each OS's main menu
    if (os === 'vmware' && url.split('/').length == 1)
        env_setup += `set ks-script http://${encodeURI(path.join(host, 'ks/vmware/default.cfg'))}`;
    else if (os === 'linux' && url.split('/').length == 2 && (distribution === 'ubuntu' || distribution === 'debian'))
        env_setup += `set ks-script http://${encodeURI(path.join(host, 'ks/linux', distribution, 'default.seed'))}`;
    else if (os === 'linux' && url.split('/').length == 2)
        env_setup += `set ks-script`;

    return `#!ipxe
${env_setup}
set query manufacturer=\${manufacturer}&product=\${product}

:menu
menu Current KS: \${ks-script}
item --gap --    Server \${manufacturer} \${product}
item --gap --    ------------------------- Installing ------------------------------
${item_list}
item
item --key k /ipxe/ks/${encodeURI(path.join(os, distribution))}/_init_      (k)ick start script selection menu...
item --key x _exit      E(x)it to previous menu...
choose selected || goto menu

# Exit will return success to previous menu/script
iseq \${selected} _exit && exit ||
# Chain call to the next script, goto menu on success return, goto failed on error
chain --autofree \${selected}.ipxe?\${query} && goto menu || goto failed

:failed
echo Press any key to return to the menu
prompt
goto menu`;
}

// Get the directories under the path with depth
async function getDirectories(dirPath, depth = 1) {
    const items = await fs.readdir(dirPath);
    const states = await Promise.all(items.map(x => fs.stat(path.join(dirPath, x))));
    const directories = states.map((x, i) => {
            if (x.isDirectory()) return items[i];
            else return undefined;
        }).filter(x => x !== undefined)
        .sort();

    if (depth == 1) {
        return directories;
    } else {
        const dirList = await Promise.all(directories.map(async (x) => {
            const subDirectories = await getDirectories(path.join(dirPath, x), depth - 1);
            if (subDirectories.length == 0) {
                return x;
            } else {
                return subDirectories.map(y => path.join(x, y));
            }
        }));
        return dirList.flat();
    }
}

// Menu Generation
// Take effect iff the URL is NOT ended with .iso
// This function sees URL route "A/B/C/_init_.ipxe" and "A/B/C" as the same route
// This is because _init_.ipxe the generic format we try to maintain on our static HTTP iPXE script server.
router.get(['/*/_init_.ipxe', '/*'], async (req, res, next) => {
    // Skip if it is ISO file
    if (req.info.isISO) return next();

    const dirPath = path.join(ISO_DIR, req.info.route);
    const isoFiles = (await fs.readdir(dirPath)).filter(file => file.search(/.*\.iso$/g) >= 0).sort();

    if (req.info.os === 'linux' && req.info.distribution !== undefined) {
        const allSubDirs = await getDirectories(dirPath, 2);
        const osDirectories = allSubDirs.filter(name => name.split('/').length == 1)
                                        .filter(name => name != 'EMPTY_FOLDER')
                                        .map(name => name.split('/')[0])
                                        .sort();
        const directories = allSubDirs.filter(name => name.split('/').length != 1)
                                      .map(name => name.split('/')[0])
                                      .filter((v, i, s) => s.indexOf(v) === i) // Get unique items
                                      .sort();

        // If the current directory does not contain any subdirectories,
        // it must be the final directory where ISO files placed.
        // Simply skip for the next handler to handle this request.
        if (isoFiles.length > 0 && allSubDirs.length == 0) return next();


        const items = [
            ...directories.map(x => `item ${encodeURI(path.join('/ipxe', req.info.route, x, '_init_'))} ${x}...`),
            ...osDirectories.map(x => `item ${encodeURI(path.join('/ipxe', req.info.route, x))} Install ${x}`),
            ...isoFiles.map(x => `item ${encodeURI(path.join('/ipxe', req.info.route, x))} Install ${x}`),
        ];

        res.setHeader('content-type', 'text/plain');
        res.send(ipxe_menu(req.headers.host, req.info.route, items));
    } else {
        const directories = await getDirectories(dirPath);
        const items = [
            ...directories.map(x => `item ${encodeURI(path.join('/ipxe', req.info.route, x, '_init_'))} ${x}...`),
            ...isoFiles.map(x => `item ${encodeURI(path.join('/ipxe', req.info.route, x))} Install ${x}`),
        ];

        res.setHeader('content-type', 'text/plain');
        res.send(ipxe_menu(req.headers.host, req.info.route, items));
    }
});

module.exports = router;
