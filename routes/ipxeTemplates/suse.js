const path = require('path');
const fs = require('fs').promises;

const boot_linux = require('./linux');

module.exports = (info, serverInfo, host, dir_path, files) => {
    const rootURL = encodeURI(`http://${path.join(host, 'iso', dir_path, files[0])}`);
    const settings = global.settings?.linux[info.distribution];

    const addon = files.slice(1)
        .map(x => `http://${encodeURI(path.join(host, 'iso', dir_path, x))}`).join(',');
    const args = [
        'install=${iso-root}',
        (addon == '') ? undefined : `addon=${addon}`,
        'udev.rule="mac=${mac:hex},name=eth0"',
    ].concat(settings?.parameters).filter(x => x!=undefined);

    const initrdList = ['/boot/x86_64/loader/initrd'].concat(settings?.initrd).filter(x => x!=undefined);
    const kernelList = ['/boot/x86_64/loader/linux'].concat(settings?.kernel).filter(x => x!=undefined);

    return boot_linux(
        serverInfo,               // Server information/description {manufacturer, product}
        rootURL,                  // Root URL to the ISO image/directory path
        initrdList,               // List of possible initrd pathes
        kernelList,               // List of possible vmlinuz pathes
        args.join(' '),           // Kernel arguments
        'autoyast=\${ks-script}'  // Kickstart/preceed template with ks-script variable on target machine
    );
}
