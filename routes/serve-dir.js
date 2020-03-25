// This file is an ugly merge of serve-index and pad.js.org


const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');
const exec = require('child_process').exec;
const nativePathSep = require('path').sep;

const accepts = require('accepts');
const createError = require('http-errors');
const debug = require('debug')('serve-dir');
const Batch = require('batch');
const mime = require('mime-types');
const parseUrl = require('parseurl');

const normalize = path.normalize,
    sep = path.sep,
    extname = path.extname,
    join = path.join,
    resolve = path.resolve;


/**
 * Module exports.
 * @public
 */

module.exports = serveIndex;

// http://stackoverflow.com/a/38897674
function fileSizeSI(size) {
    var e = (Math.log(size) / Math.log(1e3)) | 0;
    return Math.floor(size / Math.pow(1e3, e)) + ('kMGTPEZY' [e - 1] || '') + 'B';
}

// http://stackoverflow.com/a/6234804
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// http://stackoverflow.com/a/9756789
function quoteattr(s) {
    return escapeHtml(s).replace(/\r\n/g, '\n').replace(/[\r\n]/g, '\n');
}

// https://gist.github.com/ebraminio/a2e4338ce29d71156ea1703f5aaec4b6
var contentTypes = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.shtml': 'text/html',
    '.css': 'text/css',
    '.xml': 'text/xml',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'application/javascript',
    '.atom': 'application/atom+xml',
    '.rss': 'application/rss+xml',
    '.mml': 'text/mathml',
    '.txt': 'text/plain',
    '.jad': 'text/vnd.sun.j2me.app-descriptor',
    '.wml': 'text/vnd.wap.wml',
    '.htc': 'text/x-component',
    '.png': 'image/png',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.wbmp': 'image/vnd.wap.wbmp',
    '.ico': 'image/x-icon',
    '.jng': 'image/x-jng',
    '.bmp': 'image/x-ms-bmp',
    '.svg': 'image/svg+xml',
    '.svgz': 'image/svg+xml',
    '.webp': 'image/webp',
    '.md': 'text/markdown',
    '.woff': 'application/font-woff',
    '.jar': 'application/java-archive',
    '.war': 'application/java-archive',
    '.ear': 'application/java-archive',
    '.json': 'application/json',
    '.hqx': 'application/mac-binhex40',
    '.doc': 'application/msword',
    '.pdf': 'application/pdf',
    '.ps': 'application/postscript',
    '.eps': 'application/postscript',
    '.ai': 'application/postscript',
    '.rtf': 'application/rtf',
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.xls': 'application/vnd.ms-excel',
    '.eot': 'application/vnd.ms-fontobject',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.wmlc': 'application/vnd.wap.wmlc',
    '.kml': 'application/vnd.google-earth.kml+xml',
    '.kmz': 'application/vnd.google-earth.kmz',
    '.7z': 'application/x-7z-compressed',
    '.cco': 'application/x-cocoa',
    '.jardiff': 'application/x-java-archive-diff',
    '.jnlp': 'application/x-java-jnlp-file',
    '.run': 'application/x-makeself',
    '.pl': 'application/x-perl',
    '.pm': 'application/x-perl',
    '.prc': 'application/x-pilot',
    '.pdb': 'application/x-pilot',
    '.rar': 'application/x-rar-compressed',
    '.rpm': 'application/x-redhat-package-manager',
    '.sea': 'application/x-sea',
    '.swf': 'application/x-shockwave-flash',
    '.sit': 'application/x-stuffit',
    '.tcl': 'application/x-tcl',
    '.tk': 'application/x-tcl',
    '.der': 'application/x-x509-ca-cert',
    '.pem': 'application/x-x509-ca-cert',
    '.crt': 'application/x-x509-ca-cert',
    '.xpi': 'application/x-xpinstall',
    '.xhtml': 'application/xhtml+xml',
    '.xspf': 'application/xspf+xml',
    '.zip': 'application/zip',
    '.bin': 'application/octet-stream',
    '.exe': 'application/octet-stream',
    '.dll': 'application/octet-stream',
    '.deb': 'application/x-debian-package',
    '.dmg': 'application/octet-stream',
    '.iso': 'application/octet-stream',
    '.img': 'application/octet-stream',
    '.msi': 'application/octet-stream',
    '.msp': 'application/octet-stream',
    '.msm': 'application/octet-stream',
    '.wasm': 'application/wasm',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.mid': 'audio/midi',
    '.midi': 'audio/midi',
    '.kar': 'audio/midi',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/x-m4a',
    '.ra': 'audio/x-realaudio',
    '.3gpp': 'video/3gpp',
    '.3gp': 'video/3gpp',
    '.ts': 'video/mp2t',
    '.mp4': 'video/mp4',
    '.mpeg': 'video/mpeg',
    '.mpg': 'video/mpeg',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.flv': 'video/x-flv',
    '.m4v': 'video/x-m4v',
    '.mng': 'video/x-mng',
    '.asx': 'video/x-ms-asf',
    '.asf': 'video/x-ms-asf',
    '.wmv': 'video/x-ms-wmv',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/webm',
    '.mime': 'www/mime',
    '.tar': 'application/x-tar',
    '.tgz': 'application/x-tar-gz',
    '.gz': 'application/x-gzip'
};

async function getFiles(dirPath) {
    const files = ['..'].concat(await fs.promises.readdir(dirPath))
        .map((x) => {
            try {
                return {
                    name: x.toString(),
                    stat: fs.promises.stat(join(dirPath, x)),
                };
            } catch (e) {
                return undefined;
            }
        }).filter((x) => {
            return x !== undefined;
        }).map(async (x) => {
            try {
                const name = x.name;
                const stat = await x.stat;
                return {
                    name: name,
                    ext: extname(name),
                    size: stat.size,
                    date: new Date(stat.mtime),
                    isDir: stat.isDirectory()
                }
            } catch (err) {
                console.log(err);
            }
        });

    return Promise.all(files);
}

/**
 * Serve directory listings with the given `root` path.
 *
 * See Readme.md for documentation of options.
 *
 * @param {String} root
 * @param {Object} options
 * @return {Function} middleware
 * @public
 */

function serveIndex(root, options = {}) {
    // root required
    if (!root) {
        throw new TypeError('serveIndex() root path required');
    }

    // resolve root to absolute and normalize
    const rootPath = normalize(resolve(root));

    const allowDelete = options.allowDelete;
    const allowRename = options.allowRename;
    const noCors = options.noCors;
    const noInfo = options.noInfo ? options.noInfo : true;
    const noMime = options.noMime;
    const noUpload = options.noUpload;
    const noIndex = options.noIndex;
    const https = options.https;
    const showHidden = options.showHidden;
    const cmd = options.cmd;
    const keepPrevDir = options.keepPrevDir;
    const writeFlag = options.noReplace ? 'wx' : 'w';
    let userpass = undefined;
    if (options.userpass) {
        userpass = new Buffer(options.userpass).toString('base64');
    }

    return async (req, res, next) => {
        if (noUpload && ['POST', 'PUT'].indexOf(req.method) !== -1) {
            res.writeHead(405);
            return res.end('HTTP Error 405 Method Not Allowed');
        }

        // parse URLs
        const url = parseUrl(req);
        const originalUrl = parseUrl.original(req);
        const relativePath = decodeURIComponent(url.pathname);
        const originalDir = decodeURIComponent(originalUrl.pathname);

        // join / normalize from root dir
        const path = normalize(join(rootPath, relativePath));

        // null byte(s), bad request
        if (~path.indexOf('\0')) return next(createError(400));

        // malicious path
        if (path.substr(0, rootPath.length) !== rootPath) {
            debug('malicious path "%s"', path);
            return next(createError(403));
        }

        try {
            if (req.method === 'PUT') {
                return fs.mkdir(path, function() {
                    return res.end();
                });
            }

            if (req.method === 'POST') {
                if (userpass && ((req.headers.authorization || '').split(' ')[1] || '') !== userpass) {
                    res.writeHead(401, {
                        'WWW-Authenticate': 'Basic realm="nope"'
                    });
                    return res.end('HTTP Error 401 Unauthorized: Access is denied');
                }

                // aggregate received chunks of file
                var bufferArray = [];
                req.on('data', function(data) {
                    bufferArray.push(data);
                });

                return req.on('end', function() {
                    var buffer = Buffer.concat(bufferArray);

                    // buffer.indexOf('\r\n\r\n') + 4 but for older nodes, 13 => '\r'
                    for (var start = 4; start < buffer.length; ++start)
                        if (buffer[start - 2] === 13 && buffer[start - 4] === 13) break;

                    // buffer.lastIndexOf('\r\n-') but for older nodes, 13 => '\r', 45 => '-'
                    for (var end = buffer.length - 1 - 2; end >= 0; --end)
                        if (buffer[end] === 13 && buffer[end + 2] === 45) break;

                    fs.writeFile(path, buffer.slice(start, end), {
                        flag: writeFlag
                    }, function(err) {
                        if (err) {
                            console.error(err.message);
                            res.writeHead(409);
                            return res.end('HTTP Error 409 Conflict, a file with same name exists');
                        }

                        console.log('"' + path + '" SAVED!');
                        res.writeHead(200, {
                            'Content-Type': 'text/html',
                            'Access-Control-Allow-Origin': '*'
                        });
                        return res.end('UPLOADED');
                    });
                });
            }
        } catch (err) {
            console.log(err);
            return next();
        }

        try {
            const stats = await fs.promises.stat(path);
            if (stats.isSymbolicLink()) {
                const realPath = await fs.promises.realpath(path);
                if (realPath.substr(0, rootPath.length) !== rootPath) {
                    debug('malicious path "%s"', path);
                    res.writeHead(404);
                    return res.end('HTTP Error 404 Malicious symbolic link/path');
                }
            }
            if (!stats.isDirectory()) { // i.e. is a file
                return next();
            }
        } catch (err) {
            return next();
        }

        const files = await getFiles(path);

        try {
            const dir = await fs.promises.readdir(path);
            return res.end([
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                ' <meta charset="utf-8">',
                ' <meta name="viewport" content="width=device-width, initial-scale=1">',
                ' <link rel="icon" href="data:,">',
                ' <style>',
                'td:nth-child(3), th:nth-child(3) { text-align: right; }',
                'th, td { padding: 0 14px 0 0; } th { padding-bottom: 3px; }',
                'a, a:active { text-decoration: none; }',
                'a { color: blue; }',
                'a:visited { color: #48468F; }',
                'a:hover, a:focus { text-decoration: underline; color: red; }',
                'body { background-color: #F5F5F5; }',
                '@media (max-width: 800px) {',
                '  table, tbody, tr { display: block; }',
                '  td:nth-child(2), td:nth-child(4), thead { display: none; }',
                '  td:nth-child(1), td:nth-child(3) { display: inline; }',
                '  td:nth-child(3) { float: right; }',
                '  input[type="file"] { font-size: 90%; }',
                '}',
                ' </style>',
                ' <title>Index of ' + escapeHtml(originalDir) + '</title>',
                '</head>',
                '<body>',
                (noUpload ? '' : ' <div style="float: right;font-size: 25px;">' +
                    '<a onclick="createFolder(); return false;" href="#" title="Create a folder">📁</a> ' +
                    '<form method="post" enctype="multipart/form-data" style="display: inline">' +
                    '<input type="file" name="fileToUpload" id="fileToUpload" multiple ' +
                    'onchange="if (window.FormData) upload(this.files); else {' +
                    '  var form = this.parentElement;' +
                    '  form.action = this.value.split(\'\\\\\').slice(-1)[0];' +
                    '  form.submit();' +
                    '}"></form></div>'),
                ' <h2 style="font-size: 30px;margin-bottom: 12px;">' +
                '<a href="/">Index</a> of ' +
                originalDir.split('/').map(function(x, i, arr) {
                    return '<a href="' +
                        quoteattr(arr.slice(0, i + 1).join('/')) + '/">' +
                        escapeHtml(x) + '</a>';
                }).join('/') + '</h2>',
                ('<a href="' + join('/ipxe', originalDir.replace(/^\/iso/, '').replace(/\.iso\//, '.iso.ipxe')) + '">view with iPXE</a>'),
                ' <div style="font-size: 18px;background-color: white;' +
                ' border-top: 1px solid #646464; border-bottom: 1px solid #646464;' +
                ' padding-top: 10px; padding-bottom: 14px;">',
                '  <table ellpadding="0" cellspacing="0" style="' +
                'margin-left: 12px; font: 90% monospace; text-align: left;' +
                '">', '   <thead>', '    <tr>',
                '     <th onclick="sort(1); return false;"><a href="#">Name↓</a></a></th>',
                '     <th onclick="sort(2); return false;"><a href="#">Last Modified:</a></th>',
                '     <th onclick="sort(3); return false;"><a href="#">Size:</a></th>',
                '     <th onclick="sort(4); return false;"><a href="#">Type:</a></th>',
                '    </tr>', '   </thead>', '   <tbody>',
                files.filter((x) => relativePath != '/' || keepPrevDir != true && relativePath == '/' && x.name != '..')
                .filter((x) => x.name != 'lost+found')
                .filter((x) => {
                    if (showHidden == true) {
                        return true;
                    } else{
                        if (x.name == '..') return true;
                        return !x.name.startsWith('.');
                    }
                }).sort((x, y) => {
                    return x.isDir !== y.isDir ?
                        (x.isDir < y.isDir ? 1 : -1) :
                        (x.name > y.name ? 1 : -1);
                }).map((x) => {
                    return '   <tr>\n    <td>' +
                        (allowRename && x.name !== '..' && path === '' ?
                            '<a href="#" onclick="renameFile(this); return false;"' +
                            ' title="Rename" style="color: green; line-height: 0;">✍</a> ' : '') +
                        (allowDelete && x.name !== '..' ?
                            '<a href="#" onclick="deleteFile(this); return false;" title="Delete"' +
                            ' style="color: red">✗</a> ' : '') +
                        '<a href="' + quoteattr(join(originalDir, x.name, (x.isDir || x.ext == '.iso' ? '/' : ''))) + '"' +
                        (allowRename && x.name !== '..' && path === '' ?
                            (x.isDir ? ' ondrop="dropHandler(event);" ondragover="dragOverHandler(event);"' :
                                ' draggable="false" ondragstart="dragStart(event);"') :
                            '') + '>' +
                        escapeHtml(x.name) + '</a>' + (x.isDir || x.ext == '.iso' ? '/' : '') +
                        (x.ext == '.iso' ? '<span>\t...</span><a href="' + join('/raw', originalDir, quoteattr(x.name)) + '">Download File</a>' : '') +
                        '</td>\n    ' +
                        (x.name === '..' ? '<td></td>' :
                            '<td title="' + x.date.getTime() + '">' +
                            x.date.toISOString().replace('T', ' ').split('.')[0] + '</td>') +
                        '\n    <td title="' + x.size + '">' +
                        (x.isDir ? '-&nbsp;&nbsp;' : fileSizeSI(x.size)) + '</td>' +
                        '\n    <td>' + (x.isDir ? 'Directory' : contentTypes[x.ext] || '') +
                        '</td>\n   </tr>';
                }).join('\n'),
                '  </tbody></table>',
                ' </div>', ' <div style="' +
                'font: 90% monospace; color: #787878; padding-top: 4px;' +
                '">' + (noInfo ? '' : os.hostname() + ', ' + os.platform() + '/' + os.arch() +
                    ', memory: ' + fileSizeSI(os.totalmem()) + ', ') +
                ' Modified from pad.js.org, ' +
                (noUpload ? '' : 'supports upload by drag-and-drop and copy-and-paste, ') +
                'your IP is: ' +
                req.connection.remoteAddress + ' ' +
                (req.headers['x-forwarded-for'] || '') + '</div>' +
                (cmd && path === '' ?
                    '<br><input placeholder="Enter your command here and press enter" ' +
                    'style="float: right; width: 250px" ' +
                    'onkeypress="if (event.which === 13) location.href += \'@cmd/\' + this.value;">' :
                    ''), ' <script>',
                '"use strict";',
                'document.addEventListener("dragover", function (e) {',
                '  e.stopPropagation(); e.preventDefault();',
                allowRename ? '  return;' : '', // don't add overlay on the case, we have other uses
                '  if (!document.getElementById("over"))',
                '    document.body.innerHTML += "<pre id=\'over\' style=\'top: 0; right: 0; ' +
                'width: 100%; height: 100%; opacity: .9; position: absolute; margin: 0; ' +
                'background-color: white; text-align: center; padding-top: 10em;' +
                '\'>&hellip;drop anything here&hellip;</pre>";',
                '}, false);',
                'document.addEventListener("dragleave", function (e) {',
                '  e.stopPropagation(); e.preventDefault();',
                '  if (document.getElementById("over")) document.getElementById("over").remove();',
                '}, false);',
                'document.addEventListener("drop", function (e) {',
                '  e.stopPropagation(); e.preventDefault();',
                '  if (document.getElementById("over")) document.getElementById("over").remove();',
                '  handleDataTransfer(e.dataTransfer);',
                '});',
                'document.body.addEventListener("paste", function (e) {',
                '  if (e.target.nodeName !== "INPUT")', // don't interfere with input elements
                '    handleDataTransfer(e.clipboardData);',
                '});',
                'function noteSubmit(text) {',
                '  text = text || prompt("Enter a note:");',
                '  if (!text) return;',
                // fakemime as we split second part for the upload extension which is okay most of the times
                '  upload([new Blob([text], { type: "fakemime/txt" })]);',
                '}',
                'function request(callback, url, method, body, onProgress) {',
                '  var xhr = new XMLHttpRequest();',
                '  xhr.open(method, url);',
                '  xhr.onload = function () {',
                '    if (xhr.readyState === xhr.DONE) {',
                '      if (xhr.status !== 200) alert(xhr.responseText);',
                '      callback(xhr.responseText);',
                '    }',
                '  };',
                '  xhr.onerror = function (err) { alert(err); callback(err); };',
                '  if (xhr.upload && onProgress)',
                '    xhr.upload.onprogress = onProgress;',
                '  xhr.withCredentials = true;',
                '  xhr.send(body);',
                '}',
                'function createFolder() {',
                '  var name = prompt("Enter folder name:");',
                '  if (!name) return;',
                '  request(function () { location.reload(); }, encodeURIComponent(name), "PUT");',
                '}',
                'function deleteFile(element) {',
                '  var name = element.parentElement.lastElementChild.textContent;',
                '  request(function () { location.reload(); }, encodeURIComponent(name), "DELETE");',
                '}',
                'function dragStart(ev) {',
                '  ev.dataTransfer.setData("text/plain", ev.target.textContent);',
                '}',
                'function dropHandler(ev) {',
                '  ev.preventDefault();',
                '  var source = ev.dataTransfer.getData("text");',
                '  var target = ev.target.textContent;',
                '  request(function () { location.reload(); },',
                '    encodeURIComponent(source) +',
                '    "@" + encodeURIComponent(target) + "/" + encodeURIComponent(source), "PATCH");',
                '}',
                'function dragOverHandler(ev) {',
                '  ev.preventDefault();',
                '  ev.dataTransfer.dropEffect = "move";',
                '}',
                'function renameFile(element) {',
                '  var entry = element.parentElement.lastElementChild;',
                '  entry.draggable = false;', // https://stackoverflow.com/q/10317128
                '  var from = entry.textContent;',
                '  entry.contentEditable = true;',
                '  entry.focus();',
                '  entry.onkeypress = function (e) {',
                '    if (e.which === 13 || e.which === 27) entry.blur();',
                '    if (e.which !== 13) return;',
                '    e.preventDefault();',
                '    var to = entry.textContent;',
                '    request(function () { location.reload(); },',
                '      encodeURIComponent(from) + "@" + encodeURIComponent(to), "PATCH");',
                '  };',
                '  entry.onblur = function (e) {',
                '    entry.contentEditable = false;',
                '    entry.draggable = false;',
                '  };',
                '}',
                'function handleDataTransfer(dataTransfer) {',
                '  if (dataTransfer.files.length) upload(dataTransfer.files);',
                '  else if ((dataTransfer.items || [{}])[0].kind === "string")',
                '    dataTransfer.items[0].getAsString(noteSubmit);',
                '}',
                'function upload(files) {',
                '  if (files[0].type == "fakemime/txt") return ;',
                '  document.body.innerHTML += "<pre id=\'over\' style=\'top: 0; right: 0; ' +
                'width: 100%; height: 100%; opacity: .9; position: absolute; margin: 0; ' +
                'background-color: white; text-align: center; padding-top: 10em;' +
                '\'>Uploading&hellip;<br>' +
                '<div style=\'margin: 0 auto; width: 200px; background-color: #DDD\'>' +
                '<div id=\'bar\' style=\'height: 30px; background-color: #4CAF50\'>' +
                '</div></div></pre>";',
                '  var jobs = Array.prototype.slice.call(files).map(function (file) {',
                '    return function (callback) {',
                '      var name = file.name;',
                '      if (!name || name.split(".")[0] === "image")', // image.{png,jpeg,...}
                '        name = Date.now() + "." + file.type.split("/")[1];',
                '      var formData = new FormData();',
                '      formData.append("blob", file);',
                '      document.getElementById("over").innerHTML += "<div>" + name + "&hellip;</div>";',
                '      request(callback, encodeURIComponent(name), "POST", formData, function (e) {',
                '        document.getElementById("bar").style.width = e.loaded / e.total * 100 + "%";',
                '      });',
                '    };',
                '  });',
                '  (function reactor() {',
                '    (jobs.shift() || function () { location.reload(); })(reactor);',
                '  }());',
                '}',
                'var sortState = 1;',
                'function sort(ord) {',
                '  sortState = ord === sortState ? -ord : ord;',
                '  var p = document.getElementsByTagName("tbody")[0];',
                // http://stackoverflow.com/a/39569822
                '  Array.prototype.slice.call(p.children)',
                '    .map(function (x) { return p.removeChild(x); })',
                '    .sort(function (x, y) {',
                '      x = x.getElementsByTagName("td");',
                '      y = y.getElementsByTagName("td");',
                '      var xDir = x[3].textContent === "Directory";',
                '      var yDir = y[3].textContent === "Directory";',
                '      if (xDir !== yDir) return xDir < yDir ? 1 : -1;',
                '      if (x[0].textContent === "../") return -1;',
                '      if (y[0].textContent === "../") return 1;',
                '      if (ord === 2 || ord === 3)',
                '        return +x[ord - 1].title > +y[ord - 1].title ? sortState : -sortState;',
                '      return x[ord - 1].textContent > y[ord - 1].textContent ? sortState : -sortState;',
                '    }).forEach(function (x) { p.appendChild(x); });',
                '  Array.prototype.slice.call(document.getElementsByTagName("th")).forEach(function (x, i) {',
                '    x.firstChild.textContent = x.firstChild.textContent.replace(/.$/, i === ord - 1',
                '      ? (sortState < 0 ? "↑" : "↓") : ":");',
                '  });',
                '}',
                ' </script>', '</body>', '</html>'
            ].join('\n'));
        } catch (err) {
            return next();
        }
    };
};
