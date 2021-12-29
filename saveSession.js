'use strict';

const { Shell, Gio, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const SessionConfig = Me.imports.model.sessionConfig;
const FileUtils = Me.imports.utils.fileUtils;
const PrefsUtils = Me.imports.utils.prefsUtils;


var SaveSession = class {

    constructor() {
        this._prefsUtils = new PrefsUtils.PrefsUtils();        

        this._windowTracker = Shell.WindowTracker.get_default();
        this._subprocessLauncher = new Gio.SubprocessLauncher({
            flags: (Gio.SubprocessFlags.STDOUT_PIPE |
                    Gio.SubprocessFlags.STDERR_PIPE)});
        this._defaultAppSystem = Shell.AppSystem.get_default();
    }

    saveSession(sessionName) {
        
        const runningShellApps = this._defaultAppSystem.get_running();
        const sessionConfig = new SessionConfig.SessionConfig();
        sessionConfig.session_name = sessionName ? sessionName : FileUtils.default_sessionName;
        sessionConfig.session_create_time = new Date().toLocaleString();
        
        for (const runningShellApp of runningShellApps) {
            const appName = runningShellApp.get_name();
            const desktopFileId = runningShellApp.get_id();
            const desktopAppInfo = runningShellApp.get_app_info();
            // const desktopAppInfoCommandline = desktopAppInfo?.get_commandline();
            // Debug
            // log(`Saving application ${appName} :  ${desktopAppInfoCommandline}`);

            // TODO Not reliable, the result can be wrong?
            const n_windows = runningShellApp.get_n_windows();

            const metaWindows = runningShellApp.get_windows();
            for (const metaWindow of metaWindows) {
                // TODO pid is 0 if not known 
                // get_sandboxed_app_id() Gets an unique id for a sandboxed app (currently flatpaks and snaps are supported).
                const pid = metaWindow.get_pid();
                const input_cmd = ['ps', '--no-headers', '-p', `${pid}`, '-o', 'lstart,%cpu,%mem,command'];
                try {
                    const proc = this._subprocessLauncher.spawnv(input_cmd);
                    const result = proc.communicate_utf8(null, null);
                                        
                    const sessionConfigObject = new SessionConfig.SessionConfigObject();

                    this._setFieldsFromProcess(proc, result, sessionConfigObject);

                    sessionConfigObject.window_id_the_int_type = metaWindow.get_id();
                    if (metaWindow.is_always_on_all_workspaces()) {
                        sessionConfigObject.desktop_number = -1;
                    } else {
                        const workspace = metaWindow.get_workspace();
                        sessionConfigObject.desktop_number = workspace.index();
                    }
                    sessionConfigObject.pid = pid;
                    sessionConfigObject.username = GLib.get_user_name();
                    const frameRect = metaWindow.get_frame_rect();
                    let window_position = sessionConfigObject.window_position;
                    window_position.provider = 'Meta';
                    window_position.x_offset = frameRect.x;
                    window_position.y_offset = frameRect.y;
                    window_position.width = frameRect.width;
                    window_position.height = frameRect.height;
                    sessionConfigObject.client_machine_name = GLib.get_host_name();
                    sessionConfigObject.window_title = metaWindow.get_title();
                    sessionConfigObject.app_name = appName;
                    sessionConfigObject.windows_count = n_windows;
                    if (desktopAppInfo) {
                        sessionConfigObject.desktop_file_id = desktopFileId;
                    } else {
                        // No app info associated with this application, we just set an empty string
                        // Shell.App does have an id like window:22, but it's useless for restoring
                        // If desktop_file_id is '', launch this application via command line
                        sessionConfigObject.desktop_file_id = '';
                    }
                    
                    let window_state = sessionConfigObject.window_state;
                    // See: ui/windowMenu.js:L80
                    window_state.is_sticky = metaWindow.is_on_all_workspaces();
                    window_state.is_above = metaWindow.is_above();

                    sessionConfig.x_session_config_objects.push(sessionConfigObject);

                    
                    
                } catch (e) {
                    logError(e, `Failed to build sessionConfigObject`);
                }
            }

        }

        // Save open windows
        const success = this.save2File(sessionConfig);
        if (success) {
            // TODO saved Notification
        }
    }

    save2File(sessionConfig) {
        const sessionConfigJson = JSON.stringify(sessionConfig, null, 4);

        const sessions_path = FileUtils.get_sessions_path();
        const session_file_path = GLib.build_filenamev([sessions_path, sessionConfig.session_name]);
        const session_file = Gio.File.new_for_path(session_file_path);
        if (GLib.file_test(session_file_path, GLib.FileTest.EXISTS)) {
            const session_file_backup_path = GLib.build_filenamev([sessions_path, 'backups']);
            if (GLib.mkdir_with_parents(session_file_backup_path, 0o744) === 0) {
                const session_file_backup = GLib.build_filenamev([session_file_backup_path, sessionConfig.session_name + '.backup-' + new Date().getTime()]);
                session_file.copy(
                    Gio.File.new_for_path(session_file_backup),
                    Gio.FileCopyFlags.OVERWRITE,
                    null,
                    null);
            }

        }

        // https://gjs.guide/guides/gio/file-operations.html#saving-content
        // https://github.com/ewlsh/unix-permissions-cheat-sheet/blob/master/README.md#octal-notation
        // https://askubuntu.com/questions/472812/why-is-777-assigned-to-chmod-to-permit-everything-on-a-file
        // 0o stands for octal 
        // 0o744 => rwx r-- r--
        if (GLib.mkdir_with_parents(session_file.get_parent().get_path(), 0o744) === 0) {
            let [success, tag] = session_file.replace_contents(
                sessionConfigJson,
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null
            );

            if (success) {
                if (this._prefsUtils.isDebug()) {
                    log(`Saved open windows as a session in ${session_file_path}!`);
                }
            }
            return success;
        }

        return false;
    }

    _setFieldsFromProcess(proc, result, sessionConfigObject) {
        let [, stdout, stderr] = result;
        let status = proc.get_exit_status();
        if (status === 0 && stdout) {
            stdout = stdout.trim();
            const stdoutArr = stdout.split(' ').filter(a => a);
            sessionConfigObject.process_create_time = stdoutArr.slice(0, 5).join(' ');
            sessionConfigObject.cpu_percent = stdoutArr.slice(5, 6).join();
            sessionConfigObject.memory_percent = stdoutArr.slice(6, 7).join();
            sessionConfigObject.cmd = stdoutArr.slice(7);
        } else {
            logError(`Failed to query process info. status: ${status}, stdout: ${stdout}, stderr: ${stderr}`);
            sessionConfigObject.process_create_time = null;
            sessionConfigObject.cpu_percent = null;
            sessionConfigObject.memory_percent = null;
            sessionConfigObject.cmd = null;
        }
    }

    destroy() {
        if (this._windowTracker) {
            this._windowTracker = null;
        }
        if (this._defaultAppSystem) {
            this._defaultAppSystem = null;
        }
        if (this._subprocessLauncher) {
            this._subprocessLauncher = null;
        }
        if (this._prefsUtils) {
            this._prefsUtils.destroy();
            this._prefsUtils = null;
        }
    }

}