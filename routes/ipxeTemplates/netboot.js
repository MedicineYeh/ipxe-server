const path = require('path');

module.exports = (serverInfo, netbootURL, rootURL, kernelArg, ksTemplate) => {
    if (serverInfo.manufacturer === undefined)
        serverInfo.manufacturer = '\${manufacturer}'
    if (serverInfo.product === undefined)
        serverInfo.product = '\${product}'

    const fixedArgs = [
        'debian-installer/locale=en_US',
        'keyboard-configuration/layoutcode=us',
        'localechooser/translation/warn-light=true,',
        'localechooser/translation/warn-severe=true',
        'netcfg/choose_interface=auto',
        'netcfg/get_hostname=ubuntu',
    ];

    return `#!ipxe
# Set up the URL for the ISO images
set iso-root ${rootURL}
echo Server \${Green}${serverInfo.manufacturer}\${NC} \${White}${serverInfo.product}\${NC}

initrd -n initrd.img ${netbootURL}/initrd.gz || goto failed
kernel -n vmlinuz ${netbootURL}/linux || goto failed

# Uncomment below to use ks script manually
# set ks-script http://.....
isset \${ks-script} && goto withks || goto withoutks

:withks
echo
echo Using KS: \${Cyan}\${ks-script}\${NC}
set args ${kernelArg} ${ksTemplate}
goto wait_user

:withoutks
set args ${kernelArg}
goto wait_user

:wait_user
echo
prompt --timeout 2000 --key e Press 'e' to edit kernel arguments in 2 seconds... || goto final
echo -n Kernel Arguments: && read args

:final
imgargs vmlinuz initrd=initrd.img ${fixedArgs.join(' ')} \${args}
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
