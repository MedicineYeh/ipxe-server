const path = require('path');

const boot_linux = require('./linux');

module.exports = (info, serverInfo, host, dir_path, files) => {
    const rootURL = encodeURI(`http://${path.join(host, 'iso', dir_path, files[0])}`);
    const settings = global.settings?.linux[info.distribution];

    const repos = files.slice(1)
        .map(x => `inst.addrepo=${path.basename(x, '.iso')},http://${encodeURI(path.join(host, 'iso', dir_path, x))}`);
    const args = [
        'inst.repo=${iso-root}',
        'ifname=eth0:${mac:hex}',
        'ip=eth0:dhcp',
    ].concat(repos)
    .concat(settings?.parameters).filter(x => x!=undefined);

    const initrdList = ['/images/pxeboot/initrd.img'].concat(settings?.initrd).filter(x => x!=undefined);
    const kernelList = ['/images/pxeboot/vmlinuz'].concat(settings?.kernel).filter(x => x!=undefined);

    return boot_linux(
        serverInfo,              // Server information/description {manufacturer, product}
        rootURL,                 // Root URL to the ISO image/directory path
        initrdList,              // List of possible initrd pathes
        kernelList,              // List of possible vmlinuz pathes
        args.join(' '),          // Kernel arguments
        'inst.ks=\${ks-script}'  // Kickstart/preceed template with ks-script variable on target machine
    );
}
