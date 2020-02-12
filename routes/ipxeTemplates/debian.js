const path = require('path');

const boot_linux = require('./linux');

module.exports = (serverInfo, host, dir_path, files) => {
    const rootURL = `http://${path.join(host, 'iso', dir_path, files[0])}`;

    const args = [
        'quiet',
    ];
    const ks_args = [
        'auto=true',
        'preseed/url=\${ks-script}',
    ];
    return boot_linux(
        serverInfo,                 // Server information/description {manufacturer, product}
        rootURL,                    // Root URL to the ISO image/directory path
        ['/install.amd/vmlinuz'],   // List of possible initrd pathes
        ['/install.amd/initrd.gz'], // List of possible vmlinuz pathes
        args.join(' '),             // Kernel arguments
        ks_args.join(' ')           // Kickstart/preceed template with ks-script variable on target machine
    );
}
