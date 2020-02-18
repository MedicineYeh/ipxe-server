# iPXE server
iPXE Linux/ESXi auto menu and file server.
ISO files will be automatically mounted by HTTP requests.
This service is capable of parsing ESXi iso boot.cfg and patch to http boot mode.

# Preparation
1. Download netboot image from (http://cdimage.ubuntu.com/netboot/)[http://cdimage.ubuntu.com/netboot/]
2. Place it to {ROOT}/iso/netboot/netboot.iso

# Execution
```
docker-compose up -d
```

# Docker images
## Build Docker image
``` bash
docker build -t ipxe-server .
```

## Run Docker image
Change __YOUR_PUBLIC_DIRECTORY__ to the absolute path of your iso directory.
``` bash
sudo docker run --rm -it --privileged -p 80:3000 -v YOUR_PUBLIC_DIRECTORY:/workdir/public --name ipxe-server ipxe-server
```

# Development build and execution
1. npm install
2. node app.js

