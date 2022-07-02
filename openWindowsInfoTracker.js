'use strict';

const { Shell, Meta, Gio, GLib } = imports.gi;

const ByteArray = imports.byteArray;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Log = Me.imports.utils.log;
const PrefsUtils = Me.imports.utils.prefsUtils;

const EndSessionDialogIface = ByteArray.toString(
    Me.dir.get_child('dbus-interfaces').get_child('org.gnome.SessionManager.EndSessionDialog.xml').load_contents(null)[1]);
const EndSessionDialogProxy = Gio.DBusProxy.makeProxyWrapper(EndSessionDialogIface);

var OpenWindowsInfoTracker = class {

    constructor() {
        // Only track windows on X11
        if (Meta.is_wayland_compositor()) {
            return;
        }

        this._windowTracker = Shell.WindowTracker.get_default();
        this._defaultAppSystem = Shell.AppSystem.get_default();

        this._log = new Log.Log();
        this._prefsUtils = new PrefsUtils.PrefsUtils();
        this._settings = this._prefsUtils.getSettings();

        this._endSessionProxy = new EndSessionDialogProxy(Gio.DBus.session,
                                                          'org.gnome.Shell',
                                                          '/org/gnome/SessionManager/EndSessionDialog');
        
        this._endSessionProxy.connectSignal('ConfirmedLogout', this._onConfirmedLogout.bind(this));
        this._endSessionProxy.connectSignal('ConfirmedReboot', this._onConfirmedReboot.bind(this));
        this._endSessionProxy.connectSignal('ConfirmedShutdown', this._onConfirmedShutdown.bind(this));
        this._endSessionProxy.connectSignal('Closed', this._onClose.bind(this));
        this._endSessionProxy.connectSignal('Canceled', this._onCancel.bind(this));

        this._display = global.display;
        this._displayId = this._display.connect('window-created', this._windowCreated.bind(this));
    }

    _onClose() {
        this._log.debug(`User closed endSessionDialog`);
    }

    _onCancel() {
        this._log.debug(`User cancel endSessionDialog`);
    }

    _onConfirmedLogout(proxy, sender) {
        this._log.debug(`Resetting windows-mapping before logout.`);
        this._settings.set_string('windows-mapping', '{}');
    }

    _onConfirmedReboot(proxy, sender) {
        this._log.debug(`Resetting windows-mapping before reboot.`);
        this._settings.set_string('windows-mapping', '{}');
    }

    _onConfirmedShutdown(proxy, sender) {
        this._log.debug(`Resetting windows-mapping before shutdown.`);
        this._settings.set_string('windows-mapping', '{}');
    }
    
    _windowCreated(display, metaWindow, userData) {
        const shellApp = this._windowTracker.get_window_app(metaWindow);
        if (!shellApp) {
            return;
        }

        const app_info = shellApp.get_app_info();
        if (!app_info) {
            return;
        }
        
        const xid = metaWindow.get_description();
        const windowStableSequence = metaWindow.get_stable_sequence();
        const savedWindowsMappingJsonStr = this._settings.get_string('windows-mapping');
        let savedWindowsMapping;
        if (savedWindowsMappingJsonStr === '{}') {
            savedWindowsMapping = new Map();
        } else {
            savedWindowsMapping = new Map(JSON.parse(savedWindowsMappingJsonStr));
        }
        const desktopFullPath = app_info.get_filename();
        let xidObj = savedWindowsMapping.get(desktopFullPath);
        if (xidObj) {
            const windows = shellApp.get_windows();
            const removedXids = Object.keys(xidObj).filter(xid => 
                !windows.find(w => w.get_description() === xid));
            removedXids.forEach(xid => {
                delete xidObj[xid];
            });

            if (!xidObj[xid]){
                xidObj[xid] = {
                    windowTitle: metaWindow.get_title(),
                    xid: xid,
                    windowStableSequence: windowStableSequence
                };
            }
        } else {
            if (!xidObj) {
                xidObj = {};
            }
            xidObj[xid] = {
                windowTitle: metaWindow.get_title(),
                xid: xid,
                windowStableSequence: windowStableSequence
            };
            savedWindowsMapping.set(desktopFullPath, xidObj);
        }

        const newSavedWindowsMappingJsonStr = JSON.stringify(Array.from(savedWindowsMapping.entries()));
        this._settings.set_string('windows-mapping', newSavedWindowsMappingJsonStr);
        Gio.Settings.sync();
        
    }

    destroy() {
        if (this._displayId) {
            this._display.disconnect(this._displayId);
            this._displayId = 0;
        }

    }

}