const path = require('path');

const boot_netboot = require('./netboot-debian');

module.exports = (serverInfo, host, dir_path, files) => {
    const rootURL = encodeURI(`http://${path.join(host, 'iso', dir_path, files[0])}`);
    const netbootURL = encodeURI(`http://${path.join(host, 'iso', 'netboot', 'netboot.iso')}`);

    const args = [
        'vga=normal',
        'ipv6.disable=1',
        'net.ifnames=0',
        `live-installer/net-image=\${iso-root}/casper/filesystem.squashfs`
    ];
    const ks_args = [
        'preseed/url=\${ks-script}',
    ];
    return boot_netboot(
        serverInfo,                 // Server information/description {manufacturer, product}
        netbootURL,                 // URL to netboot directory
        rootURL,                    // Root URL to the ISO image/directory path
        args.join(' '),             // Kernel arguments
        ks_args.join(' ')           // Kickstart/preceed template with ks-script variable on target machine
    );
}
