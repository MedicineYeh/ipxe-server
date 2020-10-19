const path = require('path');

const boot_linux = require('./linux');

module.exports = (info, serverInfo, host, dir_path, files) => {
    const rootURL = encodeURI(`http://${path.join(host, 'iso', dir_path, files[0])}`);
    const settings = global.settings?.linux[info.distribution];

    const args = [
        'archiso_http_srv=${iso-root}/',
    ].concat(settings?.parameters).filter(x => x!=undefined);

    const initrdList = ['/arch/boot/x86_64/archiso.img'].concat(settings?.initrd).filter(x => x!=undefined);
    const kernelList = ['/arch/boot/x86_64/vmlinuz'].concat(settings?.kernel).filter(x => x!=undefined);

    return boot_linux(
        serverInfo,             // Server information/description {manufacturer, product}
        rootURL,                // Root URL to the ISO image/directory path
        initrdList,             // List of possible initrd pathes
        kernelList,             // List of possible vmlinuz pathes
        args.join(' '),         // Kernel arguments
        'script=\${ks-script}'  // Kickstart/preceed template with ks-script variable on target machine
    );
}
