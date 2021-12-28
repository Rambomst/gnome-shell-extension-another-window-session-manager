'use strict';

const { Gtk, GObject, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Prefs = GObject.registerClass(
    {
        GTypeName: 'AnotherWindowSessionManagerPrefs',
    },
    class Prefs extends GObject.Object {
        _init() {
            Gtk.init()
            
            this._settings = ExtensionUtils.getSettings(
                'org.gnome.shell.extensions.another-window-session-manager');

            this.render_ui();
            this._bindSettings();
        }

        _bindSettings() {
            this._settings.bind(
                'debugging-mode',
                this.debugging_mode_switch,
                'active',
                Gio.SettingsBindFlags.DEFAULT
            );
        }

        render_ui() {
            this._builder = new Gtk.Builder();
            this._builder.set_scope(new BuilderScope(this));
            this._builder.add_from_file(Me.path + '/ui/prefs-gtk4.ui');
            this.notebook = this._builder.get_object('prefs_notebook');

            this.debugging_mode_switch = this._builder.get_object('debugging_mode_switch');

            
        }
        
    }
);

const BuilderScope = GObject.registerClass({
    // Should be a globally unique GType name
    GTypeName: "AnotherWindowSessionManagerBuilderScope",
    Implements: [Gtk.BuilderScope],
}, class BuilderScope extends GObject.Object {
    _init(preferences) {
        this._preferences = preferences;
        super._init();
    }

    // Fix: Gtk.BuilderError: Creating closures is not supported by Gjs_BuilderScope
    // https://docs.w3cub.com/gtk~4.0/gtkbuilder#gtk-builder-create-closure
    vfunc_create_closure(builder, handlerName, flags, connectObject) {
        if (flags & Gtk.BuilderClosureFlags.SWAPPED)
            throw new Error('Unsupported template signal flag "swapped"');
        
        if (typeof this[handlerName] === 'undefined')
            throw new Error(`${handlerName} is undefined`);
        
        return this[handlerName].bind(connectObject || this);
    }

});

function buildPrefsWidget() {
    const settings = new Prefs();
    return settings.notebook;
}

function init() {

}