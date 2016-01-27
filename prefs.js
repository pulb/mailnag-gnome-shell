/* Mailnag - GNOME-Shell extension frontend
*
* Copyright 2013 - 2016 Patrick Ulbrich <zulu99@gmx.net>
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation; either version 2 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
* MA 02110-1301, USA.
*/

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Mainloop = imports.mainloop;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain('mailnag-gnome-shell');
const _ = Gettext.gettext;

const MAX_VISIBLE_MAILS_LIMIT	= 20;
const TIMEOUT_RESTART_HDLR		= 500; // ms
const TIMEOUT_REENABLE			= 100; // ms


const MailnagSettingsWidget = new GObject.Class({
	Name: 'Mailnag.Prefs.MailnagSettingsWidget',
	GTypeName: 'MailnagSettingsWidget',
	Extends: Gtk.Box,


	_init : function(params) {
		this.parent(params);
		this.orientation = Gtk.Orientation.VERTICAL;
		this.margin = 12;
		this.spacing = 6;
		this._restart_required = false;
		this._destroyed = false;
		let schemaSource = Gio.SettingsSchemaSource.get_default();
		let schemaObj = schemaSource.lookup('org.gnome.shell', true);
		this._shell_settings = new Gio.Settings( { settings_schema: schemaObj } );
		
		let settings = Convenience.getSettings();
		// Restarting the mailnag extensions whenever a setting has been changed
		// won't work when changes happen too fast (e.g. via the spinner buttons).
		// So just set a flag that something has been changed and defer the actual extension
		// restart to the restart_handler which is triggered every TIMEOUT_RESTART_HDLR ms. 
		settings.connect('changed', Lang.bind(this, function() { this._restart_required = true; }));
		
		let box = new Gtk.Box( { orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 } );
		box.add(new Gtk.Label( { label: _('Maximum number of visible mails:') } ));
		
		let spinbtn = Gtk.SpinButton.new_with_range(1, MAX_VISIBLE_MAILS_LIMIT, 1);
		spinbtn.set_value(settings.get_int('max-visible-mails'));
		settings.bind('max-visible-mails', spinbtn, 'value', Gio.SettingsBindFlags.DEFAULT);
		
		box.add(spinbtn);
		this.add(box);
		
		let checkbtn_avatars = new Gtk.CheckButton( { label: _("Show Avatars") } );
		settings.bind('show-avatars', checkbtn_avatars, 'active', Gio.SettingsBindFlags.DEFAULT);
		
		this.add(checkbtn_avatars);
		
		let checkbtn_remove = new Gtk.CheckButton( { label: _("Remove indicator icon if maillist is empty") } );
		settings.bind('remove-indicator', checkbtn_remove, 'active', Gio.SettingsBindFlags.DEFAULT);
		
		this.add(checkbtn_remove);
		
		this.connect('destroy', Lang.bind(this, function() {
			this._destroyed = true;
		}));
		
		Mainloop.timeout_add(TIMEOUT_RESTART_HDLR, Lang.bind(this, this._restart_handler));
	},
	
	
	_restart_handler: function() {
		
		// log ("restart handler")
		
		if (this._restart_required) {
			this._restart_required = false;
			// log ("restart required");
		
			let enabled_extensions_orig = this._shell_settings.get_strv('enabled-extensions');
			let enabled_extensions = [];
		
			for (let i = 0; i < enabled_extensions_orig.length; i++) {
				let ext = enabled_extensions_orig[i];
				if (ext != Me.uuid)
					enabled_extensions.push(ext);
			}
		
			this._shell_settings.set_strv('enabled-extensions', enabled_extensions);
			// GNOME-Shell (?) seems to miss toggling of enabled extensions if it happens too fast, 
			// so wait a bit (TIMEOUT_REENABLE) between disabling and re-enabling. 
			Mainloop.timeout_add(TIMEOUT_REENABLE, Lang.bind(this, function() {
				this._shell_settings.set_strv('enabled-extensions', enabled_extensions_orig);
				return false;
			}));
		}
		
		return !this._destroyed;
	}
});


function init() {
	Convenience.initTranslations();
}


function buildPrefsWidget() {
	let widget = new MailnagSettingsWidget();
	widget.show_all();
	
	return widget;
}
