const path = require('path');

const boot_linux = require('./linux');

function boot_archlinux(serverInfo, host, dir_path, files) {
    const rootURL = `http://${path.join(host, 'iso', dir_path, files[0])}`;

    const args = [
        'archiso_http_srv=${iso-root}/',
        'archisobasedir=arch',
        'ip=dhcp',
        'cow_spacesize=2G',
        'raid=noautodetect',
    ];
    return boot_linux(
        serverInfo,                        // Server information/description {manufacturer, product}
        rootURL,                           // Root URL to the ISO image/directory path
        ['/arch/boot/x86_64/archiso.img'], // List of possible initrd pathes
        ['/arch/boot/x86_64/vmlinuz'],     // List of possible vmlinuz pathes
        args.join(' '),                    // Kernel arguments
        'script=\${ks-script}'             // Kickstart/preceed template with ks-script variable on target machine
    );
}

module.exports = boot_archlinux;
