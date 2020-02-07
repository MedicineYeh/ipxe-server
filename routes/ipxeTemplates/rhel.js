const path = require('path');

const boot_linux = require('./linux');

function boot_rhel(serverInfo, host, dir_path, files) {
    const rootURL = `http://${path.join(host, 'iso', dir_path, files[0])}`;

    const repos = files.slice(1)
        .map(x => `inst.addrepo=${path.basename(x, '.iso')},http://${path.join(host, 'iso', dir_path, x)}`);
    const args = [
        'inst.repo=${iso-root}',
        repos,
    ];
    return boot_linux(
        serverInfo,                     // Server information/description {manufacturer, product}
        rootURL,                        // Root URL to the ISO image/directory path
        ['/images/pxeboot/initrd.img'], // List of possible initrd pathes
        ['/images/pxeboot/vmlinuz'],    // List of possible vmlinuz pathes
        args.join(' '),                 // Kernel arguments
        'inst.ks=\${ks-script}'         // Kickstart/preceed template with ks-script variable on target machine
    );
}

module.exports = boot_rhel;
