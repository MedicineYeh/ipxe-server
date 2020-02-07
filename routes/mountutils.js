const fs = require('fs').promises;
const util = require('util');
const exec = require('await-exec');

/**
 * mountutils provides mount and umount utiltities in linux.
 * This module has a cache to detect whether a file has been changed since being mounted.
 */

let fileCaches = {};

/**
 * quotePath
 *
 * Properly single-quote a path so it can be safely used in a shell exec().
 * Shell quoting rules requires this to be done by:
 * splitting on any single quotes, wrapping each piece in single quotes
 * and joining the pieces with escaped single quotes.
 *
 * @param path      string  The device or filesystem path to quote
 *
 */
exports.quotePath = function(path) {
    var pieces = path.split("'");
    var output = '';
    var n = pieces.length;
    for (var i = 0; i < n; i++) {
        output = output + "'" + pieces[i] + "'";
        if (i < (n - 1)) output = output + "\\'";
    }
    return output;
}

/**
 * isMounted
 *
 * Check if device or mountpoint is currently mounted and return details.
 *
 * @param path      string  The device or filesystem path to check
 * @param isDevice  boolean Look for a device. If false, look for a mountpoint
 *
 */
exports.isMounted = async function(path, isDevice = false) {
    try {
        const stat = await fs.stat(path);
        const mtab = await fs.readFile('/etc/mtab', {
            'encoding': 'ascii'
        });

        mountInfo = mtab.split('\n').find(line => {
            [filePath, mountpoint, fstype, fsopts] = line.split(' ');
            if (isDevice && filePath == path) return true;
            if (!isDevice && mountpoint == path) return true;
        })

        if (mountInfo) return true;
        // The path is not mounted anywhere
        return false;
    } catch (err) {
        if (err.path === '/etc/mtab') console.log('Error when reading mount points\n', err);
        // console.log(err);
        return false;
    }
}

/**
 *
 * mount - attempts to mount a device
 *
 * @param filePath string   file to be mounted
 * @param dirPath  string   mountpoint for the file
 * @param options  object   options (see below)
 *
 * Valid options:
 *   fstype: filesystem type, otherwise autodetected
 *   readonly: mount device read only
 *   fsopts: mount options to be passed to mount
 *   mountPath: path to mount binary
 *   createDir: create path if it doesn't exist (default not)
 *   dirMode: mode to use for dir if we need to create
 *
 */

exports.mount = async function(filePath, dirPath, options = {}) {
    // See if there is already something mounted at the path
    const mounted = await this.isMounted(dirPath, false);
    if (mounted) {
        try {
            const stat = await fs.stat(filePath);
            const cache = fileCaches[filePath];
            const unchanged = cache != undefined && (cache.ctimeMs == stat.ctimeMs) && (cache.mtimeMs == stat.mtimeMs);
            fileCaches[filePath] = stat;

            // Return success if nothing changed. Un-mount the mount point if the file has been changed.
            if (unchanged) return true;
            else await this.umount(dirPath, false);
        } catch (err) {
            console.log(err);
            return false;
        }
    }

    // Try to create a new directory if necessary
    if (options.createDir) {
        const mode = options.dirMode ? options.dirMode : '0777';
        try {
            await fs.mkdir(dirPath, {
                mode: mode,
                recursive: true
            });
        } catch (err) {
            console.log(err);
            return false;
        }
    }

    const cmd = [options.mountPath ? options.mountPath : '/bin/mount'];
    if (options.readonly) cmd.push('-r');
    if (options.fstype) cmd.push('-t', options.fstype);
    if (options.fsopts) cmd.push('-o', options.fsopts);
    cmd.push(this.quotePath(filePath));
    cmd.push(this.quotePath(dirPath));

    try {
        await exec(cmd.join(' '));
    } catch (err) {
        console.log(err.stderr);
        return false;
    }
    return true;
}

/**
 *
 * umount - attempts to unmount a device
 *
 * @param path     string  mountpoint or file path to unmount
 * @param isDevice boolean path indicates a device, not a mountpoint (default false)
 * @param options  object  options (see below)
 *
 *   umountPath: path to umount binary
 *   removeDir: remove mountpoint after umount (default no)
 *
 */

exports.umount = async function(path, isDevice = false, options = {}) {
    // See if there is already something mounted at the path
    const mounted = await this.isMounted(path, false);
    if (!mounted) return true;

    const cmd = [options.mountPath ? options.mountPath : '/bin/umount'];
    cmd.push(this.quotePath(path));

    try {
        await exec(cmd.join(' '));
    } catch (err) {
        console.log(err.stderr);
        return false;
    }
    return true;
}

