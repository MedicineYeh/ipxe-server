const path = require('path');

module.exports = (serverInfo, rootURL, initrdList, vmlinuzList, kernelArg, ksTemplate) => {
    if (serverInfo.manufacturer === undefined)
        serverInfo.manufacturer = '\${manufacturer}'
    if (serverInfo.product === undefined)
        serverInfo.product = '\${product}'

    return `#!ipxe
# Set up the URL for the ISO images
set iso-root ${rootURL}
echo Server \${Green}${serverInfo.manufacturer}\${NC} \${White}${serverInfo.product}\${NC}

${
    initrdList.map(x => `initrd -n initrd.img \${iso-root}${x} && goto pass_initrd ||`).join('\n')
}
goto failed
:pass_initrd

${
    vmlinuzList.map(x => `kernel -n vmlinuz \${iso-root}${x} && goto pass_vmlinuz ||`).join('\n')
}
goto failed
:pass_vmlinuz

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
prompt --timeout 3000 --key e Press 'e' to edit kernel arguments in 3 seconds... || goto final
echo -n Kernel Arguments: && read args

:final
imgargs vmlinuz initrd=initrd.img \${args}
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
