const path = require('path');

module.exports = (serverInfo, rootURL, initrdList, vmlinuzList, kernelArg, ksTemplate) => {
    if (serverInfo.manufacturer === undefined)
        serverInfo.manufacturer = '\${manufacturer}'
    if (serverInfo.product === undefined)
        serverInfo.product = '\${product}'

    const load_initrd = (initrdList.length == 1) ?
        `initrd -n initrd.img \${iso-root}${initrdList[0]} || goto failed` :
        `${initrdList.map(x => `initrd -n initrd.img \${iso-root}${x} && goto pass_initrd ||`).join('\n')}
goto failed
:pass_initrd`;

    const load_vmlinuz = (vmlinuzList.length == 1) ?
        `kernel -n vmlinuz \${iso-root}${vmlinuzList[0]} || goto failed` :
        `${vmlinuzList.map(x => `kernel -n vmlinuz \${iso-root}${x} && goto pass_vmlinuz ||`).join('\n')}
goto failed
:pass_vmlinuz`;

    return `#!ipxe
### Set up the URL for the ISO images
set iso-root ${rootURL}
set kernelArg ${kernelArg}
set ksTemplate ${ksTemplate}

echo Server \${Green}${serverInfo.manufacturer}\${NC} \${White}${serverInfo.product}\${NC}
echo

### Uncomment and edit below to use ks script manually
# set ks-script http://127.0.0.1/ks/linux/distribution/default.txt
isset \${ks-script} && echo Using KS: \${Cyan}\${ks-script}\${NC} ||
isset \${ks-script} && set args \${kernelArg} \${ksTemplate} || set args \${kernelArg}
echo

${load_initrd}
${load_vmlinuz}

prompt --timeout 2000 --key e Press 'e' to edit kernel arguments in 2 seconds... || goto final
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
