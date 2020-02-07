const path = require('path');

function boot_vmware(serverInfo, host, iso_path) {
    if (serverInfo.manufacturer === undefined)
        serverInfo.manufacturer = '\${manufacturer}'
    if (serverInfo.product === undefined)
        serverInfo.product = '\${product}'

    return `#!ipxe
# Set up the URL for the ISO images
set iso-root http://${path.join(host, 'iso', iso_path)}
echo Server \${Green}${serverInfo.manufacturer}\${NC} \${White}${serverInfo.product}\${NC}

echo
isset \${ks-script} && echo Using KS: \${Cyan}\${ks-script}\${NC} ||

initrd -n boot.cfg http://${host}/api/parse/boot.cfg?root=\${iso-root}&ks=\${ks-script} || goto failed
kernel -n mboot \${iso-root}/efi/boot/bootx64.efi || goto failed
imgargs mboot -c boot.cfg

echo =====================================
echo \${White}
imgstat
echo \${NC}
sleep 1

echo Boot
boot || goto failed
:failed
echo Press any key to return to the menu
prompt
exit`;
}

module.exports = boot_vmware;
