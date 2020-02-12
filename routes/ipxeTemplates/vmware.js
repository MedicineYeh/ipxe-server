const path = require('path');

module.exports = (serverInfo, host, iso_path) => {
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

# Additional boot arguments
set args
prompt --timeout 3000 --key e Press 'e' to add additional boot arguments in 3 seconds... || goto final
echo Examples:
echo   Enable serial ports: gdbPort=none logPort=none tty2Port=com1
echo   Text mode and serial ports: text gdbPort=none logPort=none tty2Port=com1
echo -n Additional arguments: && read args

:final
initrd -n boot.cfg http://${host}/api/parse/boot.cfg?root=\${iso-root:uristring}&ks=\${ks-script:uristring}&args=\${args:uristring} || goto failed
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
