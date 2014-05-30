/* Mailnag - GNOME-Shell extension frontend
*
* Copyright 2013, 2014 Patrick Ulbrich <zulu99@gmx.net>
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
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain('mailnag-gnome-shell');
const _ = Gettext.gettext;

const MAX_VISIBLE_MAILS_LIMIT = 20

/* Workaround for a bug in gnome-shell-extension-prefs that causes the 
 * extension widget to be destroyed twice. */
let built_time = 0;


const MailnagSettingsWidget = new GObject.Class({
	Name: 'Mailnag.Prefs.MailnagSettingsWidget',
	GTypeName: 'MailnagSettingsWidget',
	Extends: Gtk.Box,

	_init : function(params) {
		this.parent(params);
		this.orientation = Gtk.Orientation.VERTICAL;
		this.margin = 12;
		this.spacing = 6;
		
		let settings = Convenience.getSettings();
		
		let box = new Gtk.Box( { orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 } );
		box.add(new Gtk.Label( { label: _('Maximum number of visible mails:') } ));
		
		let spinbtn = Gtk.SpinButton.new_with_range(1, MAX_VISIBLE_MAILS_LIMIT, 1);
		spinbtn.set_value(settings.get_int('max-visible-mails'));
		settings.bind('max-visible-mails', spinbtn, 'value', Gio.SettingsBindFlags.DEFAULT);
		
		box.add(spinbtn);
		this.add(box);
		
		let checkbtn_avatars = new Gtk.CheckButton( { label: _("Show Avatars"), margin_left: 24 } );
		settings.bind('show-avatars', checkbtn_avatars, 'active', Gio.SettingsBindFlags.DEFAULT);
		checkbtn_avatars.sensitive = false;
		
		let checkbtn = null;
					
		checkbtn = new Gtk.CheckButton( { label: _('Show Notifications') } );
		settings.bind('show-notifications', checkbtn, 'active', Gio.SettingsBindFlags.DEFAULT);
		
		this.add(checkbtn);
		
		checkbtn = new Gtk.CheckButton( { label: _('Show Indicator (Top Panel)') } );
		checkbtn.connect('toggled', Lang.bind(this, function(widget) {
			checkbtn_avatars.sensitive = widget.active;
		}));
		settings.bind('show-indicator', checkbtn, 'active', Gio.SettingsBindFlags.DEFAULT);
		
		this.add(checkbtn);
		
		this.add(checkbtn_avatars);
		
		this.connect('destroy', Lang.bind(this, function() {
			this._restartExtension();
		}));
	},
	
	_restartExtension: function() {
		if ((new Date().getTime() - built_time) < 500)
			return;
		
		const gioSSS = Gio.SettingsSchemaSource;
		let schemaSource = gioSSS.get_default();
		let schemaObj = schemaSource.lookup('org.gnome.shell', true);
		let shell_settings = new Gio.Settings( { settings_schema: schemaObj } );
		
		let enabled_extensions_orig = shell_settings.get_strv('enabled-extensions');
		let enabled_extensions = [];
		
		for (let i = 0; i < enabled_extensions_orig.length; i++) {
			let ext = enabled_extensions_orig[i];
			if (ext != Me.uuid)
				enabled_extensions.push(ext);
		}
		
		shell_settings.set_strv('enabled-extensions', enabled_extensions);
		shell_settings.set_strv('enabled-extensions', enabled_extensions_orig);
	}
});

function init() {
	Convenience.initTranslations();
}

function buildPrefsWidget() {
	let widget = new MailnagSettingsWidget();
	widget.show_all();
	
	built_time = new Date().getTime();
	
	return widget;
}
