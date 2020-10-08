const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

function kickstart_file(url) {
    return `#!ipxe
set ks-script ${url} && exit || exit
`;
}

function kickstart_menu(distribution, items) {
    const item_list = items.join('\n');

    return `#!ipxe
:menu_ks
menu Kick start scripts for OS: ${distribution}
item --key n _no_ks     Do not use any kick start script
item --gap --             ------------------------- Kick start scripts ------------------------------
${item_list}
item
item --key x _exit      E(x)it to previous menu...
choose selected || goto menu_ks

# Exit will return success to previous menu/script
iseq \${selected} _exit && exit ||
iseq \${selected} _no_ks && set ks-script && exit ||
# Chain call to the next script, exit on successful return, goto failed on error
chain --autofree \${selected}.ipxe && exit || goto failed

:failed
echo Press any key to return to the menu
prompt
goto menu_ks`;
}

async function notDirectory(dirPath) {
    try {
        if ((await fs.stat(dirPath)).isDirectory()) return false;
        return true;
    } catch (err) {
        return true;
    }
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

async function file_exists(path) {
    try {
        await fs.access(path);
        return true;
    } catch(e) {
        return false;
    }
}

router.get('/*', async (req, res, next) => {
    const dirPath = path.join(KS_DIR, req.info.route);

    if (await notDirectory(dirPath)) {
        res.setHeader('content-type', 'text/plain');
        res.send(kickstart_file(encodeURI(`http://${path.join(req.headers.host, 'ks', req.info.route)}`)));
    } else {
        // Support AutoYast Rules and Classes
        if (await file_exists(path.join(dirPath, 'rules/rules.xml'))) {
            res.send(kickstart_file(encodeURI(`http://${path.join(req.headers.host, 'ks', req.info.route)}/`)));
            return ;
        }
        // Do normal iPXE menu generation
        const directories = await getDirectories(dirPath);
        const allFiles = (await fs.readdir(dirPath)).filter(x => !x.startsWith('.'));
        const dirSet = new Set(directories);
        const files = allFiles.filter(x => !dirSet.has(x));
        // Support AutoYast Rules and Classes
        let auto_yast_profiles = [];
        for (let i = 0; i < directories.length; i++) {
            if (await file_exists(path.join(dirPath, directories[i], 'rules/rules.xml')))
                auto_yast_profiles = [...auto_yast_profiles, directories[i]];
        }

        const items = [
            ...directories.filter(x => !(new Set(auto_yast_profiles)).has(x))
                          .map(x => `item ${encodeURI(path.join('/ipxe/ks', req.info.route, x, '_init_'))} ${x}...`),
            ...auto_yast_profiles.map(x => `item ${encodeURI(path.join('/ipxe/ks', req.info.route, x) + '/')} AutoYast-${x}`),
            ...files.sort().map(x => `item ${encodeURI(path.join('/ipxe/ks', req.info.route, x))} ${x}`),
        ];

        res.setHeader('content-type', 'text/plain');
        res.send(kickstart_menu(
            req.info.distribution ? req.info.distribution : req.info.os,
            items
        ));
    }
});

module.exports = router;
