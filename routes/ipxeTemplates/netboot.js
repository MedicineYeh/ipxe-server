const path = require('path');

const boot_linux = require('./linux');

module.exports = (info, serverInfo, host, dir_path, files) => {
    const rootURL = encodeURI(`http://${path.join(host, 'iso', dir_path, files[0])}`);
    const settings = global.settings?.linux[info.distribution];

    const args = [
        'interface=${mac:hex}',
    ].concat(settings?.parameters).filter(x => x!=undefined);
    const ks_args = ['auto=true', 'preseed/url=\${ks-script}'];

    const initrdList = ['/initrd.gz'].concat(settings?.initrd).filter(x => x!=undefined);
    const kernelList = ['/linux'].concat(settings?.kernel).filter(x => x!=undefined);

    return boot_linux(
        serverInfo,        // Server information/description {manufacturer, product}
        rootURL,           // Root URL to the ISO image/directory path
        initrdList,        // List of possible initrd pathes
        kernelList,        // List of possible vmlinuz pathes
        args.join(' '),    // Kernel arguments
        ks_args.join(' ')  // Kickstart/preceed template with ks-script variable on target machine
    );
}
