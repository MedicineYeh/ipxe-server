# iPXE scripts

This repo contains the template ipxe scripts for booting with iPXE auto menu service.

# How to add my manual script
## Step 1: Add one item in the menu
Edit `linux/_init_.ipxe` or `vmware/_init_.ipxe` and add your file name without `.ipxe`
to the menu.

## Step 2: Write your simple boot script
View the existing files as examples, write your simple boot script!

# How to bind a PC to my scripts
## Step 1: Get your server ID
The `boot.ipxe` script will try to boot binding scripts before entering the menu.
To check the unique ID or network chip name, please boot your server and enter config menu.
All the variables are listed there for inspection.


## Step 2: Create your binding script
Simply add new script with special naming under `boot` directory.
The following namings are valid examples
* ./boot/uuid-2be04d56-60e5-6a30-e02d-18befac6934e.ipxe
* ./boot/mac-010203040506.ipxe
* ./boot/pci-8086100e.ipxe
* ./boot/chip-vmxnet3.ipxe

Note that mac address is without ":" due to iPXE limitation.

## Step 3: Write your simple boot script
You don't need any fansy techniques or variables. Simply write your boot script from here!

