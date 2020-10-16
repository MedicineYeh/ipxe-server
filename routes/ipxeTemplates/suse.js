const path = require('path');
const fs = require('fs').promises;

const boot_linux = require('./linux');

// TODO Add kISO HPE addon patch with detection of plarform from iPXE
module.exports = (serverInfo, host, dir_path, files) => {
    const rootURL = encodeURI(`http://${path.join(host, 'iso', dir_path, files[0])}`);

    const addon = files.slice(1)
        .map(x => `http://${encodeURI(path.join(host, 'iso', dir_path, x))}`).join(',');
    const args = [
        'ipv6.disable=1',
        'install=${iso-root}',
        (addon == '') ? '' : `addon=${addon}`,
        'vga=normal',
        'udev.rule="mac=${mac:hex},name=eth0"',
        'ifcfg=eth0=dhcp',
        'self_update=0',
    ];
    return boot_linux(
        serverInfo,                     // Server information/description {manufacturer, product}
        rootURL,                        // Root URL to the ISO image/directory path
        ['/boot/x86_64/loader/initrd'], // List of possible initrd pathes
        ['/boot/x86_64/loader/linux'],  // List of possible vmlinuz pathes
        args.join(' '),                 // Kernel arguments
        'autoyast=\${ks-script}'            // Kickstart/preceed template with ks-script variable on target machine
    );
}
